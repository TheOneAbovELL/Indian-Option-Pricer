"""
Pydantic models for India Option Pricing Engine
All prices in INR (₹), aligned with NSE/BSE contract specs
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from enum import Enum


class OptionType(str, Enum):
    CALL = "CE"   # NSE uses CE/PE notation
    PUT  = "PE"


class ExerciseStyle(str, Enum):
    EUROPEAN = "european"
    AMERICAN = "american"


class PricingModel(str, Enum):
    BLACK_SCHOLES = "black_scholes"
    MONTE_CARLO   = "monte_carlo"
    BINOMIAL_TREE = "binomial_tree"


class AsianAveragingMethod(str, Enum):
    ARITHMETIC = "arithmetic"
    GEOMETRIC  = "geometric"


# ── Core Input ───────────────────────────────────────────────────────────────

class OptionInput(BaseModel):
    """Core parameters for all option pricing requests"""

    # Price fields (INR)
    spot_price:   float = Field(..., gt=0,  description="Current spot price (₹)", example=19500.0)
    strike_price: float = Field(..., gt=0,  description="Strike price (₹)",       example=19500.0)

    # Time
    time_to_expiry: float = Field(..., gt=0, le=3.0, description="Time to expiry in years (max 3 for NSE)", example=0.0833)

    # Rates / vol
    volatility:     float = Field(..., gt=0, lt=5.0, description="Annual implied volatility (e.g. 0.15 = 15%)", example=0.15)
    risk_free_rate: float = Field(..., ge=0, lt=1.0, description="Risk-free rate — use RBI repo rate (e.g. 0.065)", example=0.065)
    dividend_yield: float = Field(0.0, ge=0, lt=1.0, description="Continuous dividend yield (0 for index options)", example=0.0)

    # Contract
    option_type:     OptionType     = Field(OptionType.CALL, description="CE = Call, PE = Put")
    exercise_style:  ExerciseStyle  = Field(ExerciseStyle.EUROPEAN, description="NSE index options are European")
    lot_size:        int            = Field(1, ge=1, description="NSE lot size (Nifty=50, BankNifty=15)")
    num_simulations: int            = Field(50_000, ge=1_000, le=500_000, description="Monte Carlo paths")

    # Indian market metadata (optional, informational)
    underlying:  Optional[str] = Field(None, description="e.g. NIFTY, BANKNIFTY, RELIANCE, TCS")
    exchange:    Optional[str] = Field("NSE", description="NSE or BSE")

    @validator("strike_price")
    def validate_strike_reasonable(cls, v, values):
        if "spot_price" in values and v > 0:
            ratio = v / values["spot_price"]
            if ratio < 0.1 or ratio > 10:
                raise ValueError("Strike/Spot ratio must be between 0.1x and 10x")
        return v

    class Config:
        use_enum_values = True


class AsianOptionInput(OptionInput):
    """Additional parameters for Asian (path-dependent) options"""
    averaging_method: AsianAveragingMethod = Field(
        AsianAveragingMethod.ARITHMETIC,
        description="Arithmetic or Geometric averaging"
    )
    observation_frequency: Literal["daily", "weekly", "monthly"] = Field(
        "daily",
        description="Price observation frequency"
    )


# ── Responses ─────────────────────────────────────────────────────────────────

class BSMResult(BaseModel):
    model: str = "Black-Scholes-Merton"
    call_price: float
    put_price:  float
    call_price_inr:    float  # × lot_size
    put_price_inr:     float
    call_intrinsic:    float
    put_intrinsic:     float
    call_time_value:   float
    put_time_value:    float
    d1: float
    d2: float


class MonteCarloResult(BaseModel):
    model: str = "Monte Carlo"
    call_price:      float
    put_price:       float
    call_price_inr:  float
    put_price_inr:   float
    call_std_error:  float
    put_std_error:   float
    call_conf_interval_95: list[float]
    put_conf_interval_95:  list[float]
    num_simulations: int


class BinomialResult(BaseModel):
    model: str = "Binomial Tree (CRR)"
    call_price:      float
    put_price:       float
    call_price_inr:  float
    put_price_inr:   float
    num_steps:       int
    early_exercise_optimal: bool  # relevant for American options


class AsianResult(BaseModel):
    model: str
    averaging_method: str
    call_price:     float
    put_price:      float
    call_price_inr: float
    put_price_inr:  float
    call_std_error: float
    put_std_error:  float
    num_simulations: int


class PricingResponse(BaseModel):
    underlying:     Optional[str]
    exchange:       Optional[str]
    spot_price:     float
    strike_price:   float
    time_to_expiry: float
    volatility:     float
    risk_free_rate: float
    dividend_yield: float
    lot_size:       int
    bsm:            Optional[BSMResult]
    monte_carlo:    Optional[MonteCarloResult]
    binomial:       Optional[BinomialResult]
    asian:          Optional[AsianResult]
    pricing_models_used: list[str]


# ── Greeks ───────────────────────────────────────────────────────────────────

class GreeksResult(BaseModel):
    option_type: str

    # First-order
    delta: float = Field(..., description="Price sensitivity to spot (∂V/∂S)")
    gamma: float = Field(..., description="Delta sensitivity to spot (∂²V/∂S²)")
    theta: float = Field(..., description="Time decay per day (₹/day per lot)")
    vega:  float = Field(..., description="Sensitivity to 1% vol change (₹/lot)")
    rho:   float = Field(..., description="Sensitivity to 1% rate change (₹/lot)")

    # Second-order
    vanna:   float = Field(..., description="∂Delta/∂Vol — vol sensitivity of delta")
    volga:   float = Field(..., description="∂Vega/∂Vol — vega convexity")
    charm:   float = Field(..., description="∂Delta/∂t — delta decay rate")
    speed:   float = Field(..., description="∂Gamma/∂S — rate of gamma change")
    color:   float = Field(..., description="∂Gamma/∂t — gamma decay rate")

    # Derived
    delta_inr:       float = Field(..., description="Delta in ₹ terms (delta × lot_size)")
    theta_daily_inr: float = Field(..., description="Daily theta in ₹ (theta × lot_size)")
    theta_weekly_inr: float
    breakeven_up:    float = Field(..., description="Upper breakeven at expiry (₹)")
    breakeven_down:  float = Field(..., description="Lower breakeven at expiry (₹)")
    probability_itm: float = Field(..., description="Probability of expiring in-the-money")


class GreeksResponse(BaseModel):
    spot_price:   float
    strike_price: float
    call_greeks:  GreeksResult
    put_greeks:   GreeksResult


# ── Market Data ───────────────────────────────────────────────────────────────

class IndianMarketDefaults(BaseModel):
    """Pre-loaded reference data for major Indian underlyings"""
    underlying:     str
    exchange:       str
    description:    str
    typical_spot:   float
    lot_size:       int
    tick_size:      float
    expiry_cycle:   str
    typical_iv_pct: float  # typical implied volatility
    currency:       str = "INR"
    is_index:       bool


class RBIRateInfo(BaseModel):
    repo_rate:          float
    reverse_repo_rate:  float
    last_updated:       str
    source:             str = "RBI (hardcoded reference — verify current rate)"

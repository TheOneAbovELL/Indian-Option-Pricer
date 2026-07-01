"""
Strategy API — multi-leg option strategy pricing and analysis
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from app.core.pricing_engine import black_scholes_merton, compute_greeks

router = APIRouter()


class Leg(BaseModel):
    option_type:  Literal["CE", "PE"]
    direction:    Literal["buy", "sell"]
    strike_price: float = Field(..., gt=0)
    quantity:     int   = Field(1, ge=1, description="Number of lots")


class StrategyRequest(BaseModel):
    spot_price:     float = Field(..., gt=0)
    time_to_expiry: float = Field(..., gt=0)
    volatility:     float = Field(..., gt=0)
    risk_free_rate: float = Field(0.065)
    dividend_yield: float = Field(0.0)
    lot_size:       int   = Field(50, ge=1)
    legs:           list[Leg] = Field(..., min_length=1, max_length=6)


class LegResult(BaseModel):
    option_type:    str
    direction:      str
    strike_price:   float
    quantity:       int
    premium:        float
    premium_inr:    float   # premium × lot_size × quantity
    delta:          float
    gamma:          float
    theta_daily:    float   # per lot per day


class StrategyResponse(BaseModel):
    legs:                  list[LegResult]
    net_premium:           float   # positive = credit received, negative = debit paid
    net_premium_inr:       float
    net_delta:             float
    net_gamma:             float
    net_theta_daily:       float
    net_vega:              float
    estimated_margin_inr:  float   # rough SEBI SPAN proxy
    note:                  str


@router.post("/analyse", response_model=StrategyResponse)
def analyse_strategy(req: StrategyRequest):
    """
    Price and aggregate Greeks for a multi-leg option strategy.
    Net premium positive = credit strategy (iron condor, short straddle).
    Net premium negative = debit strategy (long straddle, spreads).
    Margin estimate is a rough proxy — verify with NSE SPAN calculator before trading.
    """
    if not req.legs:
        raise HTTPException(status_code=400, detail="At least one leg required")

    leg_results = []
    net_premium = 0.0
    net_delta   = 0.0
    net_gamma   = 0.0
    net_theta   = 0.0
    net_vega    = 0.0

    for leg in req.legs:
        try:
            bsm = black_scholes_merton(
                req.spot_price, leg.strike_price, req.time_to_expiry,
                req.risk_free_rate, req.dividend_yield, req.volatility,
            )
            g = compute_greeks(
                req.spot_price, leg.strike_price, req.time_to_expiry,
                req.risk_free_rate, req.dividend_yield, req.volatility,
                lot_size=req.lot_size,
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Pricing error for leg (strike {leg.strike_price}): {e}")

        premium = bsm.call_price if leg.option_type == "CE" else bsm.put_price
        delta   = g.call_delta   if leg.option_type == "CE" else g.put_delta
        theta   = g.call_theta   if leg.option_type == "CE" else g.put_theta
        gamma   = g.gamma

        sign = 1 if leg.direction == "buy" else -1
        lots = leg.quantity

        net_premium += sign * premium * lots
        net_delta   += sign * delta  * lots
        net_gamma   += sign * gamma  * lots
        net_theta   += sign * theta  * lots
        net_vega    += sign * g.vega * lots

        leg_results.append(LegResult(
            option_type=leg.option_type,
            direction=leg.direction,
            strike_price=leg.strike_price,
            quantity=lots,
            premium=round(premium, 4),
            premium_inr=round(sign * premium * req.lot_size * lots, 2),
            delta=round(delta, 6),
            gamma=round(gamma, 6),
            theta_daily=round(theta, 4),
        ))

    # Rough margin proxy: short legs require ~15% of notional + 3% OTM buffer (simplified)
    short_legs   = [l for l in req.legs if l.direction == "sell"]
    margin_proxy = sum(
        req.spot_price * req.lot_size * l.quantity * 0.15
        for l in short_legs
    ) if short_legs else 0.0

    net_premium_inr = net_premium * req.lot_size

    return StrategyResponse(
        legs=leg_results,
        net_premium=round(net_premium, 4),
        net_premium_inr=round(net_premium_inr, 2),
        net_delta=round(net_delta, 6),
        net_gamma=round(net_gamma, 6),
        net_theta_daily=round(net_theta, 4),
        net_vega=round(net_vega, 4),
        estimated_margin_inr=round(margin_proxy, 2),
        note="Margin estimate is approximate. Use NSE SPAN calculator or your broker's margin tool for exact figures before placing trades.",
    )

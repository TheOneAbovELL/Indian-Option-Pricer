from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.services.implied_vol import implied_volatility, vol_surface_grid

router = APIRouter()


class IVRequest(BaseModel):
    market_price: float = Field(..., gt=0, description="Observed market option price (₹)")
    spot_price:   float = Field(..., gt=0, description="Current spot (₹)")
    strike_price: float = Field(..., gt=0, description="Strike (₹)")
    time_to_expiry: float = Field(..., gt=0, description="Time to expiry in years")
    risk_free_rate: float = Field(0.065, description="RBI repo rate")
    dividend_yield: float = Field(0.0)
    option_type:    str   = Field("CE", description="CE or PE")


class IVResponse(BaseModel):
    implied_volatility:     Optional[float]
    implied_volatility_pct: Optional[float]
    converged: bool
    message:   str


class VolSurfaceRequest(BaseModel):
    spot_price:    float       = Field(19500.0, gt=0)
    strike_range:  list[float] = Field(default_factory=lambda: [
        17000, 17500, 18000, 18500, 19000, 19250, 19500, 19750, 20000, 20500, 21000, 21500, 22000
    ])
    expiries_years: list[float] = Field(default_factory=lambda: [
        7/365, 14/365, 30/365, 60/365, 90/365, 180/365
    ])
    risk_free_rate: float = Field(0.065)
    dividend_yield: float = Field(0.0)
    base_vol:       float = Field(0.15, description="ATM base volatility")


@router.post("/implied-vol", response_model=IVResponse)
def get_implied_vol(req: IVRequest):
    """
    Solve for implied volatility from an observed NSE option price.
    Uses Newton-Raphson iteration — typically converges in < 10 steps.
    """
    iv = implied_volatility(
        req.market_price, req.spot_price, req.strike_price,
        req.time_to_expiry, req.risk_free_rate, req.dividend_yield,
        req.option_type,
    )
    if iv is None:
        return IVResponse(
            implied_volatility=None,
            implied_volatility_pct=None,
            converged=False,
            message="Could not converge. Check that price > intrinsic value and inputs are valid.",
        )
    return IVResponse(
        implied_volatility=iv,
        implied_volatility_pct=round(iv * 100, 4),
        converged=True,
        message="Converged successfully.",
    )


@router.post("/vol-surface")
def get_vol_surface(req: VolSurfaceRequest):
    """
    Generate a model volatility surface with Indian market smile shape.
    Useful for charting IV across strikes and expiries.
    """
    try:
        surface = vol_surface_grid(
            req.spot_price,
            req.strike_range,
            req.expiries_years,
            req.risk_free_rate,
            req.dividend_yield,
            req.base_vol,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "spot_price": req.spot_price,
        "note": "Model smile — not live market data. For indicative use only.",
        "surface": surface,
        "strikes": sorted(set(r["strike"] for r in surface)),
        "expiries": sorted(set(r["expiry_years"] for r in surface)),
    }

from fastapi import APIRouter, HTTPException
from app.models.schemas import OptionInput, GreeksResponse, GreeksResult
from app.core.pricing_engine import compute_greeks, black_scholes_merton
import math

router = APIRouter()


@router.post("/", response_model=GreeksResponse, summary="Compute full Greeks (1st & 2nd order)")
def get_greeks(inp: OptionInput):
    """
    Compute analytical BSM Greeks for CE/PE options.
    
    Returns:
    - 1st order: Delta, Gamma, Theta (₹/day), Vega (₹/1%), Rho (₹/1%)
    - 2nd order: Vanna, Volga, Charm, Speed, Color
    - Derived: Delta in ₹, Theta ₹/week, breakeven prices, P(ITM)
    
    Theta and Vega are scaled to ₹ per lot for direct P&L interpretation.
    """
    try:
        g  = compute_greeks(
            inp.spot_price, inp.strike_price, inp.time_to_expiry,
            inp.risk_free_rate, inp.dividend_yield, inp.volatility,
            lot_size=inp.lot_size,
        )
        bsm = black_scholes_merton(
            inp.spot_price, inp.strike_price, inp.time_to_expiry,
            inp.risk_free_rate, inp.dividend_yield, inp.volatility,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    ls = inp.lot_size
    S  = inp.spot_price
    K  = inp.strike_price

    call_greeks = GreeksResult(
        option_type="CE",
        delta=round(g.call_delta, 6),
        gamma=round(g.gamma, 6),
        theta=round(g.call_theta, 4),
        vega=round(g.vega, 4),
        rho=round(g.call_rho, 4),
        vanna=round(g.vanna, 6),
        volga=round(g.volga, 6),
        charm=round(g.charm_call, 6),
        speed=round(g.speed, 8),
        color=round(g.color, 6),
        delta_inr=round(g.call_delta * ls, 2),
        theta_daily_inr=round(g.call_theta * ls, 2),
        theta_weekly_inr=round(g.call_theta * ls * 7, 2),
        breakeven_up=round(S + bsm.call_price, 2),
        breakeven_down=round(S - bsm.call_price, 2),
        probability_itm=round(g.prob_itm_call, 4),
    )

    put_greeks = GreeksResult(
        option_type="PE",
        delta=round(g.put_delta, 6),
        gamma=round(g.gamma, 6),
        theta=round(g.put_theta, 4),
        vega=round(g.vega, 4),
        rho=round(g.put_rho, 4),
        vanna=round(g.vanna, 6),
        volga=round(g.volga, 6),
        charm=round(g.charm_put, 6),
        speed=round(g.speed, 8),
        color=round(g.color, 6),
        delta_inr=round(g.put_delta * ls, 2),
        theta_daily_inr=round(g.put_theta * ls, 2),
        theta_weekly_inr=round(g.put_theta * ls * 7, 2),
        breakeven_up=round(S + bsm.put_price, 2),
        breakeven_down=round(S - bsm.put_price, 2),
        probability_itm=round(g.prob_itm_put, 4),
    )

    return GreeksResponse(
        spot_price=inp.spot_price,
        strike_price=inp.strike_price,
        call_greeks=call_greeks,
        put_greeks=put_greeks,
    )

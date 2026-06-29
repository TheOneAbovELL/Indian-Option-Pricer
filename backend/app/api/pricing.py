"""
Pricing API endpoints
Supports BSM, Monte Carlo, Binomial Tree, and Asian options
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    OptionInput, AsianOptionInput,
    PricingResponse, BSMResult, MonteCarloResult, BinomialResult, AsianResult,
)
from app.core.pricing_engine import (
    black_scholes_merton, monte_carlo_european, binomial_crr, monte_carlo_asian,
)

router = APIRouter()


def _build_bsm(inp: OptionInput) -> BSMResult:
    bsm = black_scholes_merton(
        inp.spot_price, inp.strike_price, inp.time_to_expiry,
        inp.risk_free_rate, inp.dividend_yield, inp.volatility
    )
    ls = inp.lot_size
    call_intrinsic = max(inp.spot_price - inp.strike_price, 0.0)
    put_intrinsic  = max(inp.strike_price - inp.spot_price, 0.0)
    return BSMResult(
        call_price=round(bsm.call_price, 4),
        put_price=round(bsm.put_price, 4),
        call_price_inr=round(bsm.call_price * ls, 2),
        put_price_inr=round(bsm.put_price * ls, 2),
        call_intrinsic=round(call_intrinsic, 4),
        put_intrinsic=round(put_intrinsic, 4),
        call_time_value=round(max(bsm.call_price - call_intrinsic, 0), 4),
        put_time_value=round(max(bsm.put_price - put_intrinsic, 0), 4),
        d1=round(bsm.d1, 6),
        d2=round(bsm.d2, 6),
    )


def _build_mc(inp: OptionInput) -> MonteCarloResult:
    mc = monte_carlo_european(
        inp.spot_price, inp.strike_price, inp.time_to_expiry,
        inp.risk_free_rate, inp.dividend_yield, inp.volatility,
        inp.num_simulations, antithetic=True,
    )
    ls = inp.lot_size
    return MonteCarloResult(
        call_price=round(mc.call_price, 4),
        put_price=round(mc.put_price, 4),
        call_price_inr=round(mc.call_price * ls, 2),
        put_price_inr=round(mc.put_price * ls, 2),
        call_std_error=round(mc.call_std_err, 6),
        put_std_error=round(mc.put_std_err, 6),
        call_conf_interval_95=[round(x, 4) for x in mc.call_ci_95],
        put_conf_interval_95=[round(x, 4) for x in mc.put_ci_95],
        num_simulations=mc.num_sims,
    )


def _build_binomial(inp: OptionInput) -> BinomialResult:
    american = inp.exercise_style == "american"
    bt = binomial_crr(
        inp.spot_price, inp.strike_price, inp.time_to_expiry,
        inp.risk_free_rate, inp.dividend_yield, inp.volatility,
        num_steps=200, american=american,
    )
    ls = inp.lot_size
    return BinomialResult(
        call_price=round(bt.call_price, 4),
        put_price=round(bt.put_price, 4),
        call_price_inr=round(bt.call_price * ls, 2),
        put_price_inr=round(bt.put_price * ls, 2),
        num_steps=bt.num_steps,
        early_exercise_optimal=bt.early_exercise_optimal,
    )


@router.post("/european", response_model=PricingResponse, summary="Price European options (NSE Index)")
def price_european(inp: OptionInput):
    """
    Price European-style options using all three models.
    Ideal for NSE Index options (Nifty, Bank Nifty) which are European.
    Returns BSM, Monte Carlo, and Binomial Tree prices side by side.
    All prices in INR (₹) per unit and per lot.
    """
    try:
        bsm = _build_bsm(inp)
        mc  = _build_mc(inp)
        bt  = _build_binomial(inp)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PricingResponse(
        underlying=inp.underlying,
        exchange=inp.exchange,
        spot_price=inp.spot_price,
        strike_price=inp.strike_price,
        time_to_expiry=inp.time_to_expiry,
        volatility=inp.volatility,
        risk_free_rate=inp.risk_free_rate,
        dividend_yield=inp.dividend_yield,
        lot_size=inp.lot_size,
        bsm=bsm,
        monte_carlo=mc,
        binomial=bt,
        asian=None,
        pricing_models_used=["Black-Scholes-Merton", "Monte Carlo (Antithetic)", "Binomial CRR"],
    )


@router.post("/american", response_model=PricingResponse, summary="Price American options (NSE Stock Options)")
def price_american(inp: OptionInput):
    """
    Price American-style options.
    NSE stock options (single-stock F&O) are American style since Oct 2019.
    Uses Binomial Tree (CRR) which handles early exercise correctly.
    """
    inp.exercise_style = "american"
    try:
        bsm = _build_bsm(inp)  # BSM as lower bound reference
        bt  = _build_binomial(inp)
        mc  = _build_mc(inp)   # European lower bound
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PricingResponse(
        underlying=inp.underlying,
        exchange=inp.exchange,
        spot_price=inp.spot_price,
        strike_price=inp.strike_price,
        time_to_expiry=inp.time_to_expiry,
        volatility=inp.volatility,
        risk_free_rate=inp.risk_free_rate,
        dividend_yield=inp.dividend_yield,
        lot_size=inp.lot_size,
        bsm=bsm,
        monte_carlo=mc,
        binomial=bt,
        asian=None,
        pricing_models_used=["Binomial CRR (American)", "Black-Scholes-Merton (European LB)", "Monte Carlo (European LB)"],
    )


@router.post("/asian", response_model=PricingResponse, summary="Price Asian (path-dependent) options")
def price_asian(inp: AsianOptionInput):
    """
    Price Asian options using Monte Carlo simulation.
    Supports arithmetic and geometric averaging with configurable observation frequency.
    """
    try:
        asian = monte_carlo_asian(
            inp.spot_price, inp.strike_price, inp.time_to_expiry,
            inp.risk_free_rate, inp.dividend_yield, inp.volatility,
            averaging=inp.averaging_method,
            obs_freq=inp.observation_frequency,
            num_sims=inp.num_simulations,
        )
        ls = inp.lot_size
        asian_result = AsianResult(
            model=f"Monte Carlo — {inp.averaging_method.title()} Asian",
            averaging_method=inp.averaging_method,
            call_price=round(asian.call_price, 4),
            put_price=round(asian.put_price, 4),
            call_price_inr=round(asian.call_price * ls, 2),
            put_price_inr=round(asian.put_price * ls, 2),
            call_std_error=round(asian.call_std_err, 6),
            put_std_error=round(asian.put_std_err, 6),
            num_simulations=asian.num_sims,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return PricingResponse(
        underlying=inp.underlying,
        exchange=inp.exchange,
        spot_price=inp.spot_price,
        strike_price=inp.strike_price,
        time_to_expiry=inp.time_to_expiry,
        volatility=inp.volatility,
        risk_free_rate=inp.risk_free_rate,
        dividend_yield=inp.dividend_yield,
        lot_size=inp.lot_size,
        bsm=None,
        monte_carlo=None,
        binomial=None,
        asian=asian_result,
        pricing_models_used=[f"Monte Carlo — {inp.averaging_method.title()} Asian ({inp.observation_frequency})"],
    )

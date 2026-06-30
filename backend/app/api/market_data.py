from fastapi import APIRouter, HTTPException
from app.services.market_data_service import (
    get_all_underlyings, get_underlying, get_rbi_rates,
    get_index_underlyings, get_stock_underlyings, nse_expiry_info
)
from app.models.schemas import IndianMarketDefaults, RBIRateInfo

router = APIRouter()


@router.get("/underlyings", response_model=list[IndianMarketDefaults], summary="List all supported underlyings")
def list_underlyings():
    """Returns NSE/BSE underlyings with lot sizes, typical IVs, and expiry cycle info."""
    return get_all_underlyings()


@router.get("/underlyings/indices", response_model=list[IndianMarketDefaults])
def list_index_underlyings():
    """Returns only index underlyings (Nifty, Bank Nifty, Sensex, etc.)"""
    return get_index_underlyings()


@router.get("/underlyings/stocks", response_model=list[IndianMarketDefaults])
def list_stock_underlyings():
    """Returns only single-stock underlyings."""
    return get_stock_underlyings()


@router.get("/underlyings/{symbol}", response_model=IndianMarketDefaults)
def get_underlying_info(symbol: str):
    """Get contract specs for a specific underlying (e.g. NIFTY, BANKNIFTY, RELIANCE)."""
    u = get_underlying(symbol)
    if not u:
        raise HTTPException(status_code=404, detail=f"Underlying '{symbol.upper()}' not found. Use /underlyings for full list.")
    return u


@router.get("/rbi-rates", response_model=RBIRateInfo, summary="RBI reference rates (repo, reverse repo)")
def get_rbi_rate_info():
    """
    Returns current RBI policy rates for use as risk-free rate.
    The repo rate is the standard risk-free proxy for Indian options.
    ⚠️ Always verify at rbi.org.in before using in live trading.
    """
    return get_rbi_rates()


@router.get("/nse-info", summary="NSE F&O market structure and rules")
def get_nse_info():
    """
    Reference information: expiry cycles, settlement rules, SEBI margin requirements,
    circuit breaker levels, and trading hours for NSE F&O.
    """
    return nse_expiry_info()


@router.get("/expiry-helpers", summary="Common expiry durations in years")
def expiry_helpers():
    """Pre-computed time-to-expiry fractions for common NSE expiry scenarios."""
    return {
        "note": "Approximate T values for time_to_expiry field (in years)",
        "weekly_expiry": {
            "1_week": round(7/365, 4),
            "2_weeks": round(14/365, 4),
        },
        "monthly_expiry": {
            "current_month": round(30/365, 4),
            "next_month": round(60/365, 4),
            "far_month": round(90/365, 4),
        },
        "quarterly_expiry": {
            "1_quarter": round(90/365, 4),
            "2_quarters": round(180/365, 4),
            "3_quarters": round(270/365, 4),
        },
        "long_dated": {
            "1_year": 1.0,
            "2_years": 2.0,
        },
    }

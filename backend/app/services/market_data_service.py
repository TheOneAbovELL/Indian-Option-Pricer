"""
Indian Market Data Service
Pre-loaded reference data for NSE/BSE underlyings, lot sizes, and RBI rates
"""

from typing import Optional
from app.models.schemas import IndianMarketDefaults, RBIRateInfo

# ── NSE/BSE Contract Specifications ──────────────────────────────────────────
# Lot sizes as per NSE circulars (updated periodically; verify before trading)

INDIAN_UNDERLYINGS: dict[str, IndianMarketDefaults] = {
    "NIFTY": IndianMarketDefaults(
        underlying="NIFTY",
        exchange="NSE",
        description="Nifty 50 Index — benchmark Indian large-cap index",
        typical_spot=19500.0,
        lot_size=50,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday) + Weekly (every Thursday)",
        typical_iv_pct=14.0,
        is_index=True,
    ),
    "BANKNIFTY": IndianMarketDefaults(
        underlying="BANKNIFTY",
        exchange="NSE",
        description="Bank Nifty Index — banking & financial services",
        typical_spot=44000.0,
        lot_size=15,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday) + Weekly (every Wednesday)",
        typical_iv_pct=18.0,
        is_index=True,
    ),
    "FINNIFTY": IndianMarketDefaults(
        underlying="FINNIFTY",
        exchange="NSE",
        description="Nifty Financial Services Index",
        typical_spot=19000.0,
        lot_size=40,
        tick_size=0.05,
        expiry_cycle="Monthly (last Tuesday) + Weekly (every Tuesday)",
        typical_iv_pct=16.0,
        is_index=True,
    ),
    "MIDCPNIFTY": IndianMarketDefaults(
        underlying="MIDCPNIFTY",
        exchange="NSE",
        description="Nifty Midcap Select Index",
        typical_spot=8500.0,
        lot_size=75,
        tick_size=0.05,
        expiry_cycle="Monthly (last Monday) + Weekly (every Monday)",
        typical_iv_pct=17.0,
        is_index=True,
    ),
    "SENSEX": IndianMarketDefaults(
        underlying="SENSEX",
        exchange="BSE",
        description="S&P BSE Sensex — 30 large-cap companies",
        typical_spot=65000.0,
        lot_size=10,
        tick_size=0.05,
        expiry_cycle="Monthly (last Friday) + Weekly (every Friday)",
        typical_iv_pct=14.0,
        is_index=True,
    ),
    "RELIANCE": IndianMarketDefaults(
        underlying="RELIANCE",
        exchange="NSE",
        description="Reliance Industries Ltd — largest Indian company",
        typical_spot=2450.0,
        lot_size=250,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=22.0,
        is_index=False,
    ),
    "TCS": IndianMarketDefaults(
        underlying="TCS",
        exchange="NSE",
        description="Tata Consultancy Services — IT sector bellwether",
        typical_spot=3600.0,
        lot_size=150,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=19.0,
        is_index=False,
    ),
    "HDFCBANK": IndianMarketDefaults(
        underlying="HDFCBANK",
        exchange="NSE",
        description="HDFC Bank Ltd — largest private sector bank",
        typical_spot=1650.0,
        lot_size=550,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=20.0,
        is_index=False,
    ),
    "INFY": IndianMarketDefaults(
        underlying="INFY",
        exchange="NSE",
        description="Infosys Ltd — second largest Indian IT company",
        typical_spot=1450.0,
        lot_size=400,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=21.0,
        is_index=False,
    ),
    "ICICIBANK": IndianMarketDefaults(
        underlying="ICICIBANK",
        exchange="NSE",
        description="ICICI Bank Ltd — second largest private sector bank",
        typical_spot=950.0,
        lot_size=700,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=22.0,
        is_index=False,
    ),
    "WIPRO": IndianMarketDefaults(
        underlying="WIPRO",
        exchange="NSE",
        description="Wipro Ltd — IT services company",
        typical_spot=420.0,
        lot_size=1500,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=24.0,
        is_index=False,
    ),
    "SBIN": IndianMarketDefaults(
        underlying="SBIN",
        exchange="NSE",
        description="State Bank of India — largest public sector bank",
        typical_spot=580.0,
        lot_size=1500,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=26.0,
        is_index=False,
    ),
    "TATAMOTORS": IndianMarketDefaults(
        underlying="TATAMOTORS",
        exchange="NSE",
        description="Tata Motors Ltd — auto & EV manufacturer",
        typical_spot=650.0,
        lot_size=1425,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=30.0,
        is_index=False,
    ),
    "ADANIENT": IndianMarketDefaults(
        underlying="ADANIENT",
        exchange="NSE",
        description="Adani Enterprises Ltd — Adani flagship company",
        typical_spot=2500.0,
        lot_size=300,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=35.0,
        is_index=False,
    ),
    "BAJFINANCE": IndianMarketDefaults(
        underlying="BAJFINANCE",
        exchange="NSE",
        description="Bajaj Finance Ltd — leading NBFC",
        typical_spot=7500.0,
        lot_size=125,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=25.0,
        is_index=False,
    ),
    "HINDUNILVR": IndianMarketDefaults(
        underlying="HINDUNILVR",
        exchange="NSE",
        description="Hindustan Unilever Ltd — FMCG leader",
        typical_spot=2600.0,
        lot_size=300,
        tick_size=0.05,
        expiry_cycle="Monthly (last Thursday)",
        typical_iv_pct=18.0,
        is_index=False,
    ),
}

# ── RBI Reference Rates ───────────────────────────────────────────────────────

RBI_RATES = RBIRateInfo(
    repo_rate=0.065,          # 6.50% (verify with RBI website)
    reverse_repo_rate=0.0335, # 3.35%
    last_updated="2024-02",
    source="RBI Monetary Policy — verify at rbi.org.in for current rates",
)


def get_all_underlyings() -> list[IndianMarketDefaults]:
    return list(INDIAN_UNDERLYINGS.values())


def get_underlying(symbol: str) -> Optional[IndianMarketDefaults]:
    return INDIAN_UNDERLYINGS.get(symbol.upper())


def get_rbi_rates() -> RBIRateInfo:
    return RBI_RATES


def get_index_underlyings() -> list[IndianMarketDefaults]:
    return [u for u in INDIAN_UNDERLYINGS.values() if u.is_index]


def get_stock_underlyings() -> list[IndianMarketDefaults]:
    return [u for u in INDIAN_UNDERLYINGS.values() if not u.is_index]


def nse_expiry_info() -> dict:
    return {
        "index_options_style": "European (cash-settled)",
        "stock_options_style": "American (physically settled since Oct 2019)",
        "settlement_currency": "INR",
        "trading_hours": "09:15 – 15:30 IST (Mon–Fri)",
        "expiry_time": "15:30 IST on expiry day",
        "lot_size_note": "NSE revises lot sizes periodically; always verify before trading",
        "sebi_margin_note": "SEBI mandates SPAN + Exposure margin for all F&O positions",
        "circuit_breakers": {
            "10_pct": "15-minute trading halt (first breach after 14:30 = rest of day)",
            "15_pct": "45-minute halt",
            "20_pct": "rest of day",
        },
        "key_exchanges": {
            "NSE": "National Stock Exchange — primary F&O exchange",
            "BSE": "Bombay Stock Exchange — also offers index options",
        },
    }

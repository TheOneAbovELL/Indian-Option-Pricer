"""
India Option Pricing Engine - FastAPI Backend
NSE/BSE Options: Nifty 50, Bank Nifty, Sensex, Indian Equities
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import pricing, market_data, greeks, implied_vol, strategy

app = FastAPI(
    title="India Option Pricing Engine",
    description=(
        "NSE/BSE Option Pricing — Black-Scholes-Merton, Monte Carlo, Binomial Tree, "
        "Greeks, Implied Volatility, and multi-leg Strategy analysis. "
        "All prices in INR (₹). Built for Indian derivatives markets."
    ),
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(pricing.router,     prefix="/api/pricing",     tags=["Pricing"])
app.include_router(greeks.router,      prefix="/api/greeks",      tags=["Greeks"])
app.include_router(market_data.router, prefix="/api/market-data", tags=["Market Data"])
app.include_router(implied_vol.router, prefix="/api/vol",         tags=["Implied Volatility"])
app.include_router(strategy.router,    prefix="/api/strategy",    tags=["Strategy"])


@app.get("/", tags=["Health"])
def root():
    return {
        "service":  "India Option Pricing Engine",
        "version":  "2.0.0",
        "exchange": "NSE/BSE",
        "currency": "INR (₹)",
        "docs":     "/api/docs",
        "endpoints": {
            "pricing":     "/api/pricing/{european|american|asian}",
            "greeks":      "/api/greeks",
            "vol":         "/api/vol/{implied-vol|vol-surface}",
            "strategy":    "/api/strategy/analyse",
            "market_data": "/api/market-data/{underlyings|rbi-rates|nse-info}",
        },
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}

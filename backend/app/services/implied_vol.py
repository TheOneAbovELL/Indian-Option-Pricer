"""
Implied Volatility solver and Volatility Surface utilities
Uses Newton-Raphson iteration to back out IV from market price
"""

import math
from scipy.stats import norm
from app.core.pricing_engine import black_scholes_merton, bsm_d1_d2


def implied_volatility(
    market_price: float,
    S: float, K: float, T: float, r: float, q: float,
    option_type: str = "CE",    # "CE" or "PE"
    tol: float = 1e-6,
    max_iter: int = 200,
) -> float | None:
    """
    Newton-Raphson IV solver.
    Returns implied volatility (decimal) or None if no solution found.
    
    Typical use: back out IV from NSE option chain market prices.
    """
    # Bounds check
    if T <= 0:
        return None
    intrinsic = max(S - K, 0) if option_type == "CE" else max(K - S, 0)
    discount = math.exp(-r * T)
    if market_price < intrinsic * discount - 1e-4:
        return None   # price below intrinsic — invalid

    # Initial guess: Brenner-Subrahmanyam approximation
    sigma = math.sqrt(2 * math.pi / T) * market_price / S

    for _ in range(max_iter):
        try:
            bsm = black_scholes_merton(S, K, T, r, q, sigma)
            price = bsm.call_price if option_type == "CE" else bsm.put_price
        except Exception:
            return None

        diff = price - market_price
        if abs(diff) < tol:
            return round(sigma, 8)

        # Vega for Newton step
        d1, _ = bsm_d1_d2(S, K, T, r, q, sigma)
        vega = S * math.exp(-q * T) * norm.pdf(d1) * math.sqrt(T)
        if abs(vega) < 1e-10:
            break

        sigma -= diff / vega
        sigma = max(sigma, 1e-6)   # keep positive
        sigma = min(sigma, 20.0)   # cap at 2000% vol

    # Final check
    bsm = black_scholes_merton(S, K, T, r, q, sigma)
    price = bsm.call_price if option_type == "CE" else bsm.put_price
    if abs(price - market_price) < 0.01:
        return round(sigma, 8)
    return None


def vol_surface_grid(
    S: float,
    strikes: list[float],
    expiries: list[float],
    r: float = 0.065,
    q: float = 0.0,
    base_vol: float = 0.15,
) -> list[dict]:
    """
    Generate a sample volatility surface with realistic Indian market smile:
    - Steeper skew for index options (negative skew, fear of downside)
    - Higher ATM vol for shorter expiries (term structure)
    
    Returns list of {strike, expiry, moneyness, iv} for charting.
    """
    rows = []
    for T in expiries:
        for K in strikes:
            moneyness = math.log(K / S)           # log-moneyness
            term_adj  = 1.0 + 0.03 * (1 / math.sqrt(T))  # higher short-term vol
            skew_adj  = -0.15 * moneyness          # negative skew (typical NSE)
            wing_adj  = 0.10 * moneyness ** 2      # smile wings
            iv = base_vol * term_adj + skew_adj + wing_adj
            iv = max(0.05, min(iv, 1.5))           # bound 5%–150%
            rows.append({
                "strike": K,
                "expiry_years": T,
                "moneyness": round(moneyness, 4),
                "iv": round(iv, 4),
                "iv_pct": round(iv * 100, 2),
            })
    return rows

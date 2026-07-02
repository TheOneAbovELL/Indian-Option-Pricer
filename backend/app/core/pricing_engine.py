"""
Core pricing engine for Indian options market
Implements BSM, Monte Carlo, Binomial Tree, and all Greeks
"""

import math
import numpy as np
from typing import Tuple
from dataclasses import dataclass


# ── Mathematical Utilities ────────────────────────────────────────────────────

def norm_cdf(x: float) -> float:
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)

def bsm_d1_d2(S: float, K: float, T: float, r: float, q: float, v: float) -> Tuple[float, float]:
    """Compute d1 and d2 for BSM formula"""
    d1 = (math.log(S / K) + (r - q + 0.5 * v * v) * T) / (v * math.sqrt(T))
    d2 = d1 - v * math.sqrt(T)
    return d1, d2


# ── Black-Scholes-Merton ──────────────────────────────────────────────────────

@dataclass
class BSMOutput:
    call_price: float
    put_price:  float
    d1: float
    d2: float


def black_scholes_merton(S: float, K: float, T: float, r: float, q: float, v: float) -> BSMOutput:
    """
    Full Black-Scholes-Merton pricing
    S: spot price (₹)
    K: strike price (₹)
    T: time to expiry (years)
    r: risk-free rate (RBI repo, decimal)
    q: dividend yield (decimal)
    v: volatility (decimal)
    """
    d1, d2 = bsm_d1_d2(S, K, T, r, q, v)

    call = S * math.exp(-q * T) * norm_cdf(d1) - K * math.exp(-r * T) * norm_cdf(d2)
    put  = K * math.exp(-r * T) * norm_cdf(-d2) - S * math.exp(-q * T) * norm_cdf(-d1)

    return BSMOutput(call_price=call, put_price=put, d1=d1, d2=d2)


# ── Monte Carlo ───────────────────────────────────────────────────────────────

@dataclass
class MCOutput:
    call_price:    float
    put_price:     float
    call_std_err:  float
    put_std_err:   float
    call_ci_95:    list
    put_ci_95:     list
    num_sims:      int


def monte_carlo_european(
    S: float, K: float, T: float, r: float, q: float, v: float,
    num_sims: int = 50_000, antithetic: bool = True
) -> MCOutput:
    """
    European Monte Carlo with antithetic variates for variance reduction
    Antithetic halves the std error at same simulation count
    """
    rng = np.random.default_rng()

    if antithetic:
        half = num_sims // 2
        Z = rng.standard_normal(half)
        Z_all = np.concatenate([Z, -Z])
    else:
        Z_all = rng.standard_normal(num_sims)

    drift   = (r - q - 0.5 * v * v) * T
    diffuse = v * math.sqrt(T)
    ST = S * np.exp(drift + diffuse * Z_all)

    call_payoffs = np.maximum(ST - K, 0.0)
    put_payoffs  = np.maximum(K - ST, 0.0)

    discount = math.exp(-r * T)

    call_price = discount * call_payoffs.mean()
    put_price  = discount * put_payoffs.mean()
    call_se    = discount * call_payoffs.std(ddof=1) / math.sqrt(num_sims)
    put_se     = discount * put_payoffs.std(ddof=1)  / math.sqrt(num_sims)

    return MCOutput(
        call_price=call_price,
        put_price=put_price,
        call_std_err=call_se,
        put_std_err=put_se,
        call_ci_95=[call_price - 1.96 * call_se, call_price + 1.96 * call_se],
        put_ci_95=[put_price - 1.96 * put_se, put_price + 1.96 * put_se],
        num_sims=num_sims,
    )


@dataclass
class AsianMCOutput:
    call_price:   float
    put_price:    float
    call_std_err: float
    put_std_err:  float
    num_sims:     int


def monte_carlo_asian(
    S: float, K: float, T: float, r: float, q: float, v: float,
    averaging: str = "arithmetic",
    obs_freq: str = "daily",
    num_sims: int = 50_000,
) -> AsianMCOutput:
    """
    Asian (path-dependent) option pricing via Monte Carlo
    Uses NSE-aligned observation frequencies
    """
    freq_map = {"daily": 252, "weekly": 52, "monthly": 12}
    steps_per_year = freq_map.get(obs_freq, 252)
    num_steps = max(1, int(T * steps_per_year))
    dt = T / num_steps

    drift   = (r - q - 0.5 * v * v) * dt
    diffuse = v * math.sqrt(dt)

    rng = np.random.default_rng()
    Z   = rng.standard_normal((num_sims, num_steps))

    # Simulate paths
    log_returns = drift + diffuse * Z
    log_paths   = np.cumsum(log_returns, axis=1)
    paths       = S * np.exp(log_paths)  # shape: (num_sims, num_steps)

    # Average price
    if averaging == "arithmetic":
        avg_price = paths.mean(axis=1)
    else:  # geometric
        avg_price = np.exp(np.log(paths).mean(axis=1))

    call_payoffs = np.maximum(avg_price - K, 0.0)
    put_payoffs  = np.maximum(K - avg_price, 0.0)

    discount = math.exp(-r * T)
    n = num_sims

    call_price = discount * call_payoffs.mean()
    put_price  = discount * put_payoffs.mean()
    call_se    = discount * call_payoffs.std(ddof=1) / math.sqrt(n)
    put_se     = discount * put_payoffs.std(ddof=1)  / math.sqrt(n)

    return AsianMCOutput(
        call_price=call_price,
        put_price=put_price,
        call_std_err=call_se,
        put_std_err=put_se,
        num_sims=num_sims,
    )


# ── Binomial Tree (Cox-Ross-Rubinstein) ──────────────────────────────────────

@dataclass
class BinomialOutput:
    call_price: float
    put_price:  float
    num_steps:  int
    early_exercise_optimal: bool


def binomial_crr(
    S: float, K: float, T: float, r: float, q: float, v: float,
    num_steps: int = 200,
    american: bool = False,
) -> BinomialOutput:
    """
    Cox-Ross-Rubinstein binomial tree
    Supports both European and American options
    American put early exercise is common in Indian equity options
    """
    dt = T / num_steps
    u  = math.exp(v * math.sqrt(dt))
    d  = 1.0 / u
    p  = (math.exp((r - q) * dt) - d) / (u - d)
    disc = math.exp(-r * dt)

    # Terminal stock prices
    j = np.arange(num_steps + 1)
    ST = S * (u ** (num_steps - j)) * (d ** j)

    # Terminal payoffs
    call_vals = np.maximum(ST - K, 0.0)
    put_vals  = np.maximum(K - ST, 0.0)

    early_exercise_detected = False

    # Backward induction
    for i in range(num_steps - 1, -1, -1):
        ST = S * (u ** (i - j[:i+1])) * (d ** j[:i+1])
        call_vals = disc * (p * call_vals[:-1] + (1 - p) * call_vals[1:])
        put_vals  = disc * (p * put_vals[:-1]  + (1 - p) * put_vals[1:])

        if american:
            call_iv = np.maximum(ST - K, 0.0)
            put_iv  = np.maximum(K - ST, 0.0)
            if np.any(put_iv > put_vals) or np.any(call_iv > call_vals):
                early_exercise_detected = True
            call_vals = np.maximum(call_vals, call_iv)
            put_vals  = np.maximum(put_vals, put_iv)

    return BinomialOutput(
        call_price=float(call_vals[0]),
        put_price=float(put_vals[0]),
        num_steps=num_steps,
        early_exercise_optimal=early_exercise_detected,
    )


# ── Greeks (BSM analytical) ──────────────────────────────────────────────────

@dataclass
class GreeksOutput:
    # First-order
    call_delta: float
    put_delta:  float
    gamma:      float
    call_theta: float
    put_theta:  float
    vega:       float
    call_rho:   float
    put_rho:    float
    # Second-order
    vanna:  float
    volga:  float
    charm_call: float
    charm_put:  float
    speed:  float
    color:  float
    # Derived
    prob_itm_call: float
    prob_itm_put:  float


def compute_greeks(
    S: float, K: float, T: float, r: float, q: float, v: float,
    lot_size: int = 1,
) -> GreeksOutput:
    """
    Full analytical Greeks for BSM
    Theta is per-day, Vega is per 1% vol move, Rho per 1% rate move
    """
    d1, d2 = bsm_d1_d2(S, K, T, r, q, v)
    sqrt_T = math.sqrt(T)
    exp_qt = math.exp(-q * T)
    exp_rt = math.exp(-r * T)

    nd1  = norm_pdf(d1)
    Nd1  = norm_cdf(d1)
    Nd2  = norm_cdf(d2)
    Nnd1 = norm_cdf(-d1)
    Nnd2 = norm_cdf(-d2)

    # ── First-order ──────────────────────────────────────────────
    call_delta = exp_qt * Nd1
    put_delta  = -exp_qt * Nnd1

    gamma = exp_qt * nd1 / (S * v * sqrt_T)

    # theta (per calendar day = /365)
    call_theta = (
        -(S * exp_qt * nd1 * v) / (2 * sqrt_T)
        - r * K * exp_rt * Nd2
        + q * S * exp_qt * Nd1
    ) / 365

    put_theta = (
        -(S * exp_qt * nd1 * v) / (2 * sqrt_T)
        + r * K * exp_rt * Nnd2
        - q * S * exp_qt * Nnd1
    ) / 365

    vega = S * exp_qt * nd1 * sqrt_T / 100  # per 1% vol move

    call_rho = K * T * exp_rt * Nd2  / 100  # per 1% rate move
    put_rho  = -K * T * exp_rt * Nnd2 / 100

    # ── Second-order ─────────────────────────────────────────────
    vanna  = -exp_qt * nd1 * d2 / v
    volga  = S * exp_qt * nd1 * sqrt_T * d1 * d2 / (v)
    charm_call = -exp_qt * (nd1 * ((2 * (r - q) * T - d2 * v * sqrt_T) / (2 * T * v * sqrt_T)) - q * Nd1)
    charm_put  = -exp_qt * (nd1 * ((2 * (r - q) * T - d2 * v * sqrt_T) / (2 * T * v * sqrt_T)) + q * Nnd1)
    speed  = -gamma / S * (d1 / (v * sqrt_T) + 1)
    color  = -exp_qt * nd1 / (2 * S * T * v * sqrt_T) * (2 * q * T + 1 + d1 * (2 * (r - q) * T - d2 * v * sqrt_T) / (v * sqrt_T))

    return GreeksOutput(
        call_delta=call_delta,
        put_delta=put_delta,
        gamma=gamma,
        call_theta=call_theta,
        put_theta=put_theta,
        vega=vega,
        call_rho=call_rho,
        put_rho=put_rho,
        vanna=vanna,
        volga=volga,
        charm_call=charm_call,
        charm_put=charm_put,
        speed=speed,
        color=color,
        prob_itm_call=Nd2,
        prob_itm_put=Nnd2,
    )

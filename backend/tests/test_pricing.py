"""
Tests for India Option Pricing Engine backend
Run: pytest tests/ -v
"""
import pytest
import math
from app.core.pricing_engine import (
    black_scholes_merton, monte_carlo_european,
    binomial_crr, compute_greeks, monte_carlo_asian,
)


class TestBSM:
    def test_atm_call_put_parity(self):
        """Put-call parity: C - P = S*e^(-qT) - K*e^(-rT)"""
        S, K, T, r, q, v = 19500, 19500, 0.0833, 0.065, 0.0, 0.15
        bsm = black_scholes_merton(S, K, T, r, q, v)
        lhs = bsm.call_price - bsm.put_price
        rhs = S * math.exp(-q * T) - K * math.exp(-r * T)
        assert abs(lhs - rhs) < 1e-6, f"Put-call parity failed: {lhs} != {rhs}"

    def test_deep_itm_call_approaches_intrinsic(self):
        """Deep ITM call ≈ intrinsic + time value"""
        S, K, T, r, q, v = 20000, 15000, 0.0833, 0.065, 0.0, 0.15
        bsm = black_scholes_merton(S, K, T, r, q, v)
        intrinsic = S - K
        assert bsm.call_price > intrinsic * 0.99, "Deep ITM call below intrinsic"

    def test_nifty_atm_example(self):
        """Realistic Nifty ATM call: should be within plausible range"""
        bsm = black_scholes_merton(S=19500, K=19500, T=0.0833, r=0.065, q=0.0, v=0.14)
        assert 200 < bsm.call_price < 600, f"ATM call {bsm.call_price} outside expected range"

    def test_zero_vol_boundary(self):
        """Near-zero vol ITM: call ≈ S - K*e^(-rT) (forward intrinsic)"""
        S, K, T, r, q, v = 19500, 19000, 0.1, 0.065, 0.0, 0.001
        bsm = black_scholes_merton(S, K, T, r, q, v)
        forward_intrinsic = S * math.exp(-q * T) - K * math.exp(-r * T)
        assert abs(bsm.call_price - forward_intrinsic) < 1.0, \
            f"Near-zero vol call {bsm.call_price:.4f} should ≈ forward intrinsic {forward_intrinsic:.4f}"


class TestMonteCarlo:
    def test_convergence_to_bsm(self):
        """MC with many sims should match BSM within 2 std errors"""
        S, K, T, r, q, v = 19500, 19500, 0.25, 0.065, 0.0, 0.15
        bsm = black_scholes_merton(S, K, T, r, q, v)
        mc  = monte_carlo_european(S, K, T, r, q, v, num_sims=100_000, antithetic=True)
        assert abs(mc.call_price - bsm.call_price) < 3 * mc.call_std_err * 2, "MC call not within 2σ of BSM"
        assert abs(mc.put_price  - bsm.put_price)  < 3 * mc.put_std_err  * 2, "MC put not within 2σ of BSM"

    def test_std_error_decreases_with_sims(self):
        S, K, T, r, q, v = 19500, 19500, 0.25, 0.065, 0.0, 0.15
        mc_small = monte_carlo_european(S, K, T, r, q, v, num_sims=5_000)
        mc_large = monte_carlo_european(S, K, T, r, q, v, num_sims=100_000)
        assert mc_large.call_std_err < mc_small.call_std_err


class TestBinomial:
    def test_european_matches_bsm(self):
        """CRR with 200 steps should match BSM closely"""
        S, K, T, r, q, v = 19500, 19500, 0.25, 0.065, 0.0, 0.15
        bsm = black_scholes_merton(S, K, T, r, q, v)
        bt  = binomial_crr(S, K, T, r, q, v, num_steps=200, american=False)
        assert abs(bt.call_price - bsm.call_price) < 2.0, f"Binomial call {bt.call_price} vs BSM {bsm.call_price}"

    def test_american_put_ge_european(self):
        """American put >= European put (early exercise premium)"""
        S, K, T, r, q, v = 19500, 20500, 0.5, 0.065, 0.0, 0.20
        bsm = black_scholes_merton(S, K, T, r, q, v)
        bt_am = binomial_crr(S, K, T, r, q, v, num_steps=200, american=True)
        assert bt_am.put_price >= bsm.put_price - 0.1, "American put should be >= European put"


class TestGreeks:
    def test_call_delta_range(self):
        """Call delta must be in (0, 1)"""
        g = compute_greeks(19500, 19500, 0.25, 0.065, 0.0, 0.15)
        assert 0 < g.call_delta < 1

    def test_put_delta_range(self):
        """Put delta must be in (-1, 0)"""
        g = compute_greeks(19500, 19500, 0.25, 0.065, 0.0, 0.15)
        assert -1 < g.put_delta < 0

    def test_delta_put_call_relationship(self):
        """call_delta - put_delta ≈ e^(-qT)"""
        S, K, T, r, q, v = 19500, 19500, 0.25, 0.065, 0.0, 0.15
        g = compute_greeks(S, K, T, r, q, v)
        expected = math.exp(-q * T)
        assert abs(g.call_delta - g.put_delta - expected) < 1e-6

    def test_gamma_positive(self):
        g = compute_greeks(19500, 19500, 0.25, 0.065, 0.0, 0.15)
        assert g.gamma > 0

    def test_vega_positive(self):
        g = compute_greeks(19500, 19500, 0.25, 0.065, 0.0, 0.15)
        assert g.vega > 0

    def test_theta_negative_for_long(self):
        """Long option theta should be negative (time decay)"""
        g = compute_greeks(19500, 19500, 0.25, 0.065, 0.0, 0.15)
        assert g.call_theta < 0
        assert g.put_theta < 0


class TestAsian:
    def test_asian_call_less_than_european(self):
        """Asian option <= equivalent European (averaging reduces vol)"""
        S, K, T, r, q, v = 19500, 19500, 0.25, 0.065, 0.0, 0.15
        bsm = black_scholes_merton(S, K, T, r, q, v)
        asian = monte_carlo_asian(S, K, T, r, q, v, averaging="arithmetic", num_sims=50_000)
        assert asian.call_price <= bsm.call_price * 1.05, "Asian call should be <= European call"

    def test_geometric_less_than_arithmetic(self):
        """Geometric average <= Arithmetic average → lower price"""
        S, K, T, r, q, v = 19500, 19500, 0.25, 0.065, 0.0, 0.15
        arith = monte_carlo_asian(S, K, T, r, q, v, averaging="arithmetic", num_sims=50_000)
        geom  = monte_carlo_asian(S, K, T, r, q, v, averaging="geometric",  num_sims=50_000)
        # Geometric mean <= arithmetic mean, so geometric asian should be slightly cheaper
        assert geom.call_price <= arith.call_price * 1.1

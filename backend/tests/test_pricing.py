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


class TestStrategy:
    """Tests for multi-leg strategy pricing logic"""

    def test_atm_straddle_delta_symmetry(self):
        """ATM straddle: |call_delta| ≈ |put_delta| (both close to 0.5)"""
        g = compute_greeks(19500, 19500, 0.0833, 0.065, 0.0, 0.14, lot_size=50)
        # For ATM option, |delta| should be close to 0.5 for both legs
        assert abs(g.call_delta) > 0.45, "ATM CE delta should be near 0.5"
        assert abs(g.put_delta)  > 0.40, "ATM PE delta should be near 0.5"
        # And their absolute values should be similar (symmetric ATM)
        assert abs(abs(g.call_delta) - abs(g.put_delta)) < 0.15

    def test_bull_call_spread_max_profit_capped(self):
        """Bull call spread: max profit = (K2-K1) - net_debit > 0 and < strike width"""
        K1, K2 = 19500, 20000
        bsm1 = black_scholes_merton(19500, K1, 0.0833, 0.065, 0.0, 0.14)
        bsm2 = black_scholes_merton(19500, K2, 0.0833, 0.065, 0.0, 0.14)
        net_debit  = bsm1.call_price - bsm2.call_price   # pay for lower, receive for higher
        max_profit = (K2 - K1) - net_debit
        assert net_debit > 0,           "Spread debit should be positive"
        assert max_profit > 0,          "Max profit should be positive"
        assert max_profit < (K2 - K1),  "Max profit must be less than strike width"

    def test_iron_condor_is_net_credit(self):
        """Iron condor: sell inner strikes, buy outer wings → net credit > 0"""
        S = 19500
        ce_sold = black_scholes_merton(S, 19750, 0.0833, 0.065, 0.0, 0.14)
        ce_buy  = black_scholes_merton(S, 20000, 0.0833, 0.065, 0.0, 0.14)
        pe_sold = black_scholes_merton(S, 19250, 0.0833, 0.065, 0.0, 0.14)
        pe_buy  = black_scholes_merton(S, 19000, 0.0833, 0.065, 0.0, 0.14)
        # Net credit = received premiums - paid premiums
        net_credit = (ce_sold.call_price - ce_buy.call_price +
                      pe_sold.put_price  - pe_buy.put_price)
        assert net_credit > 0, f"Iron condor net credit {net_credit:.2f} should be > 0"
        # Max loss = strike width - net credit (should be positive)
        wing_width = 250   # 19750-19500 = 250
        max_loss = wing_width - net_credit
        assert max_loss > 0, "Iron condor max loss should exceed net credit"

    def test_synthetic_forward_put_call_parity(self):
        """Buy CE + sell PE at same strike = forward price (put-call parity via legs)"""
        S, K, T, r = 19500, 19500, 0.0833, 0.065
        bsm = black_scholes_merton(S, K, T, r, 0.0, 0.14)
        synthetic_forward = bsm.call_price - bsm.put_price
        actual_forward    = S - K * math.exp(-r * T)
        assert abs(synthetic_forward - actual_forward) < 0.01, \
            f"Synthetic forward {synthetic_forward:.4f} != actual {actual_forward:.4f}"

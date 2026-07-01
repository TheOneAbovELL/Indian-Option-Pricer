import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'
import { api } from '../utils/api.js'
import { fmt } from '../utils/format.js'
import { Card, StatBox, Spinner, SectionTitle, PrimaryButton, Badge, ErrorBox } from '../components/ui.jsx'

// ─── Pre-built strategies ────────────────────────────────────────────────────

const STRATEGIES = {
  long_straddle: {
    label: 'Long Straddle',
    desc: 'Buy ATM CE + Buy ATM PE. Profit from large moves in either direction. Popular before RBI policy / earnings.',
    legs: (S) => [
      { type: 'CE', dir: 'buy', strike: S },
      { type: 'PE', dir: 'buy', strike: S },
    ],
    color: '#1A3A6B',
  },
  short_straddle: {
    label: 'Short Straddle',
    desc: 'Sell ATM CE + Sell ATM PE. Profit from time decay when market stays range-bound.',
    legs: (S) => [
      { type: 'CE', dir: 'sell', strike: S },
      { type: 'PE', dir: 'sell', strike: S },
    ],
    color: '#C0392B',
  },
  long_strangle: {
    label: 'Long Strangle',
    desc: 'Buy OTM CE + Buy OTM PE. Cheaper than straddle, needs bigger move to profit.',
    legs: (S) => [
      { type: 'CE', dir: 'buy', strike: Math.round(S * 1.025 / 50) * 50 },
      { type: 'PE', dir: 'buy', strike: Math.round(S * 0.975 / 50) * 50 },
    ],
    color: '#8E44AD',
  },
  bull_call_spread: {
    label: 'Bull Call Spread',
    desc: 'Buy lower CE + Sell higher CE. Capped upside, reduced cost vs naked call.',
    legs: (S) => [
      { type: 'CE', dir: 'buy',  strike: S },
      { type: 'CE', dir: 'sell', strike: Math.round(S * 1.025 / 50) * 50 },
    ],
    color: '#138808',
  },
  bear_put_spread: {
    label: 'Bear Put Spread',
    desc: 'Buy higher PE + Sell lower PE. Bearish view at reduced cost.',
    legs: (S) => [
      { type: 'PE', dir: 'buy',  strike: S },
      { type: 'PE', dir: 'sell', strike: Math.round(S * 0.975 / 50) * 50 },
    ],
    color: '#E67E22',
  },
  iron_condor: {
    label: 'Iron Condor',
    desc: 'Sell OTM CE + Buy further OTM CE + Sell OTM PE + Buy further OTM PE. Classic range-bound strategy for Nifty expiry weeks.',
    legs: (S) => [
      { type: 'CE', dir: 'sell', strike: Math.round(S * 1.025 / 50) * 50 },
      { type: 'CE', dir: 'buy',  strike: Math.round(S * 1.05  / 50) * 50 },
      { type: 'PE', dir: 'sell', strike: Math.round(S * 0.975 / 50) * 50 },
      { type: 'PE', dir: 'buy',  strike: Math.round(S * 0.95  / 50) * 50 },
    ],
    color: '#2980B9',
  },
  covered_call: {
    label: 'Covered Call',
    desc: 'Hold underlying + Sell OTM CE. Generate income on existing stock position (NSE stock options).',
    legs: (S) => [
      { type: 'CE', dir: 'sell', strike: Math.round(S * 1.025 / 50) * 50 },
    ],
    color: '#16A085',
  },
  bull_put_spread: {
    label: 'Bull Put Spread (Sell Put Spread)',
    desc: 'Sell higher PE + Buy lower PE. Collect premium; profit if market stays above sold strike.',
    legs: (S) => [
      { type: 'PE', dir: 'sell', strike: S },
      { type: 'PE', dir: 'buy',  strike: Math.round(S * 0.975 / 50) * 50 },
    ],
    color: '#D35400',
  },
}

const DEFAULT_PARAMS = {
  spot: '19500', T: (30 / 365).toFixed(4),
  vol: '0.14', r: '0.065', q: '0', lot: '50',
}

// ─── Pricing helper — calls backend for one leg ──────────────────────────────

async function priceLeg(spot, K, T, vol, r, q) {
  const body = {
    spot_price: spot, strike_price: K,
    time_to_expiry: T, volatility: vol,
    risk_free_rate: r, dividend_yield: q,
    option_type: 'CE', exercise_style: 'european',
    lot_size: 1, num_simulations: 1000,
  }
  const res = await fetch('/api/pricing/european', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return { ce: data.bsm.call_price, pe: data.bsm.put_price }
}

// ─── Payoff computation ───────────────────────────────────────────────────────

function computePayoff(legs, premiums, spot, lotSize) {
  const range = Array.from({ length: 81 }, (_, i) => spot * (0.80 + i * 0.005))
  return range.map(S => {
    let total = 0
    legs.forEach((leg, i) => {
      const premium = leg.type === 'CE' ? premiums[i].ce : premiums[i].pe
      const intrinsic = leg.type === 'CE'
        ? Math.max(S - leg.strike, 0)
        : Math.max(leg.strike - S, 0)
      const sign = leg.dir === 'buy' ? 1 : -1
      total += sign * (intrinsic - premium)
    })
    return { price: Math.round(S), payoff: +(total * lotSize).toFixed(2) }
  })
}

// ─── Strategy stats ───────────────────────────────────────────────────────────

function strategyStats(payoffData, legs, premiums, lotSize) {
  const payoffs = payoffData.map(d => d.payoff)
  const netPremium = legs.reduce((sum, leg, i) => {
    const p = leg.type === 'CE' ? premiums[i].ce : premiums[i].pe
    return sum + (leg.dir === 'buy' ? -p : p)
  }, 0) * lotSize

  const maxProfit = Math.max(...payoffs)
  const maxLoss   = Math.min(...payoffs)

  // Breakeven crossings
  const breakevens = []
  for (let i = 1; i < payoffData.length; i++) {
    if ((payoffData[i-1].payoff < 0 && payoffData[i].payoff >= 0) ||
        (payoffData[i-1].payoff >= 0 && payoffData[i].payoff < 0)) {
      breakevens.push(Math.round((payoffData[i-1].price + payoffData[i].price) / 2))
    }
  }

  return { netPremium, maxProfit, maxLoss, breakevens }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function StrategyPage() {
  const [params, setParams] = useState(DEFAULT_PARAMS)
  const [stratKey, setStratKey] = useState('long_straddle')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setParams(p => ({ ...p, [k]: v }))

  const analyse = async () => {
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const S   = parseFloat(params.spot)
      const T   = parseFloat(params.T)
      const vol = parseFloat(params.vol)
      const r   = parseFloat(params.r)
      const q   = parseFloat(params.q)
      const lot = parseInt(params.lot)

      const strat = STRATEGIES[stratKey]
      const legs  = strat.legs(S)

      // Price all legs in parallel
      const premiums = await Promise.all(legs.map(leg => priceLeg(S, leg.strike, T, vol, r, q)))

      const payoffData = computePayoff(legs, premiums, S, lot)
      const stats = strategyStats(payoffData, legs, premiums, lot)

      setResult({ legs, premiums, payoffData, stats, strat, S, lot })
    } catch (e) {
      setError(e.message || 'Pricing failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 14, fontFamily: 'var(--font-mono)', background: '#FAFBFF', outline: 'none' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionTitle sub="Multi-leg payoff analysis for common NSE/BSE strategies">
        Strategy Builder
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Left panel ── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20, boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 80 }}>

          {/* Strategy picker */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--ink)' }}>Strategy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(STRATEGIES).map(([k, s]) => (
                <button key={k} onClick={() => setStratKey(k)} style={{
                  textAlign: 'left', padding: '8px 12px', borderRadius: 7,
                  border: '1.5px solid',
                  borderColor: stratKey === k ? 'var(--saffron)' : 'var(--border)',
                  background: stratKey === k ? 'var(--accent-dim)' : '#fff',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}>
                  <div style={{ fontSize: 13, fontWeight: stratKey === k ? 700 : 500, color: stratKey === k ? 'var(--saffron)' : 'var(--ink)' }}>{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Strategy description */}
          <div style={{ padding: '10px 12px', background: 'rgba(26,58,107,0.05)', borderRadius: 8, fontSize: 12, color: 'var(--chakra-blue)', lineHeight: 1.6, marginBottom: 16 }}>
            {STRATEGIES[stratKey].desc}
          </div>

          {/* Market params */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 2 }}>Market Parameters</div>
            {[
              ['Spot Price (₹)', 'spot', 'number'],
              ['Time to Expiry (yrs)', 'T', 'number'],
              ['Implied Vol (e.g. 0.14)', 'vol', 'number'],
              ['RBI Rate (e.g. 0.065)', 'r', 'number'],
              ['Lot Size', 'lot', 'number'],
            ].map(([label, key, type]) => (
              <div key={key}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{label}</div>
                <input style={inputStyle} type={type} step="any" value={params[key]} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
          </div>

          {error && <div style={{ marginTop: 12 }}><ErrorBox message={error} /></div>}
          <div style={{ marginTop: 14 }}>
            <PrimaryButton onClick={analyse} loading={loading}>Analyse Strategy</PrimaryButton>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading && <Spinner />}

          {!loading && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', color: 'var(--ink-60)', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--r)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📐</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Multi-Leg Strategy Analyser</div>
              <div style={{ fontSize: 13, maxWidth: 380, lineHeight: 1.7 }}>
                Pick a strategy, set your parameters, and get the full payoff diagram at expiry with breakevens, max profit, and max loss — all in ₹ per lot.
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Iron Condor', 'Straddle', 'Strangle', 'Bull Spread'].map(s => (
                  <span key={s} style={{ padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--chakra-blue)', fontWeight: 500 }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          {!loading && result && (() => {
            const { legs, premiums, payoffData, stats, strat, S, lot } = result
            const isLimited = isFinite(stats.maxProfit) && stats.maxProfit < 1e8
            const isUnlimited = stats.maxProfit > 1e6

            return (
              <>
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <StatBox
                    label="Net Premium"
                    value={fmt.inrK(stats.netPremium)}
                    sub={stats.netPremium >= 0 ? 'collected' : 'paid'}
                    up={stats.netPremium >= 0}
                    down={stats.netPremium < 0}
                  />
                  <StatBox
                    label="Max Profit"
                    value={isUnlimited ? 'Unlimited' : fmt.inrK(stats.maxProfit)}
                    up
                  />
                  <StatBox
                    label="Max Loss"
                    value={stats.maxLoss < -1e6 ? 'Unlimited' : fmt.inrK(stats.maxLoss)}
                    down
                  />
                  <StatBox
                    label={`Breakeven${stats.breakevens.length > 1 ? 's' : ''}`}
                    value={stats.breakevens.length ? stats.breakevens.map(b => `₹${b.toLocaleString('en-IN')}`).join(' / ') : 'None'}
                  />
                </div>

                {/* Payoff chart */}
                <Card title={`${strat.label} — Payoff at Expiry (₹ per lot)`} subtitle="Theoretical P&L across spot prices">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={payoffData} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="price" tick={{ fontSize: 10 }} tickFormatter={v => '₹' + (v / 1000).toFixed(1) + 'K'} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => (v >= 0 ? '+' : '') + (v / 1000).toFixed(1) + 'K'} />
                      <Tooltip
                        formatter={v => [fmt.inr(v), 'Strategy P&L']}
                        labelFormatter={l => `Spot ₹${Number(l).toLocaleString('en-IN')}`}
                        contentStyle={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                      />
                      <ReferenceLine y={0} stroke="var(--ink-60)" strokeWidth={1.5} strokeDasharray="4 2" />
                      <ReferenceLine x={S} stroke="var(--chakra-blue)" strokeWidth={1} strokeDasharray="4 2"
                        label={{ value: 'Spot', position: 'top', fontSize: 10, fill: 'var(--chakra-blue)' }} />
                      {stats.breakevens.map(b => (
                        <ReferenceLine key={b} x={b} stroke="var(--saffron)" strokeWidth={1} strokeDasharray="3 3"
                          label={{ value: `BE ₹${b.toLocaleString('en-IN')}`, position: 'insideTopRight', fontSize: 9, fill: 'var(--saffron)' }} />
                      ))}
                      <Line type="monotone" dataKey="payoff" stroke={strat.color} dot={false} strokeWidth={2.5} name="P&L" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Leg breakdown table */}
                <Card title="Leg Breakdown" subtitle="Individual option prices computed via BSM">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface)' }}>
                        {['Leg', 'Direction', 'Type', 'Strike (₹)', 'BSM Premium (₹)', 'Cost/Lot (₹)'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontFamily: 'Inter', color: 'var(--ink-60)', fontWeight: 600, borderBottom: '2px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {legs.map((leg, i) => {
                        const premium = leg.type === 'CE' ? premiums[i].ce : premiums[i].pe
                        const costLot = (leg.dir === 'buy' ? -1 : 1) * premium * lot
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 ? 'var(--surface)' : '#fff' }}>
                            <td style={{ padding: '9px 12px', fontWeight: 600, fontFamily: 'Inter', fontSize: 12 }}>Leg {i + 1}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <Badge
                                color={leg.dir === 'buy' ? 'var(--india-green)' : 'var(--down)'}
                                bg={leg.dir === 'buy' ? 'rgba(19,136,8,0.08)' : 'rgba(192,57,43,0.08)'}
                              >
                                {leg.dir === 'buy' ? '▲ BUY' : '▼ SELL'}
                              </Badge>
                            </td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: leg.type === 'CE' ? 'var(--india-green)' : 'var(--down)' }}>{leg.type}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{fmt.inr(leg.strike, 0)}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)' }}>{fmt.inr(premium)}</td>
                            <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: costLot >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 600 }}>
                              {costLot >= 0 ? '+' : ''}{fmt.inrK(costLot)}
                            </td>
                          </tr>
                        )
                      })}
                      <tr style={{ background: 'var(--surface)', fontWeight: 700 }}>
                        <td colSpan={5} style={{ padding: '9px 12px', fontFamily: 'Inter', fontSize: 12, color: 'var(--ink-60)' }}>Net position</td>
                        <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', color: stats.netPremium >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 700 }}>
                          {stats.netPremium >= 0 ? '+' : ''}{fmt.inrK(stats.netPremium)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>

                {/* Risk profile card */}
                <Card title="Risk Profile">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 6 }}>Profit Risk</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isUnlimited ? 'var(--india-green)' : 'var(--ink)' }}>
                        {isUnlimited ? '∞ Unlimited upside' : `Capped at ${fmt.inrK(stats.maxProfit)}`}
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 6 }}>Loss Risk</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: stats.maxLoss < -1e6 ? 'var(--down)' : 'var(--ink)' }}>
                        {stats.maxLoss < -1e6 ? '∞ Unlimited downside' : `Capped at ${fmt.inrK(stats.maxLoss)}`}
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 6 }}>Breakeven(s)</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        {stats.breakevens.length === 0 ? 'Always profitable / in loss' : stats.breakevens.map(b => `₹${b.toLocaleString('en-IN')}`).join(' and ')}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(26,58,107,0.05)', borderRadius: 7, fontSize: 12, color: 'var(--chakra-blue)', lineHeight: 1.6 }}>
                    ⚠ Payoff shown is theoretical at expiry. Actual P&L during the trade depends on time value, implied volatility changes, and bid-ask spreads on NSE. SEBI SPAN + Exposure margins apply to short legs.
                  </div>
                </Card>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

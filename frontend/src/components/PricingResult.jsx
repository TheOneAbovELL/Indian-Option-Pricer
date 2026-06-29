import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { StatBox, Card, Badge } from './ui.jsx'
import { fmt } from '../utils/format.js'

function ModelCard({ title, badge, data, color }) {
  return (
    <Card title={title} subtitle={badge}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <StatBox label="CE Price / unit" value={fmt.inr(data.call_price)} up />
        <StatBox label="PE Price / unit" value={fmt.inr(data.put_price)} down />
        {data.call_price_inr != null && (
          <>
            <StatBox label={`CE per lot`} value={fmt.inrK(data.call_price_inr)} up />
            <StatBox label={`PE per lot`} value={fmt.inrK(data.put_price_inr)} down />
          </>
        )}
        {data.call_std_error != null && (
          <>
            <StatBox label="CE Std Error" value={fmt.num(data.call_std_error)} />
            <StatBox label="PE Std Error" value={fmt.num(data.put_std_error)} />
          </>
        )}
        {data.call_conf_interval_95 && (
          <div style={{ gridColumn: '1/-1' }}>
            <div style={{ fontSize: 11, color: 'var(--ink-60)', marginBottom: 4 }}>95% Confidence Interval</div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              CE: [{fmt.inr(data.call_conf_interval_95[0])} – {fmt.inr(data.call_conf_interval_95[1])}]
            </div>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', marginTop: 4 }}>
              PE: [{fmt.inr(data.put_conf_interval_95[0])} – {fmt.inr(data.put_conf_interval_95[1])}]
            </div>
          </div>
        )}
        {data.d1 != null && (
          <>
            <StatBox label="d₁" value={fmt.num(data.d1)} />
            <StatBox label="d₂" value={fmt.num(data.d2)} />
            <StatBox label="CE Intrinsic" value={fmt.inr(data.call_intrinsic)} />
            <StatBox label="PE Intrinsic" value={fmt.inr(data.put_intrinsic)} />
            <StatBox label="CE Time Value" value={fmt.inr(data.call_time_value)} />
            <StatBox label="PE Time Value" value={fmt.inr(data.put_time_value)} />
          </>
        )}
        {data.early_exercise_optimal != null && (
          <div style={{ gridColumn: '1/-1' }}>
            <Badge
              color={data.early_exercise_optimal ? '#C0392B' : 'var(--india-green)'}
              bg={data.early_exercise_optimal ? 'rgba(192,57,43,0.1)' : 'rgba(19,136,8,0.08)'}
            >
              {data.early_exercise_optimal
                ? '⚡ Early exercise may be optimal'
                : '✓ Early exercise not optimal'}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}

function PayoffChart({ result }) {
  if (!result?.bsm) return null
  const { spot_price: S, strike_price: K, bsm } = result
  const callPremium = bsm.call_price
  const putPremium  = bsm.put_price

  const points = Array.from({ length: 61 }, (_, i) => {
    const price = S * (0.7 + i * 0.01)
    const callPayoff = Math.max(price - K, 0) - callPremium
    const putPayoff  = Math.max(K - price, 0) - putPremium
    return { price: Math.round(price), callPayoff: +callPayoff.toFixed(2), putPayoff: +putPayoff.toFixed(2) }
  })

  return (
    <Card title="Payoff at Expiry (Long)" subtitle="Per unit, after premium">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="price" tick={{ fontSize: 11 }} tickFormatter={v => '₹' + (v/1000).toFixed(0) + 'K'} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => '₹' + v.toFixed(0)} />
          <Tooltip
            formatter={(v, name) => [fmt.inr(v), name === 'callPayoff' ? 'CE P&L' : 'PE P&L']}
            labelFormatter={l => `Spot: ₹${l}`}
          />
          <Legend formatter={n => n === 'callPayoff' ? 'Long CE P&L' : 'Long PE P&L'} />
          <ReferenceLine y={0} stroke="var(--ink-60)" strokeDasharray="4 2" />
          <ReferenceLine x={K} stroke="var(--chakra-blue)" strokeDasharray="4 2" label={{ value: 'Strike', position: 'top', fontSize: 10 }} />
          <Line type="monotone" dataKey="callPayoff" stroke="var(--india-green)" dot={false} strokeWidth={2} name="callPayoff" />
          <Line type="monotone" dataKey="putPayoff"  stroke="var(--down)"        dot={false} strokeWidth={2} name="putPayoff" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  )
}

function ComparisonTable({ result }) {
  if (!result?.bsm || !result?.monte_carlo || !result?.binomial) return null
  const { bsm, monte_carlo: mc, binomial: bt } = result
  return (
    <Card title="Model Comparison" subtitle="CE and PE prices across all three models">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              {['Model', 'CE (₹)', 'PE (₹)', 'CE Lot (₹)', 'PE Lot (₹)', 'Notes'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border)', fontSize: 11, fontFamily: 'Inter', color: 'var(--ink-60)', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'Inter', fontSize: 12 }}>BSM</td>
              <td style={{ padding: '10px 12px', color: 'var(--up)' }}>{fmt.inr(bsm.call_price)}</td>
              <td style={{ padding: '10px 12px', color: 'var(--down)' }}>{fmt.inr(bsm.put_price)}</td>
              <td style={{ padding: '10px 12px' }}>{fmt.inrK(bsm.call_price_inr)}</td>
              <td style={{ padding: '10px 12px' }}>{fmt.inrK(bsm.put_price_inr)}</td>
              <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'Inter', color: 'var(--ink-60)' }}>Analytical (exact)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)', background: '#FAFBFD' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'Inter', fontSize: 12 }}>Monte Carlo</td>
              <td style={{ padding: '10px 12px', color: 'var(--up)' }}>{fmt.inr(mc.call_price)}</td>
              <td style={{ padding: '10px 12px', color: 'var(--down)' }}>{fmt.inr(mc.put_price)}</td>
              <td style={{ padding: '10px 12px' }}>{fmt.inrK(mc.call_price_inr)}</td>
              <td style={{ padding: '10px 12px' }}>{fmt.inrK(mc.put_price_inr)}</td>
              <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'Inter', color: 'var(--ink-60)' }}>±{fmt.inr(mc.call_std_error)} SE · {mc.num_simulations.toLocaleString('en-IN')} sims</td>
            </tr>
            <tr>
              <td style={{ padding: '10px 12px', fontWeight: 600, fontFamily: 'Inter', fontSize: 12 }}>Binomial CRR</td>
              <td style={{ padding: '10px 12px', color: 'var(--up)' }}>{fmt.inr(bt.call_price)}</td>
              <td style={{ padding: '10px 12px', color: 'var(--down)' }}>{fmt.inr(bt.put_price)}</td>
              <td style={{ padding: '10px 12px' }}>{fmt.inrK(bt.call_price_inr)}</td>
              <td style={{ padding: '10px 12px' }}>{fmt.inrK(bt.put_price_inr)}</td>
              <td style={{ padding: '10px 12px', fontSize: 11, fontFamily: 'Inter', color: 'var(--ink-60)' }}>{bt.num_steps} steps · {result.exercise_style === 'american' ? 'American' : 'European'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function PricingResult({ result, mode }) {
  if (!result) return null

  const { bsm, monte_carlo: mc, binomial: bt, asian, underlying, exchange, lot_size } = result

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {underlying && <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--chakra-blue)' }}>{underlying}</span>}
        {exchange   && <Badge>{exchange}</Badge>}
        {lot_size   && <Badge color="var(--ink-60)" bg="var(--surface)">Lot: {lot_size}</Badge>}
        <Badge color="var(--india-green)" bg="rgba(19,136,8,0.07)">
          {mode === 'asian' ? 'Asian Option' : mode === 'american' ? 'American' : 'European'}
        </Badge>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {result.pricing_models_used?.map(m => (
            <Badge key={m} color="var(--chakra-blue)" bg="rgba(26,58,107,0.06)">{m}</Badge>
          ))}
        </div>
      </div>

      {/* BSM */}
      {bsm && (
        <ModelCard title="Black-Scholes-Merton" badge="Analytical closed-form" data={bsm} />
      )}

      {/* Model comparison table */}
      {bsm && mc && bt && <ComparisonTable result={result} />}

      {/* MC only */}
      {mc && !bsm && (
        <ModelCard title="Monte Carlo Simulation" badge={`${mc.num_simulations.toLocaleString('en-IN')} paths · antithetic variates`} data={mc} />
      )}

      {/* Binomial only */}
      {bt && !bsm && (
        <ModelCard title={`Binomial Tree (CRR) — ${result.exercise_style === 'american' ? 'American' : 'European'}`} badge={`${bt.num_steps} steps`} data={bt} />
      )}

      {/* Asian */}
      {asian && (
        <ModelCard title={asian.model} badge={`${asian.averaging_method} averaging · ${asian.num_simulations.toLocaleString('en-IN')} paths`} data={asian} />
      )}

      {/* Payoff chart */}
      <PayoffChart result={result} />

    </div>
  )
}

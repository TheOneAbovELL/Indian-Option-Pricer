import { useState } from 'react'
import { api } from '../utils/api.js'
import { fmt } from '../utils/format.js'
import { Card, StatBox, Spinner, SectionTitle, PrimaryButton, Field, inputStyle, selectStyle, ErrorBox } from '../components/ui.jsx'

const PRESETS = [
  { label: 'Nifty ATM (Weekly)', spot: 19500, strike: 19500, T: 7/365, v: 0.14, r: 0.065, q: 0, lot: 50, underlying: 'NIFTY' },
  { label: 'Bank Nifty OTM CE', spot: 44000, strike: 44500, T: 7/365, v: 0.18, r: 0.065, q: 0, lot: 15, underlying: 'BANKNIFTY' },
  { label: 'Reliance 1M ATM', spot: 2450, strike: 2450, T: 30/365, v: 0.22, r: 0.065, q: 0.005, lot: 250, underlying: 'RELIANCE' },
]

const GREEK_DOCS = {
  delta:  { name: 'Delta (Δ)', desc: 'Change in option price per ₹1 move in spot. CE: 0 to 1, PE: -1 to 0.' },
  gamma:  { name: 'Gamma (Γ)', desc: 'Rate of change of delta per ₹1 spot move. High near ATM and near expiry.' },
  theta:  { name: 'Theta (Θ)', desc: 'Time decay per calendar day. Negative for long options — you lose this daily.' },
  vega:   { name: 'Vega (V)', desc: 'P&L change per 1% move in implied volatility. Highest for ATM options.' },
  rho:    { name: 'Rho (ρ)', desc: 'P&L change per 1% move in the RBI repo rate. Minor effect short-dated.' },
  vanna:  { name: 'Vanna', desc: 'How delta changes with volatility (∂Δ/∂σ). Important for vol surface hedging.' },
  volga:  { name: 'Volga', desc: 'How vega changes with volatility — vega convexity (∂²V/∂σ²).' },
  charm:  { name: 'Charm', desc: 'Rate of delta decay over time (∂Δ/∂t). Important for overnight hedges.' },
  speed:  { name: 'Speed', desc: 'Rate of gamma change with spot (∂Γ/∂S). Third derivative of price w.r.t. spot.' },
  color:  { name: 'Color', desc: 'Rate of gamma change over time (∂Γ/∂t). Gamma carry.' },
}

function GreekRow({ label, call, put, callColor, putColor }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, color: 'var(--chakra-blue)' }}>{label}</td>
      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: callColor || 'var(--ink)' }}>{call}</td>
      <td style={{ padding: '9px 12px', fontFamily: 'var(--font-mono)', fontSize: 13, color: putColor || 'var(--ink)' }}>{put}</td>
    </tr>
  )
}

export default function GreeksPage() {
  const [form, setForm] = useState({ spot: '19500', strike: '19500', T: (30/365).toFixed(4), v: '0.14', r: '0.065', q: '0', lot: '50' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const applyPreset = (p) => setForm({
    spot: String(p.spot), strike: String(p.strike),
    T: p.T.toFixed(4), v: String(p.v), r: String(p.r),
    q: String(p.q), lot: String(p.lot),
  })

  const calculate = async () => {
    setError('')
    setLoading(true)
    try {
      const r = await api.getGreeks({
        spot_price: parseFloat(form.spot),
        strike_price: parseFloat(form.strike),
        time_to_expiry: parseFloat(form.T),
        volatility: parseFloat(form.v),
        risk_free_rate: parseFloat(form.r),
        dividend_yield: parseFloat(form.q),
        lot_size: parseInt(form.lot),
        option_type: 'CE',
        exercise_style: 'european',
        num_simulations: 10000,
      })
      setResult(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const cg = result?.call_greeks
  const pg = result?.put_greeks

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

      {/* Form */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 20, boxShadow: 'var(--shadow-sm)', position: 'sticky', top: 80 }}>
        <SectionTitle sub="BSM analytical Greeks for NSE/BSE options">Greeks Calculator</SectionTitle>

        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 11, cursor: 'pointer', color: 'var(--ink-60)', fontFamily: 'Inter, sans-serif' }}>{p.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Spot (₹)"><input style={inputStyle} type="number" value={form.spot} onChange={e => set('spot', e.target.value)} /></Field>
            <Field label="Strike (₹)"><input style={inputStyle} type="number" value={form.strike} onChange={e => set('strike', e.target.value)} /></Field>
          </div>
          <Field label="Time to Expiry (years)"><input style={inputStyle} type="number" step="0.001" value={form.T} onChange={e => set('T', e.target.value)} /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Vol (σ)"><input style={inputStyle} type="number" step="0.01" value={form.v} onChange={e => set('v', e.target.value)} /></Field>
            <Field label="RBI Rate"><input style={inputStyle} type="number" step="0.001" value={form.r} onChange={e => set('r', e.target.value)} /></Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Div. Yield"><input style={inputStyle} type="number" step="0.001" value={form.q} onChange={e => set('q', e.target.value)} /></Field>
            <Field label="Lot Size"><input style={inputStyle} type="number" value={form.lot} onChange={e => set('lot', e.target.value)} /></Field>
          </div>
          {error && <ErrorBox message={error} />}
          <PrimaryButton onClick={calculate} loading={loading}>Compute Greeks</PrimaryButton>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading && <Spinner />}

        {!loading && result && (
          <>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatBox label="CE Delta" value={fmt.num(cg.delta)} sub={`₹${fmt.num2(cg.delta_inr)} / lot`} up />
              <StatBox label="PE Delta" value={fmt.num(pg.delta)} sub={`₹${fmt.num2(Math.abs(pg.delta_inr))} / lot`} down />
              <StatBox label="Gamma" value={fmt.num(cg.gamma)} sub="shared CE & PE" />
              <StatBox label="Vega / 1%" value={fmt.inr(cg.vega)} sub={`₹${fmt.num2(cg.vega * parseInt(form.lot))} / lot`} accent />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <StatBox label="CE Theta / day" value={fmt.inr(cg.theta)} sub={`₹${fmt.num2(cg.theta_daily_inr)} / lot`} down />
              <StatBox label="PE Theta / day" value={fmt.inr(pg.theta)} sub={`₹${fmt.num2(pg.theta_daily_inr)} / lot`} down />
              <StatBox label="CE Theta / week" value={fmt.inrK(cg.theta_weekly_inr)} sub="₹ per lot" down />
              <StatBox label="PE Theta / week" value={fmt.inrK(pg.theta_weekly_inr)} sub="₹ per lot" down />
            </div>

            {/* Full Greek table */}
            <Card title="All Greeks — CE vs PE" subtitle="Analytical BSM Greeks">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)' }}>
                      {['Greek', 'Call (CE)', 'Put (PE)'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontFamily: 'Inter', color: 'var(--ink-60)', fontWeight: 600, borderBottom: '2px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <GreekRow label="Delta (Δ)"    call={fmt.num(cg.delta)}       put={fmt.num(pg.delta)}      callColor="var(--up)" putColor="var(--down)" />
                    <GreekRow label="Gamma (Γ)"    call={fmt.num(cg.gamma, 6)}    put={fmt.num(pg.gamma, 6)}   />
                    <GreekRow label="Theta (Θ) /day" call={fmt.inr(cg.theta)}    put={fmt.inr(pg.theta)}       callColor="var(--down)" putColor="var(--down)" />
                    <GreekRow label="Vega (V) /1%" call={fmt.inr(cg.vega)}        put={fmt.inr(pg.vega)}       callColor="var(--accent)" putColor="var(--accent)" />
                    <GreekRow label="Rho (ρ) /1%"  call={fmt.inr(cg.rho)}         put={fmt.inr(pg.rho)}        />
                    <tr style={{ background: 'var(--surface)' }}>
                      <td colSpan={3} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ink-60)' }}>Second-Order Greeks</td>
                    </tr>
                    <GreekRow label="Vanna"  call={fmt.num(cg.vanna, 6)}  put={fmt.num(pg.vanna, 6)}  />
                    <GreekRow label="Volga"  call={fmt.num(cg.volga, 6)}  put={fmt.num(pg.volga, 6)}  />
                    <GreekRow label="Charm"  call={fmt.num(cg.charm, 6)}  put={fmt.num(pg.charm, 6)}  />
                    <GreekRow label="Speed"  call={fmt.num(cg.speed, 8)}  put={fmt.num(pg.speed, 8)}  />
                    <GreekRow label="Color"  call={fmt.num(cg.color, 6)}  put={fmt.num(pg.color, 6)}  />
                    <tr style={{ background: 'var(--surface)' }}>
                      <td colSpan={3} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ink-60)' }}>Derived & P&L Metrics</td>
                    </tr>
                    <GreekRow label="Delta (₹ / lot)" call={fmt.inr(cg.delta_inr)} put={fmt.inr(pg.delta_inr)} />
                    <GreekRow label="Theta weekly (₹)" call={fmt.inrK(cg.theta_weekly_inr)} put={fmt.inrK(pg.theta_weekly_inr)} />
                    <GreekRow label="Breakeven ↑" call={fmt.inr(cg.breakeven_up)} put={fmt.inr(pg.breakeven_up)} />
                    <GreekRow label="Breakeven ↓" call={fmt.inr(cg.breakeven_down)} put={fmt.inr(pg.breakeven_down)} />
                    <GreekRow label="P(ITM)" call={fmt.pct(cg.probability_itm)} put={fmt.pct(pg.probability_itm)} />
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Greek definitions */}
            <Card title="Greek Definitions" subtitle="What each Greek means for your position">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {Object.entries(GREEK_DOCS).map(([k, v]) => (
                  <div key={k} style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 7, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--chakra-blue)', marginBottom: 4 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.5 }}>{v.desc}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {!loading && !result && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', color: 'var(--ink-60)', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--r)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>Δ Γ Θ V ρ</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>First & Second Order Greeks</div>
            <div style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>
              Compute full analytical Greeks for NSE/BSE options. Includes Delta, Gamma, Theta, Vega, Rho, plus Vanna, Volga, Charm, Speed, and Color — all scaled to INR (₹) per lot.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

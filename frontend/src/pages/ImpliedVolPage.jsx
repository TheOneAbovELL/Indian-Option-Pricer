import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { api } from '../utils/api.js'
import { fmt } from '../utils/format.js'
import {
  Card, StatBox, Spinner, SectionTitle,
  PrimaryButton, Field, inputStyle, selectStyle, ErrorBox, Badge
} from '../components/ui.jsx'

const SURFACE_COLORS = [
  '#FF9933', '#1A3A6B', '#138808', '#C0392B', '#8E44AD', '#2980B9'
]

export default function ImpliedVolPage() {
  // IV solver state
  const [ivForm, setIvForm] = useState({
    market_price: '368', spot: '19500', strike: '19500',
    T: (30/365).toFixed(4), r: '0.065', q: '0', type: 'CE',
  })
  const [ivResult, setIvResult] = useState(null)
  const [ivLoading, setIvLoading] = useState(false)
  const [ivError, setIvError] = useState('')

  // Vol surface state
  const [surfaceResult, setSurfaceResult] = useState(null)
  const [surfLoading, setSurfLoading] = useState(false)
  const [surfSpot, setSurfSpot] = useState('19500')
  const [surfBaseVol, setSurfBaseVol] = useState('0.14')

  const setIv = (k, v) => setIvForm(f => ({ ...f, [k]: v }))

  const solveIV = async () => {
    setIvError('')
    setIvLoading(true)
    try {
      const r = await fetch('/api/vol/implied-vol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_price:   parseFloat(ivForm.market_price),
          spot_price:     parseFloat(ivForm.spot),
          strike_price:   parseFloat(ivForm.strike),
          time_to_expiry: parseFloat(ivForm.T),
          risk_free_rate: parseFloat(ivForm.r),
          dividend_yield: parseFloat(ivForm.q),
          option_type:    ivForm.type,
        }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Error')
      setIvResult(data)
    } catch (e) {
      setIvError(e.message)
    } finally {
      setIvLoading(false)
    }
  }

  const fetchSurface = async () => {
    setSurfLoading(true)
    try {
      const spot = parseFloat(surfSpot)
      const baseVol = parseFloat(surfBaseVol)
      const strikes = Array.from({ length: 13 }, (_, i) => Math.round(spot * (0.85 + i * 0.025) / 50) * 50)
      const expiries = [7/365, 14/365, 30/365, 60/365, 90/365, 180/365]
      const r = await fetch('/api/vol/vol-surface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spot_price: spot, strike_range: strikes, expiries_years: expiries, base_vol: baseVol }),
      })
      const data = await r.json()
      setSurfaceResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      setSurfLoading(false)
    }
  }

  // Build chart data: one series per expiry, x-axis = strike
  const buildChartData = () => {
    if (!surfaceResult) return { data: [], expiries: [] }
    const expiries = surfaceResult.expiries
    const strikes  = surfaceResult.strikes
    const data = strikes.map(K => {
      const row = { strike: K }
      expiries.forEach((T, i) => {
        const pt = surfaceResult.surface.find(p => p.strike === K && Math.abs(p.expiry_years - T) < 0.001)
        row[`T${i}`] = pt ? pt.iv_pct : null
      })
      return row
    })
    const expiryLabels = expiries.map(T => {
      const days = Math.round(T * 365)
      if (days < 14) return `${days}d`
      if (days < 60) return `${Math.round(days/7)}W`
      return `${Math.round(days/30)}M`
    })
    return { data, expiryLabels }
  }

  const { data: chartData, expiryLabels } = buildChartData()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <SectionTitle sub="Back out IV from market price · visualise the vol smile">
        Implied Volatility
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* IV Solver */}
        <Card title="IV Solver" subtitle="Newton-Raphson from NSE market price">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CE', 'PE'].map(t => (
                <button key={t} onClick={() => setIv('type', t)} style={{
                  flex: 1, padding: '7px', borderRadius: 7, border: '1.5px solid',
                  borderColor: ivForm.type === t ? (t === 'CE' ? 'var(--india-green)' : 'var(--down)') : 'var(--border)',
                  background: ivForm.type === t ? (t === 'CE' ? 'rgba(19,136,8,0.07)' : 'rgba(192,57,43,0.07)') : '#fff',
                  color: ivForm.type === t ? (t === 'CE' ? 'var(--india-green)' : 'var(--down)') : 'var(--ink-60)',
                  fontWeight: ivForm.type === t ? 700 : 500, fontSize: 13, cursor: 'pointer', fontFamily: 'Inter',
                }}>{t === 'CE' ? '📈 Call (CE)' : '📉 Put (PE)'}</button>
              ))}
            </div>

            <Field label="Market Price (₹)" hint="observed NSE option price">
              <input style={inputStyle} type="number" value={ivForm.market_price} onChange={e => setIv('market_price', e.target.value)} />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Spot (₹)"><input style={inputStyle} type="number" value={ivForm.spot} onChange={e => setIv('spot', e.target.value)} /></Field>
              <Field label="Strike (₹)"><input style={inputStyle} type="number" value={ivForm.strike} onChange={e => setIv('strike', e.target.value)} /></Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Time to Expiry (yrs)"><input style={inputStyle} type="number" step="0.001" value={ivForm.T} onChange={e => setIv('T', e.target.value)} /></Field>
              <Field label="RBI Rate"><input style={inputStyle} type="number" step="0.001" value={ivForm.r} onChange={e => setIv('r', e.target.value)} /></Field>
            </div>

            {ivError && <ErrorBox message={ivError} />}
            <PrimaryButton onClick={solveIV} loading={ivLoading}>Solve for IV</PrimaryButton>

            {ivResult && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ivResult.converged ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <StatBox label="Implied Vol" value={fmt.pct(ivResult.implied_volatility)} accent />
                      <StatBox label="IV (decimal)" value={fmt.num(ivResult.implied_volatility)} />
                    </div>
                    <div style={{ padding: '8px 12px', background: 'rgba(19,136,8,0.07)', borderRadius: 7, fontSize: 12, color: 'var(--india-green)' }}>
                      ✓ {ivResult.message}
                    </div>
                  </>
                ) : (
                  <ErrorBox message={ivResult.message} />
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Vol surface builder */}
        <Card title="Volatility Smile / Surface" subtitle="Model smile across strikes & expiries (indicative)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Spot Price (₹)">
                <input style={inputStyle} type="number" value={surfSpot} onChange={e => setSurfSpot(e.target.value)} />
              </Field>
              <Field label="ATM Base Vol" hint="e.g. 0.14">
                <input style={inputStyle} type="number" step="0.01" value={surfBaseVol} onChange={e => setSurfBaseVol(e.target.value)} />
              </Field>
            </div>
            <PrimaryButton onClick={fetchSurface} loading={surfLoading}>Generate Surface</PrimaryButton>

            <div style={{ fontSize: 11, color: 'var(--ink-60)', lineHeight: 1.5 }}>
              Shows model-implied volatility smile with negative skew (typical NSE index options). Not live market data.
            </div>

            {surfLoading && <Spinner />}

            {!surfLoading && surfaceResult && chartData.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="strike" tick={{ fontSize: 10 }} tickFormatter={v => '₹' + (v/1000).toFixed(1) + 'K'} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v + '%'} domain={['auto', 'auto']} />
                    <Tooltip formatter={(v, n, p) => [`${v?.toFixed(2)}%`, expiryLabels[parseInt(n.replace('T',''))]]} labelFormatter={l => `Strike ₹${l}`} />
                    <Legend formatter={(n) => expiryLabels[parseInt(n.replace('T', ''))] || n} />
                    {surfaceResult.expiries.map((_, i) => (
                      <Line key={i} type="monotone" dataKey={`T${i}`} stroke={SURFACE_COLORS[i % SURFACE_COLORS.length]} dot={false} strokeWidth={2} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {expiryLabels?.map((l, i) => (
                    <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink-60)' }}>
                      <span style={{ width: 12, height: 3, background: SURFACE_COLORS[i % SURFACE_COLORS.length], display: 'inline-block', borderRadius: 2 }} />
                      {l}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* IV concepts */}
      <Card title="Understanding Implied Volatility in Indian Markets">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { title: 'India VIX', desc: 'NSE publishes India VIX — the fear gauge computed from Nifty option prices. A rising VIX means higher IV and costlier options.' },
            { title: 'Negative Skew', desc: 'Indian index options show negative skew: OTM puts are more expensive than equidistant OTM calls, reflecting demand for downside protection.' },
            { title: 'Term Structure', desc: 'Short-dated weekly options (Nifty, BankNifty) typically have higher IV than monthly expiries due to event risk (earnings, RBI policy, FOMC).' },
            { title: 'IV Rank', desc: 'Compare current IV to its 52-week range. High IV Rank (>50) suggests selling premium; low rank suggests buying. NSE option chain shows live IVs.' },
            { title: 'BSM Assumptions', desc: 'BSM assumes constant volatility. Real IV varies by strike (smile) and expiry (term structure). Use our surface tool to visualise this.' },
            { title: 'SEBI & Margins', desc: 'SEBI SPAN margin increases when IV rises. Higher IV → higher margin requirements. Factor this into position sizing and capital allocation.' },
          ].map(c => (
            <div key={c.title} style={{ padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--chakra-blue)', marginBottom: 6 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.6 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

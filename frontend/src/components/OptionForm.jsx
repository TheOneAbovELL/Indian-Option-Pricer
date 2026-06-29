import { useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { Field, inputStyle, selectStyle, PrimaryButton, Badge } from './ui.jsx'

const EXPIRY_OPTIONS = [
  { label: 'Weekly (1W)',        value: (7/365).toFixed(4) },
  { label: 'Bi-weekly (2W)',     value: (14/365).toFixed(4) },
  { label: 'Monthly (1M)',       value: (30/365).toFixed(4) },
  { label: 'Next month (2M)',    value: (60/365).toFixed(4) },
  { label: 'Far month (3M)',     value: (90/365).toFixed(4) },
  { label: 'Quarterly (90d)',    value: (90/365).toFixed(4) },
  { label: 'Half-year (180d)',   value: (180/365).toFixed(4) },
  { label: 'Annual (1Y)',        value: '1.0' },
  { label: 'Custom',             value: 'custom' },
]

const DEFAULT_FORM = {
  underlying: 'NIFTY',
  spot_price: '19500',
  strike_price: '19500',
  time_to_expiry: (30/365).toFixed(4),
  volatility: '0.14',
  risk_free_rate: '0.065',
  dividend_yield: '0.0',
  option_type: 'CE',
  exercise_style: 'european',
  lot_size: '50',
  num_simulations: '50000',
  option_mode: 'european',      // european | american | asian
  asian_averaging: 'arithmetic',
  asian_freq: 'daily',
  custom_expiry: '',
  expiry_preset: (30/365).toFixed(4),
}

export default function OptionForm({ onResult, onLoading }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [underlyings, setUnderlyings] = useState([])
  const [loadingPreset, setLoadingPreset] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getUnderlyings().then(setUnderlyings).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const applyUnderlying = async (sym) => {
    set('underlying', sym)
    const u = underlyings.find(x => x.underlying === sym)
    if (u) {
      set('spot_price', String(u.typical_spot))
      set('strike_price', String(u.typical_spot))
      set('lot_size', String(u.lot_size))
      set('volatility', (u.typical_iv_pct / 100).toFixed(4))
      set('exercise_style', u.is_index ? 'european' : 'american')
      set('option_mode', u.is_index ? 'european' : 'american')
    }
  }

  const handleExpiryPreset = (v) => {
    set('expiry_preset', v)
    if (v !== 'custom') set('time_to_expiry', v)
  }

  const buildPayload = () => {
    const base = {
      underlying: form.underlying,
      exchange: underlyings.find(u => u.underlying === form.underlying)?.exchange || 'NSE',
      spot_price: parseFloat(form.spot_price),
      strike_price: parseFloat(form.strike_price),
      time_to_expiry: parseFloat(form.expiry_preset === 'custom' ? form.custom_expiry : form.time_to_expiry),
      volatility: parseFloat(form.volatility),
      risk_free_rate: parseFloat(form.risk_free_rate),
      dividend_yield: parseFloat(form.dividend_yield),
      option_type: form.option_type,
      exercise_style: form.exercise_style,
      lot_size: parseInt(form.lot_size),
      num_simulations: parseInt(form.num_simulations),
    }
    if (form.option_mode === 'asian') {
      return { ...base, averaging_method: form.asian_averaging, observation_frequency: form.asian_freq }
    }
    return base
  }

  const handleSubmit = async () => {
    setError('')
    onLoading(true)
    try {
      const payload = buildPayload()
      let result
      if (form.option_mode === 'european') result = await api.priceEuropean(payload)
      else if (form.option_mode === 'american') result = await api.priceAmerican(payload)
      else result = await api.priceAsian(payload)
      onResult(result, form.option_mode)
    } catch (e) {
      setError(e.message)
      onResult(null)
    } finally {
      onLoading(false)
    }
  }

  const selectedU = underlyings.find(u => u.underlying === form.underlying)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Underlying selector */}
      <Field label="Underlying" hint="NSE/BSE symbol">
        <select
          style={selectStyle}
          value={form.underlying}
          onChange={e => applyUnderlying(e.target.value)}
        >
          <optgroup label="── Index Options ──">
            {underlyings.filter(u => u.is_index).map(u => (
              <option key={u.underlying} value={u.underlying}>
                {u.underlying} — {u.description.split('—')[0].trim()}
              </option>
            ))}
          </optgroup>
          <optgroup label="── Stock Options ──">
            {underlyings.filter(u => !u.is_index).map(u => (
              <option key={u.underlying} value={u.underlying}>
                {u.underlying} — {u.description.split('—')[0].trim()}
              </option>
            ))}
          </optgroup>
        </select>
        {selectedU && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Badge color="var(--chakra-blue)">{selectedU.exchange}</Badge>
            <Badge color="var(--ink-60)" bg="var(--surface)">Lot: {selectedU.lot_size}</Badge>
            <Badge color="var(--india-green)" bg="rgba(19,136,8,0.08)">Typical IV: {selectedU.typical_iv_pct}%</Badge>
            <Badge color={selectedU.is_index ? 'var(--chakra-blue)' : '#7B2D8B'} bg="rgba(100,100,255,0.07)">
              {selectedU.is_index ? 'European' : 'American'}
            </Badge>
          </div>
        )}
      </Field>

      {/* Option mode */}
      <Field label="Option Style">
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 'european', label: '🇮🇳 European (Index)' },
            { v: 'american', label: 'American (Stocks)' },
            { v: 'asian', label: 'Asian (Path)' },
          ].map(({ v, label }) => (
            <button
              key={v}
              onClick={() => {
                set('option_mode', v)
                set('exercise_style', v === 'american' ? 'american' : 'european')
              }}
              style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 7,
                border: '1.5px solid',
                borderColor: form.option_mode === v ? 'var(--saffron)' : 'var(--border)',
                background: form.option_mode === v ? 'var(--accent-dim)' : '#fff',
                color: form.option_mode === v ? 'var(--saffron)' : 'var(--ink-60)',
                fontWeight: form.option_mode === v ? 700 : 500,
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Price row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Spot Price" hint="₹">
          <input style={inputStyle} type="number" value={form.spot_price} onChange={e => set('spot_price', e.target.value)} />
        </Field>
        <Field label="Strike Price (₹)" hint="CE/PE">
          <input style={inputStyle} type="number" value={form.strike_price} onChange={e => set('strike_price', e.target.value)} />
        </Field>
      </div>

      {/* CE/PE toggle */}
      <Field label="Option Type">
        <div style={{ display: 'flex', gap: 8 }}>
          {[['CE', '📈 Call (CE)'], ['PE', '📉 Put (PE)']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => set('option_type', v)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 7,
                border: '1.5px solid',
                borderColor: form.option_type === v ? (v === 'CE' ? 'var(--india-green)' : 'var(--down)') : 'var(--border)',
                background: form.option_type === v ? (v === 'CE' ? 'rgba(19,136,8,0.07)' : 'rgba(192,57,43,0.07)') : '#fff',
                color: form.option_type === v ? (v === 'CE' ? 'var(--india-green)' : 'var(--down)') : 'var(--ink-60)',
                fontWeight: form.option_type === v ? 700 : 500,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      {/* Expiry */}
      <Field label="Time to Expiry" hint="(years)">
        <select style={{ ...selectStyle, marginBottom: 6 }} value={form.expiry_preset} onChange={e => handleExpiryPreset(e.target.value)}>
          {EXPIRY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {form.expiry_preset === 'custom' && (
          <input
            style={inputStyle}
            type="number"
            placeholder="e.g. 0.0822 for 30 days"
            value={form.custom_expiry}
            onChange={e => set('custom_expiry', e.target.value)}
          />
        )}
      </Field>

      {/* Vol & Rates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Implied Volatility" hint="e.g. 0.14 = 14%">
          <input style={inputStyle} type="number" step="0.01" value={form.volatility} onChange={e => set('volatility', e.target.value)} />
        </Field>
        <Field label="RBI Repo Rate" hint="e.g. 0.065">
          <input style={inputStyle} type="number" step="0.001" value={form.risk_free_rate} onChange={e => set('risk_free_rate', e.target.value)} />
        </Field>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Dividend Yield" hint="0 for index">
          <input style={inputStyle} type="number" step="0.001" value={form.dividend_yield} onChange={e => set('dividend_yield', e.target.value)} />
        </Field>
        <Field label="Lot Size" hint="NSE contract">
          <input style={inputStyle} type="number" value={form.lot_size} onChange={e => set('lot_size', e.target.value)} />
        </Field>
      </div>

      {/* Monte Carlo sims */}
      <Field label="Monte Carlo Simulations" hint="(1K–500K)">
        <select style={selectStyle} value={form.num_simulations} onChange={e => set('num_simulations', e.target.value)}>
          <option value="10000">10,000 — Fast</option>
          <option value="50000">50,000 — Standard</option>
          <option value="100000">1,00,000 — Accurate</option>
          <option value="250000">2,50,000 — High precision</option>
          <option value="500000">5,00,000 — Maximum</option>
        </select>
      </Field>

      {/* Asian options extra fields */}
      {form.option_mode === 'asian' && (
        <div style={{ background: 'var(--accent-dim)', borderRadius: 8, padding: 12, border: '1px solid #FFD9A0' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, color: 'var(--saffron)' }}>Asian Option Parameters</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Averaging Method">
              <select style={selectStyle} value={form.asian_averaging} onChange={e => set('asian_averaging', e.target.value)}>
                <option value="arithmetic">Arithmetic</option>
                <option value="geometric">Geometric</option>
              </select>
            </Field>
            <Field label="Observation Frequency">
              <select style={selectStyle} value={form.asian_freq} onChange={e => set('asian_freq', e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 7, padding: '10px 14px', color: '#C0392B', fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      <PrimaryButton onClick={handleSubmit}>Calculate Price</PrimaryButton>

      <p style={{ fontSize: 11, color: 'var(--ink-60)', lineHeight: 1.5 }}>
        ⚠ For educational and research purposes only. Not financial advice. Always verify lot sizes, margins, and expiry dates on NSE/BSE.
      </p>
    </div>
  )
}

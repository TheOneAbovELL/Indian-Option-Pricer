import { useState } from 'react'
import OptionForm from '../components/OptionForm.jsx'
import PricingResult from '../components/PricingResult.jsx'
import { Spinner, SectionTitle } from '../components/ui.jsx'

export default function PricerPage() {
  const [result, setResult] = useState(null)
  const [mode, setMode] = useState('european')
  const [loading, setLoading] = useState(false)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>

      {/* Left: Form */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: 20,
        boxShadow: 'var(--shadow-sm)',
        position: 'sticky',
        top: 80,
      }}>
        <SectionTitle
          sub="Enter parameters to price European, American, or Asian options"
        >
          Option Parameters
        </SectionTitle>
        <OptionForm
          onResult={(r, m) => { setResult(r); if (m) setMode(m) }}
          onLoading={setLoading}
        />
      </div>

      {/* Right: Results */}
      <div>
        {loading && <Spinner />}
        {!loading && !result && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '80px 32px',
            color: 'var(--ink-60)', textAlign: 'center',
            border: '2px dashed var(--border)', borderRadius: 'var(--r)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🇮🇳</div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>India Option Pricing Engine</div>
            <div style={{ fontSize: 13, maxWidth: 340, lineHeight: 1.6 }}>
              Select an underlying (Nifty, Bank Nifty, stocks), set your parameters, and calculate prices using Black-Scholes-Merton, Monte Carlo, and Binomial Tree models — all in INR (₹).
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['NSE Nifty 50', 'Bank Nifty', 'RELIANCE', 'TCS', 'HDFCBANK'].map(s => (
                <span key={s} style={{ padding: '4px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--chakra-blue)', fontWeight: 500 }}>{s}</span>
              ))}
            </div>
          </div>
        )}
        {!loading && result && <PricingResult result={result} mode={mode} />}
      </div>
    </div>
  )
}

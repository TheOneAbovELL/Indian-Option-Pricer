import { useState, useEffect } from 'react'
import { api } from '../utils/api.js'
import { Card, Badge, Spinner, SectionTitle } from '../components/ui.jsx'
import { fmt } from '../utils/format.js'

function UnderlyingCard({ u }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: 14,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--chakra-blue)' }}>{u.underlying}</span>
        <Badge>{u.exchange}</Badge>
        {u.is_index && <Badge color="var(--india-green)" bg="rgba(19,136,8,0.08)">Index</Badge>}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-60)', marginBottom: 10, lineHeight: 1.4 }}>{u.description}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          ['Typical Spot', fmt.inr(u.typical_spot, 0)],
          ['Lot Size', u.lot_size + ' units'],
          ['Tick Size', '₹' + u.tick_size],
          ['Typical IV', u.typical_iv_pct + '%'],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--surface)', padding: '6px 8px', borderRadius: 5 }}>
            <div style={{ fontSize: 10, color: 'var(--ink-60)', fontWeight: 600 }}>{k}</div>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: 1 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-60)' }}>
        📅 {u.expiry_cycle}
      </div>
    </div>
  )
}

export default function MarketDataPage() {
  const [underlyings, setUnderlyings] = useState([])
  const [rbi, setRbi] = useState(null)
  const [nse, setNse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    Promise.all([
      api.getUnderlyings(),
      api.getRBIRates(),
      api.getNSEInfo(),
    ]).then(([u, r, n]) => {
      setUnderlyings(u)
      setRbi(r)
      setNse(n)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'index'
    ? underlyings.filter(u => u.is_index)
    : filter === 'stock'
    ? underlyings.filter(u => !u.is_index)
    : underlyings

  if (loading) return <Spinner />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* RBI Rates */}
      {rbi && (
        <Card title="RBI Policy Rates" subtitle={`Source: ${rbi.source}`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 400 }}>
            {[
              ['Repo Rate', (rbi.repo_rate * 100).toFixed(2) + '%', 'Risk-free proxy for option pricing'],
              ['Reverse Repo', (rbi.reverse_repo_rate * 100).toFixed(2) + '%', 'Standing Deposit Facility rate'],
            ].map(([k, v, s]) => (
              <div key={k} style={{ background: 'var(--accent-dim)', border: '1px solid #FFD9A0', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--ink-60)', fontWeight: 600 }}>{k}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--saffron)', fontFamily: 'var(--font-mono)' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 3 }}>{s}</div>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-60)' }}>
            ⚠ Use the <strong>Repo Rate</strong> as the risk-free rate in option pricing. Always verify at{' '}
            <a href="https://rbi.org.in" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--chakra-blue)' }}>rbi.org.in</a> before trading.
          </p>
        </Card>
      )}

      {/* NSE Market Structure */}
      {nse && (
        <Card title="NSE F&O Market Structure">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 6 }}>Settlement</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 13 }}>📊 Index options: <strong>{nse.index_options_style}</strong></div>
                <div style={{ fontSize: 13 }}>📈 Stock options: <strong>{nse.stock_options_style}</strong></div>
                <div style={{ fontSize: 13 }}>💱 Currency: <strong>INR (₹)</strong></div>
                <div style={{ fontSize: 13 }}>⏰ Expiry time: <strong>{nse.expiry_time}</strong></div>
                <div style={{ fontSize: 13 }}>🕐 Trading: <strong>{nse.trading_hours}</strong></div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-60)', marginBottom: 6 }}>Circuit Breakers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(nse.circuit_breakers).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <Badge color="var(--down)" bg="rgba(192,57,43,0.1)">{k.replace('_', ' ')}</Badge>
                    <span style={{ fontSize: 12, color: 'var(--ink-60)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(26,58,107,0.05)', borderRadius: 7, fontSize: 12, color: 'var(--chakra-blue)', lineHeight: 1.5 }}>
            📋 <strong>SEBI Margin:</strong> {nse.sebi_margin_note}
          </div>
        </Card>
      )}

      {/* Underlyings */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle sub="NSE/BSE F&O contract specifications">Supported Underlyings</SectionTitle>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['all', 'All'], ['index', 'Index'], ['stock', 'Stocks']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1.5px solid',
                  borderColor: filter === v ? 'var(--saffron)' : 'var(--border)',
                  background: filter === v ? 'var(--accent-dim)' : '#fff',
                  color: filter === v ? 'var(--saffron)' : 'var(--ink-60)',
                  fontWeight: filter === v ? 700 : 500,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(u => <UnderlyingCard key={u.underlying} u={u} />)}
        </div>
      </div>

      {/* Lot size disclaimer */}
      <Card>
        <div style={{ fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.7 }}>
          <strong>⚠ Disclaimer:</strong> Lot sizes, expiry cycles, and contract specifications shown above are reference values and may change.
          NSE/BSE revise lot sizes periodically based on share price. Always verify current contract specs on{' '}
          <a href="https://www.nseindia.com/products-services/equity-derivatives-fno-contract" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--chakra-blue)' }}>NSE India</a> or{' '}
          <a href="https://www.bseindia.com/markets/Derivatives/DeriReports/deri_quote.aspx" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--chakra-blue)' }}>BSE India</a>{' '}
          before placing any trades. This tool is for educational and research purposes only and does not constitute financial advice.
        </div>
      </Card>
    </div>
  )
}

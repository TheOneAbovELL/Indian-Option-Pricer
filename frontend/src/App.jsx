import { useState } from 'react'
import Header from './components/Header.jsx'
import PricerPage from './pages/PricerPage.jsx'
import GreeksPage from './pages/GreeksPage.jsx'
import MarketDataPage from './pages/MarketDataPage.jsx'
import ImpliedVolPage from './pages/ImpliedVolPage.jsx'
import StrategyPage from './pages/StrategyPage.jsx'

const TABS = [
  { id: 'pricer',   label: 'Option Pricer' },
  { id: 'greeks',   label: 'Greeks' },
  { id: 'iv',       label: 'Implied Vol' },
  { id: 'strategy', label: 'Strategy Builder' },
  { id: 'market',   label: 'Market Data' },
]

export default function App() {
  const [tab, setTab] = useState('pricer')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <Header tab={tab} tabs={TABS} onTab={setTab} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 64px' }}>
        {tab === 'pricer'   && <PricerPage />}
        {tab === 'greeks'   && <GreeksPage />}
        {tab === 'iv'       && <ImpliedVolPage />}
        {tab === 'strategy' && <StrategyPage />}
        {tab === 'market'   && <MarketDataPage />}
      </main>
    </div>
  )
}

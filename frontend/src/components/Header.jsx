import { TrendingUp } from 'lucide-react'

const styles = {
  header: {
    background: 'var(--chakra-blue)',
    borderBottom: '3px solid var(--saffron)',
    padding: '0 16px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: 'var(--shadow-md)',
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    height: 60,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    flexShrink: 0,
  },
  brandText: {
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: '-0.3px',
  },
  brandSub: {
    color: 'var(--saffron)',
    fontSize: 11,
    fontWeight: 500,
    marginLeft: 2,
    opacity: 0.9,
  },
  nav: {
    display: 'flex',
    gap: 4,
    marginLeft: 'auto',
  },
  tab: {
    padding: '6px 14px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.15s',
  },
  badge: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  dot: {
    width: 7, height: 7,
    borderRadius: '50%',
    background: 'var(--india-green)',
    boxShadow: '0 0 6px var(--india-green)',
  },
  live: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: 500,
  },
}

export default function Header({ tab, tabs, onTab }) {
  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <a style={styles.brand}>
          <TrendingUp size={22} color="var(--saffron)" />
          <div>
            <div style={styles.brandText}>India Option Pricer</div>
            <div style={styles.brandSub}>NSE · BSE · INR</div>
          </div>
        </a>

        <nav style={styles.nav}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onTab(t.id)}
              style={{
                ...styles.tab,
                background: tab === t.id ? 'rgba(255,153,51,0.2)' : 'transparent',
                color: tab === t.id ? 'var(--saffron)' : 'rgba(255,255,255,0.75)',
                fontWeight: tab === t.id ? 600 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div style={styles.badge}>
          <div style={styles.dot} />
          <span style={styles.live}>Model-priced</span>
        </div>
      </div>
    </header>
  )
}

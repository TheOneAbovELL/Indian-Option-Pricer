export function Card({ children, style, title, subtitle }) {
  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || subtitle) && (
        <div style={{
          padding: '14px 18px 12px',
          borderBottom: '1px solid var(--border)',
          background: '#FAFBFD',
        }}>
          {title && <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{title}</div>}
          {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  )
}

export function StatBox({ label, value, sub, accent, up, down }) {
  const color = up ? 'var(--up)' : down ? 'var(--down)' : accent ? 'var(--accent)' : 'var(--ink)'
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '12px 14px',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 11, color: 'var(--ink-60)', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function Badge({ children, color = 'var(--chakra-blue)', bg = 'rgba(26,58,107,0.08)' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      color,
      background: bg,
    }}>{children}</span>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{
        width: 32, height: 32,
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--saffron)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export function ErrorBox({ message }) {
  return (
    <div style={{
      background: '#FFF5F5',
      border: '1px solid #FED7D7',
      borderRadius: 8,
      padding: '12px 16px',
      color: '#C0392B',
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      ⚠ {message}
    </div>
  )
}

export function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--ink-60)', marginLeft: 5 }}>{hint}</span>}
      </label>
      {children}
    </div>
  )
}

export const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 7,
  fontSize: 14,
  fontFamily: 'var(--font-mono)',
  color: 'var(--ink)',
  background: '#FAFBFF',
  outline: 'none',
  transition: 'border-color 0.15s',
}

export const selectStyle = {
  ...undefined,
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: 7,
  fontSize: 13,
  color: 'var(--ink)',
  background: '#FAFBFF',
  outline: 'none',
  cursor: 'pointer',
  fontFamily: 'Inter, sans-serif',
}

export function PrimaryButton({ children, onClick, loading, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: loading || disabled ? '#ccc' : 'var(--saffron)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        padding: '10px 28px',
        fontWeight: 700,
        fontSize: 14,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.2px',
        transition: 'background 0.15s',
      }}
    >
      {loading ? 'Pricing…' : children}
    </button>
  )
}

export function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--chakra-blue)', margin: 0 }}>{children}</h2>
      {sub && <p style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

const BASE = '/api'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const api = {
  priceEuropean:    (body) => post('/pricing/european', body),
  priceAmerican:    (body) => post('/pricing/american', body),
  priceAsian:       (body) => post('/pricing/asian', body),
  getGreeks:        (body) => post('/greeks/', body),
  getUnderlyings:   ()     => get('/market-data/underlyings'),
  getUnderlying:    (sym)  => get(`/market-data/underlyings/${sym}`),
  getRBIRates:      ()     => get('/market-data/rbi-rates'),
  getNSEInfo:       ()     => get('/market-data/nse-info'),
  getExpiryHelpers: ()     => get('/market-data/expiry-helpers'),
}

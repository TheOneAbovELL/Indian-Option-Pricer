export const fmt = {
  inr: (n, d = 2) =>
    '₹' + Number(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }),

  inrK: (n) => {
    const v = Number(n ?? 0)
    if (Math.abs(v) >= 1_00_000) return '₹' + (v / 1_00_000).toFixed(2) + 'L'
    if (Math.abs(v) >= 1_000) return '₹' + (v / 1_000).toFixed(2) + 'K'
    return '₹' + v.toFixed(2)
  },

  pct: (n, d = 2) => (Number(n ?? 0) * 100).toFixed(d) + '%',

  num: (n, d = 4) => Number(n ?? 0).toFixed(d),

  num2: (n) => Number(n ?? 0).toFixed(2),

  signed: (n, d = 4) => {
    const v = Number(n ?? 0)
    return (v >= 0 ? '+' : '') + v.toFixed(d)
  },
}

export function clsx(...classes) {
  return classes.filter(Boolean).join(' ')
}

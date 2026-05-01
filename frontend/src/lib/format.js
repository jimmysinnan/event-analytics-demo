export const fmt = {
  currency: (v, decimals = 0) =>
    v === null || v === undefined
      ? '—'
      : new Intl.NumberFormat('fr-FR', {
          style: 'currency', currency: 'EUR',
          maximumFractionDigits: decimals,
        }).format(v),

  number: (v, decimals = 0) =>
    v === null || v === undefined
      ? '—'
      : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: decimals }).format(v),

  pct: (v, decimals = 1) =>
    v === null || v === undefined
      ? '—'
      : `${v >= 0 ? '+' : ''}${v.toFixed(decimals)} %`,

  delta: (a, b) =>
    !a || !b || b === 0 ? null : ((a - b) / b) * 100,
}

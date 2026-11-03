const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
export const fmt = (v, d = 1) => (Number.isFinite(v) ? nf(d).format(v) : '—');
export const fmtDate = (iso, opt = { day: 'numeric', month: 'long', year: 'numeric' }) =>
  iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString('id-ID', { ...opt, timeZone: 'UTC' }) : '—';
export const fmtShort = (iso) => fmtDate(iso, { day: 'numeric', month: 'short' });

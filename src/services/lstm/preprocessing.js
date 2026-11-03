import holidaysCal from '../../models/holidays.json';

/** Praproses data mingguan → fitur 7 input (lihat docs/06 §2–§3, §6). Semua fungsi murni (tanpa DOM/TF.js). */
const DAY = 86400000;
export const MIN_WEEKS_TRAIN = 32; // sampel = n − 4 ≥ 28 → latih ≥ 16, validasi ≥ 4, uji ≥ 8

const parseISO = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const toISO = (ms) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso, n) => toISO(parseISO(iso) + n * DAY);
export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / DAY);

/** libur(t)=1 bila minggu [mulai, mulai+6] memuat tanggal merah/cuti bersama, atau ≥ ambang hari libur sekolah. */
export function deriveLibur(weekStartISO, cal = holidaysCal) {
  const start = parseISO(weekStartISO);
  const end = start + 6 * DAY;
  for (const h of cal.holidays) {
    const t = parseISO(h);
    if (t >= start && t <= end) return 1;
  }
  let days = 0;
  for (const r of cal.school_holidays) {
    const a = Math.max(start, parseISO(r.start));
    const b = Math.min(end, parseISO(r.end));
    if (b >= a) days += (b - a) / DAY + 1;
  }
  return days >= (cal.threshold_school_days ?? 4) ? 1 : 0;
}

/** Baris API → {date, td, price, libur}, terurut, tanpa baris tidak valid. */
export function normalizeRows(data = []) {
  const rows = [];
  for (const r of data) {
    const date = String(r.week_start_date ?? r.week_start ?? r.sale_date ?? r.date ?? '').slice(0, 10);
    const td = Number(r.tickets_sold ?? r.td);
    const price = Number(r.ticket_price ?? r.price);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(td) || !Number.isFinite(price)) continue;
    rows.push({ date, td, price, libur: r.libur === 0 || r.libur === 1 ? r.libur : deriveLibur(date) });
  }
  return rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

const range = (arr) => [Math.min(...arr), Math.max(...arr)];
export const norm = (v, [lo, hi]) => (v - lo) / (hi - lo || 1);
export const denorm = (v, [lo, hi]) => v * (hi - lo || 1) + lo;

/** Min/max dihitung dari baris yang dipakai latih saja (tidak pernah dari data uji). */
export function fitScaler(trainRows) {
  const td = trainRows.map((r) => r.td);
  const pr = trainRows.map((r) => r.price);
  const dl = pr.map((p, i) => (i === 0 ? 0 : p - pr[i - 1]));
  return { td: range(td), harga: range(pr), dharga: range(dl) };
}

export const toSeries = (rows) => ({ td: rows.map((r) => r.td), price: rows.map((r) => r.price), libur: rows.map((r) => r.libur) });

/** Fitur 7 input untuk indeks i. td(t−k) di luar data → 0,5 (hanya dipakai mode Replikasi Excel). */
export function featureAt(series, i, scaler) {
  const tdn = (j) => (j >= 0 ? norm(series.td[j], scaler.td) : 0.5);
  const ma3 = (j) => {
    const a = Math.max(0, j - 2);
    let s = 0;
    for (let k = a; k <= j; k++) s += series.price[k];
    return s / (j - a + 1);
  };
  const dprice = (j) => (j <= 0 ? 0 : series.price[j] - series.price[j - 1]);
  return [tdn(i - 1), tdn(i - 2), tdn(i - 3), tdn(i - 4), norm(ma3(i - 1), scaler.harga), norm(dprice(i - 1), scaler.dharga), series.libur[i]];
}

/** Sampel (x[7], y) mulai minggu ke-5 (ke-4 bila excelCompat). */
export function buildSamples(rows, scaler, { excelCompat = false } = {}) {
  const series = toSeries(rows);
  const out = [];
  for (let i = excelCompat ? 3 : 4; i < rows.length; i++) {
    out.push({ idx: i, date: rows[i].date, x: featureAt(series, i, scaler), y: norm(rows[i].td, scaler.td), yq: rows[i].td, libur: rows[i].libur });
  }
  return out;
}

/** Pembagian kronologis berbasis rasio (bukan nomor minggu tetap). N = jumlah sampel. */
export function chronologicalSplit(N, { ratioVal = 0.15, ratioTest = 0.2, minVal = 4, minTest = 8, minTrain = 16 } = {}) {
  const nTest = Math.max(minTest, Math.round(ratioTest * N));
  const nVal = Math.max(minVal, Math.round(ratioVal * N));
  const nTrain = N - nVal - nTest;
  if (nTrain < minTrain) {
    const err = new Error(`Data belum cukup untuk dilatih: butuh minimal ${MIN_WEEKS_TRAIN} minggu (sampel tersedia ${N}).`);
    err.code = 'DATA_TOO_SMALL';
    throw err;
  }
  return { nTrain, nVal, nTest };
}

/** Baris yang boleh dipakai menghitung scaler = semua baris hingga sampel latih terakhir. */
export const trainRowsFor = (rows, split) => rows.slice(0, 4 + split.nTrain);

/** Audit kualitas data (celah antar-tahun ikut terdeteksi karena memakai selisih tanggal). */
export function auditData(rows) {
  const gaps = [];
  const misaligned = [];
  const dup = [];
  for (let k = 1; k < rows.length; k++) {
    const d = daysBetween(rows[k - 1].date, rows[k].date);
    if (d === 0) dup.push(rows[k].date);
    else if (d % 7 !== 0) misaligned.push({ after: rows[k - 1].date, days: d });
    else if (d > 7) gaps.push({ after: rows[k - 1].date, missingWeeks: d / 7 - 1 });
  }
  const tds = rows.map((r) => r.td);
  const mean = tds.length ? tds.reduce((a, b) => a + b, 0) / tds.length : 0;
  const sd = tds.length ? Math.sqrt(tds.reduce((a, b) => a + (b - mean) ** 2, 0) / tds.length) : 0;
  const negatives = rows.filter((r) => r.td < 0 || r.price <= 0).length;
  const n = rows.length;
  const problems = [];
  if (gaps.length) problems.push(`${gaps.length} celah minggu`);
  if (misaligned.length) problems.push(`${misaligned.length} tanggal tidak selaras 7 hari`);
  if (dup.length) problems.push(`${dup.length} tanggal ganda`);
  if (negatives) problems.push(`${negatives} nilai tidak wajar`);
  return {
    n, first: rows[0]?.date ?? null, last: rows[n - 1]?.date ?? null, min: tds.length ? Math.min(...tds) : 0, max: tds.length ? Math.max(...tds) : 0,
    mean, sd, gaps, misaligned, duplicates: dup, negatives, problems,
    canTrain: n >= MIN_WEEKS_TRAIN && !gaps.length && !misaligned.length && !dup.length && !negatives,
    canQuickPredict: n >= 4,
  };
}

import { addDays, denorm, deriveLibur, featureAt } from './preprocessing.js';

/**
 * Peramalan rekursif 1–K minggu (docs/06 §8).
 * Lag td memakai data aktual lalu hasil prediksi; harga terakhir dibawa maju (Δ=0) untuk k ≥ 2.
 * stepFn(x, state) → { yNorm, state }.
 */
export function forecastRecursive({ rows, K, scaler, stepFn, state0 = null, trainRange = null, getLibur = deriveLibur }) {
  const series = { td: rows.map((r) => r.td), price: rows.map((r) => r.price), libur: rows.map((r) => r.libur) };
  const last = rows[rows.length - 1].date;
  let state = state0;
  const out = [];
  for (let k = 1; k <= K; k++) {
    const idx = series.td.length;
    const date = addDays(last, 7 * k);
    series.price.push(series.price[idx - 1]);
    series.libur.push(getLibur(date));
    series.td.push(0);
    const x = featureAt(series, idx, scaler);
    const r = stepFn(x, state);
    state = r.state ?? null;
    const value = denorm(r.yNorm, scaler.td);
    series.td[idx] = value;
    out.push({ date, value, libur: series.libur[idx], assumedPrice: k >= 2, outOfRange: trainRange ? value < trainRange[0] || value > trainRange[1] : false });
  }
  return out;
}

/** Persentase nilai fitur x1..x6 di luar [0,1] (indikasi scaler model sudah tidak mewakili data). */
export function outOfRangeRatio(samples) {
  let bad = 0, tot = 0;
  for (const s of samples) for (let k = 0; k < 6; k++) { tot++; if (s.x[k] < 0 || s.x[k] > 1) bad++; }
  return tot ? bad / tot : 0;
}

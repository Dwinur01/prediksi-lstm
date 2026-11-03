/** Metrik evaluasi pada nilai qty TANPA pembulatan (docs/06 §7). Mengembalikan angka, bukan string. */
export function calculateMetrics(actual, predicted) {
  const n = actual.length;
  if (!n) return { n: 0, mae: NaN, mse: NaN, rmse: NaN, mape: NaN };
  let ae = 0, se = 0, pe = 0, np = 0;
  for (let k = 0; k < n; k++) {
    const e = actual[k] - predicted[k];
    ae += Math.abs(e);
    se += e * e;
    if (actual[k] !== 0) { pe += Math.abs(e) / Math.abs(actual[k]); np++; }
  }
  const mse = se / n;
  return { n, mae: ae / n, mse, rmse: Math.sqrt(mse), mape: np ? (pe / np) * 100 : NaN };
}

export function pearson(a, b) {
  const n = a.length;
  if (n < 2) return NaN;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let k = 0; k < n; k++) { num += (a[k] - ma) * (b[k] - mb); da += (a[k] - ma) ** 2; db += (b[k] - mb) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : NaN;
}

/** Pembanding wajib: rata-rata data latih dan "minggu depan = minggu ini". */
export function baselines({ trainY, testY, testNaive }) {
  const mean = trainY.reduce((s, v) => s + v, 0) / trainY.length;
  return {
    mean: { value: mean, ...calculateMetrics(testY, testY.map(() => mean)) },
    naive: calculateMetrics(testY, testNaive),
  };
}

/** Peringatan jujur bila model tidak mengalahkan tebakan rata-rata (MAE atau RMSE uji). */
export function beatsMeanBaseline(modelTest, meanBaseline) {
  return modelTest.mae < meanBaseline.mae && modelTest.rmse < meanBaseline.rmse;
}

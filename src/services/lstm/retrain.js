import { buildSamples, chronologicalSplit, fitScaler, normalizeRows, trainRowsFor } from './preprocessing.js';
import { baselines, calculateMetrics, pearson, beatsMeanBaseline } from './metrics.js';
import { DEFAULTS, WARM_DEFAULTS, predictQty, trainVariant } from './trainer.js';
import { decide } from './champion.js';
import { outOfRangeRatio } from './forecast.js';

/**
 * Satu job pelatihan ulang (docs/06 §13.2): kandidat dari-nol + lanjutan, dievaluasi bersama model aktif
 * pada jendela uji yang SAMA, lalu gerbang MAE.
 */
export async function runRetrain({ data, activeModel = null, cfg = DEFAULTS, onProgress, shouldStop }) {
  const rows = Array.isArray(data) && data[0] && 'td' in data[0] ? data : normalizeRows(data);
  const split = chronologicalSplit(rows.length - 4); // melempar DATA_TOO_SMALL bila kurang
  const scalerA = fitScaler(trainRowsFor(rows, split));
  const skipped = [];
  const candidates = [];

  onProgress?.({ phase: 'scratch' });
  const A = await trainVariant({ variant: 'scratch', rows, split, scaler: scalerA, cfg, onEpoch: (p) => onProgress?.({ phase: 'scratch', ...p }), shouldStop });
  candidates.push(A);

  const canWarm = activeModel && activeModel.config?.variant !== 'replikasi' && activeModel.hidden === cfg.hidden;
  if (!shouldStop?.()) {
    if (!canWarm) skipped.push({ variant: 'warm', reason: activeModel ? 'arsitektur model aktif berbeda' : 'belum ada model aktif' });
    else if (outOfRangeRatio(buildSamples(rows, activeModel.scaler)) > 0.1) skipped.push({ variant: 'warm', reason: 'lebih dari 10% fitur di luar rentang skala model aktif' });
    else {
      onProgress?.({ phase: 'warm' });
      const B = await trainVariant({ variant: 'warm', rows, split, scaler: activeModel.scaler, init: activeModel, cfg: { ...cfg, ...WARM_DEFAULTS }, onEpoch: (p) => onProgress?.({ phase: 'warm', ...p }), shouldStop });
      candidates.push(B);
    }
  }

  onProgress?.({ phase: 'evaluasi' });
  const testStart = split.nTrain + split.nVal;
  const testSamples = buildSamples(rows, scalerA).slice(testStart);
  const testY = testSamples.map((s) => s.yq);
  const trainY = buildSamples(rows, scalerA).slice(0, split.nTrain).map((s) => s.yq);
  const testNaive = testSamples.map((s) => rows[s.idx - 1].td);
  const base = baselines({ trainY, testY, testNaive });

  let champion = null;
  if (activeModel) {
    const cs = buildSamples(rows, activeModel.scaler).slice(testStart);
    champion = { ...calculateMetrics(cs.map((s) => s.yq), predictQty(activeModel, cs)), variant: activeModel.config?.variant ?? 'aktif' };
  }
  const verdict = decide({ candidates: candidates.map((c) => ({ variant: c.variant, mae: c.metrics.test.mae })), champion });
  const winner = candidates.find((c) => c.variant === verdict.winner?.variant) ?? null;
  return {
    rows, split, scaler: scalerA, candidates, skipped, baselines: base, champion,
    decision: verdict.decision, reason: verdict.reason, winner,
    beatsMean: winner ? beatsMeanBaseline(winner.metrics.test, base.mean) : false,
    correlation: winner ? pearson(testY, winner.predTest) : NaN,
    window: { from: testSamples[0]?.date, to: testSamples[testSamples.length - 1]?.date, n: testSamples.length },
  };
}

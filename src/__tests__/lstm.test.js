import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tf from '@tensorflow/tfjs';
import {
  normalizeRows, deriveLibur, runReplikasi, calculateMetrics, baselines, pearson, chronologicalSplit, auditData, dataHash,
  canonicalString, decide, forecastRecursive, replikasiStepFn, staleReason,
} from '../services/lstm/index.js';
import { runRetrain } from '../services/lstm/retrain.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const dataset = JSON.parse(fs.readFileSync(path.join(dir, 'dataset_67_minggu.json'), 'utf8')).rows;
const rows = normalizeRows(dataset);
const golden = fs.readFileSync(path.join(dir, 'golden_forward_pass.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(',').map(Number));
const refHash = fs.readFileSync(path.join(dir, 'reference_data_hash.txt'), 'utf8').trim();

describe('golden test — Replikasi Excel 7 input (docs/06 §9)', () => {
  const { steps } = runReplikasi(rows);
  it('menghasilkan 64 baris', () => { expect(steps.length).toBe(64); expect(golden.length).toBe(64); });
  it('ŷ, gerbang, dan state cocok dengan Excel (≤ 5e-4)', () => {
    let maxDiff = 0;
    steps.forEach((s, k) => {
      const g = golden[k];
      const mine = [...s.x, ...s.f, ...s.i, ...s.g, ...s.c, ...s.o, ...s.h, s.yNorm, s.pred];
      mine.forEach((v, j) => { maxDiff = Math.max(maxDiff, Math.abs(v - g[j + 1])); });
    });
    expect(maxDiff).toBeLessThan(5e-4);
  });
  it('metrik gabungan sama dengan ringkasan Excel', () => {
    const m = calculateMetrics(steps.map((s) => s.yq), steps.map((s) => s.pred));
    expect(m.mae).toBeCloseTo(0.9219, 3); expect(m.rmse).toBeCloseTo(1.1156, 3); expect(m.mape).toBeCloseTo(12.5746, 2);
  });
  it('metrik uji M55–67 dan baseline (angka acuan docs/06 §7)', () => {
    const te = steps.slice(51); // M55–67
    const m = calculateMetrics(te.map((s) => s.yq), te.map((s) => s.pred));
    expect(m.mae).toBeCloseTo(0.8607, 3); expect(m.rmse).toBeCloseTo(1.0683, 3);
    const trainY = steps.slice(0, 51).map((s) => s.yq);
    const b = baselines({ trainY, testY: te.map((s) => s.yq), testNaive: te.map((s) => rows[s.idx - 1].td) });
    expect(b.mean.mae).toBeCloseTo(0.8597, 3); expect(b.naive.mae).toBeCloseTo(0.9231, 3);
  });
});

describe('kalender libur & hash data', () => {
  it('libur turunan = kolom libur dataset (67 minggu)', () => {
    dataset.forEach((r) => expect(deriveLibur(r.week_start)).toBe(r.libur));
  });
  it('hash kanonik = hash referensi; ubah 1 sel → berbeda', async () => {
    expect(await dataHash(rows)).toBe(refHash);
    const changed = rows.map((r, i) => (i === 10 ? { ...r, td: r.td + 1 } : r));
    expect(await dataHash(changed)).not.toBe(refHash);
    expect(canonicalString(rows).split('\n')[0]).toBe('2025-01-01|6|850|1');
  });
  it('alasan usang: minggu baru vs data lama diubah', () => {
    expect(staleReason(rows, rows)).toBeNull();
    expect(staleReason(rows.slice(0, 60), rows)).toBe('7 minggu baru sejak pelatihan');
    expect(staleReason(rows, rows.map((r, i) => (i === 3 ? { ...r, td: 99 } : r)))).toBe('data lama diubah');
  });
});

describe('pembagian data berbasis rasio (docs/06 §6)', () => {
  it('fixture n=67 → latih 41, validasi 9, uji 13', () => { expect(chronologicalSplit(63)).toEqual({ nTrain: 41, nVal: 9, nTest: 13 }); });
  it('minimal data 32 minggu (N=28) dan menolak lebih kecil', () => {
    expect(chronologicalSplit(28)).toEqual({ nTrain: 16, nVal: 4, nTest: 8 });
    expect(() => chronologicalSplit(27)).toThrow(/belum cukup/);
  });
  it('jendela uji tidak pernah mundur dan tak beririsan dengan latih+val model lama (N=28…400)', () => {
    let prev = null;
    for (let N = 28; N <= 400; N++) {
      const s = chronologicalSplit(N); const start = N - s.nTest;
      if (prev) { expect(start).toBeGreaterThanOrEqual(prev.start); expect(prev.s.nTrain + prev.s.nVal).toBeLessThanOrEqual(start); }
      prev = { start, s };
    }
  });
});

describe('metrik', () => {
  it('MAE/MAPE pada vektor kecil (y=[2,0,4], ŷ=[1,1,5])', () => {
    const m = calculateMetrics([2, 0, 4], [1, 1, 5]);
    expect(m.mae).toBeCloseTo(1, 10); expect(m.mape).toBeCloseTo(37.5, 6); expect(typeof m.mae).toBe('number');
  });
  it('korelasi sempurna = 1', () => { expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10); });
});

describe('audit data', () => {
  it('mendeteksi celah antar-tahun dan tanggal ganda', () => {
    const r = normalizeRows([
      { sale_date: '2025-12-24', tickets_sold: 5, ticket_price: 800 }, { sale_date: '2025-12-31', tickets_sold: 6, ticket_price: 800 },
      { sale_date: '2026-01-14', tickets_sold: 7, ticket_price: 800 }, { sale_date: '2026-01-14', tickets_sold: 7, ticket_price: 800 },
    ]);
    const a = auditData(r);
    expect(a.gaps).toEqual([{ after: '2025-12-31', missingWeeks: 1 }]); expect(a.duplicates.length).toBe(1);
    expect(a.canTrain).toBe(false);
  });
  it('dataset referensi sehat & boleh dilatih', () => { const a = auditData(rows); expect(a.problems).toEqual([]); expect(a.canTrain).toBe(true); });
});

describe('forecast', () => {
  it('langkah-1 sama dengan sel LSTM pada fitur aktual terakhir (Replikasi)', () => {
    const { finalState, scaler } = runReplikasi(rows);
    const f = forecastRecursive({ rows, K: 4, scaler, stepFn: replikasiStepFn(), state0: finalState });
    expect(f.length).toBe(4); expect(f[0].date).toBe('2026-04-15'); expect(f[1].assumedPrice).toBe(true); expect(f[0].assumedPrice).toBe(false);
    f.forEach((x) => expect(Number.isFinite(x.value)).toBe(true));
  });
});

describe('champion–challenger (docs/06 §13)', () => {
  const cand = [{ variant: 'scratch', mae: 0.9 }, { variant: 'warm', mae: 0.8 }];
  it('model pertama langsung aktif', () => { expect(decide({ candidates: cand, champion: null }).decision).toBe('tanpa_champion'); });
  it('lebih baik → diaktifkan; sama → diaktifkan; lebih buruk → ditahan', () => {
    expect(decide({ candidates: cand, champion: { mae: 0.85 } }).decision).toBe('diaktifkan');
    expect(decide({ candidates: [{ variant: 'scratch', mae: 0.85 }], champion: { mae: 0.85 } }).decision).toBe('diaktifkan');
    expect(decide({ candidates: [{ variant: 'scratch', mae: 0.95 }], champion: { mae: 0.85 } }).decision).toBe('ditahan');
  });
  it('seri antar kandidat → dari nol', () => { expect(decide({ candidates: [{ variant: 'warm', mae: 0.8 }, { variant: 'scratch', mae: 0.8 }], champion: null }).winner.variant).toBe('scratch'); });
});

describe('pelatihan (TF.js cpu) — kecil & cepat', () => {
  it('job lengkap: dua kandidat, evaluasi champion pada jendela sama, deterministik', async () => {
    await tf.setBackend('cpu'); await tf.ready();
    const cfg = { hidden: 4, lr: 0.01, l2: 0.001, epochs: 4, batchSize: 8, patience: 3, seed: 7 };
    const r1 = await runRetrain({ data: rows, activeModel: null, cfg });
    expect(r1.decision).toBe('tanpa_champion'); expect(r1.candidates.length).toBe(1); expect(r1.skipped[0].variant).toBe('warm');
    expect(r1.split).toEqual({ nTrain: 41, nVal: 9, nTest: 13 }); expect(r1.window.n).toBe(13);
    const r1b = await runRetrain({ data: rows, activeModel: null, cfg });
    expect(r1b.winner.metrics.test.mae).toBeCloseTo(r1.winner.metrics.test.mae, 6);
    const r2 = await runRetrain({ data: rows, activeModel: r1.winner.model, cfg });
    expect(r2.candidates.map((c) => c.variant)).toEqual(['scratch', 'warm']);
    expect(r2.champion.n).toBe(13); expect(['diaktifkan', 'ditahan']).toContain(r2.decision);
    expect(r2.winner.model.scaler).toBeDefined();
  });
  it('data < 32 minggu ditolak', async () => { await expect(runRetrain({ data: rows.slice(0, 30) })).rejects.toThrow(/belum cukup/); });
});

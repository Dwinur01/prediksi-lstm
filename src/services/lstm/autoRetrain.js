import { useSyncExternalStore } from 'react';
import { normalizeRows, MIN_WEEKS_TRAIN } from './preprocessing.js';
import { dataSnapshot } from './dataTrace.js';
import { runRetrain } from './retrain.js';
import { loadActive, saveActive, pushLog } from './modelStore.js';

/**
 * Pelatihan ulang otomatis langsung setelah data disimpan (keputusan pengguna; docs/06 §13.1).
 * Berjalan di peramban dengan jeda 3 dtk; job baru membatalkan job lama.
 * TODO(Antigravity): kunci satu-job-global via tabel `training_jobs` (docs/04 §2.7, docs/05 §3.3c).
 */
let state = { status: 'idle', phase: null, epoch: 0, variant: null, message: '', decision: null, reason: '', finishedAt: null };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
let timer = null;
let runId = 0;

export const getRetrainState = () => state;
export const subscribeRetrain = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const useRetrainStatus = () => useSyncExternalStore(subscribeRetrain, getRetrainState, getRetrainState);

export function requestRetrain(data, { delayMs = 3000, trigger = 'simpan' } = {}) {
  clearTimeout(timer);
  runId++; // membatalkan job yang sedang berjalan
  const rows = normalizeRows(data);
  if (rows.length < MIN_WEEKS_TRAIN) {
    set({ status: 'data_kurang', message: `Data belum cukup (${rows.length}/${MIN_WEEKS_TRAIN} minggu).`, decision: null });
    return;
  }
  set({ status: 'menunggu', message: 'Pelatihan ulang dijadwalkan…', decision: null });
  timer = setTimeout(() => execute(rows, trigger), delayMs);
}

/** Menyimpan hasil job: log keputusan + model aktif bila lolos gerbang MAE. */
export async function applyRetrainResult(res, rows, trigger = 'manual') {
  const snap = await dataSnapshot(rows);
  const entry = { model: res.winner.model, savedAt: new Date().toISOString(), snapshot: snap, series: rows, split: res.split, window: res.window, baselines: res.baselines, metrics: res.winner.metrics, beatsMean: res.beatsMean };
  pushLog({ at: entry.savedAt, trigger, decision: res.decision, reason: res.reason, variant: res.winner.variant, maeTest: res.winner.metrics.test.mae, maeChampion: res.champion?.mae ?? null, skipped: res.skipped, hash: snap.data_hash });
  if (res.decision === 'diaktifkan' || res.decision === 'tanpa_champion') saveActive(entry);
  return entry;
}

async function execute(rows, trigger) {
  const my = ++runId;
  const cancelled = () => my !== runId;
  set({ status: 'berjalan', phase: 'scratch', epoch: 0, message: 'Melatih model…' });
  try {
    const active = loadActive();
    const res = await runRetrain({
      data: rows, activeModel: active?.model ?? null, shouldStop: cancelled,
      onProgress: (p) => !cancelled() && set({ phase: p.phase ?? state.phase, epoch: p.epoch ?? state.epoch, variant: p.variant ?? state.variant }),
    });
    if (cancelled()) return;
    const entry = await applyRetrainResult(res, rows, trigger);
    set({ status: 'selesai', phase: null, decision: res.decision, reason: res.reason, message: res.reason, finishedAt: entry.savedAt, last: res });
  } catch (e) {
    if (cancelled()) return;
    set({ status: 'gagal', phase: null, message: e.code === 'DATA_TOO_SMALL' ? e.message : `Pelatihan gagal: ${e.message}` });
  }
}

export const cancelRetrain = () => { clearTimeout(timer); runId++; set({ status: 'idle', phase: null, message: '' }); };

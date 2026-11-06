import { useSyncExternalStore } from 'react';
import { normalizeRows, MIN_WEEKS_TRAIN } from './preprocessing.js';
import { dataSnapshot } from './dataTrace.js';
import { runRetrain } from './retrain.js';
import { loadActive, saveActive, pushLog } from './modelStore.js';

/**
 * Pelatihan ulang otomatis dengan koordinasi job global via tabel `training_jobs` (docs/04 §2.7, docs/05 §3.3c).
 * Berjalan di peramban dengan jeda 3 dtk; job baru membatalkan job lama.
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

/**
 * Integrasi sinkronisasi training_jobs di backend server (docs/05 §3.3c).
 */
export async function createTrainingJob(api, { trigger = 'manual', targetDataHash }) {
  if (!api || !targetDataHash) return null;
  try {
    const res = await api.post('/data/training-jobs.php', { trigger_type: trigger, target_data_hash: targetDataHash });
    return res.data?.data ?? null;
  } catch (err) {
    console.warn('Gagal membuat training job:', err);
    return null;
  }
}

export async function claimTrainingJob(api, jobId) {
  if (!api || !jobId) return false;
  try {
    const res = await api.post('/data/training-jobs.php?claim=1', { id: jobId });
    return res.data?.status === 'success';
  } catch {
    return false;
  }
}

export async function updateTrainingJobHeartbeat(api, jobId, { phase, progress } = {}) {
  if (!api || !jobId) return false;
  try {
    await api.put(`/data/training-jobs.php?id=${jobId}`, { phase, progress });
    return true;
  } catch {
    return false;
  }
}

export async function finishTrainingJob(api, jobId, { status = 'done', decision = null, historyId = null, error = null } = {}) {
  if (!api || !jobId) return false;
  try {
    await api.put(`/data/training-jobs.php?id=${jobId}`, {
      status,
      result_decision: decision,
      result_history_id: historyId,
      error_message: error,
    });
    return true;
  } catch {
    return false;
  }
}

export async function fetchPendingTrainingJobs(api) {
  if (!api) return [];
  try {
    const res = await api.get('/data/training-jobs.php?status=pending,running');
    return res.data?.data ?? [];
  } catch {
    return [];
  }
}

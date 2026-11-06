import { staleReason } from './dataTrace.js';

/**
 * Penyimpanan model aktif yang terintegrasi dengan API /data/predictions?active=1 dan tabel prediction_history (docs/04, docs/05 §3.5).
 * Nilai disinkronkan ke localStorage sebagai cache sinkron untuk render UI instan.
 */
const KEY_MODEL = 'swa.activeModel.v1';
const KEY_LOG = 'swa.retrainLog.v1';
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export const loadActive = () => read(KEY_MODEL, null);
export const saveActive = (entry) => write(KEY_MODEL, entry);
export const loadLog = () => read(KEY_LOG, []);
export function pushLog(item) {
  const log = [item, ...loadLog()].slice(0, 20);
  write(KEY_LOG, log);
  return log;
}
export const clearAll = () => { try { localStorage.removeItem(KEY_MODEL); localStorage.removeItem(KEY_LOG); } catch { /* abaikan */ } };

export function activeStatus(rows) {
  const a = loadActive();
  if (!a) return { exists: false };
  return { exists: true, entry: a, stale: staleReason(a.series, rows) };
}

/**
 * Mengambil model aktif dari server database (/data/predictions.php?active=1)
 * dan menyinkronkan cache lokal.
 */
export async function syncActiveFromDB(api) {
  if (!api) return loadActive();
  try {
    const res = await api.get('/data/predictions.php?active=1');
    if (res.data?.status === 'success' && res.data.data) {
      const row = res.data.data;
      const resJson = typeof row.results_json === 'string' ? JSON.parse(row.results_json) : (row.results_json || {});
      const entry = {
        id: row.id,
        savedAt: row.run_date,
        model: resJson.model || {
          scaler: resJson.scaler || resJson.config?.normalization,
          weights: resJson.manualCalculation || null,
          config: resJson.config || null,
        },
        snapshot: resJson.snapshot || {
          n: row.data_n,
          first_week: row.data_first_week,
          last_week: row.data_last_week,
          data_hash: row.data_hash,
        },
        series: resJson.series || [],
        split: resJson.split || null,
        window: resJson.window || row.window_size || 1,
        baselines: resJson.baselines || null,
        metrics: resJson.metrics || { test: { mae: row.mae, mse: row.mse, rmse: row.rmse, mape: row.mape } },
        beatsMean: resJson.beatsMean ?? true,
      };
      saveActive(entry);
      return entry;
    }
  } catch {
    /* Gunakan cache lokal bila offline */
  }
  return loadActive();
}

/**
 * Mengaktifkan model tertentu di database (/data/predictions.php?id=&active=1).
 */
export async function setActiveInDB(api, id) {
  if (!api || !id) return false;
  try {
    const res = await api.put(`/data/predictions.php?id=${id}&active=1`);
    if (res.data?.status === 'success') {
      await syncActiveFromDB(api);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

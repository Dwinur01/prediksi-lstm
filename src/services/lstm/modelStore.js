import { staleReason } from './dataTrace.js';

/**
 * Penyimpanan model aktif SEMENTARA di localStorage (satu peramban).
 * TODO(Antigravity): ganti dengan API `/data/predictions?active=1` + tabel `prediction_history` (docs/04, docs/05 §3.5).
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

import { buildSamples, denorm } from './preprocessing.js';
import REPL_WEIGHTS from '../../models/weights_lstm_murni_7input.json';

/** Sel LSTM murni 7 input / 4 hidden (docs/06 §4). Urutan kolom tiap baris gerbang: x1..x7, h1..h4, bias. */
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export function lstmStep(x, hPrev, cPrev, W, Wy, by) {
  const z = [...x, ...hPrev, 1];
  const dot = (row) => row.reduce((s, w, k) => s + w * z[k], 0);
  const f = W.forget.map((r) => sigmoid(dot(r)));
  const i = W.input.map((r) => sigmoid(dot(r)));
  const g = W.candidate.map((r) => Math.tanh(dot(r)));
  const o = W.output.map((r) => sigmoid(dot(r)));
  const c = cPrev.map((cp, k) => f[k] * cp + i[k] * g[k]);
  const h = c.map((ck, k) => o[k] * Math.tanh(ck));
  const yNorm = h.reduce((s, hk, k) => s + Wy[k] * hk, by);
  return { f, i, g, o, c, h, yNorm };
}

export const replikasiScaler = (w = REPL_WEIGHTS) => ({ td: w.normalization.td, harga: w.normalization.harga, dharga: w.normalization.dharga });
export const zeroState = () => ({ h: [0, 0, 0, 0], c: [0, 0, 0, 0] });

/** Mode Replikasi: bobot tetap hasil Excel; state dibawa antarbaris dari baris ke-4 data (§5). */
export function runReplikasi(rows, weights = REPL_WEIGHTS) {
  const scaler = replikasiScaler(weights);
  const samples = buildSamples(rows, scaler, { excelCompat: true });
  let state = zeroState();
  const steps = samples.map((s) => {
    const r = lstmStep(s.x, state.h, state.c, weights.gates, weights.Wy, weights.by);
    state = { h: r.h, c: r.c };
    return { ...s, ...r, yq: s.yq, pred: denorm(r.yNorm, scaler.td) };
  });
  return { steps, finalState: state, scaler };
}

export function replikasiStepFn(weights = REPL_WEIGHTS) {
  return (x, state) => {
    const st = state ?? zeroState();
    const r = lstmStep(x, st.h, st.c, weights.gates, weights.Wy, weights.by);
    return { yNorm: r.yNorm, state: { h: r.h, c: r.c } };
  };
}

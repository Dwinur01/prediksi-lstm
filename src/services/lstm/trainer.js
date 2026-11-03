import * as tf from '@tensorflow/tfjs';
import { buildSamples } from './preprocessing.js';
import { calculateMetrics } from './metrics.js';
import { denorm } from './preprocessing.js';

/** Pelatihan LSTM murni 1 lapis, 4 unit, 1 keluaran (docs/06 §6). State di-reset per sampel (1 timestep × 7 fitur; OQ-01). */
export const DEFAULTS = { hidden: 4, lr: 0.01, l2: 0.001, epochs: 200, batchSize: 8, patience: 15, seed: 42 };
export const WARM_DEFAULTS = { lr: 0.003, epochs: 50, patience: 8 };

function buildModel({ hidden, lr, l2, seed }) {
  const m = tf.sequential();
  m.add(tf.layers.lstm({
    units: hidden, inputShape: [1, 7], unitForgetBias: true,
    kernelInitializer: tf.initializers.glorotUniform({ seed }),
    recurrentInitializer: tf.initializers.orthogonal({ seed: seed + 1 }),
    kernelRegularizer: tf.regularizers.l2({ l2 }),
  }));
  m.add(tf.layers.dense({ units: 1, kernelInitializer: tf.initializers.glorotUniform({ seed: seed + 2 }) }));
  m.compile({ optimizer: tf.train.adam(lr), loss: 'meanSquaredError' });
  return m;
}

const snapshot = (model) => model.getWeights().map((w) => ({ shape: w.shape, data: Array.from(w.dataSync()) }));
function restore(model, snap) {
  const ts = snap.map((s) => tf.tensor(s.data, s.shape));
  model.setWeights(ts);
  ts.forEach((t) => t.dispose());
}

export function modelFromJSON(mj) {
  const m = buildModel({ hidden: mj.hidden, lr: 0.01, l2: 0.001, seed: 1 });
  restore(m, mj.weights);
  return m;
}

/** Prediksi qty untuk sampel yang dibangun dengan scaler MILIK model tersebut. */
export function predictQty(mj, samples) {
  if (!samples.length) return [];
  const m = modelFromJSON(mj);
  const X = tf.tensor3d(samples.map((s) => [s.x]));
  const y = m.predict(X);
  const arr = Array.from(y.dataSync());
  X.dispose(); y.dispose(); m.dispose();
  return arr.map((v) => denorm(v, mj.scaler.td));
}

export function latihStepFn(mj) {
  return (x) => {
    const m = modelFromJSON(mj);
    const t = tf.tensor3d([[x]]);
    const y = m.predict(t);
    const v = y.dataSync()[0];
    t.dispose(); y.dispose(); m.dispose();
    return { yNorm: v, state: null };
  };
}

export async function ensureBackend() {
  if (tf.getBackend() !== 'cpu') { try { await tf.setBackend('cpu'); } catch { /* pakai backend bawaan */ } }
  await tf.ready();
}

const tick = () => (typeof tf.nextFrame === 'function' ? tf.nextFrame() : Promise.resolve());

export async function trainVariant({ variant, rows, split, scaler, init = null, cfg = DEFAULTS, onEpoch, shouldStop }) {
  await ensureBackend();
  const samples = buildSamples(rows, scaler);
  const tr = samples.slice(0, split.nTrain);
  const va = samples.slice(split.nTrain, split.nTrain + split.nVal);
  const te = samples.slice(split.nTrain + split.nVal);
  const model = buildModel(cfg);
  if (init) restore(model, init.weights);
  const xt = tf.tensor3d(tr.map((s) => [s.x])), yt = tf.tensor2d(tr.map((s) => [s.y]));
  const xv = tf.tensor3d(va.map((s) => [s.x])), yv = tf.tensor2d(va.map((s) => [s.y]));
  const history = { loss: [], valLoss: [] };
  let best = Infinity, bestSnap = snapshot(model), bestEpoch = 0, wait = 0, stopped = false;
  for (let e = 1; e <= cfg.epochs; e++) {
    const h = await model.fit(xt, yt, { epochs: 1, batchSize: cfg.batchSize, shuffle: false, verbose: 0 });
    const ev = model.evaluate(xv, yv, { verbose: 0 });
    const valLoss = (await ev.data())[0];
    ev.dispose();
    const loss = h.history.loss[0];
    history.loss.push(loss); history.valLoss.push(valLoss);
    if (valLoss < best - 1e-9) { best = valLoss; bestSnap = snapshot(model); bestEpoch = e; wait = 0; } else if (++wait >= cfg.patience) { onEpoch?.({ variant, epoch: e, loss, valLoss, early: true }); break; }
    onEpoch?.({ variant, epoch: e, loss, valLoss });
    if (shouldStop?.()) { stopped = true; break; }
    await tick();
  }
  restore(model, bestSnap);
  const mj = { version: 1, hidden: cfg.hidden, weights: snapshot(model), scaler, config: { ...cfg, variant } };
  [xt, yt, xv, yv].forEach((t) => t.dispose());
  model.dispose();
  const metricsOf = (arr) => (arr.length ? calculateMetrics(arr.map((s) => s.yq), predictQty(mj, arr)) : null);
  return { variant, model: mj, history, bestEpoch, stopped, metrics: { train: metricsOf(tr), val: metricsOf(va), test: metricsOf(te) }, predTest: predictQty(mj, te), testSamples: te };
}

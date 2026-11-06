import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { apiErrorMessage } from '../../services/api';
import { useTheme, chartTheme } from '../../context/theme';
import { useTickets } from '../../hooks/useTickets';
import { fmt, fmtDate, fmtShort } from '../../utils/format';
import REFERENCE_HASH from '../../models/reference_data_hash.txt?raw';
import {
  auditData, chronologicalSplit, MIN_WEEKS_TRAIN, DEFAULTS, runRetrain, applyRetrainResult, loadActive, runReplikasi, replikasiStepFn,
  forecastRecursive, latihStepFn, calculateMetrics, baselines, pearson, beatsMeanBaseline, dataHash,
} from '../../services/lstm';

const STEPS = ['Verifikasi data', 'Konfigurasi', 'Hasil'];
const MODES = {
  latih: { title: 'Latih model', desc: 'Melatih LSTM dari data Anda: satu kandidat dari nol dan, bila ada model aktif, satu kandidat lanjutan. Model baru dipakai hanya bila kesalahan ujinya tidak lebih buruk dari model aktif.' },
  replikasi: { title: 'Replikasi perhitungan Excel', desc: 'Menjalankan bobot tetap dari Excel skripsi tanpa pelatihan. Dipakai sebagai referensi dan tidak pernah menjadi model aktif.' },
};

const Field = ({ label, children, hint }) => (
  <div><label className="input-label">{label}</label>{children}{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>
);

export default function LstmProcess() {
  const { isDark } = useTheme();
  const c = chartTheme(isDark);
  const { rows, loading, error, reload } = useTickets();
  const audit = useMemo(() => auditData(rows), [rows]);

  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [mode, setMode] = useState('latih');
  const [cfg, setCfg] = useState({ hidden: DEFAULTS.hidden, lr: DEFAULTS.lr, epochs: DEFAULTS.epochs, patience: DEFAULTS.patience, seed: DEFAULTS.seed });
  const [K, setK] = useState(4);
  const [run, setRun] = useState({ status: 'idle', progress: null, curves: {}, result: null, error: null, saved: null });
  const stopRef = useRef(false);

  const go = (n) => { setStep(n); setMaxStep((m) => Math.max(m, n)); };

  const splitInfo = useMemo(() => {
    if (rows.length < 5) return null;
    try {
      const s = chronologicalSplit(rows.length - 4);
      const at = (k) => rows[4 + k]?.date;
      return { ...s, train: [at(0), at(s.nTrain - 1)], val: [at(s.nTrain), at(s.nTrain + s.nVal - 1)], test: [at(s.nTrain + s.nVal), at(s.nTrain + s.nVal + s.nTest - 1)] };
    } catch (e) { return { error: e.message }; }
  }, [rows]);

  const canRun = mode === 'latih' ? audit.canTrain : rows.length >= 12 && audit.problems.length === 0;

  async function saveReport(result) {
    try {
      await api.post('/data/predictions.php', {
        epochs: result.epochs, learningRate: result.mode === 'latih' ? cfg.lr : 0, windowSize: 1,
        metrics: { mse: result.test.mse, rmse: result.test.rmse, mape: result.test.mape, mae: result.test.mae },
        metricsTrain: result.train ?? null, baselines: result.base, correlation: result.correlation, mode: result.mode, decision: result.decision ?? null, reason: result.reason ?? null,
        split: result.split, snapshot: result.snapshot, dates: result.series.dates, actuals: result.series.actuals, predictions: result.series.predictions, forecast: result.forecast,
      });
      setRun((r) => ({ ...r, saved: 'tersimpan' }));
      toast.success('Hasil disimpan ke laporan.', { id: 'simpan-laporan' });
    } catch (e) {
      setRun((r) => ({ ...r, saved: `gagal: ${apiErrorMessage(e, 'tidak dapat menyimpan')}` }));
    }
  }

  async function start() {
    go(3);
    stopRef.current = false;
    setRun({ status: 'berjalan', progress: null, curves: {}, result: null, error: null, saved: null });
    try {
      const snapshot = { n: rows.length, first_week: rows[0].date, last_week: rows[rows.length - 1].date, data_hash: await dataHash(rows) };
      let result;
      if (mode === 'replikasi') {
        const { steps, finalState, scaler } = runReplikasi(rows);
        const sp = chronologicalSplit(steps.length, { minTrain: 4 });
        const te = steps.slice(steps.length - sp.nTest);
        const tr = steps.slice(0, sp.nTrain);
        const yTe = te.map((s) => s.yq), pTe = te.map((s) => s.pred);
        const base = baselines({ trainY: tr.map((s) => s.yq), testY: yTe, testNaive: te.map((s) => rows[s.idx - 1].td) });
        const test = calculateMetrics(yTe, pTe);
        result = {
          mode, epochs: 0, test, train: calculateMetrics(tr.map((s) => s.yq), tr.map((s) => s.pred)), base, correlation: pearson(yTe, pTe), beatsMean: beatsMeanBaseline(test, base.mean),
          split: sp, snapshot, series: { dates: te.map((s) => s.date), actuals: yTe, predictions: pTe },
          forecast: forecastRecursive({ rows, K, scaler, stepFn: replikasiStepFn(), state0: finalState }),
          note: snapshot.data_hash === REFERENCE_HASH.trim() ? 'Data identik dengan dataset referensi skripsi; hasil dapat dibandingkan langsung dengan Excel.' : 'Data berbeda dari dataset referensi skripsi; angka tidak akan sama dengan Excel. Bobot tidak dilatih ulang pada data ini.',
        };
      } else {
        const active = loadActive();
        const res = await runRetrain({
          data: rows, activeModel: active?.model ?? null, cfg: { ...DEFAULTS, ...cfg, hidden: Number(cfg.hidden), lr: Number(cfg.lr), epochs: Number(cfg.epochs), patience: Number(cfg.patience), seed: Number(cfg.seed) },
          shouldStop: () => stopRef.current,
          onProgress: (p) => setRun((r) => {
            if (p.epoch == null) return { ...r, progress: p };
            const cur = r.curves[p.variant] ?? { loss: [], valLoss: [] };
            return { ...r, progress: p, curves: { ...r.curves, [p.variant]: { loss: [...cur.loss, p.loss], valLoss: [...cur.valLoss, p.valLoss] } } };
          }),
        });
        await applyRetrainResult(res, rows, 'manual');
        const w = res.winner;
        result = {
          mode, epochs: w.history.loss.length, test: w.metrics.test, train: w.metrics.train, base: res.baselines, correlation: res.correlation, beatsMean: res.beatsMean,
          decision: res.decision, reason: res.reason, skipped: res.skipped, variant: w.variant, split: res.split, snapshot, window: res.window, champion: res.champion,
          series: { dates: w.testSamples.map((s) => s.date), actuals: w.testSamples.map((s) => s.yq), predictions: w.predTest },
          forecast: forecastRecursive({ rows, K, scaler: w.model.scaler, stepFn: latihStepFn(w.model), trainRange: w.model.scaler.td }),
          curvesOf: w.variant,
        };
      }
      setRun((r) => ({ ...r, status: 'selesai', result }));
      saveReport(result);
    } catch (e) {
      setRun((r) => ({ ...r, status: 'gagal', error: e.code === 'DATA_TOO_SMALL' ? e.message : `Proses gagal: ${e.message}` }));
    }
  }

  const res = run.result;
  const chartData = res ? res.series.dates.map((d, i) => ({ label: fmtShort(d), date: d, aktual: res.series.actuals[i], perkiraan: res.series.predictions[i] })) : [];
  const lossData = res?.curvesOf && run.curves[res.curvesOf] ? run.curves[res.curvesOf].loss.map((l, i) => ({ epoch: i + 1, latih: l, validasi: run.curves[res.curvesOf].valLoss[i] })) : [];
  const liveLoss = Object.values(run.curves)[0];

  return (
    <div>
      <header>
        <p className="eyebrow">Prediksi</p>
        <h1 className="mt-2 text-3xl lg:text-4xl">Latih dan uji model</h1>
        <p className="mt-2 text-muted max-w-[62ch]">Setiap data baru juga memicu pelatihan otomatis. Halaman ini untuk menjalankan dan memeriksa prosesnya secara manual.</p>
      </header>

      <div className="mt-8 mb-2 flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              type="button"
              disabled={i + 1 > maxStep}
              onClick={() => setStep(i + 1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                step === i + 1
                  ? 'bg-brand text-white shadow-sm'
                  : i + 1 < step
                  ? 'bg-positive/10 text-positive border border-positive/20'
                  : 'bg-rule/50 text-muted hover:bg-rule'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                step === i + 1 ? 'bg-white/20' : i + 1 < step ? 'bg-positive/20' : 'bg-ink/10'
              }`}>
                {i + 1 < step ? '✓' : i + 1}
              </span>
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${i + 1 < step ? 'bg-positive/40' : 'bg-rule'}`} />
            )}
          </div>
        ))}
      </div>

      {loading && <p className="mt-8 text-muted">Memuat data…</p>}
      {error && <div className="mt-8 note-negative" role="alert"><p>{error}</p><button type="button" onClick={reload} className="mt-2 text-brand underline underline-offset-4">Coba lagi</button></div>}

      {!loading && !error && step === 1 && (
        <section className="mt-8">
          <h2 className="text-2xl">Verifikasi data</h2>
          {rows.length === 0 ? <p className="mt-4">Belum ada data. <Link to="/dashboard/data-input" className="text-brand underline underline-offset-4">Tambahkan data penjualan</Link>.</p> : (
            <>
              <dl className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5">
                <div><dt className="eyebrow">Jumlah minggu</dt><dd className="figure-value text-3xl">{audit.n}</dd></div>
                <div><dt className="eyebrow">Rentang</dt><dd className="mt-1 text-sm">{fmtDate(audit.first, { day: 'numeric', month: 'short', year: 'numeric' })} – {fmtDate(audit.last, { day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                <div><dt className="eyebrow">Rata-rata tiket</dt><dd className="figure-value text-3xl">{fmt(audit.mean)}</dd></div>
                <div><dt className="eyebrow">Rentang nilai</dt><dd className="figure-value text-3xl">{fmt(audit.min, 0)}–{fmt(audit.max, 0)}</dd></div>
              </dl>
              <div className="mt-6 space-y-3 max-w-[70ch]">
                {audit.problems.length === 0 ? <p className="note-positive">Tidak ada celah minggu, tanggal ganda, atau nilai tidak wajar.</p> : <p className="note-negative">Masalah pada data: {audit.problems.join(', ')}. Perbaiki di halaman Data penjualan sebelum melatih.</p>}
                {audit.n < MIN_WEEKS_TRAIN && <p className="note-caution">Pelatihan membutuhkan minimal {MIN_WEEKS_TRAIN} minggu data (tersedia {audit.n}). Replikasi Excel dapat dijalankan mulai 12 minggu.</p>}
              </div>
            </>
          )}
          <div className="mt-8 flex gap-3">
            <button type="button" className="btn-secondary" onClick={reload}>Muat ulang data</button>
            <button type="button" className="btn-primary" disabled={audit.n < 12} onClick={() => go(2)}>Lanjut ke konfigurasi</button>
          </div>
        </section>
      )}

      {!loading && !error && step === 2 && (
        <section className="mt-8">
          <h2 className="text-2xl">Konfigurasi</h2>
          <div className="mt-5 grid md:grid-cols-2 gap-4 max-w-[900px]">
            {Object.entries(MODES).map(([k, m]) => (
              <label key={k} className={`cursor-pointer rounded-md border p-4 ${mode === k ? 'border-brand bg-brand/5' : 'border-rule'}`}>
                <span className="flex items-center gap-2 font-semibold"><input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} /> {m.title}</span>
                <span className="mt-2 block text-sm text-muted">{m.desc}</span>
              </label>
            ))}
          </div>

          {mode === 'latih' ? (
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-[900px]">
              <Field label="Unit tersembunyi" hint="Bawaan 4 (skripsi)"><input className="input-field w-full" type="number" min="2" max="16" value={cfg.hidden} onChange={(e) => setCfg({ ...cfg, hidden: e.target.value })} /></Field>
              <Field label="Learning rate" hint="Bawaan 0,01"><input className="input-field w-full" type="number" step="0.001" min="0.0001" max="0.1" value={cfg.lr} onChange={(e) => setCfg({ ...cfg, lr: e.target.value })} /></Field>
              <Field label="Epoch maksimum" hint="Berhenti lebih awal bila validasi tidak membaik"><input className="input-field w-full" type="number" min="10" max="500" value={cfg.epochs} onChange={(e) => setCfg({ ...cfg, epochs: e.target.value })} /></Field>
              <Field label="Kesabaran (epoch)"><input className="input-field w-full" type="number" min="3" max="50" value={cfg.patience} onChange={(e) => setCfg({ ...cfg, patience: e.target.value })} /></Field>
            </div>
          ) : (
            <p className="mt-6 note max-w-[70ch]">Bobot tetap dari Excel: 7 masukan, 4 unit, tanpa pelatihan. State sel dibawa antarminggu, sehingga perkiraan cenderung hampir konstan — ini sengaja ditampilkan agar sesuai Excel.</p>
          )}

          <div className="mt-6 max-w-[200px]"><Field label="Minggu diperkirakan"><select className="input-field w-full" value={K} onChange={(e) => setK(Number(e.target.value))}>{[1, 2, 3, 4].map((k) => <option key={k} value={k}>{k} minggu</option>)}</select></Field></div>

          {mode === 'latih' && (
            <div className="mt-8 max-w-[760px]">
              <h3 className="text-lg">Pembagian data (urut waktu, berdasarkan rasio)</h3>
              {splitInfo?.error ? <p className="mt-3 note-caution">{splitInfo.error}</p> : splitInfo && (
                <table className="table-editorial mt-2">
                  <thead><tr><th>Bagian</th><th className="num">Minggu</th><th>Rentang</th><th>Dipakai untuk</th></tr></thead>
                  <tbody>
                    <tr><td>Latih</td><td className="num">{splitInfo.nTrain}</td><td>{fmtShort(splitInfo.train[0])} – {fmtShort(splitInfo.train[1])}</td><td>Menyesuaikan bobot</td></tr>
                    <tr><td>Validasi</td><td className="num">{splitInfo.nVal}</td><td>{fmtShort(splitInfo.val[0])} – {fmtShort(splitInfo.val[1])}</td><td>Menghentikan pelatihan tepat waktu</td></tr>
                    <tr><td>Uji</td><td className="num">{splitInfo.nTest}</td><td>{fmtShort(splitInfo.test[0])} – {fmtShort(splitInfo.test[1])}</td><td>Menilai model (tidak dipakai melatih)</td></tr>
                  </tbody>
                </table>
              )}
            </div>
          )}
          {!canRun && <p className="mt-6 note-caution max-w-[70ch]">{mode === 'latih' ? `Pelatihan membutuhkan ${MIN_WEEKS_TRAIN} minggu data tanpa masalah.` : 'Replikasi membutuhkan minimal 12 minggu data tanpa masalah.'}</p>}
          <div className="mt-8 flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>Kembali</button>
            <button type="button" className="btn-primary" disabled={!canRun || run.status === 'berjalan'} onClick={start}>{mode === 'latih' ? 'Mulai pelatihan' : 'Jalankan replikasi'}</button>
          </div>
        </section>
      )}

      {!loading && !error && step === 3 && (
        <section className="mt-8">
          <h2 className="text-2xl">Hasil</h2>

          {run.status === 'berjalan' && (
            <div className="mt-5 max-w-[760px]" role="status">
              <p>{run.progress?.phase === 'warm' ? 'Melatih kandidat lanjutan' : run.progress?.phase === 'evaluasi' ? 'Mengevaluasi kandidat' : 'Melatih kandidat dari nol'}{run.progress?.epoch ? ` · epoch ${run.progress.epoch}` : '…'}</p>
              {liveLoss && liveLoss.loss.length > 1 && (
                <div className="mt-3 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveLoss.loss.map((l, i) => ({ epoch: i + 1, latih: l, validasi: liveLoss.valLoss[i] }))}>
                      <CartesianGrid stroke={c.rule} strokeOpacity={0.6} vertical={false} />
                      <XAxis dataKey="epoch" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: c.rule }} />
                      <YAxis tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => v.toFixed(3)} />
                      <Line dataKey="latih" stroke={c.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line dataKey="validasi" stroke={c.brand} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="figure-note mt-1">Garis gelap = kesalahan latih, garis biru = validasi (nilai nyata, skala ternormalisasi).</p>
              <button type="button" className="btn-secondary mt-4" onClick={() => { stopRef.current = true; }}>Hentikan</button>
            </div>
          )}
          {run.status === 'gagal' && <p className="mt-5 note-negative" role="alert">{run.error}</p>}

          {res && (
            <div className="mt-5 space-y-8">
              <div className="space-y-3 max-w-[72ch]">
                {res.reason && <p className={res.decision === 'ditahan' ? 'note-caution' : 'note-positive'}>{res.reason}</p>}
                {res.note && <p className="note">{res.note}</p>}
                {!res.beatsMean && <p className="note-caution">Model belum melampaui tebakan rata-rata pada data uji (MAE atau RMSE). Perlakukan perkiraan sebagai pembanding, bukan satu-satunya dasar keputusan.</p>}
                {res.skipped?.map((s) => <p key={s.variant} className="note">Kandidat {s.variant === 'warm' ? 'lanjutan' : s.variant} dilewati: {s.reason}.</p>)}
                {run.saved && <p className="note">{run.saved === 'tersimpan' ? 'Hasil tersimpan di halaman Laporan.' : `Hasil belum tersimpan ke laporan (${run.saved}). `}{run.saved !== 'tersimpan' && <button type="button" className="text-brand underline underline-offset-4" onClick={() => saveReport(res)}>Coba simpan lagi</button>}</p>}
              </div>

              <div>
                <h3 className="text-xl">Model dan pembanding</h3>
                <p className="figure-note mt-1">Bagian uji: {res.series.dates.length} minggu ({fmtShort(res.series.dates[0])} – {fmtShort(res.series.dates[res.series.dates.length - 1])}). Satuan: tiket per minggu.</p>
                <div className="overflow-x-auto">
                  <table className="table-editorial mt-3 max-w-[760px]">
                    <thead><tr><th>Cara memperkirakan</th><th className="num">MAE uji</th><th className="num">RMSE uji</th><th className="num">MAPE uji (%)</th><th className="num">MAE latih</th></tr></thead>
                    <tbody>
                      <tr><td className="font-semibold">{res.mode === 'latih' ? 'Model LSTM' : 'LSTM (bobot Excel)'}</td><td className="num">{fmt(res.test.mae, 2)}</td><td className="num">{fmt(res.test.rmse, 2)}</td><td className="num">{fmt(res.test.mape, 1)}</td><td className="num">{fmt(res.train?.mae, 2)}</td></tr>
                      <tr><td>Rata-rata data latih ({fmt(res.base.mean.value)})</td><td className="num">{fmt(res.base.mean.mae, 2)}</td><td className="num">{fmt(res.base.mean.rmse, 2)}</td><td className="num">{fmt(res.base.mean.mape, 1)}</td><td className="num">—</td></tr>
                      <tr><td>Sama dengan minggu lalu</td><td className="num">{fmt(res.base.naive.mae, 2)}</td><td className="num">{fmt(res.base.naive.rmse, 2)}</td><td className="num">{fmt(res.base.naive.mape, 1)}</td><td className="num">—</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="figure-note mt-2">Korelasi perkiraan dan aktual pada data uji: {fmt(res.correlation, 2)}. MAPE tidak dijadikan ukuran utama karena angka tiket kecil membuatnya menyesatkan.</p>
              </div>

              <div>
                <h3 className="text-xl">Aktual dan perkiraan pada data uji</h3>
                <div className="mt-3 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={c.rule} strokeOpacity={0.6} vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: c.rule }} minTickGap={24} />
                      <YAxis tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
                      <Tooltip content={({ active, payload }) => active && payload?.length ? (
                        <div className="bg-surface border border-rule rounded px-3 py-2 text-sm"><p className="font-semibold">{fmtDate(payload[0].payload.date)}</p><p>Aktual: {fmt(payload[0].payload.aktual, 0)}</p><p className="text-brand">Perkiraan: {fmt(payload[0].payload.perkiraan)}</p></div>) : null} />
                      <Line dataKey="aktual" name="Aktual" stroke={c.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      <Line dataKey="perkiraan" name="Perkiraan" stroke={c.brand} strokeWidth={1.75} dot={{ r: 2.5, fill: c.brand, stroke: c.brand }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="figure-note mt-1"><span className="text-ink font-semibold">Aktual</span> (gelap) dan <span className="text-brand font-semibold">Perkiraan</span> (biru).</p>
              </div>

              {lossData.length > 1 && (
                <div>
                  <h3 className="text-xl">Kurva kesalahan pelatihan</h3>
                  <div className="mt-3 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lossData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid stroke={c.rule} strokeOpacity={0.6} vertical={false} />
                        <XAxis dataKey="epoch" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: c.rule }} />
                        <YAxis tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => v.toFixed(3)} />
                        <Line dataKey="latih" stroke={c.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        <Line dataKey="validasi" stroke={c.brand} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="figure-note mt-1">Kandidat {res.variant === 'warm' ? 'lanjutan' : 'dari nol'}: kesalahan latih (gelap) dan validasi (biru) per epoch.</p>
                </div>
              )}

              <div>
                <h3 className="text-xl">Perkiraan {res.forecast.length} minggu ke depan</h3>
                <table className="table-editorial mt-3 max-w-[520px]">
                  <thead><tr><th>Minggu mulai</th><th className="num">Perkiraan</th><th>Libur</th><th>Catatan</th></tr></thead>
                  <tbody>{res.forecast.map((f) => (
                    <tr key={f.date}><td>{fmtDate(f.date)}</td><td className="num font-semibold">{fmt(f.value)}</td><td>{f.libur ? 'Ya' : 'Tidak'}</td><td className="text-muted">{[f.assumedPrice && 'harga dianggap tetap', f.outOfRange && 'di luar rentang data latih'].filter(Boolean).join('; ') || '—'}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>Ubah konfigurasi</button>
                <Link to="/dashboard/report" className="btn-primary">Buka laporan</Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

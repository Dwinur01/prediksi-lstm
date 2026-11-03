import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTheme, chartTheme } from '../../context/theme';
import { useTickets } from '../../hooks/useTickets';
import { fmt, fmtDate, fmtShort } from '../../utils/format';
import {
  auditData, buildSamples, forecastRecursive, latihStepFn, predictQty, calculateMetrics, activeStatus, loadActive,
  requestRetrain, useRetrainStatus, MIN_WEEKS_TRAIN,
} from '../../services/lstm';

const STATUS_TEXT = { menunggu: 'Pelatihan ulang dijadwalkan…', berjalan: 'Melatih model…' };

export default function Dashboard() {
  const { isDark } = useTheme();
  const c = chartTheme(isDark);
  const { rows, loading, error, reload } = useTickets();
  const retrain = useRetrainStatus();

  const entry = useMemo(() => loadActive(), [retrain.finishedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const audit = useMemo(() => auditData(rows), [rows]);
  const status = useMemo(() => (rows.length ? activeStatus(rows) : { exists: false }), [rows, retrain.finishedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Model pertama dilatih otomatis bila belum ada dan data cukup.
  useEffect(() => {
    if (!loading && !error && rows.length >= MIN_WEEKS_TRAIN && !loadActive() && retrain.status === 'idle') {
      requestRetrain(rows, { delayMs: 800, trigger: 'pemulihan' });
    }
  }, [loading, error, rows, retrain.status]);

  const view = useMemo(() => {
    if (rows.length < 4) return null;
    const meanAll = rows.reduce((s, r) => s + r.td, 0) / rows.length;
    let forecast = [], mae = null, baselineMean = meanAll, realError = null;
    if (entry?.model) {
      const m = entry.model;
      forecast = forecastRecursive({ rows, K: 4, scaler: m.scaler, stepFn: latihStepFn(m), trainRange: m.scaler.td });
      mae = entry.metrics?.test?.mae ?? null;
      baselineMean = entry.baselines?.mean?.value ?? meanAll;
      const fresh = buildSamples(rows, m.scaler).filter((s) => s.idx >= (entry.series?.length ?? rows.length));
      if (fresh.length) realError = { ...calculateMetrics(fresh.map((s) => s.yq), predictQty(m, fresh)), n: fresh.length };
    }
    const recent = rows.slice(-26);
    const data = recent.map((r) => ({ date: r.date, label: fmtShort(r.date), aktual: r.td }));
    if (forecast.length) {
      data[data.length - 1].prediksi = data[data.length - 1].aktual;
      forecast.forEach((f) => data.push({ date: f.date, label: fmtShort(f.date), prediksi: f.value, band: mae != null ? [f.value - mae, f.value + mae] : null }));
    }
    return { data, forecast, mae, baselineMean, realError, last: rows[rows.length - 1] };
  }, [rows, entry]);

  const next = view?.forecast?.[0];
  const endLabel = (text, color, lastIdx) => ({ x, y, index }) => (index === lastIdx ? <text x={x + 8} y={y + 4} fill={color} fontSize={12} fontWeight={600}>{text}</text> : null);

  return (
    <div>
      <header>
        <p className="eyebrow">{view ? `Data hingga minggu ${fmtDate(view.last.date)}` : 'Ringkasan'}</p>
        <h1 className="mt-2 text-3xl lg:text-4xl">Ringkasan penjualan</h1>
      </header>

      {loading && <p className="mt-8 text-muted">Memuat data…</p>}
      {error && (
        <div className="mt-8 note-negative" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload} className="mt-2 text-brand underline underline-offset-4">Coba lagi</button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="mt-8">Belum ada data penjualan. <Link to="/dashboard/data-input" className="text-brand underline underline-offset-4">Tambahkan data</Link> untuk mulai.</p>
      )}

      {view && (
        <>
          <section className="mt-8 grid lg:grid-cols-[1fr_1fr] gap-8 items-end border-t border-rule pt-6">
            <div>
              <p className="eyebrow">Perkiraan minggu depan</p>
              {next ? (
                <>
                  <p className="figure-value mt-2">{fmt(next.value)} <span className="text-lg font-sans font-normal text-muted">tiket</span></p>
                  <p className="figure-note mt-2">
                    Minggu mulai {fmtDate(next.date)}
                    {view.mae != null && <> · rentang {fmt(Math.max(0, next.value - view.mae))}–{fmt(next.value + view.mae)} (± kesalahan uji)</>}
                  </p>
                </>
              ) : (
                <>
                  <p className="figure-value mt-2">{fmt(view.baselineMean)} <span className="text-lg font-sans font-normal text-muted">tiket</span></p>
                  <p className="figure-note mt-2">Perkiraan sementara: rata-rata seluruh riwayat. Belum ada model terlatih.</p>
                </>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><dt className="eyebrow">Rata-rata latih</dt><dd className="mt-0.5 text-lg font-semibold">{fmt(view.baselineMean)}</dd></div>
              <div><dt className="eyebrow">Minggu terakhir</dt><dd className="mt-0.5 text-lg font-semibold">{fmt(view.last.td, 0)}</dd></div>
              <div><dt className="eyebrow">Jumlah minggu data</dt><dd className="mt-0.5 text-lg font-semibold">{rows.length}</dd></div>
              <div><dt className="eyebrow">Libur minggu depan</dt><dd className="mt-0.5 text-lg font-semibold">{next ? (next.libur ? 'Ya' : 'Tidak') : '—'}</dd></div>
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="text-xl">Penjualan dan perkiraan</h2>
            <p className="figure-note mt-1">26 minggu terakhir dan 4 minggu ke depan. Garis putus-putus = rata-rata latih.</p>
            <div className="mt-4 h-[320px]" role="img" aria-label="Grafik penjualan mingguan dan perkiraan">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={view.data} margin={{ top: 8, right: 64, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={c.rule} strokeOpacity={0.6} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={{ stroke: c.rule }} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis tick={{ fill: c.muted, fontSize: 12 }} tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
                  <Tooltip
                    cursor={{ stroke: c.muted, strokeDasharray: '3 3' }}
                    content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-surface border border-rule rounded px-3 py-2 text-sm">
                        <p className="font-semibold">{fmtDate(payload[0].payload.date)}</p>
                        {payload[0].payload.aktual != null && <p>Aktual: {fmt(payload[0].payload.aktual, 0)}</p>}
                        {payload[0].payload.prediksi != null && payload[0].payload.band && <p className="text-brand">Perkiraan: {fmt(payload[0].payload.prediksi)}</p>}
                      </div>
                    ) : null}
                  />
                  <ReferenceLine y={view.baselineMean} stroke={c.muted} strokeDasharray="5 4" />
                  <Area dataKey="band" stroke="none" fill={c.brand} fillOpacity={0.12} isAnimationActive={false} connectNulls />
                  <Line dataKey="aktual" stroke={c.ink} strokeWidth={1.5} dot={false} isAnimationActive={false} label={endLabel('Aktual', c.ink, 25)} />
                  <Line dataKey="prediksi" stroke={c.brand} strokeWidth={1.75} strokeDasharray={view.forecast.length ? undefined : '0'} dot={{ r: 3, fill: c.brand, stroke: c.brand }} isAnimationActive={false} connectNulls label={endLabel('Perkiraan', c.brand, view.data.length - 1)} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="mt-10 grid lg:grid-cols-2 gap-10">
            <section>
              <h2 className="text-xl">Evaluasi model</h2>
              {entry?.metrics?.test ? (
                <>
                  <p className="figure-note mt-1">Diuji pada {entry.window?.n} minggu terbaru yang tidak dipakai melatih ({fmtShort(entry.window?.from)}–{fmtShort(entry.window?.to)}).</p>
                  <table className="table-editorial mt-3">
                    <thead><tr><th>Cara memperkirakan</th><th className="num">MAE</th><th className="num">RMSE</th></tr></thead>
                    <tbody>
                      <tr><td className="font-semibold">Model LSTM</td><td className="num">{fmt(entry.metrics.test.mae, 2)}</td><td className="num">{fmt(entry.metrics.test.rmse, 2)}</td></tr>
                      <tr><td>Rata-rata data latih</td><td className="num">{fmt(entry.baselines.mean.mae, 2)}</td><td className="num">{fmt(entry.baselines.mean.rmse, 2)}</td></tr>
                      <tr><td>Sama dengan minggu lalu</td><td className="num">{fmt(entry.baselines.naive.mae, 2)}</td><td className="num">{fmt(entry.baselines.naive.rmse, 2)}</td></tr>
                    </tbody>
                  </table>
                  <p className="figure-note mt-2">Satuan: tiket per minggu. Semakin kecil semakin baik.</p>
                </>
              ) : <p className="mt-3 text-muted">Belum ada model terlatih. {rows.length < MIN_WEEKS_TRAIN && `Model dilatih setelah data mencapai ${MIN_WEEKS_TRAIN} minggu.`}</p>}
            </section>

            <section>
              <h2 className="text-xl">Catatan</h2>
              <div className="mt-3 space-y-3">
                {STATUS_TEXT[retrain.status] && <p className="note-brand">{STATUS_TEXT[retrain.status]}{retrain.status === 'berjalan' && retrain.epoch ? ` (${retrain.variant === 'warm' ? 'lanjutan' : 'dari nol'}, epoch ${retrain.epoch})` : ''}</p>}
                {retrain.status === 'selesai' && retrain.reason && <p className={retrain.decision === 'ditahan' ? 'note-caution' : 'note-positive'}>{retrain.reason}</p>}
                {retrain.status === 'gagal' && <p className="note-negative">{retrain.message}</p>}
                {retrain.status === 'data_kurang' && <p className="note-caution">{retrain.message}</p>}
                {status.exists && status.stale && <p className="note-caution">Model dilatih pada data hingga {fmtDate(entry.snapshot.last_week)}: {status.stale}.</p>}
                {entry && entry.beatsMean === false && <p className="note-caution">Model belum melampaui tebakan rata-rata pada data uji. Gunakan perkiraan ini sebagai pembanding, bukan satu-satunya dasar keputusan.</p>}
                {view.realError && <p className="note">Galat nyata: MAE {fmt(view.realError.mae, 2)} pada {view.realError.n} minggu baru yang belum pernah dilihat model.</p>}
                {next && <p className="note">Perkiraan lebih dari satu minggu mengandaikan harga tiket tetap seperti minggu terakhir.</p>}
                {audit.problems.length > 0 && <p className="note-caution">Masalah pada data: {audit.problems.join(', ')}. <Link to="/dashboard/data-input" className="text-brand underline underline-offset-4">Periksa data</Link></p>}
                <button type="button" className="btn-secondary" disabled={rows.length < MIN_WEEKS_TRAIN || retrain.status === 'berjalan'} onClick={() => requestRetrain(rows, { delayMs: 0, trigger: 'manual' })}>Latih ulang sekarang</button>
              </div>
            </section>
          </div>

          <section className="mt-10">
            <div className="flex items-baseline justify-between"><h2 className="text-xl">Data terbaru</h2><Link to="/dashboard/data-input" className="text-brand underline underline-offset-4 text-sm">Kelola data</Link></div>
            <div className="overflow-x-auto">
              <table className="table-editorial mt-3">
                <thead><tr><th>Minggu mulai</th><th className="num">Tiket</th><th className="num">Harga (ribu Rp)</th><th>Libur</th></tr></thead>
                <tbody>
                  {[...rows].slice(-6).reverse().map((r) => (
                    <tr key={r.date}><td>{fmtDate(r.date)}</td><td className="num">{fmt(r.td, 0)}</td><td className="num">{fmt(r.price, 0)}</td><td>{r.libur ? 'Ya' : 'Tidak'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

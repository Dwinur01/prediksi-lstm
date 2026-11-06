import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Database, CalendarDays, AlertTriangle, RefreshCw } from 'lucide-react';
import { SkeletonStatCard, SkeletonChart } from '../../components/common/Skeleton';
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
  const endLabel = (text, color, lastIdx) => ({ x, y, index }) =>
    index === lastIdx ? <text x={x + 8} y={y + 4} fill={color} fontSize={11} fontWeight={600}>{text}</text> : null;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <header>
        <p className="eyebrow">{view ? `Data hingga minggu ${fmtDate(view.last.date)}` : 'Ringkasan'}</p>
        <h1 className="mt-2 text-3xl lg:text-4xl">Ringkasan penjualan</h1>
      </header>

      {/* ── Status / Loading ── */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
          </div>
          <SkeletonChart />
        </div>
      )}
      {error && (
        <div className="note-negative" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload} className="mt-2 text-brand underline underline-offset-4 text-sm">
            Coba lagi
          </button>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="note-brand">
          <p>Belum ada data penjualan.</p>
          <Link to="/dashboard/data-input" className="mt-1 inline-block text-brand font-semibold underline underline-offset-4 text-sm">
            Tambahkan data pertama →
          </Link>
        </div>
      )}

      {view && (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Perkiraan minggu depan */}
            <div className="stat-card col-span-2 lg:col-span-1">
              <div className="flex items-start justify-between">
                <span className="stat-card-label">Perkiraan minggu depan</span>
                <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <TrendingUp size={14} className="text-brand" />
                </div>
              </div>
              {next ? (
                <>
                  <p className="stat-card-value">{fmt(next.value)}</p>
                  <p className="text-xs text-muted">
                    tiket · {fmtDate(next.date)}
                    {view.mae != null && <span className="block mt-0.5">± {fmt(view.mae, 0)} (rentang uji)</span>}
                  </p>
                </>
              ) : (
                <>
                  <p className="stat-card-value">{fmt(view.baselineMean)}</p>
                  <p className="text-xs text-muted">tiket · rata-rata sementara</p>
                </>
              )}
            </div>

            {/* Rata-rata */}
            <div className="stat-card">
              <span className="stat-card-label">Rata-rata latih</span>
              <p className="stat-card-value">{fmt(view.baselineMean)}</p>
              <p className="text-xs text-muted">tiket/minggu</p>
            </div>

            {/* Penjualan terakhir */}
            <div className="stat-card">
              <span className="stat-card-label">Penjualan terakhir</span>
              <p className="stat-card-value">{fmt(view.last.td, 0)}</p>
              <p className="text-xs text-muted">tiket</p>
            </div>

            {/* Total data */}
            <div className="stat-card">
              <div className="flex items-start justify-between">
                <span className="stat-card-label">Total data</span>
                <div className="w-8 h-8 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
                  <Database size={13} className="text-muted" />
                </div>
              </div>
              <p className="stat-card-value">{rows.length}</p>
              <p className="text-xs text-muted">minggu</p>
            </div>
          </div>

          {/* ── Notifikasi retrain ── */}
          {(STATUS_TEXT[retrain.status] || (retrain.status === 'selesai' && retrain.reason)) && (
            <div className={retrain.status === 'selesai' && retrain.decision === 'ditahan' ? 'note-caution' : retrain.status === 'selesai' ? 'note-positive' : 'note-brand'}>
              {STATUS_TEXT[retrain.status] && (
                <span>
                  {STATUS_TEXT[retrain.status]}
                  {retrain.status === 'berjalan' && retrain.epoch ? ` (${retrain.variant === 'warm' ? 'lanjutan' : 'dari nol'}, epoch ${retrain.epoch})` : ''}
                </span>
              )}
              {retrain.status === 'selesai' && retrain.reason && <span>{retrain.reason}</span>}
            </div>
          )}
          {retrain.status === 'gagal' && <p className="note-negative">{retrain.message}</p>}
          {retrain.status === 'data_kurang' && <p className="note-caution">{retrain.message}</p>}
          {status.exists && status.stale && (
            <p className="note-caution">Model dilatih pada data hingga {fmtDate(entry.snapshot.last_week)}: {status.stale}.</p>
          )}

          {/* ── Chart ── */}
          <section className="bg-surface border border-rule rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Penjualan dan perkiraan</h2>
                <p className="figure-note text-xs mt-0.5">26 minggu terakhir dan 4 minggu ke depan · garis putus-putus = rata-rata latih</p>
              </div>
            </div>
            <div className="h-[300px]" role="img" aria-label="Grafik penjualan mingguan dan perkiraan">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={view.data} margin={{ top: 8, right: 60, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={c.rule} strokeOpacity={0.5} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={{ stroke: c.rule }} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis tick={{ fill: c.muted, fontSize: 11 }} tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
                  <Tooltip
                    cursor={{ stroke: c.muted, strokeDasharray: '3 3', strokeWidth: 1 }}
                    content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-surface border border-rule rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
                        <p className="font-semibold mb-1">{fmtDate(payload[0].payload.date)}</p>
                        {payload[0].payload.aktual != null && <p className="text-muted">Aktual: <span className="text-ink font-medium">{fmt(payload[0].payload.aktual, 0)}</span></p>}
                        {payload[0].payload.prediksi != null && payload[0].payload.band && <p className="text-brand">Perkiraan: <span className="font-medium">{fmt(payload[0].payload.prediksi)}</span></p>}
                      </div>
                    ) : null}
                  />
                  <ReferenceLine y={view.baselineMean} stroke={c.muted} strokeDasharray="5 4" strokeOpacity={0.6} />
                  <Area dataKey="band" stroke="none" fill={c.brand} fillOpacity={0.1} isAnimationActive={false} connectNulls />
                  <Line dataKey="aktual" stroke={c.ink} strokeWidth={2} dot={false} isAnimationActive={false} label={endLabel('Aktual', c.ink, 25)} />
                  <Line dataKey="prediksi" stroke={c.brand} strokeWidth={2} strokeDasharray={view.forecast.length ? undefined : '0'} dot={{ r: 3.5, fill: c.brand, stroke: 'white', strokeWidth: 1.5 }} isAnimationActive={false} connectNulls label={endLabel('Perkiraan', c.brand, view.data.length - 1)} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ── Bottom grid: Evaluasi + Catatan ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Evaluasi model */}
            <section className="bg-surface border border-rule rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)' }}>
              <h2 className="text-lg font-semibold text-ink mb-1">Evaluasi model</h2>
              {entry?.metrics?.test ? (
                <>
                  <p className="figure-note text-xs mb-4">
                    Diuji pada {entry.window?.n} minggu terbaru ({fmtShort(entry.window?.from)}–{fmtShort(entry.window?.to)})
                  </p>
                  <table className="table-editorial">
                    <thead>
                      <tr>
                        <th>Cara memperkirakan</th>
                        <th className="num">MAE</th>
                        <th className="num">RMSE</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="font-semibold text-brand">Model LSTM</td>
                        <td className="num">{fmt(entry.metrics.test.mae, 2)}</td>
                        <td className="num">{fmt(entry.metrics.test.rmse, 2)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Rata-rata data latih</td>
                        <td className="num">{fmt(entry.baselines.mean.mae, 2)}</td>
                        <td className="num">{fmt(entry.baselines.mean.rmse, 2)}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Sama dengan minggu lalu</td>
                        <td className="num">{fmt(entry.baselines.naive.mae, 2)}</td>
                        <td className="num">{fmt(entry.baselines.naive.rmse, 2)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="figure-note text-xs mt-2">Satuan: tiket per minggu. Semakin kecil semakin baik.</p>
                </>
              ) : (
                <p className="mt-3 text-muted text-sm">
                  Belum ada model terlatih.{' '}
                  {rows.length < MIN_WEEKS_TRAIN && `Model dilatih setelah data mencapai ${MIN_WEEKS_TRAIN} minggu.`}
                </p>
              )}
            </section>

            {/* Catatan & aksi */}
            <section className="bg-surface border border-rule rounded-2xl p-6 flex flex-col" style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)' }}>
              <h2 className="text-lg font-semibold text-ink mb-3">Catatan</h2>
              <div className="flex-1 space-y-2.5 text-sm">
                {entry && entry.beatsMean === false && (
                  <div className="note-caution">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={13} className="text-caution mt-0.5 shrink-0" />
                      <p>Model belum melampaui tebakan rata-rata pada data uji. Gunakan perkiraan ini sebagai pembanding, bukan satu-satunya dasar keputusan.</p>
                    </div>
                  </div>
                )}
                {view.realError && (
                  <p className="note">
                    Galat nyata: MAE {fmt(view.realError.mae, 2)} pada {view.realError.n} minggu baru.
                  </p>
                )}
                {next && (
                  <p className="note">
                    Perkiraan lebih dari satu minggu mengandaikan harga tiket tetap seperti minggu terakhir.
                  </p>
                )}
                {audit.problems.length > 0 && (
                  <div className="note-caution">
                    Masalah pada data: {audit.problems.join(', ')}.{' '}
                    <Link to="/dashboard/data-input" className="text-brand underline underline-offset-4">Periksa data</Link>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-secondary mt-4 w-full"
                disabled={rows.length < MIN_WEEKS_TRAIN || retrain.status === 'berjalan'}
                onClick={() => requestRetrain(rows, { delayMs: 0, trigger: 'manual' })}
              >
                {retrain.status === 'berjalan' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-rule border-t-brand rounded-full animate-spin" />
                    Melatih…
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Latih ulang sekarang
                  </>
                )}
              </button>
            </section>
          </div>

          {/* ── Data terbaru ── */}
          <section className="bg-surface border border-rule rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-muted" />
                <h2 className="text-lg font-semibold text-ink">Data terbaru</h2>
              </div>
              <Link to="/dashboard/data-input" className="text-brand text-sm font-medium hover:underline underline-offset-4">
                Kelola data →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table-editorial">
                <thead>
                  <tr>
                    <th>Minggu mulai</th>
                    <th className="num">Tiket</th>
                    <th className="num">Harga (ribu Rp)</th>
                    <th>Libur</th>
                  </tr>
                </thead>
                <tbody>
                  {[...rows].slice(-6).reverse().map((r) => (
                    <tr key={r.date}>
                      <td className="font-medium">{fmtDate(r.date)}</td>
                      <td className="num font-semibold text-ink">{fmt(r.td, 0)}</td>
                      <td className="num">{fmt(r.price, 0)}</td>
                      <td>
                        {r.libur
                          ? <span className="badge badge-warning">Ya</span>
                          : <span className="text-muted text-xs">Tidak</span>
                        }
                      </td>
                    </tr>
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

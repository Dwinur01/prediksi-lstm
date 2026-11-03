import { useState, useEffect } from 'react';
import Portal from '../../components/ui/Portal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Printer, BarChart3, Database, Calendar,
  Eye, TrendingUp, Search, RefreshCw, X
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../services/api';
import { useTheme } from '../../context/theme';

const Report = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [search, setSearch] = useState('');
  const [margins, setMargins] = useState({ top: 20, bottom: 20, left: 20, right: 20 });
  const [showMarginPop, setShowMarginPop] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { isDark: isDarkMode } = useTheme();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let db = [];
      try {
        const r = await api.get('/data/predictions.php');
        if (r.data?.status === 'success') db = r.data.data;
      } catch (e) { toast.error(apiErrorMessage(e, 'Riwayat tidak dapat dimuat.'), { id: 'riwayat-gagal' }); }
      const offline = (() => {
        try { return JSON.parse(localStorage.getItem('swa-offline-history') || '[]'); } catch { return []; }
      })();
      const combined = [...offline, ...db];
      if (combined.length > 0) { setHistory(combined); setSelectedReport(combined[0]); }
      else { setHistory([]); setSelectedReport(null); }
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  /* Parse results safely */
  let results = null;
  if (selectedReport) {
    try {
      results = typeof selectedReport.results_json === 'string'
        ? JSON.parse(selectedReport.results_json)
        : selectedReport.results_json;
    } catch { results = null; }
  }

  /* Chart preview data */
  const chartDataPreview = results ? (results.dates || []).map((d, i) => ({
    name: d,
    Aktual: results.actuals?.[i] || 0,
    Prediksi: results.predictions?.[i] || 0,
  })) : [];

  const filteredHistory = history.filter(h => {
    const s = search.toLowerCase();
    return (
      h.id?.toString().includes(s) ||
      (h.run_date && new Date(h.run_date).toLocaleDateString('id-ID').includes(s)) ||
      h.mape?.toString().includes(s)
    );
  });

  /* Tanggal format helper */
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const today = fmtDate(new Date());

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full" />
      <p className="text-sm font-medium text-muted ">Menyiapkan laporan...</p>
    </div>
  );

  const containerV = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

  /* ── Print Styles ── */
  const printCSS = `
    @page { size: A4; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    @media print {
      body > * { display: none !important; }
      #swa-print-root { display: block !important; position: fixed; inset: 0; }
    }
  `;

  return (
    <motion.div variants={containerV} initial="hidden" animate="visible" className="space-y-6 pb-12">
      <style>{printCSS}</style>

      {/* ── Header ── */}
      <motion.div variants={itemV} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink mb-1">Manajemen Laporan</h1>
          <p className="text-muted text-sm font-medium">Preview dan cetak laporan prediksi LSTM resmi PT. Swabina Gatra.</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button onClick={fetchHistory} className="btn-icon">
            <RefreshCw size={15} />
          </motion.button>

          {/* Margin config */}
          <div className="relative">
            <motion.button
              onClick={() => setShowMarginPop(v => !v)}
              className="btn-secondary text-sm py-2.5 px-4">
              <BarChart3 size={14} className="text-accent" /> Margin
            </motion.button>
            <AnimatePresence>
              {showMarginPop && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40" onClick={() => setShowMarginPop(false)} />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    className="absolute top-full right-0 mt-2 w-56 glass-panel p-5 z-50">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">Margin (mm)</p>
                    <div className="grid grid-cols-2 gap-3">
                      {['top', 'bottom', 'left', 'right'].map(side => (
                        <div key={side}>
                          <label className="input-label text-xs capitalize">{side}</label>
                          <input type="number" value={margins[side]}
                            onChange={e => setMargins(m => ({ ...m, [side]: parseInt(e.target.value) || 0 }))}
                            className="input-field py-2 text-sm" />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={() => { if (selectedReport) setShowPreview(true); }}
            disabled={!selectedReport}
            className="btn-secondary text-sm py-2.5 px-4">
            <Eye size={14} /> Preview
          </motion.button>

          <motion.button
            onClick={() => { if (selectedReport) { setShowPreview(true); setTimeout(handlePrint, 300); } }}
            disabled={!selectedReport}
            className="btn-primary text-sm py-2.5 px-5">
            <Printer size={14} /> Cetak PDF
          </motion.button>
        </div>
      </motion.div>

      {/* ── 2-panel: History list + Screen Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

        {/* History list */}
        <motion.div variants={itemV} className="glass-panel p-5 flex flex-col gap-4 lg:max-h-[calc(100vh-220px)] lg:overflow-hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Database size={13} /> Riwayat <span className="ml-auto badge badge-primary text-xs">{history.length}</span>
            </p>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted " />
              <input type="text" placeholder="Cari laporan..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-8 py-2 text-sm" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredHistory.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">Belum ada riwayat.</p>
            ) : filteredHistory.map((h, i) => {
              const isActive = selectedReport?.id === h.id;
              const mape = parseFloat(h.mape || 0);
              const mapeColor = mape < 5 ? 'text-positive ' : mape < 10 ? 'text-caution ' : 'text-negative ';
              return (
                <motion.button key={h.id || i} layout
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => setSelectedReport(h)}
                  className={`w-full text-left p-3.5 rounded-md border transition-all duration-200 ${isActive
 ? 'bg-primary/10 border-primary/30'
 : 'bg-ink/5 border-rule hover:bg-ink/5 dark:hover:bg-white/[0.05]'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold font-mono ${isActive ? 'text-brand ' : 'text-muted'}`}>
                      #{h.id?.toString().slice(-6) || 'OFFLINE'}
                    </span>
                    {h.is_offline && <span className="badge badge-warning text-xs">Offline</span>}
                  </div>
                  <p className="text-xs text-muted mb-2">
                    {h.run_date ? fmtDate(h.run_date) : '-'}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span>MAPE: <strong className={mapeColor}>{mape.toFixed(2)}%</strong></span>
                    <span className="text-muted ">Ep: {h.epochs}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Screen preview panel */}
        <motion.div variants={itemV}>
          {!selectedReport ? (
            <div className="glass-panel p-12 flex flex-col items-center justify-center text-muted gap-4 h-full min-h-[400px]">
              <FileText size={56} className="opacity-10" />
              <p className="font-medium">Pilih laporan dari daftar untuk melihat preview.</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={selectedReport.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }} className="glass-panel p-6 space-y-6">

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'MAPE', value: `${parseFloat(selectedReport.mape || 0).toFixed(2)}%`, color: 'text-positive ', bg: 'bg-positive/10 border-positive/20' },
                    { label: 'RMSE', value: parseFloat(selectedReport.rmse || 0).toFixed(2), color: 'text-brand ', bg: 'bg-primary/10 border-primary/20' },
                    { label: 'Epochs', value: selectedReport.epochs || '-', color: 'text-brand ', bg: 'bg-brand/10 border-brand/20' },
                  ].map((m, i) => (
                    <motion.div key={i} className={`border rounded-md p-4 text-center ${m.bg}`}>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">{m.label}</p>
                      <p className={`text-2xl font-semibold ${m.color}`}>{m.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart */}
                {chartDataPreview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
                      <TrendingUp size={13} className="text-primary" /> Aktual vs Prediksi
                    </p>
                    <div className="h-48 bg-ink/5 rounded-md p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartDataPreview}>
                          <defs>
                            <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#64748b" stopOpacity={0.2} /><stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v => v.toLocaleString()} />
                          <RechartsTooltip contentStyle={{ background: isDarkMode ? 'rgba(15,23,42,0.95)' : '#fff', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, fontSize: 11 }} />
                          <Area type="monotone" dataKey="Aktual" stroke="#64748b" strokeWidth={1.5} fill="url(#gA)" />
                          <Area type="monotone" dataKey="Prediksi" stroke="#3b82f6" strokeWidth={2} fill="url(#gP)" animationDuration={1200} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Detail table */}
                {results?.dates?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
                      <Calendar size={13} className="text-accent" /> Detail Prediksi
                    </p>
                    <div className="overflow-auto rounded-md border border-rule max-h-56">
                      <table className="w-full text-xs">
                        <thead className="bg-ink/5 sticky top-0">
                          <tr>{['No', 'Periode', 'Aktual', 'Prediksi', 'Error%'].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted uppercase tracking-wider border-b border-rule ">{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody className="divide-y divide-rule ">
                          {results.dates.map((d, i) => {
                            const act = results.actuals?.[i] || 0;
                            const pred = Math.round(results.predictions?.[i] || 0);
                            const err = act > 0 ? ((Math.abs(act - pred) / act) * 100).toFixed(1) : '-';
                            return (
                              <tr key={i} className="hover:bg-ink/5 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="px-3 py-2.5 text-muted ">{i + 1}</td>
                                <td className="px-3 py-2.5 font-bold text-muted ">{d}</td>
                                <td className="px-3 py-2.5 font-semibold text-ink text-right">{act.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-brand font-bold text-right">{pred.toLocaleString()}</td>
                                <td className="px-3 py-2.5 text-right">
                                  <span className={`badge text-xs ${parseFloat(err) < 5 ? 'badge-success' : parseFloat(err) < 10 ? 'badge-warning' : 'badge-danger'}`}>{err}%</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CTA preview */}
                <motion.button
                  onClick={() => setShowPreview(true)}
                  className="btn-secondary w-full py-3 text-sm"
                >
                  <Eye size={15} /> Buka Preview Dokumen A4
                </motion.button>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════
          MODAL PREVIEW A4 — tampil di layar sebelum cetak
          Portal: render ke document.body agar fixed bekerja
      ══════════════════════════════════════════════ */}
      <Portal>
      <AnimatePresence>
        {showPreview && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col bg-paper "
          >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 bg-surface border-b border-rule shrink-0 no-print">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-primary" />
                <span className="text-ink font-semibold text-sm">
                  Preview Dokumen — #{selectedReport.id?.toString().padStart(6,'0') || '000001'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handlePrint}
                  className="btn-primary text-sm py-2 px-5">
                  <Printer size={14} /> Cetak / Simpan PDF
                </motion.button>
                <motion.button
                  onClick={() => setShowPreview(false)}
                  className="btn-icon ml-1">
                  <X size={16} />
                </motion.button>
              </div>
            </div>

            {/* Scrollable paper area */}
            <div className="flex-1 overflow-y-auto py-8 px-4 bg-ink/5">

              {/* Kertas A4 */}
              <div
                id="swa-print-root"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  margin: '0 auto',
                  background: '#ffffff',
                  color: '#000000',
                  fontFamily: '"Times New Roman", Times, serif',
                  fontSize: '11pt',
                  lineHeight: '1.6',
                  boxShadow: '0 4px 60px rgba(0,0,0,0.6)',
                  padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                  boxSizing: 'border-box',
                }}
              >
                {/* ── KOP SURAT ── */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '4px double #0f172a', paddingBottom: '10px', marginBottom: '16px' }}>
                  <img src="/swa_logo.png" alt="Logo"
                    style={{ width: '70px', height: '70px', objectFit: 'contain', marginRight: '14px' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '16pt', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a' }}>
                      PT. SWABINA GATRA
                    </div>
                    <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '3px', color: '#334155', marginTop: '2px' }}>
                      Divisi Perencanaan &amp; Pengembangan Bisnis
                    </div>
                    <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '3px' }}>
                      Jl. RA Kartini No. 21A, Injen Timur, Sidomoro, Kec. Kebomas, Gresik 61122
                    </div>
                    <div style={{ fontSize: '8pt', color: '#64748b' }}>
                      Telepon: 0811-8890-580 &nbsp;|&nbsp; www.swabina.id &nbsp;|&nbsp; info@swabina.id
                    </div>
                  </div>
                </div>

                {/* ── IDENTITAS SURAT ── */}
                <table style={{ width: '100%', fontSize: '10pt', marginBottom: '14px', borderCollapse: 'collapse' }}>
                  <tbody>
                    {[
                      ['Nomor', `: PRD-${selectedReport.id?.toString().padStart(6, '0') || '000001'}/SWA/${new Date().getFullYear()}`],
                      ['Lampiran', ': 1 (satu) berkas data prediksi'],
                      ['Perihal', ': Laporan Hasil Prediksi Penjualan Tiket Pesawat (Model LSTM)'],
                      ['Tanggal', `: ${today}`],
                      ['Sifat', ': Rahasia / Internal'],
                    ].map(([k, v]) => (
                      <tr key={k}>
                        <td style={{ width: '90px', padding: '2px 0', fontWeight: 700, verticalAlign: 'top' }}>{k}</td>
                        <td style={{ padding: '2px 0' }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', marginBottom: '14px' }} />

                {/* ── TUJUAN SURAT ── */}
                <p style={{ marginBottom: '8px' }}>Kepada Yth.,</p>
                <p style={{ fontWeight: 700, marginBottom: '14px' }}>
                  Kepala Divisi Perencanaan &amp; Pengembangan Bisnis<br />
                  PT. Swabina Gatra<br />
                  Di Tempat
                </p>
                <p style={{ marginBottom: '12px' }}>Dengan hormat,</p>
                <p style={{ textAlign: 'justify', marginBottom: '14px' }}>
                  Bersama surat ini kami sampaikan laporan hasil analisis prediksi penjualan tiket pesawat
                  PT. Swabina Gatra menggunakan metode <em>Long Short-Term Memory</em> (LSTM) yang merupakan
                  salah satu pendekatan <em>Deep Learning</em> terkini untuk analisis data deret waktu (<em>time series</em>).
                  Proses analisis telah dilaksanakan pada tanggal{''}
                  {selectedReport.run_date ? fmtDate(selectedReport.run_date) : today}{''}
                  melalui Sistem Informasi SWA Predict.
                </p>

                {/* ── I. KONFIGURASI MODEL ── */}
                <p style={{ fontWeight: 900, fontSize: '10.5pt', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', marginBottom: '8px', marginTop: '14px' }}>
                  I. KONFIGURASI MODEL
                </p>
                <table style={{ width: '55%', fontSize: '9.5pt', borderCollapse: 'collapse', marginBottom: '14px' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#fff' }}>
                      <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #1e293b' }}>Parameter</th>
                      <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #1e293b' }}>Nilai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Jumlah Epoch', selectedReport.epochs ?? '-'],
                      ['Learning Rate', selectedReport.learning_rate ?? '-'],
                      ['Window Size', selectedReport.window_size ? `${selectedReport.window_size} Minggu` : '-'],
                      ['Optimizer', 'Adam'],
                      ['Loss Function', 'Mean Squared Error (MSE)'],
                      ['Arsitektur', 'Bidirectional LSTM + Dropout'],
                    ].map(([k, v], i) => (
                      <tr key={k} style={{ background: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '4px 10px', border: '1px solid #e2e8f0' }}>{k}</td>
                        <td style={{ padding: '4px 10px', border: '1px solid #e2e8f0', fontWeight: 700 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ── II. EVALUASI AKURASI ── */}
                <p style={{ fontWeight: 900, fontSize: '10.5pt', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', marginBottom: '8px', marginTop: '14px' }}>
                  II. EVALUASI AKURASI MODEL
                </p>
                <table style={{ width: '60%', fontSize: '9.5pt', borderCollapse: 'collapse', marginBottom: '14px' }}>
                  <thead>
                    <tr style={{ background: '#047857', color: '#fff' }}>
                      <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #059669' }}>Metrik</th>
                      <th style={{ padding: '5px 10px', textAlign: 'right', border: '1px solid #059669' }}>Nilai</th>
                      <th style={{ padding: '5px 10px', textAlign: 'left', border: '1px solid #059669' }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['MAPE (%)', `${parseFloat(selectedReport.mape || 0).toFixed(2)}%`,
                        parseFloat(selectedReport.mape || 0) < 10 ? 'Sangat Baik (< 10%)' : parseFloat(selectedReport.mape || 0) < 20 ? 'Cukup Baik (< 20%)' : 'Perlu Perbaikan'],
                      ['RMSE', parseFloat(selectedReport.rmse || 0).toFixed(4), 'Root Mean Square Error'],
                      ['MSE', parseFloat(selectedReport.mse || 0).toFixed(4), 'Mean Squared Error'],
                    ].map(([k, v, ket], i) => (
                      <tr key={k} style={{ background: i % 2 === 0 ? '#f0fdf4' : '#ffffff' }}>
                        <td style={{ padding: '4px 10px', border: '1px solid #e2e8f0', fontWeight: 700 }}>{k}</td>
                        <td style={{ padding: '4px 10px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 900, color: '#065f46' }}>{v}</td>
                        <td style={{ padding: '4px 10px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '9pt' }}>{ket}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ── III. DETAIL PREDIKSI ── */}
                {results?.dates?.length > 0 && (
                  <>
                    <p style={{ fontWeight: 900, fontSize: '10.5pt', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', marginBottom: '8px', marginTop: '14px' }}>
                      III. TABEL DETAIL HASIL PREDIKSI
                    </p>
                    <table style={{ width: '100%', fontSize: '9pt', borderCollapse: 'collapse', marginBottom: '14px' }}>
                      <thead>
                        <tr style={{ background: '#334155', color: '#fff' }}>
                          {['No.', 'Periode', 'Data Aktual', 'Hasil Prediksi', 'Selisih', 'Error (%)'].map((h, hi) => (
                            <th key={h} style={{
                              padding: '5px 8px', border: '1px solid #475569',
                              textAlign: hi === 0 ? 'center' : hi === 1 ? 'left' : 'right'
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.dates.map((d, i) => {
                          const act = results.actuals?.[i] || 0;
                          const pred = Math.round(results.predictions?.[i] || 0);
                          const selisih = Math.abs(act - pred);
                          const err = act > 0 ? ((selisih / act) * 100).toFixed(2) : '-';
                          const errColor = parseFloat(err) < 5 ? '#15803d' : parseFloat(err) < 10 ? '#b45309' : '#dc2626';
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>{i + 1}</td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0' }}>{d}</td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{act.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 700, color: '#1d4ed8' }}>{pred.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>{selisih.toLocaleString('id-ID')}</td>
                              <td style={{ padding: '4px 8px', border: '1px solid #e2e8f0', textAlign: 'right', color: errColor, fontWeight: 700 }}>{err}%</td>
                            </tr>
                          );
                        })}
                        {/* Proyeksi baris */}
                        {results.forecast?.map((f, i) => (
                          <tr key={`f${i}`} style={{ background: '#eff6ff', fontStyle: 'italic' }}>
                            <td style={{ padding: '4px 8px', border: '1px solid #dbeafe', textAlign: 'center', color: '#64748b' }}>P{i + 1}</td>
                            <td style={{ padding: '4px 8px', border: '1px solid #dbeafe', color: '#1d4ed8' }}>Proyeksi +{f.weekOffset} Minggu</td>
                            <td style={{ padding: '4px 8px', border: '1px solid #dbeafe', textAlign: 'right', color: '#94a3b8' }}>—</td>
                            <td style={{ padding: '4px 8px', border: '1px solid #dbeafe', textAlign: 'right', fontWeight: 900, color: '#0f766e' }}>{Math.round(f.value).toLocaleString('id-ID')}</td>
                            <td style={{ padding: '4px 8px', border: '1px solid #dbeafe', textAlign: 'right', color: '#94a3b8' }}>—</td>
                            <td style={{ padding: '4px 8px', border: '1px solid #dbeafe', textAlign: 'right', color: '#94a3b8' }}>—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}

                {/* ── KESIMPULAN ── */}
                <p style={{ fontWeight: 900, fontSize: '10.5pt', borderBottom: '1.5px solid #0f172a', paddingBottom: '4px', marginBottom: '8px', marginTop: '14px' }}>
                  IV. KESIMPULAN
                </p>
                <p style={{ textAlign: 'justify', marginBottom: '8px' }}>
                  Berdasarkan hasil analisis menggunakan model LSTM, diperoleh nilai MAPE sebesar{''}
                  <strong>{parseFloat(selectedReport.mape || 0).toFixed(2)}%</strong> yang menunjukkan bahwa model memiliki
                  tingkat akurasi yang {parseFloat(selectedReport.mape || 0) < 10 ? 'sangat baik' : parseFloat(selectedReport.mape || 0) < 20 ? 'cukup baik' : 'perlu ditingkatkan'}{''}
                  dalam memprediksi penjualan tiket pesawat.
                  {results?.forecast?.length > 0 && ` Proyeksi untuk ${results.forecast.length} minggu ke depan menunjukkan estimasi penjualan sebesar ${Math.round(results.forecast[0]?.value || 0).toLocaleString('id-ID')} tiket pada minggu pertama.`}
                </p>

                {/* ── PENUTUP ── */}
                <p style={{ textAlign: 'justify', marginBottom: '24px' }}>
                  Demikian laporan ini kami sampaikan sebagai bahan pertimbangan dalam pengambilan keputusan
                  operasional perusahaan. Atas perhatian dan kepercayaan Bapak/Ibu, kami mengucapkan terima kasih.
                </p>

                {/* ── TANDA TANGAN ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '10pt' }}>
                  <div style={{ textAlign: 'center', width: '42%' }}>
                    <p style={{ marginBottom: '4px' }}>Mengetahui,</p>
                    <p style={{ marginBottom: '64px' }}>Direktur Operasional</p>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                      <p style={{ fontWeight: 700 }}>( _________________________ )</p>
                      <p style={{ fontSize: '9pt', color: '#475569' }}>NIP. ___________________</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', width: '42%' }}>
                    <p>Gresik, {today}</p>
                    <p style={{ marginBottom: '64px', fontWeight: 700 }}>Kepala Bidang Perencanaan,</p>
                    <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                      <p style={{ fontWeight: 700 }}>( _________________________ )</p>
                      <p style={{ fontSize: '9pt', color: '#475569' }}>NIP. ___________________</p>
                    </div>
                  </div>
                </div>

                {/* ── FOOTER DOKUMEN ── */}
                <div style={{ marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '6px', fontSize: '7.5pt', color: '#64748b', textAlign: 'center' }}>
                  Dokumen ini digenerate secara otomatis oleh Sistem Informasi SWA Predict &nbsp;•&nbsp; PT. Swabina Gatra &nbsp;•&nbsp; {new Date().toLocaleString('id-ID')}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </motion.div>
  );
};

export default Report;

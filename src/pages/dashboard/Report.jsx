import { useState, useEffect } from 'react';
import { Printer, Calendar, TrendingUp, ChevronRight, FileText, BarChart3, Database } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { getDummyHistory } from '../../services/dummy';

const Report = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showMarginPop, setShowMarginPop] = useState(false);
  const [margins, setMargins] = useState({
    top: 25,
    bottom: 25,
    left: 25,
    right: 25
  });

  const updateMargin = (side, value) => {
    setMargins(prev => ({ ...prev, [side]: parseInt(value) || 0 }));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      let dbHistory = [];
      const response = await api.get('/data/predictions.php');
      if (response.data.status === 'success') {
        dbHistory = response.data.data;
      }
      
      const offlineHistory = JSON.parse(localStorage.getItem('swa-offline-history') || '[]');
      const combined = [...offlineHistory, ...dbHistory];
      
      setHistory(combined);
      if (combined.length > 0) {
        setSelectedReport(combined[0]);
      }
    } catch (error) {
      console.warn('Using dummy history for report');
      const dummy = getDummyHistory();
      setHistory(dummy);
      if (dummy.length > 0) setSelectedReport(dummy[0]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderKopSurat = () => (
    <div className="bg-white pb-6 mb-8 border-b-[4px] border-double border-black relative">
      <div className="flex items-center">
        <div className="w-[120px] flex justify-center">
          <div className="w-24 h-24 bg-white flex items-center justify-center overflow-hidden">
            <img src="/swa_logo.png" alt="SWA Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="flex-1 text-center pr-[120px]">
          <h1 className="text-[26px] font-bold text-black uppercase leading-tight tracking-tight">PT. SWABINA GATRA</h1>
          <p className="text-[16px] font-bold text-black mt-1 uppercase tracking-[0.15em] border-t border-black/20 pt-1 inline-block">Divisi Perencanaan & Pengembangan Bisnis</p>
          <div className="mt-3 text-[11px] text-black/80 font-medium leading-relaxed font-sans">
            <p>Jl. RA Kartini No. 21A, Injen Timur, Sidomoro, Kec. Kebomas, Gresik 61122</p>
            <p>Telepon: 0811-8890-580 | Situs: www.swabina.id | Email: info@swabina.id</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-primary">
      <div className="relative">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
      </div>
      <p className="font-medium tracking-widest uppercase text-xs animate-pulse">Menyiapkan Laporan...</p>
    </div>
  );

  let results = null;
  if (selectedReport) {
    try {
      results = typeof selectedReport.results_json === 'string' 
        ? JSON.parse(selectedReport.results_json) 
        : selectedReport.results_json;
    } catch (e) {
      console.error("Error parsing results_json", e);
      results = null;
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen pb-20"
    >
      {/* Top Toolbar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden p-6 glass-panel border-white/5 shadow-2xl relative z-[100]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <FileText className="text-primary" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Management Laporan</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] mt-0.5">PT. Swabina Gatra Official Workspace</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowMarginPop(!showMarginPop)}
              className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all"
            >
              <BarChart3 size={18} className="text-accent" />
              Konfigurasi Margin
            </motion.button>

            <AnimatePresence>
              {showMarginPop && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMarginPop(false)}
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute top-full right-0 mt-3 w-72 glass-panel p-6 shadow-2xl z-50 border-white/10"
                  >
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Margin (mm)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {['top', 'bottom', 'left', 'right'].map((side) => (
                        <div key={side} className="space-y-1">
                          <label className="text-[9px] text-gray-500 uppercase font-black">{side}</label>
                          <input 
                            type="number" 
                            value={margins[side]} 
                            onChange={(e) => updateMargin(side, e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white outline-none focus:border-accent transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePrint} 
            className="bg-white text-black px-8 py-2.5 rounded-xl font-black text-sm flex items-center gap-3 shadow-xl"
          >
            <Printer size={18} /> CETAK PDF
          </motion.button>
        </div>
      </motion.div>

      {/* Archive Table */}
      <motion.div variants={itemVariants} className="w-full max-w-7xl mx-auto mb-16 print:hidden">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-3">
            <Database size={14} className="text-primary" /> Riwayat Arsip
          </h3>
        </div>
        <div className="glass-panel overflow-hidden border-white/5 shadow-2xl relative">
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-50 dark:bg-[#0f172a] shadow-lg">
                <tr className="border-b border-white/10">
                  <th className="p-5 border-r border-gray-200 dark:border-white/5 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">ID</th>
                  <th className="p-5 border-r border-gray-200 dark:border-white/5 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">Waktu Run</th>
                  <th className="p-5 border-r border-gray-200 dark:border-white/5 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">MAPE</th>
                  <th className="p-5 border-r border-gray-200 dark:border-white/5 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase">RMSE</th>
                  <th className="p-5 text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase text-right">Navigasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/[0.03]">
                {history.map((h) => (
                  <tr key={h.id} className={`hover:bg-gray-100 dark:hover:bg-white/[0.03] transition-colors ${selectedReport?.id === h.id ? 'bg-primary/10' : ''}`}>
                    <td className="p-5 border-r border-gray-200 dark:border-white/5 text-xs font-mono text-gray-600 dark:text-gray-500">#{h.id}</td>
                    <td className="p-5 border-r border-gray-200 dark:border-white/5 text-xs text-gray-700 dark:text-gray-200">{new Date(h.run_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                    <td className="p-5 border-r border-gray-200 dark:border-white/5 text-xs font-bold text-emerald-600 dark:text-emerald-500">{parseFloat(h.mape).toFixed(2)}%</td>
                    <td className="p-5 border-r border-gray-200 dark:border-white/5 text-xs text-gray-600 dark:text-gray-500 font-mono">{parseFloat(h.rmse).toFixed(2)}</td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => { setSelectedReport(h); window.scrollTo({ top: 450, behavior: 'smooth' }); }}
                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${selectedReport?.id === h.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                      >
                        {selectedReport?.id === h.id ? 'Previewing' : 'Lihat'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Document Preview */}
      <div className="flex flex-col items-center w-full">
        <motion.div 
          variants={itemVariants} 
          className="flex justify-center w-full bg-black/40 p-4 sm:p-16 rounded-[40px] border border-white/5 shadow-inner mb-20 overflow-visible print:bg-transparent print:p-0 print:border-none"
        >
          <AnimatePresence mode="wait">
            {selectedReport ? (
              <motion.div 
                key={selectedReport.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="w-full lg:w-[210mm] bg-white shadow-2xl relative mx-auto border border-gray-200"
              >
                <div id="print-area" className="text-black font-sans relative z-10" style={{ padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm` }}>
                  {renderKopSurat()}
                  
                  <div className="flex justify-between items-start mb-8 text-[12px]">
                    <div className="space-y-1">
                      <p><strong>Nomor:</strong> {selectedReport.id}/SWA-LSTM/GRK/{new Date(selectedReport.run_date).getFullYear()}</p>
                      <p><strong>Sifat:</strong> Rahasia / Terbatas</p>
                      <p><strong>Perihal:</strong> Laporan Analisis Prediksi Penjualan Tiket</p>
                    </div>
                    <p className="text-right">{new Date(selectedReport.run_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>

                  <div className="text-[13px] leading-relaxed space-y-6">
                    <p>Berdasarkan hasil pemrosesan data menggunakan LSTM, berikut adalah laporan analisis performa dan proyeksi penjualan:</p>
                    
                    <div className="grid grid-cols-2 gap-8 my-4">
                      <div className="border border-black/10 p-4 rounded-sm">
                        <h5 className="text-[10px] font-bold uppercase mb-2 text-gray-400">Parameter</h5>
                        <div className="text-[11px] space-y-1">
                          <p className="flex justify-between"><span>Epochs</span> <b>{selectedReport.epochs}</b></p>
                          <p className="flex justify-between"><span>Learning Rate</span> <b>{selectedReport.learning_rate}</b></p>
                          <p className="flex justify-between"><span>Window Size</span> <b>{selectedReport.window_size} Mgg</b></p>
                        </div>
                      </div>
                      <div className="border border-black/10 p-4 rounded-sm bg-gray-50/50">
                        <h5 className="text-[10px] font-bold uppercase mb-2 text-gray-400">Akurasi</h5>
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div><p className="text-[9px] uppercase opacity-50">MAPE</p><p className="text-lg font-bold text-primary">{parseFloat(selectedReport.mape).toFixed(2)}%</p></div>
                          <div><p className="text-[9px] uppercase opacity-50">RMSE</p><p className="text-lg font-bold">{parseFloat(selectedReport.rmse).toFixed(2)}</p></div>
                        </div>
                      </div>
                    </div>

                    <div className="h-40 w-full my-4 border border-gray-100 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={results?.dates ? results.dates.map((d, i) => ({ 
                          date: d, 
                          Actual: results.actuals?.[i] || 0, 
                          Prediction: results.predictions?.[i] || 0 
                        })) : []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Line type="monotone" dataKey="Actual" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="Prediction" stroke="#1e293b" strokeWidth={2} dot={{ r: 2, fill: '#1e293b' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <table className="w-full text-[10px] border-collapse border border-black">
                      <thead>
                        <tr className="bg-gray-100 uppercase">
                          <th className="border border-black px-2 py-2">No</th>
                          <th className="border border-black px-2 py-2">Periode</th>
                          <th className="border border-black px-2 py-2 text-right">Aktual</th>
                          <th className="border border-black px-2 py-2 text-right">Prediksi</th>
                          <th className="border border-black px-2 py-2 text-right">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(results?.dates || []).map((date, i) => (
                          <tr key={i}>
                            <td className="border border-black px-2 py-1 text-center">{i + 1}</td>
                            <td className="border border-black px-2 py-1">{date}</td>
                            <td className="border border-black px-2 py-1 text-right">{results.actuals?.[i]?.toLocaleString()}</td>
                            <td className="border border-black px-2 py-1 text-right font-bold">{results.predictions?.[i]?.toLocaleString()}</td>
                            <td className="border border-black px-2 py-1 text-right italic text-gray-400">{Math.abs((results.actuals?.[i] || 0) - (results.predictions?.[i] || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {results?.forecast && (
                      <div className="mt-6">
                        <h5 className="text-[11px] font-bold uppercase mb-2 border-b border-black">Proyeksi Masa Depan</h5>
                        <table className="w-full text-[11px] border-collapse border border-black">
                          <thead>
                            <tr className="bg-gray-50 uppercase">
                              <th className="border border-black px-3 py-2">Minggu</th>
                              <th className="border border-black px-3 py-2 text-right">Prediksi</th>
                              <th className="border border-black px-3 py-2 text-center">Status Target</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.forecast.map((f, idx) => (
                              <tr key={idx}>
                                <td className="border border-black px-3 py-1 font-bold">Minggu +{f.weekOffset}</td>
                                <td className="border border-black px-3 py-1 text-right font-bold">{(f.value || 0).toLocaleString()}</td>
                                <td className="border border-black px-3 py-1 text-center text-[9px]">
                                  {(f.value || 0) >= 1000 ? 'MEMENUHI' : 'DI BAWAH TARGET'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <p className="pt-4 text-[11px]">Demikian laporan ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                  </div>

                  <div className="mt-16 flex justify-between px-10">
                    <div className="text-center">
                      <p className="text-[12px] mb-20 italic opacity-50">Sistem Verifikasi,</p>
                      <div className="w-32 border-b border-black mx-auto"></div>
                      <p className="text-[11px] font-bold mt-2">SKYPREDICT ENGINE</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] mb-20">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <div className="w-48 border-b border-black mx-auto"></div>
                      <p className="text-[11px] font-bold mt-2 uppercase">Kepala Bidang Perencanaan</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="py-40 text-gray-500 uppercase tracking-widest text-sm opacity-20">Pilih laporan di atas</div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4; margin: 0; }
          html, body, #root, #root * { visibility: hidden !important; margin: 0 !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 210mm !important; min-height: 297mm !important;
            padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm !important;
            background: white !important; display: block !important; box-sizing: border-box !important;
            z-index: 99999 !important;
          }
          aside, nav, header, footer, button, .glass-panel, .print\\:hidden { display: none !important; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </motion.div>
  );
};

export default Report;

import { useState, useEffect } from 'react';
import { Printer, Calendar, TrendingUp, ChevronRight, FileText, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { getDummyHistory } from '../../services/dummy';

const Report = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
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
      const response = await api.get('/data/predictions.php');
      if (response.data.status === 'success') {
        setHistory(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedReport(response.data.data[0]);
        } else {
          setSelectedReport(null);
        }
      } else {
        throw new Error('Network error');
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
        {/* Logo Section */}
        <div className="w-[120px] flex justify-center">
          <div className="w-24 h-24 bg-white border-[3px] border-black flex items-center justify-center rounded-sm">
            <TrendingUp className="text-black" size={56} />
          </div>
        </div>
        
        {/* Text Section */}
        <div className="flex-1 text-center pr-[120px]">
          <h1 className="text-[26px] font-bold text-black uppercase leading-tight tracking-tight">PT. MASKAPAI UDARA NUSANTARA</h1>
          <p className="text-[16px] font-bold text-black mt-1 uppercase tracking-[0.15em] border-t border-black/20 pt-1 inline-block">Divisi Operasional & Perencanaan Data</p>
          <div className="mt-3 text-[11px] text-black/80 font-medium leading-relaxed font-sans">
            <p>Gedung SkyCenter Lt. 12, Jl. Penerbangan No. 45, Jakarta Pusat 10110</p>
            <p>Telepon: (021) 1234-5678 | Situs: www.maskapaiudara.id | Email: info@maskapaiudara.id</p>
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

  const results = selectedReport ? JSON.parse(selectedReport.results_json) : null;

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
      className="min-h-screen"
    >
      {/* Header Controls - Hidden on Print */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Cetak Laporan Resmi</h1>
          <p className="text-gray-400">Pilih riwayat data untuk ditampilkan pada format surat resmi.</p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrint} 
          className="bg-white text-black hover:bg-gray-100 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-xl"
        >
          <Printer size={20} /> Cetak Sekarang (PDF)
        </motion.button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar - Hidden on Print */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4 print:hidden sticky top-0 z-10">
          {/* Margin Settings */}
          <div className="glass-panel p-5 shadow-xl mb-4 border-accent/20">
            <h3 className="text-xs font-bold text-accent uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
              <BarChart3 size={14} /> Pengaturan Margin (mm)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Atas</label>
                <input 
                  type="number" 
                  value={margins.top} 
                  onChange={(e) => updateMargin('top', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Bawah</label>
                <input 
                  type="number" 
                  value={margins.bottom} 
                  onChange={(e) => updateMargin('bottom', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Kiri</label>
                <input 
                  type="number" 
                  value={margins.left} 
                  onChange={(e) => updateMargin('left', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white focus:border-accent outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Kanan</label>
                <input 
                  type="number" 
                  value={margins.right} 
                  onChange={(e) => updateMargin('right', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-xs text-white focus:border-accent outline-none"
                />
              </div>
            </div>
            <p className="text-[9px] text-gray-600 mt-3 italic">* Perubahan margin akan terlihat langsung pada kanvas di bawah.</p>
          </div>

          <div className="glass-panel p-5 shadow-xl">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
              <Calendar size={14} className="text-primary" /> Riwayat Arsip
            </h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {history.map((h, i) => (
                  <motion.button
                    key={h.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedReport(h)}
                    className={`w-full text-left p-4 rounded-xl transition-colors border shadow-md ${
                      selectedReport?.id === h.id 
                        ? 'bg-primary/20 border-primary/50 text-white' 
                        : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600 hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold opacity-50">#{h.id}</span>
                      <ChevronRight size={14} className={selectedReport?.id === h.id ? 'text-primary' : 'text-gray-700'} />
                    </div>
                    <div className="font-bold text-sm">
                      {new Date(h.run_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-[11px] mt-2 flex items-center gap-2">
                      <span className="bg-gray-900/50 px-2 py-0.5 rounded border border-gray-700/50 shadow-inner">MAPE: {parseFloat(h.mape).toFixed(1)}%</span>
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              {history.length === 0 && <p className="text-gray-500 text-xs italic py-4">Belum ada riwayat perhitungan.</p>}
            </div>
          </div>
        </motion.div>

        {/* Paper Canvas */}
        <motion.div variants={itemVariants} className="lg:col-span-9 flex justify-start bg-gray-950 p-4 sm:p-8 rounded-3xl border border-white/5 shadow-2xl print:bg-white print:p-0 print:border-none print:shadow-none min-h-[50vh]">
          <AnimatePresence mode="wait">
            {selectedReport ? (
                <motion.div 
                  key={selectedReport.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="w-full lg:w-[210mm] bg-white shadow-2xl print:shadow-none relative ml-0 mr-auto"
                >
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
                  <TrendingUp size={600} className="rotate-[-35deg]" />
                </div>

                <div 
                  id="print-area" 
                  className="text-black font-serif relative z-10"
                  style={{ 
                    paddingTop: `${margins.top}mm`,
                    paddingBottom: `${margins.bottom}mm`,
                    paddingLeft: `${margins.left}mm`,
                    paddingRight: `${margins.right}mm`
                  }}
                >
                  {renderKopSurat()}
                  
                  <div className="flex justify-between items-start mb-10 text-[12px] font-sans">
                    <div className="space-y-1">
                      <div className="flex gap-4">
                        <span className="w-20 font-bold">Nomor</span>
                        <span>: {selectedReport.id}/ML-LSTM/MUN/{new Date(selectedReport.run_date).getFullYear()}</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="w-20 font-bold">Lampiran</span>
                        <span>: 1 (Satu) Berkas Analisis</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="w-20 font-bold">Sifat</span>
                        <span>: Rahasia / Terbatas</span>
                      </div>
                      <div className="flex gap-4">
                        <span className="w-20 font-bold">Perihal</span>
                        <span className="font-bold underline">: Laporan Analisis Prediksi Penjualan Tiket</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p>Jakarta, {new Date(selectedReport.run_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="text-[13px] leading-relaxed space-y-6 font-sans">
                    <p>Berdasarkan hasil pemrosesan data historis penjualan tiket menggunakan arsitektur **Long Short-Term Memory (LSTM)**, berikut disampaikan laporan analisis performa dan proyeksi mingguan:</p>
                    
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase border-b border-black mb-2 pb-1">I. Metrik Evaluasi & Konfigurasi</h4>
                    <div className="grid grid-cols-2 gap-8 my-4">
                      <div className="border border-black/10 p-4 rounded-sm">
                        <h5 className="text-[10px] font-bold uppercase mb-2 text-gray-400">Parameter Teknis</h5>
                        <table className="w-full text-[11px]">
                          <tbody>
                            <tr className="border-b border-gray-100"><td className="py-1">Epochs</td><td className="py-1 font-bold text-right">{selectedReport.epochs}</td></tr>
                            <tr className="border-b border-gray-100"><td className="py-1">Learning Rate</td><td className="py-1 font-bold text-right">{selectedReport.learning_rate}</td></tr>
                            <tr className="border-b border-gray-100"><td className="py-1">Window Size</td><td className="py-1 font-bold text-right">{selectedReport.window_size} Mgg</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="border border-black/10 p-4 rounded-sm bg-gray-50/50">
                        <h5 className="text-[10px] font-bold uppercase mb-2 text-gray-400">Akurasi Prediksi</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-[9px] uppercase opacity-50">MAPE</div>
                            <div className="text-[16px] font-bold text-primary">{parseFloat(selectedReport.mape).toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-[9px] uppercase opacity-50">RMSE</div>
                            <div className="text-[16px] font-bold">{parseFloat(selectedReport.rmse).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <h4 className="text-[11px] font-bold text-gray-500 uppercase border-b border-black mb-2 pb-1">II. Visualisasi Tren Prediksi</h4>
                    <div className="h-40 w-full my-2 border border-gray-100 p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={results ? results.dates.map((d, i) => ({ date: d, Actual: results.actuals[i], Prediction: results.predictions[i] })) : []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Line type="monotone" dataKey="Actual" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                          <Line type="monotone" dataKey="Prediction" stroke="#1e293b" strokeWidth={2} dot={{ r: 2, fill: '#1e293b' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <h4 className="text-[11px] font-bold text-gray-500 uppercase border-b border-black mb-2 pb-1">III. Tabulasi Data Hasil Prediksi</h4>
                    <table className="w-full text-[10px] border-collapse border border-black font-sans">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black px-2 py-2 text-center w-8">No</th>
                          <th className="border border-black px-2 py-2">Periode</th>
                          <th className="border border-black px-2 py-2 text-right">Aktual</th>
                          <th className="border border-black px-2 py-2 text-right">MA3</th>
                          <th className="border border-black px-2 py-2 text-right">EMA</th>
                          <th className="border border-black px-2 py-2 text-right font-bold">Prediksi</th>
                          <th className="border border-black px-2 py-2 text-right">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results && results.dates.map((date, i) => {
                          const actual = results.actuals[i];
                          const pred = results.predictions[i];
                          const diff = Math.abs(actual - pred);
                          const normData = results.normalized ? results.normalized[i] : null;
                          const min = results.min || 0;
                          const max = results.max || 1;

                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="border border-black px-1 py-1 text-center">{i + 1}</td>
                              <td className="border border-black px-1 py-1 font-medium">{date}</td>
                              <td className="border border-black px-1 py-1 text-right">{actual.toLocaleString()}</td>
                              <td className="border border-black px-1 py-1 text-right opacity-60">{normData ? (parseFloat(normData.ma3) * (max - min) + min).toFixed(0) : '-'}</td>
                              <td className="border border-black px-1 py-1 text-right opacity-60">{normData ? (parseFloat(normData.ema) * (max - min) + min).toFixed(0) : '-'}</td>
                              <td className="border border-black px-1 py-1 text-right font-bold bg-gray-50/50">{pred.toLocaleString()}</td>
                              <td className="border border-black px-1 py-1 text-right italic text-gray-400">{diff.toLocaleString()}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    
                    <p className="pt-2 text-[11px]">Demikian laporan ini dibuat untuk dipergunakan sebagaimana mestinya sebagai bahan pertimbangan dalam pengambilan keputusan operasional maskapai.</p>
                  
                    {results.forecast && results.forecast.length > 0 && (
                      <div className="mt-8 pt-8 border-t border-gray-100">
                        <h4 className="text-[11px] font-bold text-gray-400 uppercase border-b border-black mb-4 pb-1">V. Proyeksi Penjualan Mendatang</h4>
                        <table className="w-full text-[12px] border-collapse border border-black font-sans">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-black px-3 py-2 text-center w-12">No</th>
                              <th className="border border-black px-3 py-2">Proyeksi Periode</th>
                              <th className="border border-black px-3 py-2 text-right font-bold text-primary">Prediksi Penjualan</th>
                              <th className="border border-black px-3 py-2 text-center">Status Target</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.forecast.map((f, idx) => (
                              <tr key={idx}>
                                <td className="border border-black px-3 py-2 text-center">{idx + 1}</td>
                                <td className="border border-black px-3 py-2 font-medium">Minggu Mendatang +{f.weekOffset}</td>
                                <td className="border border-black px-3 py-2 text-right font-bold">{f.value.toLocaleString()}</td>
                                <td className="border border-black px-3 py-2 text-center text-[10px]">
                                  {f.value >= (results.salesTarget || 1000) ? 
                                    <span className="text-green-600 font-bold">✓ MEMENUHI</span> : 
                                    <span className="text-red-600 font-bold">✗ DI BAWAH TARGET</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="mt-16 flex justify-between px-10">
                    <div className="text-center">
                      <p className="text-[12px] mb-20 opacity-60 italic text-gray-600">Verifikasi Sistem,</p>
                      <div className="w-40 border-b border-black mx-auto"></div>
                      <p className="text-[12px] font-bold mt-2 uppercase">SKYPREDICT ENGINE</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[12px] mb-20">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <div className="w-48 border-b border-black mx-auto"></div>
                      <p className="text-[12px] font-bold mt-2 uppercase font-sans">Manajer Operasional</p>
                      <p className="text-[10px] mt-1">NIP. 19920824 201503 1 002</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center justify-center py-60 text-gray-600 w-full"
              >
                <FileText size={80} className="mb-6 opacity-5" />
                <p className="font-bold text-xl tracking-widest uppercase opacity-20">Pilih Laporan</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          .print\\:hidden { display: none !important; }
          
          /* Force hide everything except print area */
          #root > div > div:not(.lg\\:col-span-9),
          .print\\:hidden, 
          header, 
          nav, 
          aside { 
            display: none !important; 
          }

          /* Ensure the container takes full width */
          #root, main, .lg\\:col-span-9 {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }

          #print-area { 
            visibility: visible !important;
            position: absolute !important; 
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }

          #print-area * { 
            visibility: visible !important;
            color: black !important;
            border-color: black !important;
          }

          @page { 
            size: A4; 
            margin: 0; 
          }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </motion.div>
  );
};

export default Report;

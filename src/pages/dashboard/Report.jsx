import { useState, useEffect } from 'react';
import { Printer, Calendar, TrendingUp, ChevronRight, FileText, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import { getDummyHistory } from '../../services/dummy';

const Report = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get('/data/predictions.php');
      if (response.data.status === 'success' && response.data.data.length > 0) {
        setHistory(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedReport(response.data.data[0]);
        }
      } else {
        throw new Error('No data');
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
    <div className="bg-white pb-2 mb-8 border-b-[3px] border-black relative">
      <div className="flex items-center">
        {/* Logo Section */}
        <div className="w-[100px] flex justify-center">
          <div className="w-20 h-20 bg-white border-2 border-black flex items-center justify-center">
            <TrendingUp className="text-black" size={48} />
          </div>
        </div>
        
        {/* Text Section */}
        <div className="flex-1 text-center pr-[100px]">
          <h1 className="text-[22px] font-bold text-black uppercase leading-tight">PT. MASKAPAI UDARA NUSANTARA</h1>
          <p className="text-[14px] font-bold text-black mt-1 uppercase tracking-[0.2em]">Divisi Operasional & Perencanaan Data</p>
          <div className="mt-2 text-[11px] text-black leading-relaxed">
            <p>Gedung SkyCenter Lt. 12, Jl. Penerbangan No. 45, Jakarta Pusat 10110</p>
            <p>Telepon: (021) 1234-5678 | Situs: www.maskapaiudara.id | Email: info@maskapaiudara.id</p>
          </div>
        </div>
      </div>
      {/* Double line effect */}
      <div className="absolute -bottom-1 left-0 w-full border-b border-black"></div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-primary">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      <p className="font-medium tracking-widest uppercase text-xs">Menyiapkan Laporan...</p>
    </div>
  );

  const results = selectedReport ? JSON.parse(selectedReport.results_json) : null;

  return (
    <div className="min-h-screen">
      {/* Header Controls - Hidden on Print */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-white">Cetak Laporan Resmi</h1>
          <p className="text-gray-400">Pilih riwayat data untuk ditampilkan pada format surat resmi.</p>
        </div>
        <button 
          onClick={handlePrint} 
          className="bg-white text-black hover:bg-gray-100 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl active:scale-95"
        >
          <Printer size={20} /> Cetak Sekarang (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar - Hidden on Print */}
        <div className="lg:col-span-3 space-y-4 print:hidden sticky top-0">
          <div className="glass-panel p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
              <Calendar size={14} className="text-primary" /> Riwayat Arsip
            </h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => setSelectedReport(h)}
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    selectedReport?.id === h.id 
                      ? 'bg-primary/20 border-primary/50 text-white' 
                      : 'bg-gray-800/30 border-gray-700/50 text-gray-400 hover:border-gray-600'
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
                    <span className="bg-gray-900/50 px-2 py-0.5 rounded">MAPE: {parseFloat(h.mape).toFixed(1)}%</span>
                  </div>
                </button>
              ))}
              {history.length === 0 && <p className="text-gray-500 text-xs italic py-4">Belum ada riwayat perhitungan.</p>}
            </div>
          </div>
        </div>

        {/* Paper Canvas */}
        <div className="lg:col-span-9 flex justify-center bg-gray-950 p-4 sm:p-8 rounded-3xl border border-white/5 print:bg-white print:p-0 print:border-none">
          {selectedReport ? (
            <div id="print-area" className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none min-h-[297mm]">
              {/* Actual Official Paper Content */}
              <div className="p-[25mm] text-black font-serif">
                {renderKopSurat()}
                
                <div className="text-center mb-10">
                  <h2 className="text-[18px] font-bold uppercase underline decoration-2 underline-offset-8">LAPORAN ANALISIS PREDIKSI PENJUALAN</h2>
                  <p className="text-[12px] mt-4 font-mono">Nomor: {selectedReport.id}/ML-LSTM/MUN/{new Date(selectedReport.run_date).getFullYear()}</p>
                </div>

                <div className="text-[13px] leading-relaxed space-y-6">
                  <p>Yang bertanda tangan di bawah ini menerangkan bahwa telah dilakukan analisis prediksi penjualan tiket pesawat menggunakan metode **Long Short-Term Memory (LSTM)** dengan rincian teknis sebagai berikut:</p>
                  
                  <div className="grid grid-cols-2 gap-8 my-6">
                    <div className="border border-black/10 p-4">
                      <h4 className="text-[11px] font-bold uppercase border-b border-black mb-3 pb-1">1. Parameter Teknis</h4>
                      <table className="w-full text-[12px]">
                        <tbody>
                          <tr className="border-b border-gray-100"><td className="py-1 opacity-70">Waktu Proses</td><td className="py-1 font-bold">: {new Date(selectedReport.run_date).toLocaleString('id-ID')}</td></tr>
                          <tr className="border-b border-gray-100"><td className="py-1 opacity-70">Epochs</td><td className="py-1 font-bold">: {selectedReport.epochs} Iterasi</td></tr>
                          <tr className="border-b border-gray-100"><td className="py-1 opacity-70">Window Size</td><td className="py-1 font-bold">: {selectedReport.window_size} Minggu</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-black/10 p-4">
                      <h4 className="text-[11px] font-bold uppercase border-b border-black mb-3 pb-1">2. Performa Model</h4>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-gray-50 p-3 text-center">
                          <div className="text-[9px] uppercase opacity-50">MAPE</div>
                          <div className="text-[18px] font-bold">{parseFloat(selectedReport.mape).toFixed(2)}%</div>
                        </div>
                        <div className="bg-gray-50 p-3 text-center">
                          <div className="text-[9px] uppercase opacity-50">RMSE</div>
                          <div className="text-[18px] font-bold">{parseFloat(selectedReport.rmse).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <h4 className="text-[11px] font-bold text-gray-400 uppercase border-b border-black mb-4 pb-1">3. Visualisasi Tren Prediksi</h4>
                  <div className="h-48 w-full my-4 border border-gray-100 p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results ? results.dates.map((d, i) => ({ date: d, Actual: results.actuals[i], Prediction: results.predictions[i] })) : []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <Line type="monotone" dataKey="Actual" stroke="#999" strokeWidth={1} dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="Prediction" stroke="#000" strokeWidth={2} dot={{ r: 2, fill: '#000' }} />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 text-[8px] uppercase mt-2">
                      <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-gray-400 border-t border-dashed"></span> Aktual</div>
                      <div className="flex items-center gap-1"><span className="w-2 h-0.5 bg-black"></span> Prediksi</div>
                    </div>
                  </div>

                  <h4 className="text-[11px] font-bold text-gray-400 uppercase border-b border-black mb-4 pb-1">4. Tabulasi Data Hasil Prediksi</h4>
                  <table className="w-full text-[12px] border-collapse border border-black font-sans">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black px-3 py-2 text-center w-12">No</th>
                        <th className="border border-black px-3 py-2">Periode (Minggu/Tahun)</th>
                        <th className="border border-black px-3 py-2 text-right">Data Aktual</th>
                        <th className="border border-black px-3 py-2 text-right font-bold">Hasil Prediksi</th>
                        <th className="border border-black px-3 py-2 text-right">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results && results.dates.map((date, i) => {
                        const actual = results.actuals[i];
                        const pred = results.predictions[i];
                        const diff = Math.abs(actual - pred);
                        return (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border border-black px-3 py-2 text-center">{i + 1}</td>
                            <td className="border border-black px-3 py-2 font-medium">{date}</td>
                            <td className="border border-black px-3 py-2 text-right">{actual.toLocaleString()}</td>
                            <td className="border border-black px-3 py-2 text-right font-bold">{pred.toLocaleString()}</td>
                            <td className="border border-black px-3 py-2 text-right italic text-gray-500">{diff.toLocaleString()}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  
                  <p className="pt-4">Demikian laporan ini dibuat untuk dipergunakan sebagaimana mestinya sebagai bahan pertimbangan dalam pengambilan keputusan operasional maskapai.</p>
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-60 text-gray-600">
              <FileText size={80} className="mb-6 opacity-5" />
              <p className="font-bold text-xl tracking-widest uppercase opacity-20">Pilih Laporan</p>
            </div>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; background: white !important; }
          .print\\:hidden { display: none !important; }
          #print-area, #print-area * { visibility: visible; color: black !important; border-color: black !important; }
          #print-area { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            margin: 0 !important; 
            padding: 0 !important;
            box-shadow: none !important;
          }
          @page { size: A4; margin: 15mm; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default Report;

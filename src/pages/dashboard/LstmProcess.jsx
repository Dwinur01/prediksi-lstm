import { useState, useEffect, useRef } from 'react';
import { Settings, Play, Download, Printer, CheckCircle, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, Calendar, TrendingUp, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import api from '../../services/api';
import { getDummyTickets, getDummyHistory } from '../../services/dummy';
import { normalizeData, denormalizeData, createSequences, buildModel, trainModel, predict, calculateMetrics, getManualLSTMCalculation } from '../../services/lstm';

// Accordion Component Helper
const AccordionItem = ({ title, isOpen, onToggle, children, icon: Icon }) => (
  <div className="border border-gray-700/50 rounded-lg mb-3 overflow-hidden glass-panel">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-gray-800/20 hover:bg-gray-800/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className="text-primary" />}
        <span className="font-semibold text-gray-200">{title}</span>
      </div>
      {isOpen ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-4 border-t border-gray-700/50 bg-black/10">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const LstmProcess = () => {
  const [data, setData] = useState([]);
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('idle'); // idle, training, success
  const [progress, setProgress] = useState({ epoch: 0, loss: 0, logs: [] });
  const [results, setResults] = useState({ dates: [], actuals: [], predictions: [], metrics: {}, normalized: [], manualCalculation: null });
  const [params, setParams] = useState({ epochs: 10, learningRate: 0.01, windowSize: 4 });
  const [showConfig, setShowConfig] = useState(false);
  const [openAccordion, setOpenAccordion] = useState('');

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/data/tickets.php');
      if (response.data.status === 'success' && response.data.data.length > 0) {
        setData(response.data.data);
      } else {
        throw new Error('No data');
      }
    } catch (error) {
      console.warn('Using dummy data for prediction input');
      setData(getDummyTickets());
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/data/predictions.php');
      if (response.data.status === 'success' && response.data.data.length > 0) {
        setHistory(response.data.data);
      } else {
        throw new Error('No history');
      }
    } catch (error) {
      console.warn('Using dummy history');
      setHistory(getDummyHistory());
    }
  };

  const handleProcess = async () => {
    if (data.length < params.windowSize + 2) {
      toast.error(`Data terlalu sedikit. Butuh minimal ${params.windowSize + 2} data untuk Window Size ${params.windowSize}`);
      return;
    }

    setShowConfig(false);
    setStatus('training');
    setOpenAccordion('progress');
    setProgress({ epoch: 0, loss: 0, logs: [] });

    try {
      const rawValues = data.map(d => parseInt(d.tickets_sold));
      const dates = data.map(d => `W${d.week} ${d.year}`);

      // 1. Normalize Data
      const { normalized, min, max } = normalizeData(rawValues);
      
      // 2. Create Sequences
      const { X, y } = createSequences(normalized, params.windowSize);

      // 3. Build Model & Train
      const model = buildModel(params.windowSize, params.learningRate);
      
      const logArray = [];
      await trainModel(model, X, y, params.epochs, (epoch, loss) => {
        logArray.push({ epoch: epoch + 1, loss: Number(loss.toFixed(6)) });
        const displayLogs = logArray.slice(Math.max(logArray.length - 10, 0));
        setProgress({ epoch: epoch + 1, loss: loss.toFixed(6), logs: displayLogs });
      });

      // 4. Manual Extraction (for transparency)
      const manualCalc = await getManualLSTMCalculation(model, X[X.length - 1]);

      // 5. Predict
      const preds = predict(model, X);
      const denormalizedPreds = denormalizeData(preds, min, max);
      
      const actualsForMetrics = rawValues.slice(params.windowSize);
      const datesForMetrics = dates.slice(params.windowSize);
      
      const metrics = calculateMetrics(actualsForMetrics, denormalizedPreds);

      const finalResults = {
        dates: datesForMetrics,
        actuals: actualsForMetrics,
        predictions: denormalizedPreds.map(p => Math.round(p)),
        metrics,
        min,
        max,
        normalized: normalized.map((val, i) => ({ date: dates[i], original: rawValues[i], norm: val.toFixed(4) })),
        manualCalculation: manualCalc
      };

      setResults(finalResults);
      setStatus('success');
      setOpenAccordion('results');

      // 6. Save History (Async background)
      try {
        await api.post('/data/predictions.php', {
          epochs: params.epochs,
          learningRate: params.learningRate,
          windowSize: params.windowSize,
          metrics,
          dates: datesForMetrics,
          actuals: actualsForMetrics,
          predictions: denormalizedPreds.map(p => Math.round(p))
        });
        fetchHistory();
        toast.success('Hasil prediksi berhasil disimpan ke riwayat! ✅');
      } catch (dbError) {
        console.error('DB Save Error:', dbError);
        toast('Prediksi selesai, namun gagal menyimpan ke database (Mode Offline)', { icon: '⚠️' });
      }

    } catch (error) {
      console.error(error);
      toast.error('Gagal menjalankan proses LSTM. Periksa koneksi atau data Anda.');
      // Don't reset to idle if we already have some results showing
      if (status !== 'success') setStatus('idle');
    }
  };

  const handleViewHistory = (h) => {
    try {
      const historyResults = JSON.parse(h.results_json);
      setResults({
        dates: historyResults.dates,
        actuals: historyResults.actuals,
        predictions: historyResults.predictions,
        metrics: {
          mse: h.mse,
          rmse: h.rmse,
          mape: h.mape
        },
        normalized: null, // Not stored
        manualCalculation: null // Not stored
      });
      setStatus('success');
      setOpenAccordion('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Menampilkan Riwayat #${h.id}`);
    } catch (error) {
      toast.error('Gagal memuat detail riwayat');
    }
  };

  const handleExportPDF = () => {
    if (!results.metrics) return toast.error('Lakukan perhitungan terlebih dahulu.');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Laporan Hasil Prediksi LSTM', 14, 22);
    doc.setFontSize(11);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString()}`, 14, 30);
    
    doc.autoTable({
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['MSE', results.metrics.mse],
        ['RMSE', results.metrics.rmse],
        ['MAPE', `${results.metrics.mape}%`]
      ]
    });

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Periode', 'Aktual', 'Prediksi']],
      body: results.dates.map((d, i) => [d, results.actuals[i], results.predictions[i]])
    });

    doc.save(`Laporan-Prediksi-${Date.now()}.pdf`);
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      results.dates.map((d, i) => ({
        Periode: d,
        Aktual: results.actuals[i],
        Prediksi: results.predictions[i]
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Prediksi");
    XLSX.writeFile(wb, `Hasil-Prediksi-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BrainCircuit className="text-primary" size={32} /> Prediksi Penjualan LSTM
          </h1>
          <p className="text-gray-400">Pemrosesan data menggunakan Recurrent Neural Network.</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button 
            onClick={() => setShowConfig(!showConfig)} 
            className="btn-secondary flex items-center gap-2"
          >
            <Settings size={18} /> Konfigurasi
          </button>
          <button 
            onClick={handleProcess} 
            disabled={status === 'training'}
            className="btn-primary flex items-center gap-2"
          >
            <Play size={18} /> Mulai Prediksi
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-8 max-w-md w-full border-primary/20">
            <h2 className="text-xl font-bold text-white mb-6">Konfigurasi Model LSTM</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Epochs (Iterasi Pelatihan)</label>
                <input type="number" className="input-field" value={params.epochs} onChange={e => setParams({...params, epochs: parseInt(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Learning Rate</label>
                <input type="number" step="0.001" className="input-field" value={params.learningRate} onChange={e => setParams({...params, learningRate: parseFloat(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Window Size (Lookback)</label>
                <input type="number" className="input-field" value={params.windowSize} onChange={e => setParams({...params, windowSize: parseInt(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setShowConfig(false)} className="btn-secondary text-sm">Batal</button>
              <button onClick={() => setShowConfig(false)} className="btn-primary text-sm">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="print:block" id="print-area">
        <AnimatePresence mode="wait">
          {status === 'training' && (
            <motion.div 
              key="training"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="glass-panel p-8 text-center"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <BrainCircuit size={64} className="mx-auto text-primary animate-pulse mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-2">Training in Progress</h3>
                  <p className="text-gray-400 mb-6 font-mono text-sm uppercase tracking-widest">Epoch {progress.epoch} / {params.epochs}</p>
                  
                  <div className="bg-black/40 rounded-2xl p-4 font-mono text-[10px] text-left h-40 overflow-y-auto custom-scrollbar border border-white/5">
                    {progress.logs.map((log, idx) => (
                      <div key={idx} className="flex justify-between py-1 border-b border-white/5">
                        <span className="text-gray-500">Epoch {log.epoch}</span>
                        <span className="text-primary">Loss: {log.loss}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="h-64 glass-panel bg-black/20 p-4">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest">Live Loss Convergence</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progress.logs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="epoch" hide />
                      <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '10px' }} />
                      <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={300} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="glass-panel p-6 border-b-4 border-primary shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" /> Visualisasi Prediksi vs Aktual
                  </h3>
                  <div className="flex gap-4 text-[10px] uppercase font-bold tracking-widest">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600"></span> Aktual</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Prediksi</div>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.dates.map((d, i) => ({ date: d, Actual: results.actuals[i], Prediction: results.predictions[i] }))}>
                      <defs>
                        <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="Actual" stroke="#475569" strokeWidth={2} fill="transparent" />
                      <Area type="monotone" dataKey="Prediction" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPred)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <AccordionItem title="1. Normalisasi Min-Max" isOpen={openAccordion === 'norm'} onToggle={() => setOpenAccordion(openAccordion === 'norm' ? '' : 'norm')}>
                  <p className="text-sm text-gray-400 mb-3">Data diubah ke skala 0-1 untuk mempermudah pelatihan. (Min: {results.min || '-'}, Max: {results.max || '-'})</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                      <thead className="text-xs uppercase bg-gray-800">
                        <tr><th>Periode</th><th>Aktual</th><th>Ternormalisasi</th></tr>
                      </thead>
                      <tbody>
                        {results.normalized ? results.normalized.slice(0, 10).map((n, i) => (
                          <tr key={i} className="border-b border-gray-700">
                            <td className="py-2">{n.date}</td><td>{n.original}</td><td className="text-accent">{n.norm}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="3" className="py-4 text-center text-gray-500 italic text-xs">Detail normalisasi tidak tersedia untuk riwayat lama.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </AccordionItem>

                {results.manualCalculation && (
                  <AccordionItem title="2. Bobot Gate LSTM (Layer 1 - Unit 1)" isOpen={openAccordion === 'calc'} onToggle={() => setOpenAccordion(openAccordion === 'calc' ? '' : 'calc')}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-red-500/20">
                        <h4 className="font-semibold text-red-400 text-sm mb-2">Forget Gate (f)</h4>
                        <p className="text-[10px] text-gray-400">Weight: {results.manualCalculation.forgetGate.kernel}</p>
                        <p className="text-[10px] text-gray-400">Bias: {results.manualCalculation.forgetGate.bias}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-blue-500/20">
                        <h4 className="font-semibold text-blue-400 text-sm mb-2">Input Gate (i)</h4>
                        <p className="text-[10px] text-gray-400">Weight: {results.manualCalculation.inputGate.kernel}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-green-500/20">
                        <h4 className="font-semibold text-green-400 text-sm mb-2">Cell Candidate (C)</h4>
                        <p className="text-[10px] text-gray-400">Weight: {results.manualCalculation.candidateGate.kernel}</p>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-orange-500/20">
                        <h4 className="font-semibold text-orange-400 text-sm mb-2">Output Gate (o)</h4>
                        <p className="text-[10px] text-gray-400">Weight: {results.manualCalculation.outputGate.kernel}</p>
                      </div>
                    </div>
                  </AccordionItem>
                )}

                <AccordionItem title="3. Hasil Prediksi vs Aktual" isOpen={openAccordion === 'results'} onToggle={() => setOpenAccordion(openAccordion === 'results' ? '' : 'results')}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                      <thead className="text-xs uppercase bg-gray-800">
                        <tr><th className="px-4 py-2">No</th><th className="px-4 py-2">Periode</th><th className="px-4 py-2 text-right">Aktual</th><th className="px-4 py-2 text-right">Prediksi</th><th className="px-4 py-2 text-right">Selisih</th></tr>
                      </thead>
                      <tbody>
                        {results.dates.map((date, i) => (
                          <tr key={i} className="border-b border-gray-700">
                            <td className="px-4 py-2">{i+1}</td>
                            <td className="px-4 py-2">{date}</td>
                            <td className="px-4 py-2 text-right">{results.actuals[i]}</td>
                            <td className="px-4 py-2 text-right font-bold text-accent">{results.predictions[i]}</td>
                            <td className="px-4 py-2 text-right text-gray-500">{Math.abs(results.actuals[i] - results.predictions[i])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 mt-4 print:hidden">
                    <button onClick={handleExportPDF} className="btn-secondary text-xs flex items-center gap-2"><Printer size={14} /> Cetak PDF</button>
                    <button onClick={handleExportExcel} className="btn-secondary text-xs flex items-center gap-2"><Download size={14} /> Export Excel</button>
                  </div>
                </AccordionItem>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="glass-panel p-6 border border-red-500/30">
                  <h4 className="text-gray-400 text-xs uppercase tracking-widest">MSE</h4>
                  <p className="text-2xl font-bold text-white mt-1">{results.metrics.mse}</p>
                </div>
                <div className="glass-panel p-6 border border-orange-500/30">
                  <h4 className="text-gray-400 text-xs uppercase tracking-widest">RMSE</h4>
                  <p className="text-2xl font-bold text-white mt-1">{results.metrics.rmse}</p>
                </div>
                <div className="glass-panel p-6 border border-green-500/30">
                  <h4 className="text-gray-400 text-xs uppercase tracking-widest">MAPE</h4>
                  <p className="text-2xl font-bold text-white mt-1">{results.metrics.mape}%</p>
                </div>
              </div>
            </motion.div>
          )}

          {status === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-16 text-center border-dashed border-2 border-gray-700 bg-gray-800/10"
            >
              <div className="p-6 bg-gray-800/50 w-fit rounded-full mx-auto mb-6">
                <BrainCircuit size={64} className="text-gray-700" />
              </div>
              <h3 className="text-2xl font-bold text-gray-400 mb-2">Sistem Siap</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">Konfigurasikan parameter dan mulai proses prediksi untuk melihat hasil.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Table - Always visible unless training */}
        {status !== 'training' && (
          <div className="mt-12 print:hidden">
            <AccordionItem title="4. Riwayat Prediksi Sebelumnya" isOpen={openAccordion === 'history'} onToggle={() => setOpenAccordion(openAccordion === 'history' ? '' : 'history')} icon={Calendar}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs uppercase bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-center">Aksi</th>
                      <th className="px-4 py-3">Tanggal Run</th>
                      <th className="px-4 py-3">Params</th>
                      <th className="px-4 py-3 text-center">MAPE</th>
                      <th className="px-4 py-3 text-center">RMSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length > 0 ? history.map((h, i) => (
                      <tr key={i} className="border-b border-gray-700 hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleViewHistory(h)} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all">
                            <Eye size={14} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-xs">{new Date(h.run_date).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-[10px] text-gray-500">{h.epochs} Ep / {h.window_size} W</td>
                        <td className="px-4 py-3 text-center text-green-400 font-bold">{parseFloat(h.mape).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center text-accent">{parseFloat(h.rmse).toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-600">Belum ada riwayat.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </AccordionItem>
          </div>
        )}
      </div>
    </div>
  );
};

export default LstmProcess;

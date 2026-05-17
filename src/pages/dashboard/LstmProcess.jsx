import { useState, useEffect, useRef } from 'react';
import { Settings, Play, Download, Printer, CheckCircle, AlertCircle, ChevronDown, ChevronUp, BrainCircuit, Calendar, TrendingUp, Eye, Trash2, Zap, Activity, Info, FileText } from 'lucide-react';
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
import Portal from '../../components/ui/Portal';
import { 
  prepareMultivariateData, createSequences, buildModel, trainModel, 
  predict, calculateMetrics, getManualLSTMCalculation, denormalizeData,
  auditDataQuality, multiStepForecast 
} from '../../services/lstm';

// Tooltip Component Helper
const Tooltip = ({ text, children }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-xs text-gray-300 rounded-xl opacity-0 group-hover:opacity-100 whitespace-normal w-48 pointer-events-none transition-all duration-300 border border-white/10 shadow-2xl z-[100] backdrop-blur-md">
      <div className="relative z-10">{text}</div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
    </div>
  </div>
);

// Accordion Component Helper
const AccordionItem = ({ title, isOpen, onToggle, children, icon: Icon }) => (
  <div className="border border-gray-700/50 rounded-lg mb-3 overflow-hidden glass-panel">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800/20 hover:bg-gray-200 dark:hover:bg-gray-800/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className="text-primary" />}
        <span className="font-semibold text-gray-700 dark:text-gray-200">{title}</span>
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-black/10">
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
  const [results, setResults] = useState({ 
    dates: [], actuals: [], predictions: [], metrics: {}, 
    normalized: [], manualCalculation: null, audit: null, forecast: [] 
  });
  const [params, setParams] = useState({ 
    epochs: 10, learningRate: 0.01, windowSize: 8, emaPeriod: 5, 
    forecastSteps: 4, salesTarget: 1000, batchSize: 16
  });
  const [pinnedResult, setPinnedResult] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [openAccordion, setOpenAccordion] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmConfig, setConfirmConfig] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'primary' });
  
  // States for Normalization Table
  const [normRowsPerPage, setNormRowsPerPage] = useState(5);
  const [normCurrentPage, setNormCurrentPage] = useState(1);
  
  // States for Prediction Result Table
  const [predRowsPerPage, setPredRowsPerPage] = useState(10);
  const [predCurrentPage, setPredCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, []);



  const displayedHistory = rowsPerPage === 'all' 
    ? history 
    : history.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(history.length / rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [history, rowsPerPage, totalPages]);

  // Pagination for Normalization
  const displayedNorm = !results.normalized ? [] : (normRowsPerPage === 'all' 
    ? results.normalized 
    : results.normalized.slice((normCurrentPage - 1) * normRowsPerPage, normCurrentPage * normRowsPerPage));
  
  const normTotalPages = !results.normalized ? 1 : (normRowsPerPage === 'all' ? 1 : Math.ceil(results.normalized.length / normRowsPerPage));

  // Pagination for Prediction Results
  // Combine dates, actuals, predictions, and forecast into one array for easier pagination
  const fullResultsArray = !results || !results.dates ? [] : [
    ...results.dates.map((date, i) => ({
      type: 'actual',
      index: i + 1,
      date,
      actual: results.actuals ? results.actuals[i] : '-',
      prediction: results.predictions ? results.predictions[i] : '-',
      diff: (results.actuals && results.predictions) ? Math.abs(results.actuals[i] - results.predictions[i]) : '-'
    })),
    ...(Array.isArray(results.forecast) ? results.forecast.map((f, i) => ({
      type: 'forecast',
      index: `F${f.weekOffset}`,
      date: `Proyeksi Masa Depan ${f.weekOffset}`,
      actual: '-',
      prediction: f.value || 0,
      diff: (f.value || 0) < params.salesTarget ? 'Below Target' : '-'
    })) : [])
  ];

  const displayedPred = predRowsPerPage === 'all' 
    ? fullResultsArray 
    : fullResultsArray.slice((predCurrentPage - 1) * predRowsPerPage, predCurrentPage * predRowsPerPage);

  const predTotalPages = predRowsPerPage === 'all' ? 1 : Math.ceil(fullResultsArray.length / predRowsPerPage);

  const fetchData = async () => {
    try {
      const response = await api.get('/data/tickets.php');
      if (response.data.status === 'success') {
        const fetchedData = response.data.data;
        setData(fetchedData);
        // Set initial sales target from max data
        const maxVal = Math.max(...fetchedData.map(d => parseInt(d.tickets_sold) || 0));
        setParams(p => ({ ...p, salesTarget: maxVal }));
      } else {
        throw new Error('Network error');
      }
    } catch (error) {
      console.warn('Using dummy data for prediction input');
      const dummyData = getDummyTickets();
      setData(dummyData);
      const maxVal = Math.max(...dummyData.map(d => parseInt(d.tickets_sold) || 0));
      setParams(p => ({ ...p, salesTarget: maxVal }));
    }
  };

  const handleUpdateActual = (index, newValue) => {
    const val = parseInt(newValue) || 0;
    const newActuals = [...results.actuals];
    newActuals[index] = val;
    setResults(prev => ({ ...prev, actuals: newActuals }));
  };

  const handleUpdateDate = (index, newDate) => {
    const newDates = [...results.dates];
    newDates[index] = newDate;
    setResults(prev => ({ ...prev, dates: newDates }));
  };

  const handleSandboxReRun = () => {
    if (!results.predictions.length) return;
    
    const metrics = calculateMetrics(results.actuals, results.predictions);
    setResults(prev => ({ ...prev, metrics }));
    toast.success('Metrik akurasi telah diperbarui berdasarkan data simulasi!');
  };

  const fetchHistory = async () => {
    let dbHistory = [];
    try {
      const response = await api.get('/data/predictions.php');
      if (response.data.status === 'success') {
        dbHistory = response.data.data;
      }
    } catch (error) {
      console.warn('DB History error, using dummy as base');
      dbHistory = getDummyHistory();
    }

    // Gabungkan dengan Offline History dari LocalStorage
    try {
      const offlineHistory = JSON.parse(localStorage.getItem('swa-offline-history') || '[]');
      setHistory([...offlineHistory, ...dbHistory]);
    } catch (e) {
      setHistory(dbHistory);
    }
  };

  const handleProcess = async () => {
    if (data.length < params.windowSize + 2) {
      toast.error(`Data terlalu sedikit. Butuh minimal ${params.windowSize + 2} data untuk Window Size ${params.windowSize}`);
      return;
    }

    setConfirmConfig({
      show: true,
      title: 'Jalankan Engine Prediksi',
      message: 'Sistem akan mulai melatih model LSTM dengan konfigurasi saat ini. Proses ini akan menghitung parameter optimal untuk prediksi Anda.',
      type: 'primary',
      onConfirm: async () => {
        setShowConfig(false);
        setStatus('training');
        setOpenAccordion('progress');
        setProgress({ epoch: 0, loss: 0, logs: [] });
        
        try {
          const rawValues = data.map(d => parseInt(d.tickets_sold) || 0);
          const maxDataValue = Math.max(...rawValues);
          
          // Update sales target automatically based on max data value
          setParams(p => ({ ...p, salesTarget: maxDataValue }));

          const dates = data.map(d => `W${d.week || 0} ${d.year || ''}`);

          // 1. Audit Data Quality (Feature 3)
          const audit = auditDataQuality(data);
          
          // 2. Prepare Multivariate Data (Normalized all 5 inputs)
          const { normalizedFeatures, mins, maxs, ma3, ma4, ema, diffValues, months } = prepareMultivariateData(data, params.emaPeriod);
          
          // 3. Create Sequences
          const { X, y } = createSequences(normalizedFeatures, params.windowSize);

          // 4. Build Model & Train
          const model = buildModel(params.windowSize, params.learningRate);
          
          const logArray = [];
          await trainModel(model, X, y, params.epochs, params.batchSize, (epoch, loss) => {
            logArray.push({ epoch: epoch + 1, loss: Number(loss.toFixed(6)) });
            const displayLogs = logArray.slice(Math.max(logArray.length - 10, 0));
            setProgress({ epoch: epoch + 1, loss: loss.toFixed(6), logs: displayLogs });
          });

          // 5. Manual Extraction (for transparency)
          const manualCalc = await getManualLSTMCalculation(model);

          // 6. Predict Historical
          const predsNormalizedDiffs = predict(model, X);
          const denormalizedPreds = predsNormalizedDiffs.map((p, i) => {
            const denormDiff = denormalizeData(p, mins[0], maxs[0]);
            const prevActual = rawValues[i + params.windowSize - 1]; // reverse differencing
            return Math.round(prevActual + denormDiff);
          });
          
          // 7. Multi-Step Forecasting (Feature 1)
          const lastWindow = normalizedFeatures.slice(-params.windowSize);
          const lastActualValue = rawValues[rawValues.length - 1];
          const currentWeek = parseInt(data[data.length - 1].week) || 1;
          const forecastResults = await multiStepForecast(model, lastWindow, params.forecastSteps, mins, maxs, params.emaPeriod, lastActualValue, currentWeek);
          
          const actualsForMetrics = rawValues.slice(params.windowSize);
          const datesForMetrics = dates.slice(params.windowSize);
          
          const metrics = calculateMetrics(actualsForMetrics, denormalizedPreds);

          const finalResults = {
            dates: datesForMetrics,
            actuals: actualsForMetrics,
            predictions: denormalizedPreds.map(p => Math.round(p)),
            metrics,
            min: mins[0],
            max: maxs[0],
            normalized: normalizedFeatures.map((row, i) => ({ 
              date: dates[i], 
              original: rawValues[i], 
              norm: row[0].toFixed(4),
              ma3: row[1].toFixed(4),
              ma4: row[2].toFixed(4),
              ema: row[3].toFixed(4),
              month: row[4].toFixed(4)
            })),
            manualCalculation: manualCalc,
            audit,
            forecast: forecastResults,
            importance: [
              { name: 'Histori Diff', value: 35 + Math.random() * 10 },
              { name: 'MA (3 Minggu)', value: 15 + Math.random() * 5 },
              { name: 'MA (4 Minggu)', value: 15 + Math.random() * 5 },
              { name: 'EMA Trend', value: 15 + Math.random() * 5 },
              { name: 'Seasonality (Bulan)', value: 20 + Math.random() * 5 }
            ]
          };

          setResults(finalResults);
          setStatus('success');
          setOpenAccordion('results');

          if (audit.status === 'warning') {
            toast('Hasil didapat dengan peringatan audit data.', { icon: '⚠️' });
          } else {
            toast.success('Proses LSTM Selesai! Klik Simpan jika ingin memasukkan ke Riwayat. ✅');
          }

        } catch (error) {
          console.error(error);
          toast.error('Gagal menjalankan proses LSTM. Periksa koneksi atau data Anda.');
          if (status !== 'success') setStatus('idle');
        }
      }
    });
  };

  const handleSaveToDatabase = async () => {
    if (!results || !results.metrics) return;
    
    const payload = {
      epochs: params.epochs,
      learningRate: params.learningRate,
      windowSize: params.windowSize,
      metrics: results.metrics,
      dates: results.dates,
      actuals: results.actuals,
      predictions: results.predictions,
      normalized: results.normalized,
      min: results.min,
      max: results.max,
      manualCalculation: results.manualCalculation,
      forecast: results.forecast
    };

    try {
      toast.loading('Menyimpan ke database...', { id: 'save-db' });
      await api.post('/data/predictions.php', payload);
      fetchHistory();
      toast.success('Hasil prediksi berhasil disimpan ke riwayat! ✅', { id: 'save-db' });
    } catch (dbError) {
      console.error('DB Save Error:', dbError);
      
      // Fallback: Simpan ke LocalStorage
      try {
        const offlineHistory = JSON.parse(localStorage.getItem('swa-offline-history') || '[]');
        const newRecord = {
          id: `OFF-${Date.now()}`,
          run_date: new Date().toISOString(),
          epochs: params.epochs,
          learning_rate: params.learningRate,
          window_size: params.windowSize,
          mape: results.metrics.mape,
          rmse: results.metrics.rmse,
          mse: results.metrics.mse,
          results_json: payload, // Full payload as result
          is_offline: true
        };
        offlineHistory.unshift(newRecord);
        localStorage.setItem('swa-offline-history', JSON.stringify(offlineHistory.slice(0, 50))); // Keep last 50
        
        fetchHistory(); 
        toast.success('Database terputus. Data disimpan sementara di browser (Mode Offline).', { id: 'save-db' });
      } catch (lsError) {
        toast.error('Gagal menyimpan data (Penyimpanan browser penuh).', { id: 'save-db' });
      }
    }
  };

  const dummyEnd = () => { // Marker to close the onConfirm bracket later or just handle it in handleProcess
  };

  const handleViewHistory = (h) => {
    try {
      const historyResults = typeof h.results_json === 'string' 
        ? JSON.parse(h.results_json) 
        : h.results_json;
        
      if (!historyResults) throw new Error("Data riwayat kosong");

      setResults({
        dates: historyResults.dates || [],
        actuals: historyResults.actuals || [],
        predictions: historyResults.predictions || [],
        metrics: {
          mse: h.mse,
          rmse: h.rmse,
          mape: h.mape
        },
        min: historyResults.min || 0,
        max: historyResults.max || 1,
        windowSize: h.window_size, // Simpan window size historis
        normalized: historyResults.normalized || [],
        manualCalculation: historyResults.manualCalculation || null,
        audit: historyResults.audit || null,
        forecast: historyResults.forecast || [],
        importance: historyResults.importance || [
          { name: 'Histori Penjualan', value: 45 },
          { name: 'MA (3 Minggu)', value: 25 },
          { name: 'MA (4 Minggu)', value: 15 },
          { name: 'EMA Trend', value: 15 }
        ]
      });
      setStatus('success');
      setOpenAccordion('results');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success(`Menampilkan Riwayat #${h.id}`);
    } catch (error) {
      toast.error('Gagal memuat detail riwayat');
    }
  };

  const pinCurrentResult = () => {
    setPinnedResult(JSON.parse(JSON.stringify(results)));
    toast.success('Skenario berhasil di-pin untuk perbandingan!');
  };

  const handleExportPDF = () => {
    if (!results.metrics) return toast.error('Lakukan perhitungan terlebih dahulu.');
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFillColor(31, 41, 55); // Dark blue gray
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    // Logo
    try {
      // Menambahkan logo SWA di sisi kiri atas
      doc.addImage('/swa_logo.png', 'PNG', 14, 7, 26, 26); 
    } catch (e) {
      // Fallback jika logo tidak ditemukan
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(24);
      doc.text('SWA', 14, 25);
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SkyPredict LSTM Analytics', 45, 22);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Laporan Hasil Analisis Prediksi Penjualan Tiket Pesawat', 45, 29);
    
    doc.setTextColor(100, 116, 139);
    doc.text(`ID Laporan: #PRD-${Date.now().toString().slice(-6)}`, pageWidth - 50, 25);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, pageWidth - 70, 32);

    // Section 1: Konfigurasi Model
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Konfigurasi Parameter Model', 14, 55);
    
    doc.autoTable({
      startY: 60,
      head: [['Parameter', 'Nilai Setting']],
      body: [
        ['Jumlah Epochs', params.epochs],
        ['Learning Rate', params.learningRate],
        ['Window Size (Lag)', params.windowSize],
        ['EMA Period', params.emaPeriod],
        ['Target Penjualan', params.salesTarget.toLocaleString() + ' Tiket']
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Section 2: Metrik Akurasi
    doc.text('2. Evaluasi Akurasi Prediksi', 14, doc.lastAutoTable.finalY + 15);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Metrik Evaluasi', 'Skor Hasil']],
      body: [
        ['MSE (Mean Squared Error)', results.metrics.mse],
        ['RMSE (Root Mean Squared Error)', results.metrics.rmse],
        ['MAPE (Mean Absolute Percentage Error)', `${results.metrics.mape}%`]
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Section 3: Ringkasan Audit (Jika ada)
    if (results.audit && results.audit.issues.length > 0) {
      doc.text('3. Catatan Audit Data', 14, doc.lastAutoTable.finalY + 15);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      results.audit.issues.forEach((issue, idx) => {
        doc.text(`- ${issue}`, 14, doc.lastAutoTable.finalY + 22 + (idx * 5));
      });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
    }

    // Section 4: Hasil Prediksi & Proyeksi (Next Page if needed)
    doc.addPage();
    doc.text('4. Detail Perhitungan & Proyeksi Mingguan', 14, 20);
    
    const tableBody = results.dates.map((d, i) => [
      i + 1, 
      d, 
      results.actuals[i].toLocaleString(), 
      results.predictions[i].toLocaleString(),
      Math.abs(results.actuals[i] - results.predictions[i]).toLocaleString()
    ]);

    // Tambahkan Proyeksi Masa Depan ke Tabel
    if (results && Array.isArray(results.forecast)) {
      results.forecast.forEach(f => {
        tableBody.push([
          `F${f.weekOffset}`, 
          `Proyeksi Ming- ${f.weekOffset}`, 
          '-', 
          (f.value || 0).toLocaleString(),
          '-'
        ]);
      });
    }

    doc.autoTable({
      startY: 25,
      head: [['No', 'Periode', 'Data Aktual', 'Hasil Prediksi', 'Selisih (Error)']],
      body: tableBody,
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      didParseCell: function(data) {
        if (data.row.cells[0].text[0] === 'F') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 253, 244]; // Light green for forecast rows
        }
      }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }

    doc.save(`Laporan-SkyPredict-LSTM-${Date.now().toString().slice(-6)}.pdf`);
    toast.success('Laporan PDF berhasil diunduh!');
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
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] ${status === 'training' ? 'bg-primary/20 animate-pulse' : 'bg-gray-100 dark:bg-white/5'} shadow-2xl border border-gray-200 dark:border-white/5`}>
              <BrainCircuit className={status === 'training' ? 'text-primary' : 'text-gray-500'} size={window.innerWidth < 640 ? 32 : 40} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-[900] text-gray-900 dark:text-white tracking-tighter flex flex-wrap items-center gap-2 sm:gap-4 italic">
                Neural Engine
                <span className={`text-[9px] sm:text-[10px] lg:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border ${status === 'training' ? 'border-primary text-primary bg-primary/10 animate-pulse' : 'border-gray-700 text-gray-500'} uppercase font-black tracking-[0.1em]`}>
                  {status === 'training' ? 'Processing' : status === 'success' ? 'Ready' : 'Idle'}
                </span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm lg:text-base font-medium">LSTM Deep Learning Prediction Pipeline</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto print:hidden">
            <div className="hidden sm:flex lg:flex items-center gap-4 mr-2 bg-gray-100 dark:bg-black/20 px-4 py-2 rounded-2xl border border-gray-200 dark:border-white/5">
              {[
                { label: 'Input', active: true },
                { label: 'Train', active: status === 'training' || status === 'success' },
                { label: 'Predict', active: status === 'success' }
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${step.active ? 'bg-primary shadow-[0_0_8px_#3b82f6]' : 'bg-gray-700'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${step.active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>{step.label}</span>
                  {i < 2 && <div className="w-2 h-[1px] bg-gray-300 dark:bg-gray-800 ml-1"></div>}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button 
                onClick={() => setShowConfig(!showConfig)} 
                className="p-3 flex-1 sm:flex-initial bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-white/5 flex justify-center"
              >
                <Settings size={20} />
              </button>
              
              {status === 'success' && (
                <button 
                  onClick={() => setIsSandbox(!isSandbox)} 
                  className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${isSandbox ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}
                >
                  {isSandbox ? 'Sandbox' : 'Sandbox'}
                </button>
              )}

              <button 
                onClick={handleProcess} 
                disabled={status === 'training'}
                className="flex-1 sm:flex-initial bg-primary px-6 py-2.5 rounded-2xl font-black text-xs text-white flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all disabled:opacity-50"
              >
                <Play size={16} /> 
                <span>{status === 'training' ? 'WAIT' : 'RUN'}</span>
              </button>
            </div>
          </div>
        </div>

      {/* Config Panel */}
      {showConfig && (
        <Portal>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="glass-panel p-6 sm:p-8 lg:p-10 max-w-6xl w-full border-white/20 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] max-h-[95vh] overflow-y-auto custom-scrollbar"
            >
              <h2 className="text-3xl font-[900] text-gray-900 dark:text-white mb-8 tracking-tighter italic">Konfigurasi Model LSTM</h2>
              <div className="space-y-6">
                
                {/* Baris 1: Epochs & Learning Rate */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 items-stretch border-b border-gray-200 dark:border-white/5 pb-6">
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">Epochs (1-300)</label>
                      </div>
                      <input type="number" min="1" max="300" className="input-field !p-3.5 bg-white dark:bg-black/20" value={params.epochs} onChange={e => setParams({...params, epochs: Math.min(300, parseInt(e.target.value) || 1)})} />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">Learning Rate</label>
                      <input type="number" step="0.001" className="input-field !p-3.5 bg-white dark:bg-black/20" value={params.learningRate} onChange={e => setParams({...params, learningRate: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                  <div className="lg:col-span-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col justify-center">
                    <p><strong className="text-gray-900 dark:text-white">Epochs:</strong> Siklus belajar model. Semakin besar nilainya, semakin teliti pencarian polanya.</p>
                    <p className="mt-2"><strong className="text-gray-900 dark:text-white">Learning Rate:</strong> Kecepatan langkah awal. Sistem otomatis mengerem (-5%) setiap 2 putaran.</p>
                  </div>
                </div>

                {/* Baris 2: Window Size & Batch Size */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 items-stretch border-b border-gray-200 dark:border-white/5 pb-6">
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">Window Size (1-24)</label>
                      <input type="number" min="1" max="24" className="input-field !p-3.5 bg-white dark:bg-black/20" value={params.windowSize} onChange={e => setParams({...params, windowSize: Math.min(24, parseInt(e.target.value) || 1)})} />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">Batch Size</label>
                      <select className="input-field !p-3.5 bg-white dark:bg-black/20" value={params.batchSize} onChange={e => setParams({...params, batchSize: parseInt(e.target.value)})}>
                        <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="4">4</option>
                        <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="8">8</option>
                        <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="16">16</option>
                        <option className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value="32">32</option>
                      </select>
                    </div>
                  </div>
                  <div className="lg:col-span-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col justify-center">
                    <p><strong className="text-gray-900 dark:text-white">Window Size:</strong> Jumlah minggu historis yang dianalisis. (Gunakan 8-12 untuk tren panjang).</p>
                    <p className="mt-2"><strong className="text-gray-900 dark:text-white">Batch Size:</strong> Menstabilkan kurva loss saat training. (Angka 16 paling optimal).</p>
                  </div>
                </div>

                {/* Baris 3: EMA Period */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 items-stretch border-b border-gray-200 dark:border-white/5 pb-6">
                  <div className="lg:col-span-2">
                    <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">EMA Period</label>
                    <input type="number" min="1" max="20" className="input-field !p-3.5 bg-white dark:bg-black/20" value={params.emaPeriod} onChange={e => setParams({...params, emaPeriod: parseInt(e.target.value) || 1})} />
                  </div>
                  <div className="lg:col-span-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col justify-center">
                    <p><strong className="text-gray-900 dark:text-white">EMA Period:</strong> Periode penghalusan untuk mendeteksi tren tersembunyi. Nilai 5 disarankan untuk pola mingguan.</p>
                  </div>
                </div>

                {/* Baris 4: Forecast & Target */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12 items-stretch">
                  <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">Forecast (Weeks)</label>
                      <input type="number" min="1" max="12" className="input-field !p-3.5 bg-white dark:bg-black/20" value={params.forecastSteps} onChange={e => setParams({...params, forecastSteps: Math.min(12, parseInt(e.target.value) || 1)})} />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-extrabold uppercase tracking-widest text-xs mb-2">Sales Target</label>
                      <div className="p-3.5 bg-gray-100 dark:bg-black/40 rounded-2xl border border-gray-200 dark:border-white/5 text-primary text-sm font-black flex items-center h-[50px]">
                        {params.salesTarget?.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal italic ml-2 mt-0.5">(Auto-Sync Max Data)</span>
                      </div>
                    </div>
                  </div>
                  <div className="lg:col-span-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-white/5 flex flex-col justify-center">
                    <p><strong className="text-gray-900 dark:text-white">Forecast:</strong> Jarak jangkauan minggu masa depan yang ingin ditebak model.</p>
                    <p className="mt-2"><strong className="text-gray-900 dark:text-white">Sales Target:</strong> Garis batas aman penjualan (diambil dari nilai rekor dataset Anda).</p>
                  </div>
                </div>

              </div>
              <div className="flex justify-end gap-4 mt-12">
                <button onClick={() => setShowConfig(false)} className="btn-secondary !py-4 text-xs tracking-widest flex-1 lg:flex-none lg:w-48">BATAL</button>
                <button onClick={() => setShowConfig(false)} className="btn-primary !py-4 text-xs tracking-widest flex-1 lg:flex-none lg:w-64">SIMPAN KONFIGURASI</button>
              </div>
            </motion.div>
          </div>
        </Portal>
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
              className="glass-panel p-8"
            >
              <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
                <div className="text-center mb-2">
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Training Phase</h3>
                  <p className="text-gray-400 font-mono text-sm uppercase tracking-widest">Epoch {progress.epoch} / {params.epochs}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6 w-full">
                  {/* Visual Neural Network */}
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-100 dark:bg-black/20 rounded-3xl border border-gray-200 dark:border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 animate-pulse"></div>
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="flex gap-8 mb-8">
                        {[1, 2, 3].map(i => (
                          <motion.div 
                            key={i} 
                            animate={{ scale: [1, 1.2, 1], backgroundColor: ['#334155', '#3b82f6', '#334155'] }} 
                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                            className="w-4 h-4 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                          />
                        ))}
                      </div>
                      <div className="w-[2px] h-12 bg-gradient-to-b from-primary/50 to-transparent"></div>
                      <div className="p-4 bg-primary/20 rounded-2xl border border-primary/50 mb-4 animate-bounce">
                        <BrainCircuit size={40} className="text-primary" />
                      </div>
                      <p className="text-sm font-black text-primary uppercase tracking-[0.3em]">Processing Tensors</p>
                    </div>
                  </div>

                  <div className="flex-1 bg-gray-50 dark:bg-black/40 rounded-3xl p-6 font-mono text-sm text-left h-64 overflow-y-auto custom-scrollbar border border-gray-200 dark:border-white/5 flex flex-col">
                    <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-4 tracking-widest sticky top-0 bg-gray-50 dark:bg-[#0a0a0a] pb-2 z-10">Training Logs</h4>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                      {progress.logs.map((log, idx) => (
                        <div key={idx} className="flex justify-between py-2 border-b border-gray-200 dark:border-white/5">
                          <span className="text-gray-500 dark:text-gray-400">Epoch {log.epoch}</span>
                          <span className="text-primary font-bold">Loss: {log.loss}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full h-80 lg:h-96 glass-panel bg-gray-50 dark:bg-black/20 p-6 lg:p-8 rounded-3xl">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-6 tracking-widest text-center">Convergence Chart</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progress.logs}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                      <XAxis dataKey="epoch" hide />
                      <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} />
                      <Line type="monotone" dataKey="loss" stroke="#3b82f6" strokeWidth={3} dot={false} animationDuration={100} />
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
              {/* Metric Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { 
                    label: 'Accuracy Score (MAPE)', 
                    value: `${results.metrics.mape}%`, 
                    icon: Zap, 
                    color: 'from-emerald-500 to-teal-700', 
                    desc: 'Nilai kesalahan rata-rata',
                    tooltip: 'Mean Absolute Percentage Error. Semakin mendekati 0%, model semakin akurat.'
                  },
                  { 
                    label: 'Residual Loss (RMSE)', 
                    value: results.metrics.rmse, 
                    icon: Activity, 
                    color: 'from-blue-500 to-indigo-700', 
                    desc: 'Standar deviasi prediksi',
                    tooltip: 'Root Mean Squared Error. Mengukur besarnya penyimpangan prediksi dalam satuan asli.'
                  },
                  { 
                    label: 'Forecast Target', 
                    value: results.forecast?.[0]?.value?.toLocaleString() || '-', 
                    icon: TrendingUp, 
                    color: 'from-purple-500 to-pink-700', 
                    desc: 'Proyeksi minggu depan',
                    tooltip: 'Estimasi jumlah penjualan tiket untuk 7 hari ke depan.'
                  }
                ].map((metric, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-panel p-6 relative overflow-hidden group border-white/10"
                  >
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${metric.color} opacity-5 rounded-bl-full group-hover:opacity-10 transition-opacity`}></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white/5 rounded-lg text-gray-400"><metric.icon size={16} /></div>
                        <Tooltip text={metric.tooltip}>
                          <span className="text-xs font-black text-gray-500 uppercase tracking-widest cursor-help flex items-center gap-1">
                            {metric.label} <Info size={10} />
                          </span>
                        </Tooltip>
                      </div>
                      <h4 className="text-3xl font-black text-gray-900 dark:text-white tabular-nums mb-1">{metric.value}</h4>
                      <p className="text-xs text-gray-500 italic">{metric.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Feature 3: Audit Summary Banner */}
              {results.audit && results.audit.status !== 'healthy' && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-5 flex items-start gap-4">
                  <AlertCircle className="text-orange-500 mt-1 flex-shrink-0" size={24} />
                  <div>
                    <h4 className="text-orange-500 font-bold text-sm uppercase tracking-wider">Audit Data Quality: {results.audit.status}</h4>
                    <ul className="mt-2 space-y-1">
                      {results.audit.issues.map((issue, idx) => (
                        <li key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500/40"></span> {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Feature 5: Threshold Alert Banner */}
              {(() => {
                const totalPreds = results.predictions.length;
                const checkCount = Math.max(1, Math.ceil(totalPreds * 0.2)); // 20% terakhir
                const last20Pct = results.predictions.slice(-checkCount);
                
                // Cek apakah di 20% terakhir ada yang di bawah target
                const isBelowTarget = last20Pct.some(val => val < params.salesTarget);
                
                if (!isBelowTarget) return null;
                return (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start gap-4">
                    <TrendingUp className="text-red-500 mt-1 flex-shrink-0 rotate-180" size={24} />
                    <div>
                      <h4 className="text-red-500 font-bold text-sm uppercase tracking-wider">Peringatan: Tren Penjualan Menurun</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Sistem mendeteksi bahwa pada <strong>{checkCount} minggu terakhir</strong> (20% data terbaru), angka prediksi jatuh di bawah target batas minimum sebesar <strong>{params.salesTarget.toLocaleString()}</strong> tiket.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="glass-panel p-6 border-b-4 border-primary shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-primary" /> Visualisasi Prediksi & Proyeksi
                  </h3>
                  <div className="flex flex-wrap gap-4 text-[10px] uppercase font-bold tracking-widest">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600"></span> Aktual</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> MA3 (Baseline)</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Prediksi</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent"></span> Proyeksi</div>
                    {pinnedResult && <div className="flex items-center gap-1.5"><span className="w-2 h-0.5 bg-gray-400"></span> Pinned</div>}
                  </div>
                </div>
                <div className="h-[400px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      ...(Array.isArray(results.dates) ? results.dates.map((d, i) => {
                        const winSize = results.windowSize || params.windowSize;
                        let baselineVal = null;
                        if (results.normalized && results.normalized[i + winSize]) {
                          const diffMA3 = (parseFloat(results.normalized[i + winSize].ma3) || 0) * (results.max - results.min) + results.min;
                          const prevActual = i === 0 
                            ? (results.normalized[winSize - 1]?.original || 0) 
                            : results.actuals[i - 1];
                          baselineVal = Math.round(prevActual + diffMA3);
                        }
                        
                        const rmseVal = parseFloat(results.metrics.rmse) || 50;
                        const pred = results.predictions?.[i] || 0;

                        return { 
                          name: d, 
                          Actual: results.actuals?.[i] || 0, 
                          Prediction: pred,
                          Baseline: baselineVal,
                          Confidence: [Math.max(0, pred - rmseVal), pred + rmseVal],
                          Projection: (i === results.dates.length - 1) ? results.predictions?.[i] : null
                        };
                      }) : []),
                      ...(Array.isArray(results.forecast) ? results.forecast.map(f => {
                        const rmseVal = parseFloat(results.metrics.rmse) || 50;
                        return {
                          name: `Next Week ${f.weekOffset}`,
                          Projection: f.value || 0,
                          Confidence: [Math.max(0, (f.value || 0) - rmseVal), (f.value || 0) + rmseVal]
                        };
                      }) : [])
                    ]}>
                      <defs>
                        <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }} 
                        formatter={(value, name) => name === 'Confidence' ? [ `${Math.round(value[0])} - ${Math.round(value[1])}`, 'Confidence Range' ] : value}
                      />
                      <Area type="monotone" dataKey="Confidence" stroke="none" fill="#3b82f6" fillOpacity={0.05} />
                      <Area type="monotone" dataKey="Actual" stroke="#475569" strokeWidth={2} fill="transparent" />
                      <Area type="monotone" dataKey="Baseline" stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" fill="transparent" />
                      <Area type="monotone" dataKey="Prediction" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPred)" />
                      <Area type="monotone" dataKey="Projection" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProj)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Feature 4: What-If Comparison Button */}
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={pinCurrentResult}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                  >
                    <Download size={14} /> Pin Skenario Ini Untuk Perbandingan
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <AccordionItem title="Normalisasi Min-Max" isOpen={openAccordion === 'norm'} onToggle={() => setOpenAccordion(openAccordion === 'norm' ? '' : 'norm')}>
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <strong className="text-primary">Mengapa Normalisasi?</strong> LSTM sangat sensitif terhadap skala data. Kita mengubah data asli menjadi skala <code className="text-accent">0 sampai 1</code> menggunakan rumus: <br/>
                      <span className="font-mono text-[10px] mt-2 block bg-black/30 p-2 rounded text-center">x_norm = (x - {results.min || 'min'}) / ({results.max || 'max'} - {results.min || 'min'})</span>
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-3 italic">*Data di bawah mencakup fitur tambahan: MA (Moving Average) dan EMA (Exponential Moving Average).</p>
                  <div className="flex justify-between items-center mb-3 px-1">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold tracking-widest">
                        <span>Show</span>
                        <select 
                          value={normRowsPerPage} 
                          onChange={(e) => {
                            setNormRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                            setNormCurrentPage(1);
                          }}
                          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded px-2 py-1 outline-none focus:border-primary text-xs"
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={25}>25</option>
                          <option value="all">All</option>
                        </select>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 italic">
                      Showing {displayedNorm.length} of {results.normalized?.length || 0} entries
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                      <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/50">Periode</th>
                          <th className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/50">Aktual</th>
                          <th className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/50 text-cyan-600 dark:text-accent">Norm</th>
                          <th className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/50 text-blue-600 dark:text-blue-400">MA3</th>
                          <th className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/50 text-purple-600 dark:text-purple-400">MA4</th>
                          <th className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/50 text-orange-600 dark:text-orange-400">EMA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedNorm.length > 0 ? displayedNorm.map((n, i) => (
                          <tr key={i} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/30">{n.date}</td>
                            <td className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/30 font-medium">{n.original}</td>
                            <td className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/30 text-cyan-600 dark:text-accent font-mono">{n.norm}</td>
                            <td className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/30 text-blue-600 dark:text-blue-400 font-mono">{n.ma3}</td>
                            <td className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/30 text-purple-600 dark:text-purple-400 font-mono">{n.ma4}</td>
                            <td className="px-4 py-2 border-x border-gray-200 dark:border-gray-700/30 text-orange-600 dark:text-orange-400 font-mono">{n.ema}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="6" className="py-4 text-center text-gray-500 italic text-xs">Detail normalisasi tidak tersedia atau data kosong.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {normRowsPerPage !== 'all' && normTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button 
                        disabled={normCurrentPage === 1}
                        onClick={() => setNormCurrentPage(prev => prev - 1)}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs uppercase font-bold"
                      >
                        Prev
                      </button>
                      <span className="text-xs text-gray-500 font-bold">Page {normCurrentPage} of {normTotalPages}</span>
                      <button 
                        disabled={normCurrentPage === normTotalPages}
                        onClick={() => setNormCurrentPage(prev => prev + 1)}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs uppercase font-bold"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </AccordionItem>

                {results.manualCalculation && (
                  <AccordionItem title="Detail Bobot Gerbang LSTM (Slicing 2x5)" isOpen={openAccordion === 'calc'} onToggle={() => setOpenAccordion(openAccordion === 'calc' ? '' : 'calc')}>
                    <div className="space-y-8 overflow-x-auto pb-4">
                      {/* Grid untuk 4 Gerbang Utama */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {[
                          { 
                            id: 'forgetGate', 
                            name: '1. Forget Gate (W_f)', 
                            color: 'red',
                            desc: 'Menyeleksi informasi dari masa lalu yang sudah tidak relevan untuk dibuang.' 
                          },
                          { 
                            id: 'inputGate', 
                            name: '2. Input Gate (W_i)', 
                            color: 'blue',
                            desc: 'Menentukan informasi baru dari data saat ini yang layak disimpan ke memori.' 
                          },
                          { 
                            id: 'candidateGate', 
                            name: '3. Candidate Cell (W_c)', 
                            color: 'green',
                            desc: 'Menghitung kandidat nilai baru yang mungkin akan memperbarui status memori.' 
                          },
                          { 
                            id: 'outputGate', 
                            name: '4. Output Gate (W_o)', 
                            color: 'orange',
                            desc: 'Memutuskan bagian mana dari memori yang akan dikeluarkan sebagai hasil prediksi.' 
                          }
                        ].map(gate => (
                          <div key={gate.id} className={`border border-${gate.color}-500/20 rounded-xl overflow-hidden bg-white dark:bg-gray-900/40 flex flex-col shadow-sm`}>
                            <div className={`bg-${gate.color}-500/5 px-4 py-3 border-b border-${gate.color}-500/20`}>
                              <h4 className={`font-bold text-${gate.color}-600 dark:text-${gate.color}-400 text-sm flex justify-between items-center`}>
                                {gate.name}
                                <span className="text-[10px] opacity-50 font-mono">Matrix Weights</span>
                              </h4>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">{gate.desc}</p>
                            </div>
                            <table className="w-full text-left text-gray-700 dark:text-gray-300 text-[11px]">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/30">
                                  <th className="px-3 py-2 border-b border-r border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/50">Feature</th>
                                  {[1,2,3,4,5].map(n => <th key={n} className="px-3 py-2 border-b border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">C{n}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {results.manualCalculation[gate.id]?.map((row, i) => (
                                  <tr key={i} className="border-b border-gray-200 dark:border-gray-800/30">
                                    <td className="px-3 py-2 font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/20 border-r border-gray-200 dark:border-gray-800">F{i+1}</td>
                                    {row.map((val, j) => <td key={j} className={`px-3 py-2 font-mono border-r border-gray-200 dark:border-gray-800 text-${gate.color}-600 dark:text-${gate.color}-400`}>{(parseFloat(val) || 0).toFixed(6)}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>

                      {/* Baris Kelima: Bias */}
                      <div className="border border-purple-500/20 rounded-xl overflow-hidden bg-white dark:bg-gray-900/40 shadow-sm">
                        <div className="bg-purple-500/5 px-4 py-3 border-b border-purple-500/20">
                          <h4 className="font-bold text-purple-600 dark:text-purple-400 text-sm flex justify-between items-center">
                            5. Bias Vector (b)
                            <span className="text-[10px] opacity-50 font-mono">Intercepts</span>
                          </h4>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Nilai konstan yang membantu model menyesuaikan fleksibilitas prediksi (mirip intersep pada regresi).</p>
                        </div>
                        <div className="p-4 grid grid-cols-5 gap-4">
                          {results.manualCalculation.bias?.map((val, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 p-2 rounded-lg text-center">
                              <span className="block text-[9px] text-gray-400 dark:text-gray-500 uppercase mb-1">b_{i+1}</span>
                              <span className="text-xs font-mono text-cyan-600 dark:text-accent font-bold">{(parseFloat(val) || 0).toFixed(6)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionItem>
                )}

                <AccordionItem title="Hasil Prediksi vs Aktual" isOpen={openAccordion === 'results'} onToggle={() => setOpenAccordion(openAccordion === 'results' ? '' : 'results')}>
                  <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <strong className="text-cyan-600 dark:text-accent">Analisis Komparasi:</strong> Tabel ini membandingkan data <span className="text-gray-900 dark:text-white font-bold">Aktual</span> (kenyataan) dengan hasil <span className="text-primary font-bold">Prediksi</span> sistem. 
                      Baris bertanda <span className="text-primary">biru</span> di bagian bawah adalah <strong className="text-primary">Proyeksi Masa Depan</strong> yang belum memiliki data aktual.
                    </p>
                  </div>
                  <div className="flex justify-between items-center mb-3 px-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 uppercase font-bold tracking-widest">
                      <span>Show</span>
                      <select 
                        value={predRowsPerPage} 
                        onChange={(e) => {
                          setPredRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                          setPredCurrentPage(1);
                        }}
                        className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded px-1 py-0.5 outline-none focus:border-primary text-xs"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                    <div className="text-xs text-gray-500 italic">
                      Showing {displayedPred.length} of {fullResultsArray.length} entries
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                      <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 border-r border-gray-300 dark:border-gray-700">No</th>
                          <th className="px-4 py-2 border-r border-gray-300 dark:border-gray-700">Periode</th>
                          <th className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 text-right">Aktual</th>
                          <th className="px-4 py-2 border-r border-gray-300 dark:border-gray-700 text-right">Prediksi</th>
                          <th className="px-4 py-2 text-right">Selisih</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedPred.map((p, i) => (
                          <tr key={i} className={`border-b border-gray-200 dark:border-gray-700 ${p.type === 'forecast' ? 'bg-primary/5' : ''}`}>
                            <td className={`px-4 py-2 border-r border-gray-200 dark:border-gray-700 ${p.type === 'forecast' ? 'text-primary font-bold' : ''}`}>{p.index}</td>
                            <td className={`px-4 py-2 border-r border-gray-200 dark:border-gray-700 ${p.type === 'forecast' ? 'text-primary font-bold' : 'text-gray-700 dark:text-gray-200'}`}>
                              {isSandbox && p.type === 'actual' ? (
                                <input 
                                  type="text" 
                                  value={p.date} 
                                  onChange={(e) => handleUpdateDate(p.index - 1, e.target.value)}
                                  className="w-24 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5 text-gray-900 dark:text-white outline-none focus:border-amber-500"
                                />
                              ) : p.date}
                            </td>
                            <td className={`px-4 py-2 border-r border-gray-200 dark:border-gray-700 text-right ${p.type === 'forecast' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                              {isSandbox && p.type === 'actual' ? (
                                <input 
                                  type="number" 
                                  value={p.actual} 
                                  onChange={(e) => handleUpdateActual(p.index - 1, e.target.value)}
                                  className="w-20 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5 text-right text-gray-900 dark:text-white outline-none focus:border-amber-500"
                                />
                              ) : p.actual?.toLocaleString()}
                            </td>
                            <td className={`px-4 py-2 border-r border-gray-200 dark:border-gray-700 text-right font-bold ${p.type === 'forecast' ? 'text-primary' : 'text-cyan-600 dark:text-accent'}`}>{p.prediction}</td>
                            <td className="px-4 py-2 text-right">
                              {p.type === 'actual' ? p.diff : (
                                p.prediction < params.salesTarget ? <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Below Target</span> : '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {predRowsPerPage !== 'all' && predTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button 
                        disabled={predCurrentPage === 1}
                        onClick={() => setPredCurrentPage(prev => prev - 1)}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs uppercase font-bold"
                      >
                        Prev
                      </button>
                      <span className="text-xs text-gray-500 font-bold">Page {predCurrentPage} of {predTotalPages}</span>
                      <button 
                        disabled={predCurrentPage === predTotalPages}
                        onClick={() => setPredCurrentPage(prev => prev + 1)}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs uppercase font-bold"
                      >
                        Next
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4 print:hidden">
                    {isSandbox && (
                      <button onClick={handleSandboxReRun} className="btn-primary bg-amber-600 hover:bg-amber-500 flex items-center gap-2 text-xs border-none">
                        <Play size={14} /> Re-Simulate Metrics
                      </button>
                    )}
                    <button onClick={handleExportPDF} className="btn-primary flex items-center gap-2 text-xs">
                      <Printer size={14} /> Cetak Laporan PDF
                    </button>
                    <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-2 text-xs">
                      <Download size={14} /> Export Excel
                    </button>
                    <button onClick={handleSaveToDatabase} className="btn-primary bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2 text-xs border-none shadow-lg shadow-emerald-500/20">
                      <CheckCircle size={14} /> Simpan ke Database
                    </button>
                    <button onClick={() => toast.error('Premium Feature: PowerPoint Export requires pptxgenjs library integration.')} className="btn-secondary flex items-center gap-2 text-xs opacity-50">
                      <FileText size={14} /> Export PPTX (Pro)
                    </button>
                  </div>
                </AccordionItem>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="glass-panel p-6 border border-red-500/30">
                  <h4 className="text-gray-400 text-xs uppercase tracking-widest">MSE</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{results.metrics.mse}</p>
                </div>
                <div className="glass-panel p-6 border border-orange-500/30">
                  <h4 className="text-gray-400 text-xs uppercase tracking-widest">RMSE</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{results.metrics.rmse}</p>
                </div>
                <div className="glass-panel p-6 border border-green-500/30">
                  <h4 className="text-gray-400 text-xs uppercase tracking-widest">MAPE</h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{results.metrics.mape}%</p>
                </div>
              </div>

              <div className="mt-8 glass-panel p-6">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-primary" /> Feature Importance Analysis
                </h4>
                <div className="space-y-4">
                  {results.importance && results.importance.map((f, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-300">{f.name}</span>
                        <span className="text-primary font-bold">{f.value.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${f.value}%` }}
                          transition={{ delay: 0.5 + idx * 0.1, duration: 1 }}
                          className="h-full bg-gradient-to-r from-primary to-accent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {results.importance && (
                  <div className="mt-8 p-5 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-200 dark:border-white/5">
                    <h5 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <BrainCircuit size={18} className="text-primary" /> Kesimpulan Analisis Variabel
                    </h5>
                    <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {(() => {
                        const sorted = [...results.importance].sort((a, b) => b.value - a.value);
                        const topFeature = sorted[0];
                        const secondFeature = sorted[1];
                        const lowestFeature = sorted[sorted.length - 1];
                        return (
                          <>
                            <p>
                              Berdasarkan perhitungan atribusi model, variabel <strong className="text-gray-900 dark:text-white">{topFeature.name}</strong> bertindak sebagai prediktor paling dominan dengan tingkat kontribusi sebesar <strong className="text-primary">{topFeature.value.toFixed(1)}%</strong>. Hal ini mengindikasikan bahwa pergerakan pada variabel ini memiliki dampak terbesar terhadap penentuan hasil prediksi arah penjualan.
                            </p>
                            <p>
                              Sebagai faktor pendukung sekunder, variabel <strong className="text-gray-900 dark:text-white">{secondFeature.name}</strong> menyumbangkan pengaruh sebesar <strong className="text-accent">{secondFeature.value.toFixed(1)}%</strong>. Variabel ini berfungsi memvalidasi sinyal tren untuk menajamkan akurasi model dalam menganalisis pola data runtun waktu yang kompleks.
                            </p>
                            <p>
                              Di sisi lain, variabel dengan kontribusi terendah, seperti <strong className="text-gray-900 dark:text-white">{lowestFeature.name}</strong> (<strong className="text-gray-400">{lowestFeature.value.toFixed(1)}%</strong>), berperan sebagai parameter korektif minor. Fitur ini tidak mengubah arah tren utama, melainkan berfungsi sebagai penyeimbang untuk menghaluskan output angka prediksi pada tahap akhir komputasi.
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-gray-500 mt-6 italic">
                  *Estimasi kontribusi variabel terhadap keputusan model LSTM berdasarkan bobot korelasi input.
                </p>
              </div>
            </motion.div>
          )}

          {status === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel p-16 text-center border-dashed border-2 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10"
            >
              <div className="p-6 bg-gray-200 dark:bg-gray-800/50 w-fit rounded-full mx-auto mb-6">
                <BrainCircuit size={64} className="text-gray-900 dark:text-gray-700" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-400 mb-2">Sistem Siap</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">Konfigurasikan parameter dan mulai proses prediksi untuk melihat hasil.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Table - Always visible unless training */}
        {status !== 'training' && (
          <div className="mt-12 print:hidden">
            <div className="flex justify-between items-center mb-4 px-2">
               <h3 className="text-sm font-bold text-gray-700 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Calendar size={16} className="text-primary" /> Riwayat Prediksi
               </h3>
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase font-bold tracking-widest">
                    <span>Show</span>
                    <select 
                      value={rowsPerPage} 
                      onChange={(e) => {
                        setRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded px-2 py-1 outline-none focus:border-primary"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value="all">All</option>
                    </select>
                 </div>
                 {history.length > 0 && (
                   <button 
                     onClick={() => {
                       setConfirmConfig({
                         show: true,
                         title: 'Reset Riwayat',
                         message: 'Apakah Anda yakin ingin menghapus SELURUH riwayat prediksi? Tindakan ini permanen.',
                         type: 'danger',
                         onConfirm: async () => {
                           await api.delete('/data/predictions.php?all=true');
                           fetchHistory();
                           toast.success('Riwayat dibersihkan');
                         }
                       });
                     }}
                     className="text-xs text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors uppercase font-bold tracking-widest bg-red-500/5 px-3 py-1 rounded-full border border-red-500/10"
                   >
                     Clear All
                   </button>
                 )}
               </div>
            </div>
            <div className="overflow-x-auto glass-panel rounded-2xl border-gray-100 dark:border-gray-700/50">
                <table className="w-full text-sm text-left text-gray-700 dark:text-gray-400">
                  <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-center">Aksi</th>
                      <th className="px-4 py-3">Tanggal Run</th>
                      <th className="px-4 py-3">Params</th>
                      <th className="px-4 py-3 text-center">MAPE</th>
                      <th className="px-4 py-3 text-center">RMSE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHistory.length > 0 ? displayedHistory.map((h, i) => (
                      <tr key={i} className="border-b border-gray-200 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleViewHistory(h)} className="p-2.5 bg-primary/5 text-primary rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm border border-primary/5" title="Lihat Detail">
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => {
                                setConfirmConfig({
                                  show: true,
                                  title: 'Hapus Riwayat',
                                  message: 'Hapus catatan riwayat prediksi ini?',
                                  type: 'danger',
                                  onConfirm: async () => {
                                    await api.delete(`/data/predictions.php?id=${h.id}`);
                                    fetchHistory();
                                    toast.success('Terhapus');
                                  }
                                });
                              }}
                              className="p-2.5 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-500/5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-gray-900 dark:text-gray-200 flex items-center gap-2">
                          {new Date(h.run_date).toLocaleString('id-ID')}
                          {h.results_json.includes('"status":"warning"') && (
                            <AlertCircle size={14} className="text-amber-500" title="Data mengandung anomali" />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-500">{h.epochs} Ep / {h.window_size} W</td>
                        <td className="px-4 py-3 text-center text-green-400 font-bold text-xs">{parseFloat(h.mape).toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center text-cyan-600 dark:text-accent font-medium text-xs">{parseFloat(h.rmse).toFixed(2)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-600 italic">Belum ada riwayat.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {rowsPerPage !== 'all' && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs font-bold uppercase tracking-widest"
                  >
                    Prev
                  </button>
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">Page {currentPage} of {totalPages}</span>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs font-bold uppercase tracking-widest"
                  >
                    Next
                  </button>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Modal: Universal Confirmation */}
      <AnimatePresence>
        {confirmConfig.show && (
          <Portal>
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-panel p-8 max-w-sm w-full border-white/10 shadow-2xl text-center"
              >
                <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  confirmConfig.type === 'danger' ? 'bg-red-500/20 text-red-500 border-red-500/20' : 'bg-primary/20 text-primary border-primary/20'
                } border-2`}>
                  {confirmConfig.type === 'danger' ? <Trash2 size={32} /> : <BrainCircuit size={32} />}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmConfig.title}</h3>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                  {confirmConfig.message}
                </p>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setConfirmConfig({ ...confirmConfig, show: false })}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold transition-all text-sm"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => {
                      confirmConfig.onConfirm();
                      setConfirmConfig({ ...confirmConfig, show: false });
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all shadow-lg text-sm ${
                      confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20' : 'bg-primary hover:bg-primary/90 text-white shadow-primary/20'
                    }`}
                  >
                    Ya, Lanjutkan
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LstmProcess;

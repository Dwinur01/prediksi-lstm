import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '../../components/common/Skeleton';
import { 
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Calendar, AlertCircle, Database, Search, 
  BarChart3, ArrowRight, BrainCircuit, Activity, ShieldCheck, Zap 
} from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import api from '../../services/api';
import { getDummyTickets } from '../../services/dummy';
import toast from 'react-hot-toast';

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;
    
    let totalDuration = 1500;
    let increment = end / (totalDuration / 16);
    
    let timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);

  return <span>{displayValue.toLocaleString()}</span>;
};
const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avg: 0, latest: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [latestForecast, setLatestForecast] = useState(null);
  const [auditAlerts, setAuditAlerts] = useState(null);
  const [lastRunDate, setLastRunDate] = useState(null);
  const [historyResults, setHistoryResults] = useState(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    // Listen for theme changes (optional but good for consistency)
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch sales data
      const response = await api.get('/data/tickets.php');
      if (response.data.status === 'success') {
        processFetchedData(response.data.data);
      }

      // 2. Fetch latest prediction history
      let latest = null;
      const histResponse = await api.get('/data/predictions.php');
      if (histResponse.data.status === 'success' && histResponse.data.data.length > 0) {
        latest = histResponse.data.data[0];
      } else {
        // Cek LocalStorage jika DB kosong/error
        const offlineHistory = JSON.parse(localStorage.getItem('swa-offline-history') || '[]');
        if (offlineHistory.length > 0) {
          latest = offlineHistory[0];
        }
      }

      if (latest) {
        setLastRunDate(latest.run_date);
        
        try {
          const results = typeof latest.results_json === 'string' 
            ? JSON.parse(latest.results_json) 
            : latest.results_json;
            
          setHistoryResults(results);
          if (results && results.forecast && results.forecast.length > 0) {
            setLatestForecast(results.forecast[0].value);
          }
          if (results && results.audit && results.audit.status === 'warning') {
            setAuditAlerts(results.audit.issues);
          }
        } catch (parseError) {
          console.error('Failed to parse history JSON:', parseError);
        }
      } else {
        setLastRunDate(null);
        setLatestForecast(null);
        setAuditAlerts(null);
        setHistoryResults(null);
      }
    } catch (error) {
      console.warn('API Error, using dummy data:', error);
      toast('Menggunakan data simulasi (Database terputus)', { icon: '⚠️' });
      processFetchedData(getDummyTickets());
    } finally {
      setLoading(false);
    }
  };

  const processFetchedData = (rawData) => {
    // Keep all fields for the table, add derived 'name' for the chart
    const fetchedData = rawData.map(item => ({
      ...item,
      name: `W${item.week} ${item.year}`,
      tickets_sold: parseInt(item.tickets_sold) || 0
    }));
    setData(fetchedData);
    
    // Calculate stats
    const total = fetchedData.reduce((acc, curr) => acc + curr.tickets_sold, 0);
    const avg = fetchedData.length > 0 ? Math.round(total / fetchedData.length) : 0;
    const latest = fetchedData.length > 0 ? fetchedData[fetchedData.length - 1].tickets_sold : 0;
    
    // Calculate Data Health Score
    let health = 0;
    if (fetchedData.length >= 20) health += 40;
    else health += (fetchedData.length / 20) * 40;
    
    const gaps = fetchedData.filter((d, i) => i > 0 && (new Date(d.sale_date) - new Date(fetchedData[i-1].sale_date)) > 86400000 * 8).length;
    health += Math.max(0, 40 - (gaps * 5));
    
    const variance = new Set(fetchedData.map(d => d.tickets_sold)).size;
    health += Math.min(20, variance * 2);
    
    setStats({ total, avg, latest, health: Math.round(health) });
  };

  const filteredData = data.filter(item => {
    const s = searchTerm.toLowerCase();
    return (
      item.id?.toLowerCase().includes(s) || 
      item.name.toLowerCase().includes(s) || 
      item.tickets_sold.toString().includes(s)
    );
  });

  const displayedData = rowsPerPage === 'all' 
    ? filteredData 
    : filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / rowsPerPage);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    return (
      <motion.div 
        style={{ perspective: 1000, rotateX, rotateY }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          x.set(e.clientX - rect.left - rect.width / 2);
          y.set(e.clientY - rect.top - rect.height / 2);
        }}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        variants={itemVariants}
        whileHover={{ y: -5, scale: 1.02 }}
        className={`${colorClass} rounded-3xl p-8 relative overflow-hidden group cursor-pointer shadow-2xl transition-shadow`}
      >
        <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
          <Icon size={140} />
        </div>
        <div className="relative z-10">
          <div className="p-3 bg-white/20 w-fit rounded-2xl mb-6 shadow-xl">
            <Icon size={28} />
          </div>
          <p className="opacity-70 text-xs font-black uppercase tracking-[0.2em] mb-1">{title}</p>
          <h3 className="text-4xl font-black tabular-nums">
            <AnimatedNumber value={value} />
          </h3>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ringkasan Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Ikhtisar data penjualan tiket pesawat dan performa sistem.</p>
        </div>
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-xs text-blue-600 dark:text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/30 font-bold shadow-sm"
        >
          Sistem Online & Terhubung
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Tiket Terjual" 
              value={stats.total} 
              icon={TrendingUp} 
              colorClass="bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/20 text-white"
            />
            <StatCard 
              title="Rata-rata Mingguan" 
              value={stats.avg} 
              icon={Calendar} 
              colorClass="bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple/20 text-white"
            />
            <StatCard 
              title="Data Terbaru" 
              value={stats.latest} 
              icon={AlertCircle} 
              colorClass="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl !text-gray-900 dark:!text-white"
            />
          </>
        )}
      </div>

      {/* Feature 3: Dashboard Audit Alerts */}
      {auditAlerts && (
        <motion.div 
          variants={itemVariants}
          whileHover={{ scale: 1.01 }}
          className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg shadow-amber-500/5 cursor-pointer"
        >
          <motion.div 
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2, delay: 1 }}
            className="p-2 bg-amber-500/20 text-amber-500 rounded-lg"
          >
            <AlertCircle size={20} />
          </motion.div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Perhatian: Kualitas Data Terdeteksi Rendah</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{auditAlerts[0]} (dan {auditAlerts.length - 1} masalah lainnya)</p>
          </div>
          <Link to="/lstm-process" className="text-xs font-bold text-amber-500 hover:underline hover:text-amber-400 transition-colors">Lihat Detail & Audit</Link>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          variants={itemVariants}
          className="lg:col-span-2 glass-panel p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <motion.div
                 animate={{ scale: [1, 1.2, 1] }}
                 transition={{ repeat: Infinity, duration: 3 }}
              >
                <BarChart3 size={20} className="text-primary" />
              </motion.div>
              Tren Penjualan Tiket
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Aktual</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"></span> MA3</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_5px_rgba(59,130,246,0.8)]"></span> Prediksi</div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span> Proyeksi</div>
            </div>
          </div>
          
          <div className="h-[320px] w-full relative">
            {loading ? (
              <SkeletonChart />
            ) : data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  ...data.map((item, i) => {
                    // Coba cari data prediksi yang cocok dengan periode ini
                    let predVal = null;
                    let maVal = null;
                    
                    if (historyResults) {
                      const dateIdx = historyResults.dates?.indexOf(item.name);
                      if (dateIdx !== -1 && dateIdx !== undefined) {
                        predVal = parseFloat(historyResults.predictions[dateIdx]) || 0;
                      }
                      
                      // Cari MA3 dari normalized data
                      const normItem = historyResults.normalized?.find(n => n.date === item.name);
                      if (normItem) {
                        const min = parseFloat(historyResults.min) || 0;
                        const max = parseFloat(historyResults.max) || 1;
                        maVal = Math.round((parseFloat(normItem.ma3) || 0) * (max - min) + min);
                      }
                    }

                    return {
                      ...item,
                      Actual: item.tickets_sold,
                      Prediction: predVal,
                      Baseline: maVal,
                      // Titik terakhir prediksi disambungkan ke awal proyeksi
                      Projection: (i === data.length - 1 && predVal) ? predVal : null
                    };
                  }),
                  ...(historyResults?.forecast || []).map(f => ({
                    name: `Next W${f.weekOffset}`,
                    Projection: f.value
                  }))
                ]}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#64748b" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="[&>line]:stroke-gray-200 dark:[&>line]:stroke-[#1e293b]" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
                      backdropFilter: 'blur(8px)', 
                      border: isDarkMode ? '1px solid rgba(51, 65, 85, 0.5)' : '1px solid rgba(226, 232, 240, 0.8)', 
                      borderRadius: '12px', 
                      fontSize: '12px', 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: isDarkMode ? '#fff' : '#1e293b'
                    }} 
                    itemStyle={{ fontSize: '11px', fontWeight: 'bold', color: isDarkMode ? '#e2e8f0' : '#475569' }}
                    labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: isDarkMode ? '#fff' : '#1e293b' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Actual" 
                    stroke="#64748b" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Baseline" 
                    stroke="#f59e0b" 
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="transparent" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Prediction" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPred)" 
                    animationDuration={2000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Projection" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorProj)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                <Database size={32} className="opacity-20" />
                <p className="text-sm italic">Belum ada data tersedia.</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          className="lg:col-span-1 glass-panel p-6 flex flex-col shadow-xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 relative z-10">Aksi Cepat</h3>
          <div className="space-y-4 flex-1 relative z-10">
            <Link to="/data-input">
              <motion.div 
                whileHover={{ scale: 1.03, backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(243, 244, 246, 0.8)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800/40 rounded-2xl transition-colors border border-gray-200 dark:border-gray-700/50 group cursor-pointer shadow-md mb-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-accent/20 text-accent rounded-xl group-hover:scale-110 group-hover:bg-accent/30 transition-all shadow-inner">
                    <Database size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-accent transition-colors">Input Data</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Kelola database tiket</div>
                  </div>
                </div>
                <motion.div
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                >
                  <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors" />
                </motion.div>
              </motion.div>
            </Link>
            <Link to="/lstm-process">
              <motion.div 
                whileHover={{ scale: 1.03, backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)' }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-between p-4 bg-primary/10 rounded-2xl transition-colors border border-primary/20 group cursor-pointer shadow-md shadow-primary/5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/20 text-primary rounded-xl group-hover:rotate-12 group-hover:bg-primary/30 transition-all shadow-inner">
                    <BrainCircuit size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">Mulai Prediksi</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Running LSTM Engine</div>
                  </div>
                </div>
                <motion.div
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                >
                  <ArrowRight size={16} className="text-primary transition-colors" />
                </motion.div>
              </motion.div>
            </Link>
          </div>
          
          {/* Feature 3: Forecast Highlight */}
          <motion.div 
            whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.4)' }}
            className="mt-6 p-5 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-2xl text-white relative overflow-hidden shadow-xl shadow-indigo-500/20 cursor-default transition-all duration-300"
          >
            <motion.div 
              animate={{ rotate: [12, 15, 12] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute -right-6 -bottom-6 opacity-20"
            >
              <TrendingUp size={120} />
            </motion.div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaTTggMEwwIDhaIiBzdHJva2U9IiNmZmYiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')] opacity-20"></div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80 relative z-10">Prediksi Minggu Depan</p>
            <h4 className="text-4xl font-black mt-1 flex items-center gap-3 relative z-10 drop-shadow-md">
              {latestForecast ? latestForecast.toLocaleString() : '-'}
              {latestForecast && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </h4>
            <p className="text-[10px] mt-2 opacity-70 leading-relaxed relative z-10">
              {lastRunDate ? `Berdasarkan analisis: ${new Date(lastRunDate).toLocaleDateString('id-ID')}` : 'Belum ada hasil prediksi terbaru.'}
            </p>
          </motion.div>
        </motion.div>
      </div>
      
      {/* Feature 1: Sales Heatmap */}
      <motion.div variants={itemVariants} className="glass-panel p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Activity size={20} className="text-emerald-500" /> Heatmap Intensitas Penjualan
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.slice(-52).map((item, i) => {
            // Determine intensity color based on value vs average
            const intensity = item.tickets_sold / (stats.avg * 1.5);
            const opacity = Math.min(1, Math.max(0.1, intensity));
            
            return (
              <div 
                key={i}
                className="group relative"
              >
                <div 
                  className="w-6 h-6 rounded-md transition-all duration-500 hover:scale-125 hover:z-10 cursor-pointer"
                  style={{ 
                    backgroundColor: `rgba(16, 185, 129, ${opacity})`,
                    boxShadow: opacity > 0.7 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-white/10 z-50">
                  {item.name}: {item.tickets_sold.toLocaleString()} Tiket
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 text-[10px] text-gray-500">
          <span>Rendah</span>
          <div className="flex gap-1">
            {[0.1, 0.3, 0.5, 0.7, 0.9].map(o => (
              <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(16, 185, 129, ${o})` }} />
            ))}
          </div>
          <span>Tinggi</span>
        </div>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="glass-panel p-6 shadow-xl"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Database size={20} className="text-accent" /> Tabel Data Historis
          </h3>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Cari periode..."
              className="input-field pl-10 py-2 text-sm bg-gray-50 dark:bg-gray-800/80 focus:bg-white dark:focus:bg-gray-800 border-gray-200 dark:border-gray-700/50"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Show</span>
            <select 
              value={rowsPerPage} 
              onChange={(e) => {
                setRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded px-1 py-0.5 outline-none focus:border-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value="all">All</option>
            </select>
            <span>entries</span>
          </div>
          <div className="text-xs text-gray-500">
            Showing {displayedData.length} of {filteredData.length} entries
          </div>
        </div>
        
        {loading ? (
          <SkeletonTable />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700/50 max-h-80 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-gray-900/20">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-800/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                <tr>
                  <th className="px-4 py-4 border-r border-gray-200 dark:border-gray-700/50">No</th>
                  <th className="px-4 py-4 border-r border-gray-200 dark:border-gray-700/50">ID Transaksi</th>
                  <th className="px-4 py-4 border-r border-gray-200 dark:border-gray-700/50">Tanggal (Y-M-D)</th>
                  <th className="px-4 py-4 border-r border-gray-200 dark:border-gray-700/50">Mgg/Thn</th>
                  <th className="px-4 py-4 border-r border-gray-200 dark:border-gray-700/50 text-right">Jumlah Terjual</th>
                  <th className="px-4 py-4 text-center">Waktu Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {displayedData.map((item, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(243, 244, 246, 0.8)', scale: 1.01, zIndex: 10, position: 'relative' }}
                    key={index} 
                    className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-all duration-200 group origin-left cursor-default border-b border-gray-200 dark:border-gray-800/50"
                  >
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">{(currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + index + 1}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.id}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-accent font-bold group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{item.sale_date}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-xs text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">M{item.week} / {item.year}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-right text-accent font-bold group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                      {item.tickets_sold.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500 italic">
                      {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : '-'}
                    </td>
                  </motion.tr>
                ))}
                {displayedData.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-12 text-center text-gray-600 italic">
                      Data tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {rowsPerPage !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs"
            >
              Prev
            </button>
            <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-xs"
            >
              Next
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;

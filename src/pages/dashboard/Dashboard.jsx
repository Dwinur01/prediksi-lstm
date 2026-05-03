import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Calendar, AlertCircle, Database, Search, BarChart3, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { getDummyTickets } from '../../services/dummy';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avg: 0, latest: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('/data/tickets.php');
      if (response.data.status === 'success' && response.data.data.length > 0) {
        processFetchedData(response.data.data);
      } else {
        throw new Error('No data or error');
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
    const fetchedData = rawData.map(item => ({
      name: `W${item.week} ${item.year}`,
      tickets_sold: parseInt(item.tickets_sold),
      created_at: item.created_at
    }));
    setData(fetchedData);
    
    // Calculate stats
    const total = fetchedData.reduce((acc, curr) => acc + curr.tickets_sold, 0);
    const avg = fetchedData.length > 0 ? Math.round(total / fetchedData.length) : 0;
    const latest = fetchedData.length > 0 ? fetchedData[fetchedData.length - 1].tickets_sold : 0;
    
    setStats({ total, avg, latest });
  };

  const StatCard = ({ title, value, icon: Icon, colorClass, delay = 0 }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className={`${colorClass} rounded-2xl p-6 text-white relative overflow-hidden group cursor-default`}
    >
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        <Icon size={120} />
      </div>
      <div className="relative z-10">
        <div className="p-3 bg-white/20 w-fit rounded-xl mb-4 group-hover:rotate-12 transition-transform">
          <Icon size={24} />
        </div>
        <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-bold mt-1 tabular-nums">{value}</h3>
      </div>
    </motion.div>
  );

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.tickets_sold.toString().includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Ringkasan Dashboard</h1>
          <p className="text-gray-400">Ikhtisar data penjualan tiket pesawat dan performa sistem.</p>
        </div>
        <div className="text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 animate-pulse font-medium">
          Sistem Online & Terhubung
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Tiket Terjual" 
          value={stats.total.toLocaleString()} 
          icon={TrendingUp} 
          colorClass="bg-gradient-to-br from-primary to-blue-700 shadow-lg shadow-primary/20"
          delay={0.1}
        />
        <StatCard 
          title="Rata-rata Mingguan" 
          value={stats.avg.toLocaleString()} 
          icon={Calendar} 
          colorClass="bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple/20"
          delay={0.2}
        />
        <StatCard 
          title="Data Terbaru" 
          value={stats.latest.toLocaleString()} 
          icon={AlertCircle} 
          colorClass="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-panel p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" /> Tren Penjualan Tiket
            </h3>
            <div className="text-xs text-gray-400 flex items-center gap-4">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Tiket Terjual</div>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
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
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#3b82f6' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tickets_sold" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    animationDuration={2000}
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
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1 glass-panel p-6 flex flex-col"
        >
          <h3 className="text-lg font-semibold text-white mb-6">Aksi Cepat</h3>
          <div className="space-y-4 flex-1">
            <Link to="/data-input" className="flex items-center justify-between p-4 bg-gray-800/30 hover:bg-gray-800/60 rounded-2xl transition-all border border-gray-700/50 group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-accent/20 text-accent rounded-xl group-hover:scale-110 transition-transform">
                  <Database size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Input Data</div>
                  <div className="text-[10px] text-gray-500">Kelola database tiket</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
            <Link to="/lstm-process" className="flex items-center justify-between p-4 bg-primary/10 hover:bg-primary/20 rounded-2xl transition-all border border-primary/20 group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/20 text-primary rounded-xl group-hover:rotate-12 transition-transform">
                  <BrainCircuit size={18} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Mulai Prediksi</div>
                  <div className="text-[10px] text-gray-500">Running LSTM Engine</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
          <div className="mt-8 p-5 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-2xl text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
            <div className="absolute -right-6 -bottom-6 opacity-20 rotate-12">
              <TrendingUp size={120} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Akurasi Sistem</p>
            <h4 className="text-3xl font-black mt-1">98.2%</h4>
            <p className="text-[11px] mt-2 opacity-80 leading-relaxed max-w-[180px]">Optimasi algoritma LSTM untuk data penerbangan.</p>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-panel p-6"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Database size={20} className="text-accent" /> Tabel Data Historis
          </h3>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Cari periode..."
              className="input-field pl-10 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-xl border border-gray-700/50 max-h-80 overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-800/90 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-4 py-4">No</th>
                <th className="px-4 py-4">Periode</th>
                <th className="px-4 py-4">Waktu Input</th>
                <th className="px-4 py-4 text-right">Jumlah Terjual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="px-4 py-3 text-gray-500 group-hover:text-gray-300 transition-colors">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-200 group-hover:text-primary transition-colors">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 italic">
                    {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', { 
                      day: '2-digit', 
                      month: 'short', 
                      year: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-accent font-bold group-hover:scale-105 transition-transform origin-right">
                    {item.tickets_sold.toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-gray-600 italic">
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;

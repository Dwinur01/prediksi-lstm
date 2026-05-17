import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Trash2, Edit2, AlertTriangle, FileSpreadsheet, Download, Search, X, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { getDummyTickets } from '../../services/dummy';
import Portal from '../../components/ui/Portal';

const DataInput = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: '', sale_date: '', week: '', year: '', tickets_sold: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'danger' });
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
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
    try {
      setLoading(true);
      const response = await api.get('/data/tickets.php');
      if (response.data.status === 'success') {
        setData(response.data.data);
      } else {
        throw new Error('Network error');
      }
    } catch (error) {
      console.warn('API Error, using dummy data:', error);
      toast('Menggunakan data simulasi (Database terputus)', { icon: '⚠️' });
      setData(getDummyTickets());
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => {
    const s = searchTerm.toLowerCase();
    return (
      item.id.toLowerCase().includes(s) || 
      (item.sale_date && item.sale_date.toLowerCase().includes(s)) ||
      item.tickets_sold.toString().includes(s) ||
      item.week.toString().includes(s) ||
      item.year.toString().includes(s)
    );
  });

  const displayedData = rowsPerPage === 'all' 
    ? filteredData 
    : filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredData, rowsPerPage, totalPages]);

  const handleManualSubmit = async (e) => {
    if (e) e.preventDefault();
    
    setConfirmConfig({
      show: true,
      title: isEditing ? 'Konfirmasi Edit' : 'Konfirmasi Simpan',
      message: `Apakah Anda yakin ingin ${isEditing ? 'memperbarui' : 'menyimpan'} data ini?`,
      type: 'primary',
      onConfirm: async () => {
        try {
          const response = await api.post('/data/tickets.php', formData);
          if (response.data.status === 'success') {
            toast.success(isEditing ? 'Data berhasil diperbarui' : 'Data berhasil disimpan');
            setFormData({ id: '', sale_date: '', week: '', year: '', tickets_sold: '' });
            setIsEditing(false);
            setShowModal(false);
            fetchData();
          }
        } catch (error) {
          toast.error('Gagal memproses data.');
        }
      }
    });
  };

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      sale_date: item.sale_date || '',
      week: item.week,
      year: item.year,
      tickets_sold: item.tickets_sold
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const cancelEdit = () => {
    setFormData({ id: '', sale_date: '', week: '', year: '', tickets_sold: '' });
    setIsEditing(false);
    setShowModal(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(csv)$/i)) {
      toast.error('Hanya file CSV yang didukung.');
      return;
    }

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const batchData = results.data.map(row => {
          const rawDate = row['Tanggal'] || row['Date'] || row['tanggal'] || row['date'];
          const rawAmount = row['Jumlah'] || row['Terjual'] || row['tickets_sold'] || row['amount'];
          if (!rawDate || !rawAmount) return null;
          let dateObj = new Date(rawDate);
          if (isNaN(dateObj.getTime())) {
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
              else if (parts[2].length === 4) dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
            }
          }
          const tickets_sold = parseInt(rawAmount.toString().replace(/[^0-9]/g, ''));
          if (!dateObj || isNaN(dateObj.getTime())) return null;
          const year = dateObj.getFullYear();
          const firstDayOfYear = new Date(year, 0, 1);
          const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
          const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
          return { sale_date: dateObj.toISOString().split('T')[0], week, year, tickets_sold };
        }).filter(item => item !== null && !isNaN(item.tickets_sold));

        if (batchData.length === 0) {
          toast.error('Format CSV tidak sesuai.');
          setLoading(false);
          return;
        }

        try {
          const response = await api.post('/data/tickets.php', { batch: batchData });
          if (response.data.status === 'success') {
            toast.success(response.data.message);
            fetchData();
          }
        } catch (error) {
          toast.error('Gagal mengimpor data batch.');
        } finally {
          setLoading(false);
          e.target.value = null;
          setShowImportModal(false);
        }
      },
      error: (error) => {
        toast.error('Gagal membaca file CSV.');
        setLoading(false);
      }
    });
  };

  const handleDelete = async (id) => {
    setConfirmConfig({
      show: true,
      title: 'Hapus Data',
      message: 'Apakah Anda yakin ingin menghapus data ini secara permanen?',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.delete(`/data/tickets.php?id=${id}`);
          if (response.data.status === 'success') {
            toast.success('Data berhasil dihapus');
            fetchData();
          }
        } catch (error) {
          toast.error('Gagal menghapus data.');
        }
      }
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(displayedData.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    setConfirmConfig({
      show: true,
      title: 'Hapus Terpilih',
      message: `Apakah Anda yakin ingin menghapus ${selectedIds.length} data yang dipilih?`,
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.post('/data/tickets.php', { delete_batch: selectedIds });
          if (response.data.status === 'success') {
            toast.success(`${selectedIds.length} data berhasil dihapus`);
            setSelectedIds([]);
            fetchData();
          }
        } catch (error) {
          toast.error('Gagal menghapus data massal.');
        }
      }
    });
  };

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4"></div></td>
      <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16"></div></td>
      <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div></td>
      <td className="px-4 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12"></div></td>
      <td className="px-4 py-4 text-right"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-16 ml-auto"></div></td>
      <td className="px-4 py-4 text-center"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20 mx-auto"></div></td>
      <td className="px-4 py-4 text-center"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-12 mx-auto"></div></td>
    </tr>
  );

  const handleDeleteAll = async () => {
    setConfirmConfig({
      show: true,
      title: 'Reset Database',
      message: 'PERINGATAN KRITIKAL: Seluruh data penjualan akan dihapus permanen. Tindakan ini tidak dapat dibatalkan!',
      type: 'danger',
      onConfirm: async () => {
        try {
          const response = await api.delete('/data/tickets.php?all=true');
          if (response.data.status === 'success') {
            toast.success('Semua data berhasil dihapus.');
            fetchData();
          }
        } catch (error) {
          toast.error('Gagal menghapus data.');
        }
      }
    });
  };

  const handleExportCSV = () => {
    if (data.length === 0) return toast.error('Tidak ada data untuk diekspor.');
    
    // Transform data for export
    const exportData = data.map(item => ({
      'Tanggal': item.sale_date,
      'Minggu': item.week,
      'Tahun': item.year,
      'Jumlah': item.tickets_sold
    }));

    // Gunakan delimiter titik koma (;) dan tambahkan hint 'sep=;' untuk Excel
    const csv = 'sep=;\n' + Papa.unparse(exportData, { delimiter: ';' });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `database_penjualan_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Database berhasil diekspor ke CSV (Delimited ; untuk Excel)');
  };

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
      className="space-y-10"
    >
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-8 sm:mb-10 lg:mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-[900] text-gray-900 dark:text-white tracking-tighter mb-1 italic">Database Penjualan Tiket</h1>
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm md:text-base font-medium">Kelola data historis untuk pelatihan model LSTM cerdas</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent/5 dark:bg-accent/10 text-cyan-600 dark:text-accent border border-accent/20 rounded-xl text-sm font-bold shadow-sm hover:shadow-md transition-all"
          >
            <Upload size={18} /> Import Data
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setIsEditing(false);
              setFormData({ id: '', sale_date: '', week: '', year: '', tickets_sold: '' });
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2 px-6 py-2"
          >
            <Plus size={18} /> Input Manual
          </motion.button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Modal: Input Manual */}
        <AnimatePresence>
          {showModal && (
            <Portal>
              <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 30 }}
                  className="glass-panel p-6 sm:p-8 lg:p-10 max-w-md w-full border-primary/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] relative max-h-[90vh] overflow-y-auto custom-scrollbar"
                >
                  <button onClick={cancelEdit} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={24} /></button>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    {isEditing ? <Edit2 size={24} className="text-accent" /> : <Plus size={24} className="text-primary" />}
                    {isEditing ? 'Edit Data Penjualan' : 'Input Data Manual'}
                  </h3>
                  <form onSubmit={handleManualSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">ID Transaksi</label>
                      <input type="text" className="input-field bg-gray-100 dark:bg-gray-800/50 cursor-not-allowed opacity-60" placeholder={isEditing ? formData.id : "Otomatis..."} value={isEditing ? formData.id : ""} readOnly />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Tanggal Transaksi</label>
                      <input required type="date" className="input-field" value={formData.sale_date} onChange={e => {
                          const dateObj = new Date(e.target.value);
                          if (!isNaN(dateObj.getTime())) {
                            const year = dateObj.getFullYear();
                            const firstDayOfYear = new Date(year, 0, 1);
                            const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
                            const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                            setFormData({...formData, sale_date: e.target.value, week, year});
                          } else { setFormData({...formData, sale_date: e.target.value}); }
                      }} />
                      {formData.week && <p className="text-sm text-accent mt-2 font-medium">Minggu ke-{formData.week}, {formData.year}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 dark:text-gray-400 mb-2">Jumlah Terjual</label>
                      <input required type="number" min="0" className="input-field" placeholder="0" value={formData.tickets_sold} onChange={e => setFormData({...formData, tickets_sold: e.target.value})} />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={cancelEdit} className="btn-secondary flex-1">Batal</button>
                      <button type="submit" className={`btn-primary flex-1 ${isEditing ? 'bg-accent hover:bg-accent/90' : ''}`}>{isEditing ? 'Simpan' : 'Simpan'}</button>
                    </div>
                  </form>
                </motion.div>
              </div>
            </Portal>
          )}
        </AnimatePresence>

        {/* Modal: Import Data (Combined Guide + Upload) - Premium Redesign */}
        <AnimatePresence>
          {showImportModal && (
            <Portal>
              <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 40 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 40 }}
                  className="glass-panel max-w-4xl w-full border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] relative overflow-y-auto max-h-[95vh]"
                >
                  {/* Decorative Background Elements */}
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[80px] rounded-full"></div>
                  <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/20 blur-[80px] rounded-full"></div>

                  <div className="relative p-8 md:p-10">
                    <button 
                      onClick={() => setShowImportModal(false)} 
                      className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-all z-10"
                    >
                      <X size={24} />
                    </button>
                    
                    <div className="mb-10 text-center md:text-left">
                      <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
                        Import Database <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Penjualan</span>
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400">Pastikan format file Anda sudah sesuai dengan standar sistem.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Step 1: Preparation Card */}
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 relative group overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <AlertTriangle size={80} />
                        </div>
                        
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <span className="font-bold">01</span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">Persiapan Data</h4>
                        </div>

                        <div className="space-y-5">
                          <div className="space-y-3">
                            {[
                              { label: 'Format File', value: 'CSV (Comma Separated)', color: 'text-blue-400' },
                              { label: 'Header Wajib', value: 'Tanggal, Jumlah', color: 'text-emerald-400' },
                              { label: 'Format Tanggal', value: 'YYYY-MM-DD', color: 'text-accent' },
                            ].map((spec, i) => (
                              <div key={i} className="flex justify-between items-center text-sm py-2 border-b border-white/5">
                                <span className="text-gray-500">{spec.label}</span>
                                <span className={`font-mono font-medium ${spec.color}`}>{spec.value}</span>
                              </div>
                            ))}
                          </div>

                          <p className="text-sm text-gray-500 leading-relaxed italic">
                            * Sistem akan otomatis mengekstrak data Minggu dan Tahun dari kolom Tanggal secara cerdas.
                          </p>

                          <motion.a 
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(59, 130, 246, 0.2)' }} 
                            whileTap={{ scale: 0.98 }} 
                            href="/template_data.csv" 
                            download 
                            className="flex items-center justify-center gap-3 w-full py-4 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl font-bold transition-all shadow-lg"
                          >
                            <Download size={20} /> 
                            <span>Download Template .CSV</span>
                          </motion.a>
                        </div>
                      </motion.div>

                      {/* Step 2: Upload Card */}
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/5 border border-white/10 rounded-3xl p-6 relative group overflow-hidden flex flex-col"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent border border-accent/20">
                            <span className="font-bold">02</span>
                          </div>
                          <h4 className="text-lg font-bold text-gray-900 dark:text-white">Eksekusi Import</h4>
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                          <motion.label 
                            whileHover={{ scale: 1.01, borderColor: 'rgba(168, 85, 247, 0.5)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }}
                            className="flex flex-col items-center justify-center w-full h-56 border-2 border-gray-300 dark:border-gray-700 border-dashed rounded-3xl cursor-pointer bg-gray-50 dark:bg-black/20 transition-all duration-300 group"
                          >
                            <div className="flex flex-col items-center justify-center p-6 text-center">
                              <div className="p-4 bg-accent/10 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-accent/20 transition-all">
                                <Upload size={40} className="text-accent" />
                              </div>
                              <p className="text-gray-900 dark:text-white font-medium mb-1">Klik atau Drop File</p>
                              <p className="text-sm text-gray-500">Maksimum ukuran file: 10MB</p>
                            </div>
                            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
                          </motion.label>
                        </div>

                        {loading && (
                          <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-2xl flex items-center gap-3">
                            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-accent font-bold tracking-widest uppercase">Memproses Data...</p>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </Portal>
          )}
        </AnimatePresence>

        {/* Tabel Data Full Width */}
        <motion.div variants={itemVariants} className="glass-panel p-4 sm:p-6 lg:p-8 shadow-2xl flex flex-col min-h-[600px] border-white/10 relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -z-10 rounded-full"></div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Database size={24} className="text-primary"/> 
              Data Historis Penjualan
            </h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 z-10" />
                <input
                  type="text"
                  placeholder="Cari data..."
                  className="input-field pl-12 py-3.5 text-sm font-medium"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>

              <div className="flex items-center gap-2">
                {selectedIds.length > 0 && (
                  <motion.button 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20"
                  >
                    <Trash2 size={16} /> Hapus ({selectedIds.length})
                  </motion.button>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={handleExportCSV} 
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all"
                >
                  <Download size={18} /> Export
                </motion.button>
                
                <motion.button 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={handleDeleteAll} 
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={18} /> Reset
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
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
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
              <span>entries</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {displayedData.length} of {filteredData.length} entries
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700/50 custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-sm text-gray-600 dark:text-gray-300 uppercase bg-gray-100 dark:bg-gray-800/80 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/50">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-primary focus:ring-primary w-4 h-4"
                      checked={selectedIds.length === displayedData.length && displayedData.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/50">ID Transaksi</th>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/50">Tanggal (Y-M-D)</th>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/50">Mgg/Thn</th>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/50 text-right">Jumlah Terjual</th>
                  <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/50 text-center">Waktu Input</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800/50">
                {loading ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : displayedData.length > 0 ? displayedData.map((item, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    key={item.id} 
                    className={`border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 origin-center ${selectedIds.includes(item.id) ? 'bg-primary/5' : ''}`}
                  >
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-primary focus:ring-primary w-4 h-4"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleSelectRow(item.id)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 font-medium text-gray-700 dark:text-gray-300">{item.id}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-accent font-bold">{item.sale_date}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-sm text-gray-600 dark:text-gray-400">M{item.week} / {item.year}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-right text-accent font-medium">{parseInt(item.tickets_sold).toLocaleString()}</td>
                    <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700/30 text-center text-sm text-gray-600 dark:text-gray-500">
                      {item.created_at ? new Date(item.created_at).toLocaleString('id-ID', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={() => handleEdit(item)} className="text-accent hover:text-accent/80 p-1">
                        <Edit2 size={16} />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.2, color: '#ef4444' }} whileTap={{ scale: 0.9 }} onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 size={16} />
                      </motion.button>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      Belum ada data tersedia atau tidak ada kecocokan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {rowsPerPage !== 'all' && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-sm"
              >
                Prev
              </button>
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
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
                className="glass-panel p-8 max-sm:p-6 max-w-sm w-full border-white/10 shadow-2xl text-center"
              >
                <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${
                  confirmConfig.type === 'danger' ? 'bg-red-500/20 text-red-500 border-red-500/20' : 'bg-primary/20 text-primary border-primary/20'
                } border-2`}>
                  <AlertTriangle size={32} />
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{confirmConfig.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
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
    </motion.div>
  );
};

export default DataInput;

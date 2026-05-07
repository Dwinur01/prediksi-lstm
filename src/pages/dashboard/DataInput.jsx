import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Trash2, Edit2, AlertTriangle, FileSpreadsheet, Download, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { getDummyTickets } from '../../services/dummy';

const DataInput = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: '', sale_date: '', week: '', year: '', tickets_sold: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

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

  const filteredData = data.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.week.toString().includes(searchTerm) ||
    item.year.toString().includes(searchTerm) ||
    item.tickets_sold.toString().includes(searchTerm)
  );

  const displayedData = rowsPerPage === 'all' 
    ? filteredData 
    : filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / rowsPerPage);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/data/tickets.php', formData);
      if (response.data.status === 'success') {
        toast.success(isEditing ? 'Data berhasil diperbarui' : 'Data berhasil disimpan');
        setFormData({ id: '', week: '', year: '', tickets_sold: '' });
        setIsEditing(false);
        fetchData();
      }
    } catch (error) {
      toast.error('Gagal memproses data.');
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setFormData({ id: '', week: '', year: '', tickets_sold: '' });
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus data ini?')) {
      try {
        const response = await api.delete(`/data/tickets.php?id=${id}`);
        if (response.data.status === 'success') {
          toast.success('Data dihapus');
          fetchData();
        }
      } catch (error) {
        toast.error('Gagal menghapus data.');
      }
    }
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
        // Validate and transform data
        const batchData = results.data.map(row => {
          const rawDate = row['Tanggal'] || row['Date'] || row['tanggal'] || row['date'];
          const rawAmount = row['Jumlah'] || row['Terjual'] || row['tickets_sold'] || row['amount'];
          
          if (!rawDate || !rawAmount) return null;

          // Robust date parsing
          let dateObj = new Date(rawDate);
          
          // Handle DD/MM/YYYY or DD-MM-YYYY formats if native parsing fails
          if (isNaN(dateObj.getTime())) {
            const parts = rawDate.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) { // YYYY-MM-DD
                dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
              } else if (parts[2].length === 4) { // DD-MM-YYYY
                dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
              }
            }
          }

          const tickets_sold = parseInt(rawAmount.toString().replace(/[^0-9]/g, ''));

          if (!dateObj || isNaN(dateObj.getTime())) return null;

          const year = dateObj.getFullYear();
          const firstDayOfYear = new Date(year, 0, 1);
          const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
          const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);

          return { 
            sale_date: dateObj.getFullYear() + '-' + 
                      String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + 
                      String(dateObj.getDate()).padStart(2, '0'), 
            week, 
            year, 
            tickets_sold 
          };
        }).filter(item => item !== null && !isNaN(item.tickets_sold));

        if (batchData.length === 0) {
          toast.error('Format CSV tidak sesuai. Pastikan ada kolom Tanggal dan Jumlah.');
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
          e.target.value = null; // reset file input
        }
      },
      error: (error) => {
        toast.error('Gagal membaca file CSV.');
        setLoading(false);
      }
    });
  };

  const handleDeleteAll = async () => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data penjualan?')) {
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
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white mb-2">Manajemen Data Penjualan</h1>
        <p className="text-gray-400">Input manual atau impor data penjualan mingguan dari CSV.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-4 shadow-lg shadow-blue-500/5">
        <AlertTriangle className="text-blue-400 mt-1 flex-shrink-0" size={24} />
        <div>
          <h4 className="text-blue-400 font-medium">Panduan Import Data CSV</h4>
          <p className="text-gray-300 text-sm mt-1">
            Gunakan format file <strong>CSV</strong> (Comma Separated Values).
            <br/>Kolom baris pertama (header) <strong>wajib</strong> bernama: <code>Tanggal, Jumlah</code>. (Format: YYYY-MM-DD).
            <br/>Sistem akan otomatis menghitung <strong>Minggu</strong> dan <strong>Tahun</strong> dari tanggal tersebut.
          </p>
          <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="/template_data.csv" download className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors border border-blue-500/30">
            <Download size={14} /> Download File Contoh CSV
          </motion.a>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Manual */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div variants={itemVariants} className="glass-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditing ? <Edit2 size={20} className="text-accent" /> : <Plus size={20} className="text-primary" />}
                {isEditing ? 'Edit Data' : 'Input Manual'}
              </div>
              {isEditing && (
                <motion.button whileHover={{ rotate: 90 }} onClick={cancelEdit} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </motion.button>
              )}
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">ID Transaksi/Periode</label>
                <input 
                  type="text" 
                  className="input-field bg-gray-800/50 cursor-not-allowed opacity-60" 
                  placeholder={isEditing ? formData.id : "Dibuat otomatis oleh sistem..."} 
                  value={isEditing ? formData.id : ""} 
                  readOnly 
                />
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  Format: tiket-{new Date().toISOString().split('T')[0].replace(/-/g, '')}-XXX
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tanggal Transaksi</label>
                  <input 
                    required 
                    type="date" 
                    className="input-field" 
                    value={formData.sale_date} 
                    onChange={e => {
                      const dateObj = new Date(e.target.value);
                      if (!isNaN(dateObj.getTime())) {
                        const year = dateObj.getFullYear();
                        const firstDayOfYear = new Date(year, 0, 1);
                        const pastDaysOfYear = (dateObj - firstDayOfYear) / 86400000;
                        const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
                        setFormData({...formData, sale_date: e.target.value, week, year});
                      } else {
                        setFormData({...formData, sale_date: e.target.value});
                      }
                    }} 
                  />
                  {formData.week && (
                    <p className="text-[10px] text-accent mt-1">Terdeteksi: Minggu ke-{formData.week}, Tahun {formData.year}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Jumlah Tiket Terjual</label>
                <input required type="number" min="0" className="input-field" placeholder="0" value={formData.tickets_sold} onChange={e => setFormData({...formData, tickets_sold: e.target.value})} />
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className={`btn-primary w-full ${isEditing ? 'bg-accent hover:bg-accent/90 shadow-accent/25' : ''}`}
              >
                {isEditing ? 'Perbarui Data' : 'Simpan Data'}
              </motion.button>
            </form>
          </motion.div>

          <motion.div variants={itemVariants} className="glass-panel p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-accent" /> Import CSV
            </h3>
            <motion.label 
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(31, 41, 55, 0.8)' }}
              whileTap={{ scale: 0.98 }}
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:border-primary transition-all duration-300"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload size={28} className="text-gray-400 mb-2 group-hover:text-primary transition-colors" />
                <p className="text-sm text-gray-400"><span className="font-semibold text-primary">Klik untuk upload</span></p>
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </motion.label>
            {loading && <p className="text-sm text-accent mt-2 text-center animate-pulse">Memproses file...</p>}
          </motion.div>
        </div>

        {/* Tabel Data */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-panel p-6 shadow-xl flex flex-col h-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Search size={20} className="text-primary"/> Database Penjualan
            </h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-56">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Cari ID/Tahun..."
                  className="input-field pl-10 py-1.5 text-sm"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExportCSV} className="text-xs flex items-center justify-center gap-1 text-accent hover:text-accent/80 transition-colors bg-accent/10 px-3 py-1.5 rounded-lg border border-accent/20 w-full sm:w-auto whitespace-nowrap">
                  <FileSpreadsheet size={14} /> Export CSV
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDeleteAll} className="text-xs flex items-center justify-center gap-1 text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 w-full sm:w-auto whitespace-nowrap">
                  <Trash2 size={14} /> Hapus Semua
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Show</span>
              <select 
                value={rowsPerPage} 
                onChange={(e) => {
                  setRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-800 border border-gray-700 text-gray-300 rounded px-1 py-0.5 outline-none focus:border-primary"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
              <span>entries</span>
            </div>
            <div className="text-xs text-gray-500">
              Showing {displayedData.length} of {filteredData.length} entries
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto rounded-lg border border-gray-700/50 custom-scrollbar">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-300 uppercase bg-gray-800/80 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">ID Transaksi</th>
                  <th className="px-4 py-3">Tanggal (Y-M-D)</th>
                  <th className="px-4 py-3">Mgg/Thn</th>
                  <th className="px-4 py-3 text-right">Jumlah Terjual</th>
                  <th className="px-4 py-3 text-center">Waktu Input</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {displayedData.length > 0 ? displayedData.map((item, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.4)', scale: 1.01 }}
                    key={item.id} 
                    className="border-b border-gray-700/50 hover:bg-gray-800/30 origin-left"
                  >
                    <td className="px-4 py-3">{(currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-300">{item.id}</td>
                    <td className="px-4 py-3 text-accent font-bold">{item.sale_date}</td>
                    <td className="px-4 py-3 text-xs">M{item.week} / {item.year}</td>
                    <td className="px-4 py-3 text-right text-accent font-medium">{parseInt(item.tickets_sold).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
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
                className="px-3 py-1 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-30 text-xs"
              >
                Prev
              </button>
              <span className="text-xs text-gray-500">Page {currentPage} of {totalPages}</span>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3 py-1 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-30 text-xs"
              >
                Next
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default DataInput;

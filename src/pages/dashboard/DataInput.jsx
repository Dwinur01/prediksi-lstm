import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, Plus, Trash2, Edit2, AlertTriangle, FileSpreadsheet, Download, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getDummyTickets } from '../../services/dummy';

const DataInput = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ id: '', week: '', year: '', tickets_sold: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/data/tickets.php');
      if (response.data.status === 'success' && response.data.data.length > 0) {
        setData(response.data.data);
      } else {
        throw new Error('No data');
      }
    } catch (error) {
      console.warn('API error, using dummy data');
      toast('Database terputus, menampilkan data simulasi', { icon: '⚠️' });
      setData(getDummyTickets());
    } finally {
      setLoading(false);
    }
  };

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
          // Asumsi nama kolom di CSV: ID, Minggu, Tahun, Jumlah
          const week = parseInt(row['Minggu'] || row['Week'] || row['week']);
          const year = parseInt(row['Tahun'] || row['Year'] || row['year']);
          const tickets_sold = parseInt(row['Jumlah'] || row['Terjual'] || row['tickets_sold']);
          const id = row['ID'] || row['id'] || `W${week}Y${year}`;

          return { id, week, year, tickets_sold };
        }).filter(item => item.week && item.year && !isNaN(item.tickets_sold));

        if (batchData.length === 0) {
          toast.error('Format CSV tidak sesuai. Pastikan ada kolom ID, Minggu, Tahun, Jumlah.');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Manajemen Data Penjualan</h1>
        <p className="text-gray-400">Input manual atau impor data penjualan mingguan dari CSV.</p>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-4">
        <AlertTriangle className="text-blue-400 mt-1 flex-shrink-0" size={24} />
        <div>
          <h4 className="text-blue-400 font-medium">Panduan Import Data CSV</h4>
          <p className="text-gray-300 text-sm mt-1">
            Gunakan format file <strong>CSV</strong> (Comma Separated Values).
            <br/>Kolom baris pertama (header) <strong>wajib</strong> bernama: <code>ID, Minggu, Tahun, Jumlah</code>.
            <br/>Untuk mendapatkan hasil prediksi LSTM yang akurat, <strong>pastikan tidak ada urutan minggu yang terlewat</strong> dalam rentang data Anda (data harus berurutan).
          </p>
          <a href="/template_data.csv" download className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors border border-blue-500/30">
            <Download size={14} /> Download File Contoh CSV
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Manual */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isEditing ? <Edit2 size={20} className="text-accent" /> : <Plus size={20} className="text-primary" />}
                {isEditing ? 'Edit Data' : 'Input Manual'}
              </div>
              {isEditing && (
                <button onClick={cancelEdit} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              )}
            </h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">ID Transaksi/Periode</label>
                <input required type="text" className={`input-field ${isEditing ? 'bg-gray-700/50 cursor-not-allowed' : ''}`} placeholder="Contoh: W1Y2023" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} readOnly={isEditing} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Minggu Ke-</label>
                  <input required type="number" min="1" max="53" className="input-field" placeholder="1-53" value={formData.week} onChange={e => setFormData({...formData, week: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tahun</label>
                  <input required type="number" min="2000" className="input-field" placeholder="2023" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Jumlah Tiket Terjual</label>
                <input required type="number" min="0" className="input-field" placeholder="0" value={formData.tickets_sold} onChange={e => setFormData({...formData, tickets_sold: e.target.value})} />
              </div>
              <button type="submit" className={`btn-primary w-full ${isEditing ? 'bg-accent hover:bg-accent/90 shadow-accent/25' : ''}`}>
                {isEditing ? 'Perbarui Data' : 'Simpan Data'}
              </button>
            </form>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-accent" /> Import CSV
            </h3>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload size={28} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-400"><span className="font-semibold text-primary">Klik untuk upload</span></p>
              </div>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={loading} />
            </label>
            {loading && <p className="text-sm text-accent mt-2 text-center animate-pulse">Memproses file...</p>}
          </div>
        </div>

        {/* Tabel Data */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-semibold text-white">Database Penjualan</h3>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={handleDeleteAll} className="text-xs flex items-center justify-center gap-1 text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 w-full sm:w-auto whitespace-nowrap">
                <Trash2 size={14} /> Hapus Semua
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-700/50">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-300 uppercase bg-gray-800/80">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Minggu</th>
                  <th className="px-4 py-3">Tahun</th>
                  <th className="px-4 py-3 text-right">Jumlah Terjual</th>
                  <th className="px-4 py-3 text-center">Waktu Input</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.filter(item => 
                  item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  item.week.toString().includes(searchTerm) ||
                  item.year.toString().includes(searchTerm) ||
                  item.tickets_sold.toString().includes(searchTerm)
                ).length > 0 ? data.filter(item => 
                  item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  item.week.toString().includes(searchTerm) ||
                  item.year.toString().includes(searchTerm) ||
                  item.tickets_sold.toString().includes(searchTerm)
                ).map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-300">{item.id}</td>
                    <td className="px-4 py-3">{item.week}</td>
                    <td className="px-4 py-3">{item.year}</td>
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
                      <button onClick={() => handleEdit(item)} className="text-accent hover:text-accent/80 p-1">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 p-1">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
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
        </div>
      </div>
    </div>
  );
};

export default DataInput;

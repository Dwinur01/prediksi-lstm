import { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import {
  Upload, Plus, Trash2, Edit2, FileSpreadsheet, Download,
  Search, X, Database, CheckSquare, Square, AlertTriangle,
  ArrowUpDown, RefreshCw, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import api, { apiErrorMessage } from '../../services/api';
import { requestRetrain, useRetrainStatus } from '../../services/lstm/autoRetrain';
import Portal from '../../components/ui/Portal';

/* ─── Confirm Modal ─── */
const ConfirmModal = ({ config, onClose }) => {
  if (!config.show) return null;
  return (
    <Portal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 "
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="modal-panel p-7 max-w-sm w-full "
          onClick={e => e.stopPropagation()}
        >
          <div className={`w-12 h-12 rounded-md flex items-center justify-center mx-auto mb-4 ${config.type === 'danger' ? 'bg-negative/10 text-negative ' : 'bg-primary/10 text-brand '}`}>
            <AlertTriangle size={22} />
          </div>
          <h3 className="text-lg font-semibold text-center text-ink mb-2">{config.title}</h3>
          <p className="text-sm text-muted text-center mb-6 leading-relaxed">{config.message}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Batal</button>
            <button
              onClick={() => { config.onConfirm?.(); onClose(); }}
              className={`flex-1 py-2.5 rounded-md font-bold text-sm text-white dark:text-paper transition-all ${config.type === 'danger' ? 'bg-negative hover:bg-negative ' : 'btn-primary'}`}
            >
              {config.type === 'danger' ? 'Hapus' : 'Konfirmasi'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </Portal>
  );
};

/* ─── Data Form Modal ─── */
const DataFormModal = ({ show, onClose, formData, setFormData, isEditing, onSubmit }) => {
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };

    if (name === 'sale_date' && value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const firstDay = new Date(y, 0, 1);
        const w = Math.ceil(((d - firstDay) / 86400000 + firstDay.getDay() + 1) / 7);
        updated.week = w;
        updated.year = y;
      }
    }

    setFormData(updated);
    const errs = { ...errors };
    if (name === 'sale_date' && value) delete errs.sale_date;
    if (name === 'tickets_sold' && parseInt(value) > 0) delete errs.tickets_sold;
    if (name === 'ticket_price' && parseFloat(value) > 0) delete errs.ticket_price;
    setErrors(errs);
  };

  const validate = () => {
    const errs = {};
    if (!formData.sale_date) errs.sale_date = 'Tanggal wajib diisi';
    if (!formData.tickets_sold || parseInt(formData.tickets_sold) <= 0) errs.tickets_sold = 'Jumlah tiket harus > 0';
    if (!formData.ticket_price || parseFloat(formData.ticket_price) <= 0) errs.ticket_price = 'Harga tiket harus > 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSubmit();
  };

  return (
    <AnimatePresence>
      {show && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 "
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="modal-panel p-7 max-w-md w-full "
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md text-brand ">
                    {isEditing ? <Edit2 size={18} /> : <Plus size={18} />}
                  </div>
                  <h3 className="text-lg font-semibold text-ink ">
                    {isEditing ? 'Edit Data' : 'Tambah Data Baru'}
                  </h3>
                </div>
                <button onClick={onClose} className="btn-icon p-2"><X size={16} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label className="input-label">Tanggal Penjualan</label>
                  <input
                    type="date" name="sale_date" value={formData.sale_date}
                    onChange={handleChange}
                    className={`input-field ${errors.sale_date ? 'border-negative/50' : ''}`}
                  />
                  {errors.sale_date && (
                    <p className="text-negative text-xs mt-1">{errors.sale_date}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Minggu</label>
                    <input type="number" name="week" value={formData.week} readOnly
                      className="input-field bg-ink/5 text-muted cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="input-label">Tahun</label>
                    <input type="number" name="year" value={formData.year} readOnly
                      className="input-field bg-ink/5 text-muted cursor-not-allowed" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Jumlah Tiket Terjual</label>
                    <input
                      type="number" name="tickets_sold" value={formData.tickets_sold}
                      onChange={handleChange} placeholder="Jumlah tiket"
                      className={`input-field ${errors.tickets_sold ? 'border-negative/50' : ''}`}
                    />
                    {errors.tickets_sold && (
                      <p className="text-negative text-xs mt-1">{errors.tickets_sold}</p>
                    )}
                  </div>
                  <div>
                    <label className="input-label">Harga tiket (ribu Rp)</label>
                    <input
                      type="number" name="ticket_price" value={formData.ticket_price}
                      onChange={handleChange} placeholder="Harga tiket"
                      className={`input-field ${errors.ticket_price ? 'border-negative/50' : ''}`}
                    />
                    {errors.ticket_price && (
                      <p className="text-negative text-xs mt-1">{errors.ticket_price}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5 text-sm">Batal</button>
                  <button type="submit" className="btn-primary flex-1 py-2.5 text-sm">
                    <Check size={15} />
                    {isEditing ? 'Simpan Perubahan' : 'Tambah Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

/* ─── Drag-and-Drop CSV Import Modal ─── */
const ImportModal = ({ show, onClose, onImport, loading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1); // 1=upload, 2=preview
  const fileRef = useRef(null);

  const reset = () => { setFile(null); setPreview([]); setStep(1); };

  const handleClose = () => { reset(); onClose(); };

  const parseFile = useCallback((f) => {
    if (!f || !f.name.match(/\.csv$/i)) {
      toast.error('Hanya file .csv yang didukung.'); return;
    }
    setFile(f);
    Papa.parse(f, {
      header: true, skipEmptyLines: true, preview: 5,
      complete: (results) => {
        const parsed = results.data.map(row => {
          const rawDate = row['Tanggal'] || row['Date'] || row['tanggal'] || '';
          const rawAmt = row['Jumlah'] || row['Terjual'] || row['tickets_sold'] || '';
          const rawPrice = row['Harga'] || row['Harga Tiket'] || row['ticket_price'] || row['price'] || '0';
          return { tanggal: rawDate, jumlah: rawAmt, harga: rawPrice };
        }).filter(r => r.tanggal && r.jumlah);
        setPreview(parsed);
        setStep(2);
      },
    });
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };

  const handleFileInput = (e) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
    e.target.value = null;
  };

  const handleConfirmImport = () => {
    if (!file) return;
    onImport(file);
    handleClose();
  };

  const downloadTemplate = () => {
    const csv = 'Tanggal,Jumlah,Harga\n2024-01-07,520,850\n2024-01-14,480,870\n2024-01-21,510,890\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template_tiket.csv';
    a.click();
  };

  return (
    <AnimatePresence>
      {show && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 "
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="modal-panel p-7 max-w-lg w-full "
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-md text-brand ">
                    <Upload size={18} />
                  </div>
                  <h3 className="text-lg font-semibold text-ink ">Import CSV</h3>
                </div>
                <button onClick={handleClose} className="btn-icon p-2"><X size={16} /></button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-6">
                {['Upload File', 'Preview & Konfirmasi'].map((s, i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step > i ? 'bg-positive text-white dark:text-paper' : step === i + 1 ? 'bg-primary text-white' : 'bg-ink/5 text-muted '}`}>
                      {step > i + 1 ? <Check size={12} /> : i + 1}
                    </div>
                    <span className={`text-xs font-bold ${step === i + 1 ? 'text-ink ' : 'text-muted '}`}>{s}</span>
                    {i < 1 && <div className="flex-1 h-px bg-ink/5 " />}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {/* Drag zone */}
                    <div
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className="drag-zone cursor-pointer transition-all duration-300"
                    >
                      <motion.div animate={isDragging ? { scale: 1.1 } : { scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
                        <FileSpreadsheet size={48} className={`mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted '}`} />
                      </motion.div>
                      <p className="font-semibold text-ink mb-1">
                        {isDragging ? 'Lepaskan file di sini!' : 'Drag & drop file CSV'}
                      </p>
                      <p className="text-sm text-muted ">atau klik untuk memilih file</p>
                      <input ref={fileRef} type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
                    </div>

                    {/* Format hint */}
                    <div className="mt-4 p-4 rounded-md bg-brand/5 border border-brand/10 text-xs text-muted ">
                      <p className="font-bold text-muted mb-2">Format kolom yang didukung:</p>
                      <code className="block bg-ink/5 rounded-lg p-2 text-xs font-mono">
                        Tanggal, Jumlah, Harga<br />
                        2024-01-07, 520, 850<br />
                        2024-01-14, 480, 870
                      </code>
                    </div>

                    <button onClick={downloadTemplate} className="btn-ghost w-full justify-center mt-3 text-sm">
                      <Download size={14} className="text-accent" />
                      Unduh Template CSV
                    </button>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <div className="mb-4 p-3 bg-positive/10 border border-positive/20 rounded-md flex items-center gap-3">
                      <Check size={16} className="text-positive shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-positive ">{file?.name}</p>
                        <p className="text-xs text-muted">Menampilkan 5 baris pertama sebagai preview</p>
                      </div>
                    </div>

                    <div className="overflow-auto rounded-md border border-rule mb-4 max-h-48">
                      <table className="w-full text-xs">
                        <thead className="bg-ink/5 ">
                          <tr>
                            {['Tanggal', 'Jumlah Tiket', 'Harga'].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rule ">
                          {preview.map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2.5 text-muted ">{row.tanggal}</td>
                              <td className="px-3 py-2.5 font-bold text-brand ">{row.jumlah}</td>
                              <td className="px-3 py-2.5 font-bold text-brand ">Rp {parseFloat(row.harga || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={() => { setStep(1); setFile(null); setPreview([]); }} className="btn-secondary flex-1 text-sm py-2.5">
                        Ganti File
                      </button>
                      <button onClick={handleConfirmImport} disabled={loading} className="btn-primary flex-1 text-sm py-2.5">
                        {loading ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-rule border-t-white rounded-full" />
                        ) : (
                          <><Upload size={14} /> Import Data</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

/* ─── Main DataInput Component ─── */
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
  const [isOnline, setIsOnline] = useState(true);
  const [sortDir, setSortDir] = useState('desc');
  const [loadError, setLoadError] = useState(null);
  const retrain = useRetrainStatus();

  useEffect(() => { fetchData(); }, []);

  // `retrain=true` setelah data disimpan/diubah/dihapus → memicu pelatihan ulang otomatis (jeda 3 dtk).
  const fetchData = async (retrain = false) => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await api.get('/data/tickets.php');
      if (r.data.status === 'success') {
        setData(r.data.data);
        setIsOnline(true);
        if (retrain) requestRetrain(r.data.data);
      } else {
        setData([]);
        setLoadError(r.data.message || 'Data tidak dapat dimuat.');
      }
    } catch (e) {
      setData([]);
      setIsOnline(false);
      setLoadError(apiErrorMessage(e, 'Data tidak dapat dimuat.'));
    } finally { setLoading(false); }
  };

  const filteredData = data
    .filter(item => {
      const s = searchTerm.toLowerCase();
      return (
        (item.id && item.id.toString().toLowerCase().includes(s)) ||
        (item.sale_date && item.sale_date.toLowerCase().includes(s)) ||
        item.tickets_sold.toString().includes(s) ||
        item.week.toString().includes(s) ||
        item.year.toString().includes(s)
      );
    })
    .sort((a, b) => sortDir === 'desc'
      ? parseInt(b.tickets_sold) - parseInt(a.tickets_sold)
      : parseInt(a.tickets_sold) - parseInt(b.tickets_sold)
    );

  const displayedData = rowsPerPage === 'all'
    ? filteredData
    : filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = rowsPerPage === 'all' ? 1 : Math.ceil(filteredData.length / rowsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [filteredData, rowsPerPage, totalPages, currentPage]);

  const handleEdit = (item) => {
    setFormData({ id: item.id, sale_date: item.sale_date || '', week: item.week, year: item.year, tickets_sold: item.tickets_sold, ticket_price: item.ticket_price || '' });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleManualSubmit = () => {
    setConfirmConfig({
      show: true,
      title: isEditing ? 'Konfirmasi Edit' : 'Konfirmasi Simpan',
      message: `Apakah Anda yakin ingin ${isEditing ? 'memperbarui' : 'menyimpan'} data ini?`,
      type: 'primary',
      onConfirm: async () => {
        try {
          const r = await api.post('/data/tickets.php', formData);
          if (r.data.status === 'success') {
            toast.success(isEditing ? 'Data berhasil diperbarui.' : 'Data berhasil ditambahkan.');
            setFormData({ id: '', sale_date: '', week: '', year: '', tickets_sold: '', ticket_price: '' });
            setIsEditing(false);
            setShowModal(false);
            fetchData(true);
          }
        } catch { toast.error('Gagal memproses data.'); }
      },
    });
  };

  const handleImportCSV = (file) => {
    setLoading(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const batchData = results.data.map(row => {
          const rawDate = row['Tanggal'] || row['Date'] || row['tanggal'] || row['date'];
          const rawAmt = row['Jumlah'] || row['Terjual'] || row['tickets_sold'] || row['amount'];
          const rawPrice = row['Harga'] || row['Harga Tiket'] || row['ticket_price'] || row['price'] || '0';
          if (!rawDate || !rawAmt) return null;
          let d = new Date(rawDate);
          if (isNaN(d.getTime())) {
            const p = rawDate.split(/[-/]/);
            if (p.length === 3) d = p[0].length === 4 ? new Date(p[0], p[1] - 1, p[2]) : new Date(p[2], p[1] - 1, p[0]);
          }
          if (!d || isNaN(d.getTime())) return null;
          const y = d.getFullYear();
          const first = new Date(y, 0, 1);
          const w = Math.ceil(((d - first) / 86400000 + first.getDay() + 1) / 7);
          const tickets_sold = parseInt(rawAmt.toString().replace(/[^0-9]/g, ''));
          const ticket_price = parseFloat(rawPrice.toString().replace(/[^0-9.]/g, ''));
          return isNaN(tickets_sold) ? null : {
            sale_date: d.toISOString().split('T')[0],
            week: w,
            year: y,
            tickets_sold,
            ticket_price: isNaN(ticket_price) ? 0 : ticket_price
          };
        }).filter(Boolean);

        if (batchData.length === 0) { toast.error('Format CSV tidak sesuai.'); setLoading(false); return; }
        try {
          const r = await api.post('/data/tickets.php', { batch: batchData });
          if (r.data.status === 'success') { toast.success(r.data.message || `${batchData.length} data berhasil diimport!`); fetchData(true); }
        } catch { toast.error('Gagal mengimport data.'); }
        finally { setLoading(false); }
      },
      error: () => { toast.error('Gagal membaca file CSV.'); setLoading(false); },
    });
  };

  const handleDelete = (id) => {
    setConfirmConfig({
      show: true, title: 'Hapus Data', type: 'danger',
      message: 'Data ini akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.',
      onConfirm: async () => {
        try {
          const r = await api.delete(`/data/tickets.php?id=${id}`);
          if (r.data.status === 'success') { toast.success('Data berhasil dihapus.'); fetchData(true); }
        } catch { toast.error('Gagal menghapus data.'); }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmConfig({
      show: true, title: `Hapus ${selectedIds.length} Data`, type: 'danger',
      message: `${selectedIds.length} data yang dipilih akan dihapus secara permanen.`,
      onConfirm: async () => {
        try {
          const r = await api.post('/data/tickets.php', { delete_batch: selectedIds });
          if (r.data.status === 'success') { toast.success(`${selectedIds.length} data berhasil dihapus.`); setSelectedIds([]); fetchData(true); }
        } catch { toast.error('Gagal menghapus data.'); }
      },
    });
  };

  const handleDeleteAll = () => {
    setConfirmConfig({
      show: true, title: 'Reset Semua Data', type: 'danger',
      message: '⚠️ PERINGATAN: Seluruh database penjualan akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan!',
      onConfirm: async () => {
        try {
          const r = await api.delete('/data/tickets.php?all=true');
          if (r.data.status === 'success') { toast.success('Semua data berhasil dihapus.'); fetchData(true); }
        } catch { toast.error('Gagal menghapus semua data.'); }
      },
    });
  };

  const handleExportCSV = () => {
    if (data.length === 0) return toast.error('Tidak ada data untuk diekspor.');
    const csv = 'sep=;\n' + Papa.unparse(
      data.map(d => ({ Tanggal: d.sale_date, Minggu: d.week, Tahun: d.year, Jumlah: d.tickets_sold, Harga: d.ticket_price })),
      { delimiter: ';' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `data-tiket-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Data berhasil diekspor ke CSV!');
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? displayedData.map(d => d.id) : []);
  };
  const handleSelectRow = (id) => {
    setSelectedIds(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  };

  const containerV = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

  return (
    <motion.div variants={containerV} initial="hidden" animate="visible" className="space-y-6 pb-12">

      {/* ── Header ── */}
      <motion.div variants={itemV} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-semibold tracking-tight text-ink ">Data Penjualan</h1>
            {!isOnline && <span className="badge badge-warning">Server tidak terjangkau</span>}
          </div>
          <p className="text-muted text-sm font-medium">
            Kelola database penjualan tiket pesawat. Total: <strong className="text-brand ">{data.length.toLocaleString()}</strong> record.
          </p>
          {loadError && <p className="note-negative mt-3" role="alert">{loadError}</p>}
          {retrain.status !== 'idle' && retrain.message && <p className="note-brand mt-3">{retrain.message}</p>}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2">
          <motion.button onClick={() => fetchData()} className="btn-icon" disabled={loading}>
            <motion.div animate={loading ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <RefreshCw size={15} />
            </motion.div>
          </motion.button>
          <motion.button onClick={handleExportCSV} className="btn-secondary text-sm py-2.5 px-4">
            <Download size={14} className="text-accent" /> Export CSV
          </motion.button>
          <motion.button onClick={() => setShowImportModal(true)} className="btn-secondary text-sm py-2.5 px-4">
            <Upload size={14} className="text-primary" /> Import CSV
          </motion.button>
          <motion.button
            onClick={() => { setIsEditing(false); setFormData({ id: '', sale_date: '', week: '', year: '', tickets_sold: '', ticket_price: '' }); setShowModal(true); }}
            className="btn-primary text-sm py-2.5 px-5"
          >
            <Plus size={15} /> Tambah Data
          </motion.button>
        </div>
      </motion.div>

      {/* ── Bulk actions ── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-3.5 flex items-center justify-between gap-4 border border-primary/20 bg-primary/5">
              <span className="text-sm font-bold text-brand ">{selectedIds.length} data dipilih</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds([])} className="btn-ghost text-xs py-1.5 px-3">Batal Pilih</button>
                <button onClick={handleBulkDelete} className="btn-danger text-xs py-1.5 px-3">
                  <Trash2 size={13} /> Hapus Terpilih
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table card ── */}
      <motion.div variants={itemV} className="glass-panel p-5 lg:p-7">
        {/* Table toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted " />
            <input
              type="text" placeholder="Cari data..." value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="input-field pl-9 py-2.5 text-sm"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              className="btn-icon"
              title="Urutkan berdasarkan tiket"
            >
              <ArrowUpDown size={15} />
            </motion.button>
            <select value={rowsPerPage} onChange={e => { setRowsPerPage(e.target.value === 'all' ? 'all' : parseInt(e.target.value)); setCurrentPage(1); }} className="input-field py-2 text-sm w-auto">
              {[5, 10, 25, 50, 'all'].map(v => <option key={v} value={v}>{v === 'all' ? 'Semua' : `${v} baris`}</option>)}
            </select>
            <button onClick={handleDeleteAll} className="btn-danger text-xs py-2 px-3">
              <Trash2 size={13} /> Reset
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-md border border-rule relative">
          {loading && (
            <div className="absolute inset-0 bg-surface z-10 flex items-center justify-center rounded-md">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full" />
            </div>
          )}
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted uppercase bg-ink/5 sticky top-0">
              <tr>
                <th className="px-4 py-3.5 border-b border-rule w-10">
                  <button onClick={() => handleSelectAll(selectedIds.length !== displayedData.length)} className="text-muted hover:text-primary transition-colors">
                    {selectedIds.length === displayedData.length && displayedData.length > 0
                      ? <CheckSquare size={16} className="text-primary" />
                      : <Square size={16} />}
                  </button>
                </th>
                {['No', 'ID', 'Tanggal', 'Mgg/Thn', 'Tiket Terjual', 'Harga tiket (ribu Rp)', 'Input', 'Aksi'].map(h => (
                  <th key={h} className="px-4 py-3.5 font-semibold tracking-wider border-b border-rule ">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule ">
              <AnimatePresence initial={false}>
                {displayedData.map((item, idx) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <motion.tr
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`group transition-colors duration-150 ${isSelected ? 'bg-primary/5 ' : 'hover:bg-ink/5 dark:hover:bg-white/[0.02]'}`}
                    >
                      <td className="px-4 py-3.5">
                        <button onClick={() => handleSelectRow(item.id)} className="text-muted hover:text-primary transition-colors">
                          {isSelected ? <CheckSquare size={15} className="text-primary" /> : <Square size={15} />}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-muted text-xs">{(currentPage - 1) * (rowsPerPage === 'all' ? 0 : rowsPerPage) + idx + 1}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted">{item.id}</td>
                      <td className="px-4 py-3.5 font-bold text-brand text-xs">{item.sale_date}</td>
                      <td className="px-4 py-3.5 text-xs text-muted ">M{item.week}/{item.year}</td>
                      <td className="px-4 py-3.5 font-semibold text-ink text-right tabular-nums">
                        {parseInt(item.tickets_sold).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-brand text-right tabular-nums">
                        Rp {parseFloat(item.ticket_price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-muted italic">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.button onClick={() => handleEdit(item)} className="p-1.5 rounded-lg bg-primary/10 text-brand hover:bg-primary/20 transition-colors">
                            <Edit2 size={13} />
                          </motion.button>
                          <motion.button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg bg-negative/10 text-negative hover:bg-negative/20 transition-colors">
                            <Trash2 size={13} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {!loading && displayedData.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <Database size={40} className="mx-auto mb-3 text-gray-200 " />
                    <p className="text-muted font-medium">
                      {searchTerm ? 'Tidak ada data yang cocok.' : 'Belum ada data tersedia.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {rowsPerPage !== 'all' && totalPages > 1 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-rule ">
            <p className="text-xs text-muted ">
              Menampilkan <strong>{displayedData.length}</strong> dari <strong>{filteredData.length}</strong> data
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-2.5 py-1.5 text-xs font-bold bg-ink/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors">«</button>
              <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="px-3 py-1.5 text-xs font-bold bg-ink/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors">‹</button>
              <span className="text-xs font-bold text-muted px-2">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs font-bold bg-ink/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors">›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-2.5 py-1.5 text-xs font-bold bg-ink/5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-30 transition-colors">»</button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Modals ── */}
      <DataFormModal
        show={showModal}
        onClose={() => { setShowModal(false); setIsEditing(false); setFormData({ id: '', sale_date: '', week: '', year: '', tickets_sold: '', ticket_price: '' }); }}
        formData={formData}
        setFormData={setFormData}
        isEditing={isEditing}
        onSubmit={handleManualSubmit}
      />

      <ImportModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportCSV}
        loading={loading}
      />

      <AnimatePresence>
        {confirmConfig.show && (
          <ConfirmModal
            config={confirmConfig}
            onClose={() => setConfirmConfig(c => ({ ...c, show: false }))}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DataInput;

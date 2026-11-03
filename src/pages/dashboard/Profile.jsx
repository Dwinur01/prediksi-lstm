import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, Check, Save, AlertCircle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Profile = ({ user, setUser }) => {
  const [formData, setFormData] = useState({ id: '', name: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const u = user || JSON.parse(localStorage.getItem('user') || '{}');
    setFormData(prev => ({ ...prev, id: u.id || '', name: u.name || '' }));
  }, [user]);

  const validate = (name, value) => {
    const errs = { ...errors };
    if (name === 'name') {
      if (!value.trim()) errs.name = 'Nama tidak boleh kosong';
      else if (value.length < 2) errs.name = 'Min. 2 karakter';
      else delete errs.name;
    }
    if (name === 'confirmPassword' || name === 'password') {
      const pwd = name === 'password' ? value : formData.password;
      const conf = name === 'confirmPassword' ? value : formData.confirmPassword;
      if (conf && pwd !== conf) errs.confirmPassword = 'Password tidak cocok';
      else delete errs.confirmPassword;
    }
    setErrors(errs);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(f => ({ ...f, [name]: value }));
    validate(name, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Nama tidak boleh kosong';
    if (formData.password && formData.password !== formData.confirmPassword) errs.confirmPassword = 'Password tidak cocok';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = { id: formData.id, name: formData.name };
      if (formData.password) payload.password = formData.password;

      const res = await api.post('/user/profile.php', payload);
      if (res.data.status === 'success') {
        const updated = { ...JSON.parse(localStorage.getItem('user') || '{}'), name: formData.name };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser?.(updated);
        setFormData(f => ({ ...f, password: '', confirmPassword: '' }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        toast.success('Profil berhasil diperbarui!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  const initials = formData.name?.split('').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const containerV = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const itemV = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } } };

  return (
    <motion.div variants={containerV} initial="hidden" animate="visible" className="space-y-6 pb-12 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <motion.div variants={itemV}>
        <h1 className="text-3xl font-semibold tracking-tight text-ink mb-1">Pengaturan Profil</h1>
        <p className="text-muted text-sm font-medium">Perbarui informasi akun dan kata sandi Anda.</p>
      </motion.div>

      {/* ── Avatar card ── */}
      <motion.div variants={itemV} className="glass-panel p-6 flex items-center gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-md border border-rule bg-brand/10 flex items-center justify-center text-brand font-semibold text-2xl font-serif">
            {initials}
          </div>
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-ink ">{formData.name || 'Administrator'}</h2>
          <p className="text-sm text-muted font-medium">SWA Enterprise Administrator</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="badge badge-success text-xs"><Shield size={10} /> Akun Aktif</span>
          </div>
        </div>
      </motion.div>

      {/* ── Form card ── */}
      <motion.div variants={itemV} className="glass-panel p-6 sm:p-8">
        {/* Success banner */}
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="p-3.5 bg-positive/10 border border-positive/20 rounded-md flex items-center gap-2.5 text-sm text-positive ">
                <Check size={16} />
                Profil berhasil diperbarui!
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Informasi Akun */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
              <User size={12} /> Informasi Akun
            </p>
            <div>
              <label className="input-label">Nama Lengkap</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted " />
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleChange} placeholder="Nama lengkap Anda"
                  className={`input-field pl-10 ${errors.name ? 'border-negative/50' : ''}`}
                />
              </div>
              <AnimatePresence>
                {errors.name && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="text-negative text-xs mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-ink/5 " />

          {/* Keamanan */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-4 flex items-center gap-2">
              <Lock size={12} /> Ubah Password <span className="badge bg-ink/5 text-muted text-xs">Opsional</span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="input-label">Password Baru</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted " />
                  <input
                    type={showPass ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    placeholder="Biarkan kosong jika tidak diubah"
                    className="input-field pl-10 pr-12"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="input-label">Konfirmasi Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted " />
                  <input
                    type={showPass ? 'text' : 'password'} name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange}
                    placeholder="Ulangi password baru"
                    className={`input-field pl-10 ${errors.confirmPassword ? 'border-negative/50' : ''}`}
                    autoComplete="new-password"
                  />
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <Check size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-positive" />
                  )}
                </div>
                <AnimatePresence>
                  {errors.confirmPassword && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="text-negative text-xs mt-1.5 flex items-center gap-1">
                      <AlertCircle size={11} /> {errors.confirmPassword}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Submit */}
          <motion.button
            type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.02, y: -1 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            className="btn-primary w-full py-3.5 text-base mt-2"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-5 h-5 border-2 border-rule border-t-white rounded-full" />
            ) : (
              <><Save size={17} /> Simpan Perubahan</>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Profile;

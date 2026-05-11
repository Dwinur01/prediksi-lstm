import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlaneTakeoff, User, Lock, Mail, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await api.post('/auth/register.php', formData);
      if (response.data.status === 'success') {
        toast.success('Registrasi berhasil! Silakan login.');
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat registrasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px]"></div>

      {/* Tombol Toggle Tema */}
      <div className="absolute top-6 right-8 z-50">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-surface/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 shadow-sm text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
          title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
        >
          {isDarkMode ? <Sun size={22} className="text-amber-500" /> : <Moon size={22} className="text-slate-600" />}
        </motion.button>
      </div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-primary mb-4 shadow-lg shadow-accent/30">
            <PlaneTakeoff size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Buat Akun Baru</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Bergabung dengan SkyPredict hari ini</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Nama Lengkap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                name="name"
                required
                className="input-field pl-10"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                name="username"
                required
                className="input-field pl-10"
                placeholder="Pilih username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-500" />
              </div>
              <input
                type="password"
                name="password"
                required
                className="input-field pl-10"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex justify-center py-3 mt-4"
          >
            {loading ? 'Memproses...' : 'Daftar Akun'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-accent hover:text-accent/80 font-medium transition-colors">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

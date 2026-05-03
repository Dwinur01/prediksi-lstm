import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlaneTakeoff, User, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Login = ({ setUser }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/login.php', formData);
      if (response.data.status === 'success') {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        toast.success('Login berhasil!');
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Terjadi kesalahan saat login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px]"></div>

      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-accent mb-4 shadow-lg shadow-primary/30">
            <PlaneTakeoff size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">SkyPredict Login</h2>
          <p className="text-gray-400 text-sm">Masuk untuk mengelola data dan prediksi LSTM</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={18} className="text-gray-500" />
              </div>
              <input
                type="text"
                name="username"
                required
                className="input-field pl-10"
                placeholder="Masukkan username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
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
            {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Belum punya akun?{' '}
          <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

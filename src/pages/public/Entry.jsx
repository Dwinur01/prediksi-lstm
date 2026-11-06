import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, BrainCircuit, ArrowRight, TrendingUp, Shield, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../services/api';
import { useTheme } from '../../context/theme';

const features = [
  {
    icon: TrendingUp,
    title: 'Prediksi Akurat',
    desc: 'Model LSTM dengan 7 variabel untuk perkiraan penjualan mingguan yang lebih presisi.',
  },
  {
    icon: BarChart3,
    title: 'Analisis Mendalam',
    desc: 'Evaluasi otomatis dibandingkan baseline untuk menilai kualitas setiap prediksi.',
  },
  {
    icon: Shield,
    title: 'Data Terlindungi',
    desc: 'Autentikasi JWT, enkripsi, dan kontrol akses berbasis peran untuk keamanan data.',
  },
];

export default function Entry({ setUser }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((x) => ({ ...x, [e.target.name]: undefined, form: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username tidak boleh kosong.';
    if (!form.password) errs.password = 'Password tidak boleh kosong.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login.php', form);
      if (res.data.status === 'success') {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);
        toast.success(`Selamat datang, ${res.data.user.name}.`);
        navigate('/dashboard');
      } else {
        setErrors({ form: res.data.message || 'Username atau password salah.' });
      }
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, 'Username atau password salah.') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-rule bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-sm shadow-brand/30">
              <BrainCircuit size={16} className="text-white" />
            </div>
            <span className="font-serif text-lg font-semibold tracking-tight">SWA Predict</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tentang" className="btn-ghost text-sm hidden sm:inline-flex">Tentang Metode</Link>
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-icon"
              aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-12 lg:py-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-20 items-center">

          {/* ── Left: Brand & Features ── */}
          <section className="space-y-8">
            <div>
              <span className="badge badge-primary mb-4">PT Swabina Gatra</span>
              <h1 className="text-4xl lg:text-5xl xl:text-[3.5rem] mt-3 leading-[1.1]">
                Perkiraan penjualan tiket{' '}
                <span className="text-brand">mingguan</span>
              </h1>
              <p className="mt-5 text-lg text-muted max-w-[52ch] leading-relaxed">
                Sistem prediksi berbasis LSTM yang memperkirakan jumlah tiket terjual minggu depan
                dari riwayat penjualan, harga, dan data libur.
              </p>
            </div>

            <div className="grid gap-4">
              {features.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="mt-0.5 w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-brand" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">{title}</p>
                    <p className="text-muted text-sm mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/tentang" className="inline-flex items-center gap-2 text-brand text-sm font-medium hover:gap-3 transition-all">
              Baca tentang metode dan batasan <ArrowRight size={15} />
            </Link>
          </section>

          {/* ── Right: Login Form ── */}
          <section aria-label="Masuk">
            <div className="bg-surface border border-rule rounded-2xl p-7 sm:p-9" style={{ boxShadow: '0 4px 24px rgb(0 0 0 / 0.07), 0 0 0 1px rgb(0 0 0 / 0.04)' }}>
              <div className="mb-7">
                <h2 className="text-2xl">Masuk ke akun Anda</h2>
                <p className="mt-1.5 text-sm text-muted">Akun dibuat oleh administrator sistem.</p>
              </div>

              {errors.form && (
                <div className="note-negative mb-5" role="alert">
                  {errors.form}
                </div>
              )}

              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="username" className="input-label">Username</label>
                  <input
                    id="username"
                    name="username"
                    autoComplete="username"
                    value={form.username}
                    onChange={onChange}
                    placeholder="Masukkan username"
                    className={`input-field ${errors.username ? 'border-negative/60 focus:ring-negative/15' : ''}`}
                  />
                  {errors.username && <p className="mt-1.5 text-xs text-negative">{errors.username}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="input-label">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="Masukkan password"
                      className={`input-field pr-11 ${errors.password ? 'border-negative/60 focus:ring-negative/15' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 right-0 px-3.5 text-muted hover:text-ink transition-colors"
                      aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs text-negative">{errors.password}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-2 py-3 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memeriksa…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Masuk <ArrowRight size={15} />
                    </span>
                  )}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-rule">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted">
          <p>PT Swabina Gatra · Divisi Perencanaan &amp; Pengembangan Bisnis</p>
          <p>Skripsi Informatika · Universitas Muhammadiyah Gresik</p>
        </div>
      </footer>
    </div>
  );
}

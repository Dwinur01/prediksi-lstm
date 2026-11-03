import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { apiErrorMessage } from '../../services/api';
import { useTheme } from '../../context/theme';

const facts = [
  ['Data', 'Penjualan tiket per minggu, diinput oleh staf dan selalu bertambah.'],
  ['Model', 'LSTM dengan tujuh variabel: penjualan empat minggu terakhir, harga, perubahan harga, dan hari libur.'],
  ['Evaluasi', 'Setiap perkiraan diuji pada data yang tidak dipakai melatih dan dibandingkan dengan tebakan sederhana.'],
];

export default function Entry({ setUser }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => { setForm((f) => ({ ...f, [e.target.name]: e.target.value })); setErrors((x) => ({ ...x, [e.target.name]: undefined, form: undefined })); };

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
      <header className="border-b border-rule">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/swa_logo.png" alt="" className="h-7 w-7 object-contain" />
            <span className="font-serif text-xl font-semibold tracking-tight">SWA Predict</span>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/tentang" className="btn-ghost">Metode dan batasan</Link>
            <button type="button" onClick={toggleTheme} className="btn-ghost" aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-12 lg:py-20 grid lg:grid-cols-[1.25fr_1fr] gap-12 lg:gap-20 items-start">
          <section>
            <p className="eyebrow">PT Swabina Gatra</p>
            <h1 className="mt-3 text-4xl lg:text-5xl">Perkiraan penjualan tiket mingguan</h1>
            <p className="mt-5 text-lg text-muted max-w-[56ch]">
              Sistem ini memperkirakan jumlah tiket yang terjual minggu depan dari riwayat penjualan, lalu menunjukkan seberapa baik perkiraan itu dibandingkan tebakan sederhana.
            </p>
            <dl className="mt-10 border-y border-rule divide-y divide-rule">
              {facts.map(([k, v]) => (
                <div key={k} className="py-4 grid sm:grid-cols-[7rem_1fr] gap-1 sm:gap-6">
                  <dt className="eyebrow pt-0.5">{k}</dt>
                  <dd className="text-[15px]">{v}</dd>
                </div>
              ))}
            </dl>
            <Link to="/tentang" className="mt-6 inline-block text-brand underline underline-offset-4 hover:no-underline">Metode dan batasan →</Link>
          </section>

          <section aria-label="Masuk">
            <form onSubmit={onSubmit} noValidate className="bg-surface border border-rule rounded-md p-6 sm:p-8">
              <h2 className="text-2xl">Masuk</h2>
              <p className="mt-1 text-sm text-muted">Akun dibuat oleh administrator.</p>
              {errors.form && <p role="alert" className="note-negative mt-5">{errors.form}</p>}
              <div className="mt-6">
                <label htmlFor="username" className="input-label">Username</label>
                <input id="username" name="username" autoComplete="username" value={form.username} onChange={onChange} className="input-field w-full" />
                {errors.username && <p className="mt-1 text-sm text-negative">{errors.username}</p>}
              </div>
              <div className="mt-4">
                <label htmlFor="password" className="input-label">Password</label>
                <div className="relative">
                  <input id="password" name="password" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={onChange} className="input-field w-full pr-11" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 px-3 text-muted hover:text-ink" aria-label={showPw ? 'Sembunyikan password' : 'Tampilkan password'}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-negative">{errors.password}</p>}
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-6">{loading ? 'Memeriksa…' : 'Masuk'}</button>
            </form>
          </section>
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-5 text-sm text-muted space-y-0.5">
          <p>PT Swabina Gatra · Divisi Perencanaan &amp; Pengembangan Bisnis</p>
          <p>Disusun sebagai bagian skripsi Informatika, Universitas Muhammadiyah Gresik</p>
        </div>
      </footer>
    </div>
  );
}

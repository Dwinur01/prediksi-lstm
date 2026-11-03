import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/theme';

const navItems = [
  { name: 'Ringkasan', path: '/dashboard', end: true },
  { name: 'Data penjualan', path: '/dashboard/data-input' },
  { name: 'Prediksi', path: '/dashboard/lstm-process' },
  { name: 'Laporan', path: '/dashboard/report' },
  { name: 'Profil', path: '/dashboard/profile' },
];

const Wordmark = () => (
  <div className="flex items-center gap-2.5">
    <img src="/swa_logo.png" alt="" className="h-7 w-7 object-contain" />
    <span className="font-serif text-xl font-semibold tracking-tight text-ink">SWA Predict</span>
  </div>
);

const NavList = ({ onNavigate }) => (
  <nav aria-label="Menu utama" className="flex flex-col">
    {navItems.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `py-2 pl-3 -ml-px text-[15px] border-l-2 transition-colors ${
            isActive ? 'border-brand font-semibold text-ink' : 'border-transparent text-muted hover:text-ink'
          }`
        }
      >
        {item.name}
      </NavLink>
    ))}
  </nav>
);

const Layout = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const ThemeButton = (
    <button type="button" onClick={toggleTheme} className="btn-ghost" aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}>
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{isDark ? 'Terang' : 'Gelap'}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen border-r border-rule px-6 py-6">
        <Wordmark />
        <div className="mt-10"><NavList /></div>
        <div className="mt-auto pt-6 border-t border-rule text-sm">
          <p className="font-semibold text-ink truncate">{user?.name}</p>
          <p className="text-muted truncate">{user?.username}</p>
          <button type="button" onClick={handleLogout} className="mt-3 text-negative underline underline-offset-4 hover:no-underline">Keluar</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-paper border-b border-rule">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-10">
            <button type="button" className="lg:hidden btn-icon" onClick={() => setOpen(true)} aria-label="Buka menu"><Menu size={18} /></button>
            <div className="lg:hidden"><Wordmark /></div>
            <p className="hidden lg:block eyebrow">{navItems.find((n) => (n.end ? location.pathname === n.path : location.pathname.startsWith(n.path)))?.name}</p>
            {ThemeButton}
          </div>
        </header>
        <main className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
          <Outlet />
        </main>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-paper border-r border-rule p-6 flex flex-col">
            <div className="flex items-center justify-between"><Wordmark />
              <button type="button" className="btn-icon" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={18} /></button>
            </div>
            <div className="mt-8"><NavList onNavigate={() => setOpen(false)} /></div>
            <button type="button" onClick={handleLogout} className="mt-auto text-left text-negative underline underline-offset-4">Keluar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

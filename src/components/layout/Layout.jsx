import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X, Sun, Moon, LayoutDashboard, Database, BrainCircuit, FileText, User, LogOut } from 'lucide-react';
import { useTheme } from '../../context/theme';

const navItems = [
  { name: 'Ringkasan',      path: '/dashboard',               end: true,  icon: LayoutDashboard },
  { name: 'Data Penjualan', path: '/dashboard/data-input',                icon: Database },
  { name: 'Prediksi',       path: '/dashboard/lstm-process',              icon: BrainCircuit },
  { name: 'Laporan',        path: '/dashboard/report',                    icon: FileText },
  { name: 'Profil',         path: '/dashboard/profile',                   icon: User },
];

const Wordmark = () => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center shadow-sm shadow-brand/30">
      <BrainCircuit size={16} className="text-white" />
    </div>
    <span className="font-serif text-lg font-semibold tracking-tight text-ink">SWA Predict</span>
  </div>
);

const NavList = ({ onNavigate }) => (
  <nav aria-label="Menu utama" className="flex flex-col gap-0.5">
    {navItems.map(({ name, path, end, icon: Icon }) => (
      <NavLink
        key={path}
        to={path}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
            isActive
              ? 'bg-brand text-white shadow-sm shadow-brand/25 font-semibold'
              : 'text-muted hover:text-ink hover:bg-ink/5'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={16} className={isActive ? 'opacity-100' : 'opacity-70'} />
            {name}
          </>
        )}
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

  const currentPage = navItems.find((n) =>
    n.end ? location.pathname === n.path : location.pathname.startsWith(n.path)
  );

  const ThemeButton = (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn-icon"
      aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-surface border-r border-rule px-4 py-5">
        <div className="px-2">
          <Wordmark />
        </div>

        <div className="mt-7 flex-1">
          <p className="eyebrow px-3 mb-2">Menu</p>
          <NavList />
        </div>

        {/* User & actions */}
        <div className="mt-auto pt-4 border-t border-rule">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center text-brand text-xs font-bold font-serif shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate leading-tight">{user?.name}</p>
              <p className="text-xs text-muted truncate">{user?.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-1">
            {ThemeButton}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-ghost flex-1 justify-start text-negative hover:text-negative hover:bg-negative/8 text-sm"
            >
              <LogOut size={14} />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0">
        {/* Mobile / tablet header */}
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-rule">
          <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              className="lg:hidden btn-icon"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={18} />
            </button>
            <div className="lg:hidden"><Wordmark /></div>
            {currentPage && (
              <div className="hidden lg:flex items-center gap-2">
                <currentPage.icon size={15} className="text-muted" />
                <span className="eyebrow">{currentPage.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="lg:hidden">{ThemeButton}</div>
            </div>
          </div>
        </header>

        <main className="max-w-[1140px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
          <Outlet />
        </main>
      </div>

      {/* ── Mobile drawer ── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-surface border-r border-rule p-5 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-6 px-2">
              <Wordmark />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1">
              <p className="eyebrow px-3 mb-2">Menu</p>
              <NavList onNavigate={() => setOpen(false)} />
            </div>

            <div className="pt-4 border-t border-rule">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-brand/15 flex items-center justify-center text-brand text-xs font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 px-1">
                {ThemeButton}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-ghost flex-1 justify-start text-negative hover:text-negative hover:bg-negative/8"
                >
                  <LogOut size={14} />
                  Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

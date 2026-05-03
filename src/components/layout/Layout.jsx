import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { PlaneTakeoff, LayoutDashboard, Database, BrainCircuit, FileText, User, LogOut } from 'lucide-react';

const Layout = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Data Penjualan', path: '/data-input', icon: <Database size={20} /> },
    { name: 'Prediksi LSTM', path: '/lstm-process', icon: <BrainCircuit size={20} /> },
    { name: 'Laporan Hasil', path: '/report', icon: <FileText size={20} /> },
    { name: 'Profil', path: '/profile', icon: <User size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-l-0 border-t-0 border-b-0 rounded-none flex flex-col z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-primary/20 text-primary rounded-lg">
            <PlaneTakeoff size={24} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">SkyPredict</h1>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-700/50">
          <p className="text-sm text-gray-400">Selamat datang,</p>
          <p className="font-semibold text-gray-100 truncate">{user?.name}</p>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary shadow-sm border border-primary/20' 
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none"></div>
        <div className="relative z-10 p-8 min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { PlaneTakeoff, LayoutDashboard, Database, BrainCircuit, FileText, User, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const Layout = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);

  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [location.pathname]);

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
    <div className="flex h-screen bg-background text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="w-64 glass-panel border-l-0 border-t-0 border-b-0 rounded-none flex flex-col z-20 relative"
      >
        <div className="p-6 flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-2 bg-primary/20 text-primary rounded-xl shadow-lg shadow-primary/20"
          >
            <PlaneTakeoff size={24} />
          </motion.div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">SWA Predict</h1>
        </div>
        
        <div className="px-6 py-4 border-b border-gray-700/50">
          <p className="text-sm text-gray-400">Selamat datang,</p>
          <p className="font-semibold text-gray-100 truncate text-lg">{user?.name}</p>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
              >
                <motion.div
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary shadow-sm border border-primary/20' 
                      : 'text-gray-400 hover:bg-gray-800/80 hover:text-gray-200 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-200'}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none"></div>
        <div className="relative z-10 p-8 min-h-full">
          <AnimatePresence mode="wait">
            {isPageLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center h-[70vh] text-primary"
              >
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute -inset-4 border-4 border-primary/20 border-t-primary rounded-full"
                  />
                  <PlaneTakeoff size={48} className="text-primary animate-pulse" />
                </div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-8 text-xl font-medium text-gray-300 tracking-wider"
                >
                  Menyiapkan Halaman...
                </motion.h2>
              </motion.div>
            ) : (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Outlet />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default Layout;

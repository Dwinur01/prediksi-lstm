import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { PlaneTakeoff, LayoutDashboard, Database, BrainCircuit, FileText, User, LogOut, Loader2, Sun, Moon, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const Layout = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsPageLoading(true);
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Set state awal berdasarkan class HTML
  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  // Fungsi pergantian tema
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Data Penjualan', path: '/dashboard/data-input', icon: <Database size={20} /> },
    { name: 'Prediksi LSTM', path: '/dashboard/lstm-process', icon: <BrainCircuit size={20} /> },
    { name: 'Laporan Hasil', path: '/dashboard/report', icon: <FileText size={20} /> },
    { name: 'Profil', path: '/dashboard/profile', icon: <User size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-background text-gray-800 dark:text-gray-100 overflow-hidden transition-colors duration-300 relative">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ 
          x: (window.innerWidth < 1024 && !isSidebarOpen) ? -320 : 0,
          width: window.innerWidth < 1024 ? 300 : 320
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed lg:relative h-full bg-white/90 dark:bg-surface/90 backdrop-blur-3xl border-r border-gray-100 dark:border-white/5 flex flex-col z-50 shadow-2xl transition-all duration-300 ${
          !isSidebarOpen ? 'max-lg:-translate-x-full' : 'max-lg:translate-x-0'
        }`}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-primary/20 to-accent/20 text-primary rounded-2xl shadow-xl border border-primary/10">
              <PlaneTakeoff size={24} />
            </div>
            <h1 className="text-2xl font-[900] bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tighter italic">SWA Predict</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mx-6 p-4 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 mb-6 group hover:bg-white dark:hover:bg-white/10 transition-all duration-300 shadow-sm">
          <p className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em] mb-1.5">User Profile</p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <p className="font-extrabold text-gray-900 dark:text-gray-100 truncate text-sm tracking-tight">{user?.name || 'Administrator'}</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            return (
              <Link key={item.path} to={item.path} onClick={() => setIsSidebarOpen(false)}>
                <motion.div
                  whileHover={{ scale: 1.02, x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 relative group overflow-hidden ${
                    location.pathname === item.path 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <div className={`transition-transform duration-300 ${location.pathname === item.path ? 'scale-110' : ''}`}>
                    {item.icon}
                  </div>
                  <span className="font-extrabold text-sm tracking-tight">{item.name}</span>
                  {location.pathname === item.path && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_#fff]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700/50">
          <motion.button
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 rounded-xl transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Keluar</span>
          </motion.button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative bg-background transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none transition-colors duration-300"></div>
        
        {/* Top Header Bar - Fluid Height & Padding */}
        <div className="sticky top-0 z-30 flex items-center justify-between p-4 sm:p-5 lg:p-6 bg-background/50 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 bg-white/80 dark:bg-surface/80 border border-gray-200 dark:border-white/5 rounded-xl shadow-sm"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-surface/80 backdrop-blur-md border border-gray-200 dark:border-gray-700/50 shadow-sm text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
              title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-slate-600" />}
            </motion.button>
          </div>
        </div>

        <div className="relative z-10 p-4 sm:p-6 lg:p-8 xl:p-12 min-h-[calc(100vh-80px)] max-w-[1600px] mx-auto w-full transition-all duration-300">
          <AnimatePresence mode="wait">
            {isPageLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center h-[60vh] text-primary"
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
                  className="mt-8 text-xl font-medium text-gray-600 dark:text-gray-300 tracking-wider text-center"
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
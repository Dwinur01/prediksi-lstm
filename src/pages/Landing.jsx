import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BrainCircuit, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  PlaneTakeoff,
  Database,
  FileText
} from 'lucide-react';
import mascot from '../assets/mascot.png';

const Landing = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-gray-900 dark:text-white overflow-hidden selection:bg-primary/30">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full"></div>
        <div className="absolute -bottom-[5%] left-[20%] w-[35%] h-[35%] bg-blue-500/5 blur-[110px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-background/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 lg:h-24 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="p-2 sm:p-2.5 bg-primary/10 text-primary rounded-xl sm:rounded-2xl border border-primary/10">
              <PlaneTakeoff size={20} className="sm:w-7 sm:h-7" />
            </div>
            <h1 className="text-lg sm:text-2xl font-[900] tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent italic">SWA Predict</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              to="/login"
              className="px-4 sm:px-8 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-gray-100 dark:bg-white/5 rounded-xl transition-all"
            >
              Login
            </Link>
            <Link 
              to="/register"
              className="px-4 sm:px-8 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-widest bg-primary text-white rounded-xl shadow-lg shadow-primary/20 transition-all"
            >
              Register
            </Link>
            {user && (
              <Link 
                to="/dashboard"
                className="ml-4 p-2.5 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-500 hover:text-primary transition-colors"
                title="Go to Dashboard"
              >
                <ArrowRight size={20} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-black tracking-widest uppercase mb-8 border border-primary/20">
              <Zap size={14} /> Next-Gen Analytics Engine
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-[900] leading-[1.1] tracking-tighter mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-br from-gray-900 via-gray-700 to-gray-500 dark:from-white dark:via-gray-200 dark:to-gray-500">
              Prediksi Masa Depan Bisnis <span className="text-primary italic">Cerdas.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 font-medium mb-10 max-w-xl leading-relaxed">
              Optimalkan strategi operasional PT. Swabina Gatra dengan kekuatan Deep Learning LSTM. Akurasi tinggi, visualisasi transparan, dan laporan instan.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mt-4">
              <button 
                onClick={() => navigate(user ? '/dashboard' : '/login')}
                className="btn-primary px-8 sm:px-12 py-3.5 sm:py-5 text-sm sm:text-xl group flex items-center justify-center gap-3"
              >
                {user ? 'Ke Dashboard' : 'Masuk Ke Sistem'} 
                <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform duration-500" />
              </button>
              
              <button 
                onClick={() => navigate('/features')}
                className="btn-secondary px-8 sm:px-12 py-3.5 sm:py-5 text-sm sm:text-xl group flex items-center justify-center gap-3"
              >
                Pelajari Fitur <Zap size={18} className="text-amber-500 group-hover:scale-125 transition-transform" />
              </button>
            </div>

            <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-8">
              {[
                { label: 'Akurasi', val: '98%' },
                { label: 'Kecepatan', val: '< 2s' },
                { label: 'Data', val: 'Batch' },
              ].map((stat, i) => (
                <div key={i}>
                  <p className="text-2xl sm:text-3xl font-[900] tracking-tighter text-gray-900 dark:text-white mb-1">{stat.val}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative"
          >
            <div className="glass-panel p-4 aspect-square rounded-[3rem] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20 opacity-50"></div>
              <div className="relative h-full w-full rounded-[2.5rem] bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center border border-white/10 overflow-hidden">
                <motion.div 
                  animate={{ y: [0, -15, 0] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  className="z-10 w-full h-full flex items-center justify-center p-8"
                >
                  <img 
                    src={mascot} 
                    alt="SWA Predict Mascot" 
                    className={`max-w-full max-h-full object-contain drop-shadow-[0_20px_50px_rgba(59,130,246,0.3)] ${
                      !isDarkMode ? 'mix-blend-multiply' : ''
                    }`}
                  />
                </motion.div>
                
                {/* Floating Elements */}
                <motion.div 
                  animate={{ x: [-10, 10, -10], y: [-5, 5, -5] }}
                  transition={{ repeat: Infinity, duration: 5 }}
                  className="absolute top-20 left-10 glass-panel p-4 shadow-2xl"
                >
                  <BarChart3 className="text-accent" size={24} />
                </motion.div>
                <motion.div 
                   animate={{ x: [10, -10, 10], y: [5, -5, 5] }}
                   transition={{ repeat: Infinity, duration: 6 }}
                   className="absolute bottom-20 right-10 glass-panel p-4 shadow-2xl"
                >
                  <Database className="text-emerald-500" size={24} />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      {/* Tech Stack Marquee */}
      <section className="py-10 border-y border-gray-200 dark:border-white/5 bg-white/50 dark:bg-white/[0.02] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 dark:text-gray-400 mb-10">Powered by Industry Leading Tech</p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-24 opacity-80 transition-all duration-700">
            {[
              { icon: BrainCircuit, label: 'TensorFlow' },
              { icon: Database, label: 'MySQL' },
              { icon: Zap, label: 'React.js' },
              { icon: ShieldCheck, label: 'JWT Auth' },
              { icon: BarChart3, label: 'Recharts' }
            ].map((tech, i) => (
              <div key={i} className="flex items-center gap-3 group cursor-default hover:scale-110 transition-transform">
                <tech.icon size={28} className="text-primary" />
                <span className="font-black tracking-tighter text-lg text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6 bg-gray-50/50 dark:bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-[900] tracking-tighter mb-4">Teknologi Cerdas Untuk Bisnis</h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-medium text-lg">Platform all-in-one yang dirancang untuk efisiensi operasional maksimal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                title: 'Neural Engine', 
                desc: 'Algoritma LSTM tercanggih untuk prediksi tren berdasarkan data historis.',
                icon: BrainCircuit,
                color: 'text-primary'
              },
              { 
                title: 'Arsip Digital', 
                desc: 'Penyimpanan terstruktur untuk seluruh hasil prediksi dan laporan resmi.',
                icon: FileText,
                color: 'text-accent'
              },
              { 
                title: 'Keamanan Data', 
                desc: 'Proteksi berlapis untuk memastikan integritas data perusahaan Anda.',
                icon: ShieldCheck,
                color: 'text-emerald-500'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="glass-panel p-10 hover:border-primary/30 transition-all duration-500"
              >
                <div className={`p-4 bg-gray-100 dark:bg-white/5 rounded-2xl w-fit mb-8 ${feature.color}`}>
                  <feature.icon size={32} />
                </div>
                <h3 className="text-2xl font-[900] tracking-tight mb-4">{feature.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      </main>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-primary/10 text-primary rounded-2xl border border-primary/10">
                  <PlaneTakeoff size={28} />
                </div>
                <span className="text-2xl font-[900] tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">SWA Predict</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-sm mb-8">
                Platform analisis prediktif berbasis Deep Learning untuk optimasi operasional perusahaan. Akurasi tinggi, keputusan tepat.
              </p>
              <div className="flex gap-4">
                {[BarChart3, BrainCircuit, ShieldCheck].map((Icon, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-400 hover:text-primary transition-colors cursor-pointer">
                    <Icon size={20} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-6 text-gray-900 dark:text-white">Navigasi</h4>
              <ul className="space-y-4">
                {['Home', 'Fitur', 'Analisis', 'Laporan'].map(item => (
                  <li key={item}>
                    <a href="#" className="text-gray-500 hover:text-primary transition-colors font-bold text-sm">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-6 text-gray-900 dark:text-white">Sistem</h4>
              <ul className="space-y-4">
                {['Dashboard', 'Neural Engine', 'Database', 'Security'].map(item => (
                  <li key={item}>
                    <a href="#" className="text-gray-500 hover:text-primary transition-colors font-bold text-sm">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              © 2026 PT. SWABINA GATRA. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-8">
              <a href="#" className="text-[10px] font-black text-gray-500 hover:text-primary uppercase tracking-tighter">Privacy Policy</a>
              <a href="#" className="text-[10px] font-black text-gray-500 hover:text-primary uppercase tracking-tighter">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

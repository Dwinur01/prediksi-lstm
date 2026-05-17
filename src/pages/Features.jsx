import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BrainCircuit, 
  Database, 
  BarChart3, 
  ShieldCheck, 
  FileText, 
  Zap, 
  ArrowRight, 
  ArrowLeft,
  PlaneTakeoff,
  Clock,
  Layout,
  Cpu
} from 'lucide-react';

const Features = () => {
  const navigate = useNavigate();

  const featureGroups = [
    {
      title: "Predictive Analytics",
      icon: <BrainCircuit className="text-primary" size={32} />,
      features: [
        { name: "Stacked LSTM Engine", desc: "Model Deep Learning berlapis untuk akurasi prediksi tren jangka panjang yang superior." },
        { name: "Multi-Step Forecasting", desc: "Prediksi hingga 12 minggu ke depan untuk perencanaan stok dan operasional yang lebih matang." },
        { name: "Dynamic Parameters", desc: "Atur Epochs, Window Size, dan Learning Rate secara real-time untuk fine-tuning model." }
      ]
    },
    {
      title: "Data Intelligence",
      icon: <Database className="text-accent" size={32} />,
      features: [
        { name: "Automated Data Audit", desc: "Sistem cerdas mendeteksi anomali, outlier, dan gap data secara otomatis sebelum diproses." },
        { name: "Smart Normalization", desc: "Teknik pemrosesan data (Min-Max/Standardization) untuk memastikan stabilitas pelatihan model." },
        { name: "Bulk Import CSV", desc: "Unggah database penjualan dalam jumlah besar dalam hitungan detik dengan parser cerdas." }
      ]
    },
    {
      title: "Enterprise Reporting",
      icon: <FileText className="text-emerald-500" size={32} />,
      features: [
        { name: "Professional PDF Export", desc: "Hasilkan laporan resmi dengan kop surat perusahaan dan tata letak yang siap cetak." },
        { name: "Interactive Visuals", desc: "Visualisasi tren aktual vs prediksi menggunakan Area Charts yang responsif dan elegan." },
        { name: "Historical Archive", desc: "Simpan dan telusuri riwayat seluruh prediksi yang pernah dilakukan untuk audit internal." }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-gray-900 dark:text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md border-b border-white/5 bg-background/50">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4 group">
            <div className="p-2.5 bg-primary/10 text-primary rounded-2xl border border-primary/10 group-hover:scale-110 transition-transform">
              <PlaneTakeoff size={28} />
            </div>
            <h1 className="text-2xl font-[900] tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent italic">SWA Predict</h1>
          </Link>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft size={18} /> Kembali
          </button>
        </div>
      </nav>

      <main className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full text-xs font-black tracking-widest uppercase mb-6"
            >
              <Cpu size={14} /> Full System Capabilities
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-[900] tracking-tighter mb-8"
            >
              Ekosistem <span className="text-primary italic">Prediksi</span> Terintegrasi.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-gray-500 dark:text-gray-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            >
              Dirancang khusus untuk kebutuhan operasional PT. Swabina Gatra, menggabungkan kecerdasan buatan dengan kemudahan manajemen data.
            </motion.p>
          </div>

          {/* Detailed Features */}
          <div className="grid grid-cols-1 gap-32">
            {featureGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-12">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-[2rem] shadow-xl">
                    {group.icon}
                  </div>
                  <h2 className="text-3xl font-black tracking-tight">{group.title}</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 dark:from-white/10 to-transparent"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {group.features.map((feature, fIdx) => (
                    <motion.div
                      key={fIdx}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: fIdx * 0.1 }}
                      className="glass-panel p-8 hover:border-primary/50 transition-all duration-500 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                        <Zap size={20} className="text-gray-400 group-hover:text-primary" />
                      </div>
                      <h4 className="text-xl font-bold mb-3">{feature.name}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-32 p-12 md:p-20 glass-panel relative overflow-hidden text-center border-primary/20"
          >
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-accent/20 blur-[100px] rounded-full"></div>
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-8">Siap Mengambil Kendali?</h2>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-12 max-w-2xl mx-auto">
                Mulai perjalanan transformasi digital Anda hari ini dan lihat bagaimana data dapat bekerja untuk kesuksesan perusahaan.
              </p>
              <Link 
                to="/login"
                className="btn-primary !px-16 !py-5 text-xl group inline-flex"
              >
                Mulai Sekarang <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center">
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
          © 2026 PT. SWABINA GATRA. BUILT FOR ENTERPRISE EXCELLENCE.
        </p>
      </footer>
    </div>
  );
};

export default Features;

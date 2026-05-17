import { motion } from 'framer-motion';
import { PlaneTakeoff } from 'lucide-react';

const PageLoader = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center text-primary"
    >
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="absolute -inset-6 border-4 border-primary/10 border-t-primary rounded-full"
        />
        <PlaneTakeoff size={64} className="text-primary animate-pulse" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-12 text-center"
      >
        <h2 className="text-2xl font-black tracking-tighter italic bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
          SWA Predict
        </h2>
        <p className="mt-2 text-xs font-black text-gray-500 uppercase tracking-[0.3em]">
          Menyiapkan Ekosistem Cerdas...
        </p>
      </motion.div>
    </motion.div>
  );
};

export default PageLoader;

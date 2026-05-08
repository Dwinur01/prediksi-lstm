import { motion } from 'framer-motion';

export const SkeletonCard = () => (
  <div className="glass-panel p-8 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
    <div className="w-12 h-12 bg-white/10 rounded-2xl mb-6"></div>
    <div className="w-24 h-2 bg-white/10 rounded-full mb-4"></div>
    <div className="w-full h-8 bg-white/10 rounded-xl"></div>
  </div>
);

export const SkeletonChart = () => (
  <div className="glass-panel p-6 h-[400px] flex flex-col justify-end gap-2 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
    <div className="flex items-end gap-4 h-full px-4">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="flex-1 bg-white/5 rounded-t-lg" 
          style={{ height: `${Math.random() * 60 + 20}%` }}
        ></div>
      ))}
    </div>
  </div>
);

export const SkeletonTable = () => (
  <div className="space-y-4 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="h-12 bg-white/5 rounded-xl w-full"></div>
    ))}
  </div>
);

import { createContext, useContext } from 'react';

/** Konstanta, konteks, hook, dan peta warna tema (tanpa komponen → aman untuk fast refresh). */
export const STORAGE_KEY = 'theme';
export const DEFAULT_THEME = 'dark'; // harus sama dengan DEFAULT_THEME di skrip index.html

export const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme harus dipakai di dalam <ThemeProvider>');
  return ctx;
}

/** Peta warna untuk Recharts (SVG tidak memakai CSS variable) — selaras dengan DESIGN.md §2. */
export const chartTheme = (isDark) =>
  isDark
    ? { ink: '#ECEAE4', muted: '#A0A6B4', rule: '#2A303C', brand: '#8DAEF5', surface: '#151922', paper: '#0F1218', positive: '#6FCB9F', caution: '#E0B04C', negative: '#F08A78' }
    : { ink: '#161A22', muted: '#585E6C', rule: '#D9D6CE', brand: '#1848A8', surface: '#FFFFFF', paper: '#FBFAF7', positive: '#1F6B4A', caution: '#8A5A00', negative: '#A3321F' };

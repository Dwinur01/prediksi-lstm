import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ThemeContext, STORAGE_KEY } from './theme';

/**
 * ThemeContext — satu-satunya sumber kebenaran tema (terang/gelap).
 * - Kelas `dark` pada <html> diatur oleh skrip awal di index.html (tanpa kilatan)
 *   dan disinkronkan di sini.
 * - Komponen cukup memakai `const { isDark, toggleTheme } = useTheme();`
 *   (tidak perlu useState/MutationObserver sendiri-sendiri).
 */
const readDomTheme = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light';

const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme; // kontrol bawaan (date, select, scrollbar) ikut tema
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readDomTheme);

  useLayoutEffect(() => {
    applyTheme(theme);
    try {
      const bg = getComputedStyle(document.body).backgroundColor;
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      if (bg) meta.setAttribute('content', bg);
    } catch { /* abaikan */ }
  }, [theme]);

  // Sinkronisasi antar-tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) setThemeState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((next) => {
    const value = next === 'light' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* mode privat */ }
    setThemeState(value);
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', isDarkMode: theme === 'dark', setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

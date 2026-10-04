import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useProgress } from './ProgressContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { updateProgress } = useProgress();
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('ds_theme');
    if (stored === 'light') return false;
    if (stored === 'dark') return true;
    return true;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('ds_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      updateProgress({ settings: { darkMode: next } });
      return next;
    });
  };

  const value = useMemo(() => ({ darkMode, toggleDarkMode }), [darkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

import { createContext, useContext, useState, useEffect } from 'react';

export const FONT_SIZES = {
  sm: { label: 'Small',  pct: '81.25%'  },   // ~13px
  md: { label: 'Medium', pct: '100%'    },   // 16px (default)
  lg: { label: 'Large',  pct: '118.75%' },   // ~19px
};

export const ThemeCtx = createContext({
  dark: false, toggle: () => {},
  fontSize: 'md', setFontSize: () => {},
});
export const useTheme = () => useContext(ThemeCtx);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('qa_theme');
      if (saved !== null) return saved === 'dark';
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  const [fontSize, setFontSizeState] = useState(() => {
    try { return localStorage.getItem('qa_font') || 'md'; } catch { return 'md'; }
  });

  // Apply dark class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('qa_theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  // Apply root font-size — scales all rem-based text proportionally
  // Column WIDTHS are stored in px so table alignment is unaffected
  useEffect(() => {
    document.documentElement.style.fontSize = FONT_SIZES[fontSize]?.pct || '100%';
    try { localStorage.setItem('qa_font', fontSize); } catch {}
  }, [fontSize]);

  const setFontSize = (size) => {
    if (FONT_SIZES[size]) setFontSizeState(size);
  };

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d), fontSize, setFontSize }}>
      {children}
    </ThemeCtx.Provider>
  );
}

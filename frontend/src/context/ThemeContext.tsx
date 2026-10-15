import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's choice: an explicit theme, or "system". */
  theme: Theme;
  /** The theme actually applied right now (system resolved to light/dark). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Flip between light and dark (resolves "system" to its opposite first). */
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'superlink-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* localStorage unavailable (private mode) — fall through */
  }
  return 'system';
}

/** Applies the theme to <html> and returns the resolved (light/dark) value. */
function applyTheme(theme: Theme): ResolvedTheme {
  const resolved: ResolvedTheme = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;
  const root = document.documentElement;
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = readStoredTheme();
    return initial === 'system' ? (prefersDark() ? 'dark' : 'light') : initial;
  });

  // Apply whenever the choice changes.
  useEffect(() => {
    setResolvedTheme(applyTheme(theme));
  }, [theme]);

  // Keep in sync with the OS while in "system" mode.
  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolvedTheme(applyTheme('system'));
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(applyTheme(theme) === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

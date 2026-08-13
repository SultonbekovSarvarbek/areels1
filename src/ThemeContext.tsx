import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { Palette, ThemeName, palettes } from './theme';
import { loadTheme, saveTheme } from './storage';

interface ThemeValue {
  name: ThemeName;
  colors: Palette;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  // null = пользователь ещё не выбирал вручную, идём за системой.
  const [chosen, setChosen] = useState<ThemeName | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadTheme().then((saved) => {
      setChosen(saved);
      setHydrated(true);
    });
  }, []);

  const name: ThemeName = chosen ?? (system === 'light' ? 'light' : 'dark');

  const toggle = useCallback(() => {
    setChosen((current) => {
      const next: ThemeName =
        (current ?? (system === 'light' ? 'light' : 'dark')) === 'dark' ? 'light' : 'dark';
      saveTheme(next);
      return next;
    });
  }, [system]);

  const value = useMemo<ThemeValue>(
    () => ({ name, colors: palettes[name], toggle }),
    [name, toggle],
  );

  // До чтения сохранённой темы не рисуем: иначе тёмный экран моргнёт светлым.
  if (!hydrated) return null;

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme вызван вне ThemeProvider');
  return ctx;
}

/** Палитра без остальной обвязки — самый частый случай в компонентах. */
export function useColors(): Palette {
  return useTheme().colors;
}

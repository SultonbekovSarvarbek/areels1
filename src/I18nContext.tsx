import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLocales } from 'expo-localization';

import { Dict, Lang, dictionaries } from './i18n';
import { loadLang, saveLang } from './storage';

interface I18nValue {
  lang: Lang;
  t: Dict;
  setLang: (lang: Lang) => void;
}

const I18nCtx = createContext<I18nValue | null>(null);

/** Язык устройства: узбекская локаль — латиница, всё остальное — русский. */
function deviceLang(): Lang {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'uz' ? 'uz' : 'ru';
  } catch {
    return 'ru';
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    loadLang().then((saved) => setLangState(saved ?? deviceLang()));
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLang(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang: lang ?? 'ru', t: dictionaries[lang ?? 'ru'], setLang }),
    [lang, setLang],
  );

  // Пока язык не прочитан, не рендерим: иначе интерфейс мигнёт русским.
  if (!lang) return null;

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error('useI18n вызван вне I18nProvider');
  return ctx;
}

/** Словарь без обвязки — самый частый случай в компонентах. */
export function useT(): Dict {
  return useI18n().t;
}

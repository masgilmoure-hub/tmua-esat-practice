import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Language } from './types';

type I18n = { lang: Language; t: (zh: string, en: string) => string; toggle: () => void };
const Context = createContext<I18n>({ lang: 'zh', t: zh => zh, toggle: () => {} });
export function LanguageProvider({ lang, onChange, children }: { lang: Language; onChange: (lang: Language) => void; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: (zh: string, en: string) => lang === 'zh' ? zh : en, toggle: () => onChange(lang === 'zh' ? 'en' : 'zh') }), [lang, onChange]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);

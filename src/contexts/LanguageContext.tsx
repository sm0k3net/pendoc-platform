import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, TranslationKeys } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('pendoc-language');
    return (saved as Language) || 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pendoc-language', lang);
  }, []);

  const mergeTranslations = (base: any, override: any): any => {
    if (!override) return base;
    if (Array.isArray(base)) return override ?? base;
    if (typeof base !== 'object' || base === null) return override ?? base;

    const result: any = { ...base };
    Object.keys(override).forEach((key) => {
      result[key] = mergeTranslations(base[key], override[key]);
    });
    return result;
  };

  const t = language === 'en'
    ? translations.en
    : (mergeTranslations(translations.en, translations[language]) as TranslationKeys);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

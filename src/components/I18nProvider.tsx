"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language, translations, Translations } from "@/lib/i18n";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vv_lang") as Language | null;
      if (saved === "en" || saved === "kn") {
        setLanguageState(saved);
      }
    } catch {
      // Storage access may be restricted
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("vv_lang", lang);
    } catch {
      // Ignore storage errors
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "kn" : "en");
  };

  const t = (key: keyof Translations): string => {
    const table = translations[language] || translations.en;
    return table[key] || translations.en[key] || String(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

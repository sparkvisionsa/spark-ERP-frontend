"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { applyLocaleToDocument, Locale } from "@/lib/i18n";

type LanguageContextValue = { locale: Locale; setLocale: (locale: Locale) => void; toggleLocale: () => void };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");
  const setLocale = useCallback((next: Locale) => {
    applyLocaleToDocument(next);
    setLocaleState(next);
    window.localStorage.setItem("spark-locale", next);
  }, []);
  const toggleLocale = useCallback(() => setLocale(locale === "ar" ? "en" : "ar"), [locale, setLocale]);

  useEffect(() => {
    const saved = window.localStorage.getItem("spark-locale");
    const initial: Locale = saved === "en" ? "en" : "ar";
    setLocaleState(initial);
    applyLocaleToDocument(initial);
  }, []);

  useEffect(() => {
    applyLocaleToDocument(locale);
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        observer.disconnect();
        applyLocaleToDocument(locale);
        observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt", "data-tooltip"] });
      });
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "placeholder", "alt", "data-tooltip"] });
    return () => { observer.disconnect(); if (frame) window.cancelAnimationFrame(frame); };
  }, [locale]);

  return <LanguageContext.Provider value={{ locale, setLocale, toggleLocale }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used within LanguageProvider");
  return value;
}

"use client";

import { useLanguage } from "@/components/language-provider";
import { apiRequest } from "@/lib/api";
import { Languages, Loader2, RotateCcw } from "lucide-react";
import { KeyboardEvent, MouseEvent, useEffect, useState } from "react";

type Language = "ar" | "en";
type TranslationResponse = {
  translatedText: string;
  sourceLanguage: Language;
  targetLanguage: Language;
};

const translationCache = new Map<string, string>();

function textLanguage(text: string): Language {
  const arabic = (text.match(/[\u0600-\u06ff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return arabic >= latin && arabic > 0 ? "ar" : "en";
}

export function TranslatableText({
  text,
  className = "",
  textClassName = "",
  compact = false,
  multiline = false,
  onTextClick,
}: {
  text: string;
  className?: string;
  textClassName?: string;
  compact?: boolean;
  multiline?: boolean;
  onTextClick?: () => void;
}) {
  const { locale } = useLanguage();
  const [translatedText, setTranslatedText] = useState("");
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const source = textLanguage(text);
  const target: Language = source === "ar" ? "en" : "ar";
  const visibleText = showTranslation && translatedText ? translatedText : text;
  const visibleLanguage = showTranslation ? target : source;

  useEffect(() => {
    setTranslatedText("");
    setShowTranslation(false);
    setError("");
  }, [text]);

  async function toggleTranslation(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }
    if (translatedText) {
      setShowTranslation(true);
      return;
    }
    const cacheKey = `${target}:${text}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslatedText(cached);
      setShowTranslation(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<TranslationResponse>("/translation", {
        method: "POST",
        body: JSON.stringify({ text, target }),
      });
      translationCache.set(cacheKey, result.translatedText);
      setTranslatedText(result.translatedText);
      setShowTranslation(true);
    } catch {
      setError(locale === "ar" ? "تعذرت الترجمة" : "Translation failed");
    } finally {
      setLoading(false);
    }
  }

  function activateText(event: KeyboardEvent<HTMLSpanElement>) {
    if (!onTextClick || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onTextClick();
  }

  const translateLabel = target === "ar"
    ? locale === "ar" ? "ترجمة إلى العربية" : "Translate to Arabic"
    : locale === "ar" ? "ترجمة إلى الإنجليزية" : "Translate to English";
  const restoreLabel = locale === "ar" ? "الرجوع إلى النص الأصلي" : "Show original text";

  return (
    <span
      data-no-translate
      className={`min-w-0 ${multiline ? "flex flex-wrap items-start" : "inline-flex items-center"} gap-1 ${className}`}
    >
      <span
        dir={visibleLanguage === "ar" ? "rtl" : "ltr"}
        lang={visibleLanguage}
        title={visibleText}
        className={`${multiline ? "min-w-[160px] flex-1 whitespace-pre-wrap break-words" : "min-w-0 flex-1 truncate"} ${onTextClick ? "cursor-pointer" : ""} ${textClassName}`}
        onClick={onTextClick}
        onKeyDown={activateText}
        role={onTextClick ? "button" : undefined}
        tabIndex={onTextClick ? 0 : undefined}
      >
        {visibleText}
      </span>
      <button
        type="button"
        className={`${compact ? "h-6 w-6 rounded-full border-0 p-0 opacity-70 hover:opacity-100" : "h-6 border px-1.5"} btn-ghost shrink-0 gap-1 text-[9px] transition-all`}
        style={{
          borderColor: compact ? "transparent" : showTranslation ? "color-mix(in srgb, var(--primary) 35%, var(--border))" : "var(--border)",
          color: showTranslation ? "var(--primary)" : "var(--muted)",
          background: showTranslation ? "var(--primary-soft)" : compact ? "transparent" : "var(--surface)",
        }}
        onClick={toggleTranslation}
        disabled={loading || !text.trim()}
        title={showTranslation ? restoreLabel : translateLabel}
        aria-label={showTranslation ? restoreLabel : translateLabel}
        aria-pressed={showTranslation}
      >
        {loading ? <Loader2 size={compact ? 13 : 11} className="animate-spin" /> : showTranslation ? <RotateCcw size={compact ? 13 : 11} /> : <Languages size={compact ? 13 : 11} />}
        {!compact && (showTranslation ? restoreLabel : translateLabel)}
      </button>
      {error && <span className="w-full text-[8px]" style={{ color: "var(--danger)" }}>{error}</span>}
    </span>
  );
}

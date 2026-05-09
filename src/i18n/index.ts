import en from "./en";
import ru from "./ru";
import es from "./es";
import type { Language } from "../types";

export type TranslationKey = keyof typeof en;

const TABLES: Record<Language, Record<TranslationKey, string>> = {
  en,
  ru,
  es,
};

export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Русский" },
  { value: "es", label: "Español" },
];

export function translate(lang: Language, key: TranslationKey): string {
  return TABLES[lang]?.[key] ?? TABLES.en[key] ?? key;
}

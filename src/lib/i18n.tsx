import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ur";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (en: string, ur: string) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("paklegal-lang")) as Lang | null;
    if (saved === "en" || saved === "ur") setLangState(saved);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("paklegal-lang", l);
  };

  const t = (en: string, ur: string) => (lang === "ur" ? ur : en);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be inside LangProvider");
  return ctx;
}

import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Scale, Languages, Menu, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

const NAV = [
  { to: "/", en: "Home", ur: "ہوم" },
  { to: "/situation", en: "Explain My Situation", ur: "اپنی صورتحال بتائیں" },
  { to: "/translator", en: "Document Explainer", ur: "دستاویز کی وضاحت" },
  { to: "/law", en: "Search the Law", ur: "قانون تلاش کریں" },
] as const;

export function SiteHeader() {
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = useLocation({ select: (l) => l.pathname });

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Scale className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            PakLegal <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label={t("Main", "مرکزی")}>
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              className="px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeProps={{
                className: "px-3 py-2 text-sm rounded-md text-primary bg-primary/10 font-medium",
              }}
            >
              {t(n.en, n.ur)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            aria-label={lang === "en" ? "Switch to Urdu" : "انگریزی میں تبدیل کریں"}
          >
            <Languages className="h-4 w-4" />
            {lang === "en" ? "اردو" : "English"}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden inline-flex items-center justify-center rounded-md border border-border bg-card p-2 hover:bg-muted transition-colors"
            aria-label={menuOpen ? t("Close menu", "مینو بند کریں") : t("Open menu", "مینو کھولیں")}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t border-border/60 bg-background"
          aria-label={t("Main", "مرکزی")}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 grid gap-1">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className={`px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${lang === "ur" ? "urdu" : ""}`}
                activeProps={{
                  className: `px-3 py-2.5 rounded-md text-primary bg-primary/10 font-medium ${lang === "ur" ? "urdu" : ""}`,
                }}
              >
                {t(n.en, n.ur)}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

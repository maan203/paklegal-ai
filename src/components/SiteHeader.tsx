import { Link } from "@tanstack/react-router";
import { Scale, Languages } from "lucide-react";
import { useLang } from "@/lib/i18n";

export function SiteHeader() {
  const { lang, setLang, t } = useLang();
  const nav = [
    { to: "/", en: "Home", ur: "ہوم" },
    { to: "/translator", en: "Translator", ur: "ترجمہ" },
    { to: "/fir", en: "Draft FIR", ur: "ایف آئی آر" },
    { to: "/bail", en: "Bail App.", ur: "ضمانت" },
    { to: "/notice", en: "Notice", ur: "نوٹس" },
    { to: "/complaint", en: "Complaint", ur: "شکایت" },
    { to: "/rights", en: "Rights", ur: "حقوق" },
  ] as const;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Scale className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            PakLegal <span className="text-primary">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeProps={{ className: "px-3 py-2 text-sm rounded-md text-primary bg-primary/10 font-medium" }}
            >
              {t(n.en, n.ur)}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setLang(lang === "en" ? "ur" : "en")}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          aria-label="Toggle language"
        >
          <Languages className="h-4 w-4" />
          {lang === "en" ? "اردو" : "English"}
        </button>
      </div>
    </header>
  );
}

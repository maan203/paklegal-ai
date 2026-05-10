import { useLang } from "@/lib/i18n";
export function PageHeader({ eyebrow, titleEn, titleUr, descEn, descUr }: { eyebrow?: string; titleEn: string; titleUr: string; descEn: string; descUr: string }) {
  const { t, lang } = useLang();
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-14 pb-8">
      {eyebrow && <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">{eyebrow}</p>}
      <h1 className={`mt-2 font-display text-4xl sm:text-5xl font-semibold tracking-tight ${lang === "ur" ? "urdu" : ""}`}>{t(titleEn, titleUr)}</h1>
      <p className={`mt-4 text-lg text-muted-foreground max-w-2xl ${lang === "ur" ? "urdu" : ""}`}>{t(descEn, descUr)}</p>
    </div>
  );
}

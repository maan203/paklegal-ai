import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { ExternalLink, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { searchLaw } from "@/lib/ai-functions";
import { LAWS, type LawId } from "@/lib/rag/laws";
import type { RetrievalResult } from "@/lib/rag/retrieve";

export const Route = createFileRoute("/law")({
  component: Page,
  head: () => ({ meta: [{ title: "Search the Law | PakLegal AI" }] }),
});

const EXAMPLES = [
  { en: "arrest without a warrant", ur: "بغیر وارنٹ گرفتاری" },
  { en: "bail in a non-bailable offence", ur: "ناقابل ضمانت جرم میں ضمانت" },
  { en: "right to education", ur: "تعلیم کا حق" },
  { en: "fake news about someone online", ur: "آن لائن جھوٹی خبر" },
  { en: "Section 489-F PPC", ur: "دفعہ 302" },
];

// Semantic search over the knowledge base, with no AI generation: results are the law itself.
function Page() {
  const { t, lang } = useLang();
  const [query, setQuery] = useState("");
  const [law, setLaw] = useState<LawId | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [searched, setSearched] = useState("");
  const ur = lang === "ur" ? "urdu" : "";

  // Only the latest search may update the page; a slower earlier one must not overwrite it.
  const latestRequest = useRef(0);

  const run = useCallback(
    async (q: string, lawFilter: LawId | undefined) => {
      if (!q.trim()) return;
      const request = ++latestRequest.current;
      setIsLoading(true);
      try {
        const found = await searchLaw({ data: { query: q.trim(), law: lawFilter } });
        if (request !== latestRequest.current) return;
        setResult(found);
        setSearched(q.trim());
      } catch (err) {
        if (request !== latestRequest.current) return;
        toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
      } finally {
        if (request === latestRequest.current) setIsLoading(false);
      }
    },
    [t],
  );

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`;

  return (
    <PageShell>
      <PageHeader
        titleEn="Search the Law"
        titleUr="قانون تلاش کریں"
        descEn="Search the official text of Pakistani laws by meaning, in English or Urdu. No AI writing here: every result is the law itself."
        descUr="پاکستانی قوانین کا سرکاری متن معنی کے لحاظ سے تلاش کریں، اردو یا انگریزی میں۔ یہاں اے آئی کچھ نہیں لکھتا، ہر نتیجہ خود قانون ہے۔"
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-16">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(query, law);
          }}
          className="relative"
        >
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            dir="auto"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "e.g. arrest without a warrant, or Section 154 CrPC",
              "مثلاً: بغیر وارنٹ گرفتاری، یا دفعہ 154",
            )}
            className="w-full rounded-lg border border-input bg-card ps-11 pe-28 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute end-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Search", "تلاش")}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={chip(!law)}
            onClick={() => {
              setLaw(undefined);
              if (searched) run(searched, undefined);
            }}
          >
            {t("All laws", "تمام قوانین")}
          </button>
          {LAWS.map((l) => (
            <button
              key={l.id}
              type="button"
              className={chip(law === l.id)}
              onClick={() => {
                setLaw(l.id);
                if (searched) run(searched, l.id);
              }}
            >
              {t(l.shortName, l.urduName)}
            </button>
          ))}
        </div>

        {!result && (
          <div className="mt-8">
            <p
              className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 ${ur ? "urdu normal-case" : ""}`}
            >
              {t("Try", "آزمائیں")}
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => {
                const q = t(ex.en, ex.ur);
                return (
                  <button
                    key={ex.en}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      run(q, law);
                    }}
                    className={`rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/50 hover:bg-primary/5 transition ${ur}`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-6">
            {result.status === "unavailable" && (
              <p className={`text-sm text-amber-700 ${ur}`}>
                {t(
                  "The legal knowledge base could not be searched right now. Please try again.",
                  "قانونی ذخیرہ اس وقت تلاش نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
                )}
              </p>
            )}
            {result.status === "no_match" && (
              <p className={`text-sm text-muted-foreground ${ur}`}>
                {t(
                  "No provision in the knowledge base matches this closely enough. It may be covered by a law that is not loaded yet.",
                  "ذخیرے میں کوئی شق اس سے کافی حد تک نہیں ملتی۔ ممکن ہے یہ کسی ایسے قانون میں ہو جو ابھی شامل نہیں۔",
                )}
              </p>
            )}
            {result.sources.length > 0 && (
              <>
                <p className={`text-sm text-muted-foreground mb-3 ${ur}`}>
                  {t(
                    `${result.sources.length} provisions for "${searched}"`,
                    `"${searched}" کے لیے ${result.sources.length} دفعات`,
                  )}
                </p>
                <ol className="space-y-3">
                  {result.sources.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-border bg-card p-4"
                      dir="ltr"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold">
                          <span className="text-primary">
                            {s.unit} {s.displayNumber}
                          </span>{" "}
                          <span className="text-muted-foreground font-normal">· {s.lawName}</span>
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {s.matchedBy === "reference"
                            ? t("exact match", "عین مطابق")
                            : t(
                                `relevance ${Math.round((s.score ?? 0) * 100)}%`,
                                `مطابقت ${Math.round((s.score ?? 0) * 100)}%`,
                              )}
                        </span>
                      </div>
                      <p className="mt-1 font-medium">
                        {s.title}
                        {s.parts > 1 && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            (part {s.part} of {s.parts})
                          </span>
                        )}
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-primary">
                          {t("Read the official text", "سرکاری متن پڑھیں")}
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
                          {s.text}
                        </p>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-primary underline"
                        >
                          {t("Source: Pakistan Code", "ماخذ: پاکستان کوڈ")}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </details>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

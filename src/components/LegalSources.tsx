import { AlertTriangle, BookOpen, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { ChatAnswer } from "@/lib/ai-functions";

// Shows which legal provisions an answer was based on. Numbers match the [n] citations in the answer.
export function LegalSources({
  sources,
  retrieval,
  unsupportedCitations,
}: Omit<ChatAnswer, "text">) {
  const { t, lang } = useLang();
  const urdu = lang === "ur" ? "urdu" : "";

  return (
    <div className="mt-3 border-t border-border pt-2 text-xs space-y-2">
      {sources.length > 0 && (
        <div>
          <p className={`flex items-center gap-1.5 font-semibold text-foreground ${urdu}`}>
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            {t(
              `Legal sources used (${sources.length})`,
              `استعمال شدہ قانونی حوالہ جات (${sources.length})`,
            )}
          </p>
          <ol className="mt-1 space-y-1">
            {sources.map((s, i) => (
              <li key={s.id}>
                <details className="group rounded-md bg-muted/50 px-2 py-1">
                  <summary className="cursor-pointer list-none text-foreground" dir="ltr">
                    <span className="font-semibold text-primary">[{i + 1}]</span>{" "}
                    <span className="font-medium">
                      {s.unit} {s.displayNumber}, {s.lawName}
                    </span>
                    : {s.title}
                    {s.parts > 1 && (
                      <span className="text-muted-foreground">
                        {" "}
                        (part {s.part} of {s.parts})
                      </span>
                    )}
                  </summary>
                  <p
                    className="mt-1.5 whitespace-pre-line text-muted-foreground leading-relaxed"
                    dir="ltr"
                  >
                    {s.text}
                  </p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-primary underline"
                  >
                    {t("Official text on Pakistan Code", "پاکستان کوڈ پر سرکاری متن")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </details>
              </li>
            ))}
          </ol>
        </div>
      )}

      {retrieval === "no_match" && (
        <p className={`flex items-start gap-1.5 text-muted-foreground ${urdu}`}>
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
          {t(
            "No matching provision was found in the legal knowledge base. This answer is general guidance, not based on a specific law.",
            "قانونی ذخیرے میں کوئی متعلقہ شق نہیں ملی۔ یہ جواب عمومی رہنمائی ہے، کسی مخصوص قانون پر مبنی نہیں۔",
          )}
        </p>
      )}

      {retrieval === "unavailable" && (
        <p className={`flex items-start gap-1.5 text-muted-foreground ${urdu}`}>
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
          {t(
            "Legal sources could not be searched right now, so this answer is not based on retrieved law.",
            "قانونی ذرائع اس وقت تلاش نہیں ہو سکے، اس لیے یہ جواب حاصل کردہ قانون پر مبنی نہیں۔",
          )}
        </p>
      )}

      {unsupportedCitations.length > 0 && (
        <p className={`flex items-start gap-1.5 text-amber-700 ${urdu}`}>
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {t(
              "Also mentioned, but not in the retrieved sources (please verify): ",
              "یہ بھی مذکور ہے مگر حاصل کردہ ذرائع میں شامل نہیں (براہ کرم تصدیق کریں): ",
            )}
            <span dir="ltr">{unsupportedCitations.join(", ")}</span>
          </span>
        </p>
      )}
    </div>
  );
}

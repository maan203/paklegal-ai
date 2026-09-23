import { AlertTriangle, BookOpen, ExternalLink } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { GroundedAnswer } from "@/lib/ai-functions";
import type { LegalSource } from "@/lib/rag/retrieve";

// A source counts as cited when the answer refers to it as [n] or names its number.
function isCited(text: string, source: LegalSource, index: number): boolean {
  if (text.includes(`[${index + 1}]`)) return true;
  const number = source.displayNumber.replace(/[-]/g, "[-‐-―]?");
  return new RegExp(`(?<![\\dA-Za-z])${number}(?![\\dA-Za-z])`).test(text);
}

function SourceItem({ source, index }: { source: LegalSource; index: number }) {
  const { t } = useLang();
  return (
    <li>
      <details className="group rounded-md bg-muted/50 px-2 py-1">
        <summary className="cursor-pointer list-none text-foreground" dir="ltr">
          <span className="font-semibold text-primary">[{index + 1}]</span>{" "}
          <span className="font-medium">
            {source.unit} {source.displayNumber}, {source.lawName}
          </span>
          : {source.title}
          {source.parts > 1 && (
            <span className="text-muted-foreground">
              {" "}
              (part {source.part} of {source.parts})
            </span>
          )}
        </summary>
        <p className="mt-1.5 whitespace-pre-line text-muted-foreground leading-relaxed" dir="ltr">
          {source.text}
        </p>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-primary underline"
        >
          {t("Official text on Pakistan Code", "پاکستان کوڈ پر سرکاری متن")}
          <ExternalLink className="h-3 w-3" />
        </a>
      </details>
    </li>
  );
}

// Shows which legal provisions an answer was based on. Numbers match the [n] citations in the
// answer; provisions that were retrieved but not used are listed separately.
export function LegalSources({ text, sources, retrieval, unsupportedCitations }: GroundedAnswer) {
  const { t, lang } = useLang();
  const urdu = lang === "ur" ? "urdu" : "";
  const indexed = sources.map((source, index) => ({ source, index }));
  const cited = indexed.filter(({ source, index }) => isCited(text, source, index));
  const unused = indexed.filter(({ source, index }) => !isCited(text, source, index));

  return (
    <div className="mt-3 border-t border-border pt-2 text-xs space-y-2">
      {cited.length > 0 && (
        <div>
          <p className={`flex items-center gap-1.5 font-semibold text-foreground ${urdu}`}>
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            {t(
              `Legal sources cited (${cited.length})`,
              `حوالہ دیے گئے قانونی ماخذ (${cited.length})`,
            )}
          </p>
          <ol className="mt-1 space-y-1">
            {cited.map(({ source, index }) => (
              <SourceItem key={source.id} source={source} index={index} />
            ))}
          </ol>
        </div>
      )}

      {unused.length > 0 && (
        <details className="text-muted-foreground">
          <summary className={`cursor-pointer ${urdu}`}>
            {t(
              `Also retrieved, not used in this answer (${unused.length})`,
              `مزید حاصل شدہ، اس جواب میں استعمال نہیں ہوئے (${unused.length})`,
            )}
          </summary>
          <ol className="mt-1 space-y-1">
            {unused.map(({ source, index }) => (
              <SourceItem key={source.id} source={source} index={index} />
            ))}
          </ol>
        </details>
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

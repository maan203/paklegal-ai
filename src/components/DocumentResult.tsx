import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { copyText, printDocument } from "@/lib/document-actions";
import { MarkdownResult } from "@/components/MarkdownResult";

type Props = {
  text: string;
  heading: string;
  printTitle: string;
  resetLabel: string;
  onReset: () => void;
  disclaimer: string;
};

// Generated document with Copy / Print / Start-over actions.
export function DocumentResult({
  text,
  heading,
  printTitle,
  resetLabel,
  onReset,
  disclaimer,
}: Props) {
  const { t, lang } = useLang();
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    if (await copyText(text)) setCopied(true);
    else
      toast.error(
        t(
          "Could not copy. Please select the text and copy it manually.",
          "کاپی نہیں ہو سکا۔ متن منتخب کر کے خود کاپی کریں۔",
        ),
      );
  }, [text, t]);

  const handlePrint = useCallback(() => {
    if (!printDocument(`${printTitle} | PakLegal AI`, contentRef.current)) {
      toast.error(
        t(
          "Please allow pop-ups for this site to print.",
          "پرنٹ کرنے کے لیے اس سائٹ کو پاپ اپ کی اجازت دیں۔",
        ),
      );
    }
  }, [printTitle, t]);

  const buttonClass =
    "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition";

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className={`font-display text-xl font-semibold ${lang === "ur" ? "urdu" : ""}`}>
          {heading}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={handleCopy} className={buttonClass}>
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? t("Copied!", "کاپی ہو گیا!") : t("Copy", "کاپی کریں")}
          </button>
          <button type="button" onClick={handlePrint} className={buttonClass}>
            <Printer className="h-4 w-4" />
            {t("Print", "پرنٹ")}
          </button>
          <button type="button" onClick={onReset} className={buttonClass}>
            <RotateCcw className="h-4 w-4" />
            {resetLabel}
          </button>
        </div>
      </div>
      <div
        ref={contentRef}
        className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-[var(--shadow-soft)]"
      >
        <MarkdownResult text={text} />
      </div>
      <p className={`mt-4 text-xs text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
        ⚠️ {disclaimer}
      </p>
    </div>
  );
}

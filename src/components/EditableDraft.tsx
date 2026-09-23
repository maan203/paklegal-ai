import { useEffect, useState } from "react";
import { Check, Copy, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { copyText, printDocument } from "@/lib/document-actions";

type Props = {
  generated: string;
  // Keeps the person's edits (e.g. in localStorage) so they survive a reload.
  value: string | null;
  onChange: (text: string | null) => void;
  printTitle: string;
  note: string;
};

// A draft the person finishes themselves: edit freely, then copy or print.
export function EditableDraft({ generated, value, onChange, printTitle, note }: Props) {
  const { t, lang } = useLang();
  const [copied, setCopied] = useState(false);
  const text = value ?? generated;

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const print = () => {
    const el = document.createElement("div");
    const body = document.createElement("div");
    body.style.whiteSpace = "pre-wrap";
    body.setAttribute("dir", "auto");
    body.textContent = text;
    el.appendChild(body);
    if (!printDocument(`${printTitle} | PakLegal AI`, el)) {
      toast.error(
        t(
          "Please allow pop-ups for this site to print.",
          "پرنٹ کرنے کے لیے اس سائٹ کو پاپ اپ کی اجازت دیں۔",
        ),
      );
    }
  };

  const button =
    "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition";

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          className={button}
          onClick={async () =>
            (await copyText(text))
              ? setCopied(true)
              : toast.error(
                  t(
                    "Could not copy. Select the text and copy it manually.",
                    "کاپی نہیں ہو سکا۔ متن منتخب کر کے خود کاپی کریں۔",
                  ),
                )
          }
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? t("Copied!", "کاپی ہو گیا!") : t("Copy", "کاپی کریں")}
        </button>
        <button type="button" className={button} onClick={print}>
          <Printer className="h-4 w-4" />
          {t("Print", "پرنٹ")}
        </button>
        {value !== null && (
          <button type="button" className={button} onClick={() => onChange(null)}>
            <RotateCcw className="h-4 w-4" />
            {t("Reset to generated", "اصل مسودہ بحال کریں")}
          </button>
        )}
      </div>
      <textarea
        dir="auto"
        rows={20}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        aria-label={printTitle}
        className="w-full rounded-lg border border-input bg-background p-4 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
      />
      <p className={`mt-2 text-xs text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
        ⚠️ {note}
      </p>
    </div>
  );
}

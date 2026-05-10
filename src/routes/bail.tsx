import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, ChevronLeft, Printer, RotateCcw, Loader2, Copy, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { useState, useCallback } from "react";
import { generateBailApplication, type BailInput } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/bail")({
  component: Page,
  head: () => ({ meta: [{ title: "Bail Application — PakLegal AI" }] }),
});

type Step = "details" | "language";

const FIELDS: { key: keyof BailInput; en: string; ur: string; placeholder: string; required?: boolean; span?: boolean }[] = [
  { key: "accusedName",    en: "Accused Full Name",        ur: "ملزم کا پورا نام",        placeholder: "e.g. Muhammad Ali Khan",             required: true },
  { key: "accusedCnic",    en: "Accused CNIC",              ur: "ملزم کا شناختی کارڈ نمبر", placeholder: "e.g. 35202-1234567-1" },
  { key: "accusedAddress", en: "Accused Address",           ur: "ملزم کا پتہ",             placeholder: "e.g. House 5, Street 3, Gulberg",    required: true },
  { key: "court",          en: "Court Name",                ur: "عدالت کا نام",            placeholder: "e.g. Sessions Court Lahore",         required: true },
  { key: "firNumber",      en: "FIR Number",                ur: "ایف آئی آر نمبر",         placeholder: "e.g. 245/2026" },
  { key: "policeStation",  en: "Police Station",            ur: "تھانہ",                   placeholder: "e.g. Gulberg Police Station" },
  { key: "sections",       en: "PPC Sections Charged",      ur: "متعلقہ دفعات",            placeholder: "e.g. 302, 324 PPC" },
  { key: "arrestDate",     en: "Date of Arrest",            ur: "گرفتاری کی تاریخ",        placeholder: "e.g. 5 May 2026" },
  { key: "advocateName",   en: "Advocate Name (optional)",  ur: "وکیل کا نام (اختیاری)",   placeholder: "e.g. Barrister Sara Ahmed" },
  { key: "grounds",        en: "Grounds for Bail",          ur: "ضمانت کی وجوہات",         placeholder: "e.g. Accused is sole breadwinner, has no prior criminal record, is willing to cooperate with investigation, health issues...", required: true, span: true },
];

function Page() {
  const { t, lang } = useLang();
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<Partial<BailInput>>({});
  const [selectedLang, setSelectedLang] = useState<"en" | "ur" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useLocalStorage<string | null>("bail-result", null);
  const [copied, setCopied] = useState(false);

  const setField = (key: keyof BailInput, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const canProceed = ["accusedName", "accusedAddress", "court", "grounds"].every(
    (k) => (form as Record<string, string>)[k]?.trim()
  );

  const handleGenerate = useCallback(async (lng: "en" | "ur") => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await generateBailApplication({ data: { ...form, language: lng } as BailInput });
      setResult(res.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
    } finally {
      setIsLoading(false);
    }
  }, [form, t, setResult]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handlePrint = useCallback(() => {
    if (!result) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Bail Application — PakLegal AI</title><style>body{font-family:serif;padding:2cm;line-height:1.8;}</style></head><body><pre style="white-space:pre-wrap;font-family:serif;">${result.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null); setForm({}); setSelectedLang(null); setStep("details");
  }, [setResult]);

  if (result) {
    return (
      <PageShell>
        <PageHeader titleEn="Bail Application" titleUr="ضمانت کی درخواست"
          descEn="Formal bail application for Sessions Court or High Court." descUr="سیشن یا ہائی کورٹ کے لیے باضابطہ ضمانت کی درخواست۔" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display text-xl font-semibold">{t("Bail Application Draft", "ضمانت کی درخواست کا مسودہ")}</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? t("Copied!", "کاپی ہو گیا!") : t("Copy", "کاپی کریں")}
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                <Printer className="h-4 w-4" />{t("Print", "پرنٹ")}
              </button>
              <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                <RotateCcw className="h-4 w-4" />{t("New Application", "نئی درخواست")}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <MarkdownResult text={result} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">⚠️ {t("AI-generated draft. Have it reviewed by a lawyer before filing.", "اے آئی سے تیار کردہ مسودہ۔ دائر کرنے سے پہلے وکیل سے تصدیق کروائیں۔")}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader titleEn="Bail Application" titleUr="ضمانت کی درخواست"
        descEn="Generate a formally drafted bail application for Sessions Court or High Court under CrPC 1898." descUr="سی آر پی سی ١٨٩٨ کے تحت سیشن یا ہائی کورٹ کے لیے باضابطہ ضمانت کی درخواست تیار کریں۔" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["details", "language"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step === s ? "bg-primary text-primary-foreground" : step === "language" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-xs hidden sm:inline ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t(["Case Details", "Choose Language"][i], ["مقدمے کی تفصیلات", "زبان منتخب کریں"][i])}
              </span>
              {i < 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {step === "details" && (
          <div>
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key} className={`rounded-xl border border-border bg-card p-4 ${f.span ? "sm:col-span-2" : ""}`}>
                  <label className={`block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 ${lang === "ur" ? "urdu normal-case" : ""}`}>
                    {t(f.en, f.ur)}{f.required && <span className="text-destructive ms-1">*</span>}
                  </label>
                  {f.span ? (
                    <textarea rows={3} value={(form[f.key] as string) ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                  ) : (
                    <input type="text" value={(form[f.key] as string) ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                      placeholder={f.placeholder} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep("language")} disabled={!canProceed}
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {t("Next: Choose Language", "اگلا: زبان منتخب کریں")}<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "language" && (
          <div>
            <p className="text-sm text-muted-foreground mb-6">{t("Choose the language for your bail application.", "ضمانت درخواست کی زبان منتخب کریں۔")}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {([{ val: "en" as const, label: "English", sub: "Application in English" }, { val: "ur" as const, label: "اردو", sub: "اردو میں درخواست" }]).map((opt) => (
                <button key={opt.val} onClick={() => { setSelectedLang(opt.val); handleGenerate(opt.val); }} disabled={isLoading}
                  className={`rounded-2xl border-2 p-6 text-center transition hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed ${selectedLang === opt.val ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                  <p className={`text-2xl font-bold mb-1 ${opt.val === "ur" ? "urdu" : ""}`}>{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.sub}</p>
                  {isLoading && selectedLang === opt.val && <Loader2 className="h-5 w-5 animate-spin mx-auto mt-3 text-primary" />}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <button onClick={() => setStep("details")} disabled={isLoading} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition">
                <ChevronLeft className="h-4 w-4" />{t("Back", "واپس")}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

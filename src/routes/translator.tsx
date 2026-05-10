import { createFileRoute } from "@tanstack/react-router";
import { Upload, FileText, Printer, RotateCcw, Loader2, ChevronRight, ChevronLeft, Copy, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { useState, useCallback, useRef } from "react";
import { translateDocument } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/translator")({
  component: Page,
  head: () => ({ meta: [{ title: "Court Order Translator — PakLegal AI" }] }),
});

type Tab = "upload" | "paste";
type LangChoice = "en" | "ur" | "both";
type Step = "document" | "language";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Page() {
  const { t, lang } = useLang();
  const [step, setStep] = useState<Step>("document");
  const [tab, setTab] = useState<Tab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLang, setSelectedLang] = useState<LangChoice | null>(null);
  const [result, setResult] = useLocalStorage<string | null>("translator-result", null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canProceed = tab === "upload" ? !!file : pasteText.trim().length > 10;

  const acceptFile = useCallback(
    (f: File) => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(t("File must be under 10 MB.", "فائل 10 میگابائٹ سے کم ہونی چاہیے۔"));
        return;
      }
      setFile(f);
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) acceptFile(f);
    },
    [acceptFile]
  );

  const handleAnalyze = useCallback(async (chosenLang: LangChoice) => {
    setIsLoading(true);
    setResult(null);
    try {
      let payload: { text?: string; fileBase64?: string; mediaType?: string; language: LangChoice };
      if (tab === "upload" && file) {
        const base64 = await fileToBase64(file);
        payload = { fileBase64: base64, mediaType: file.type, language: chosenLang };
      } else if (tab === "paste" && pasteText.trim().length > 10) {
        payload = { text: pasteText.trim(), language: chosenLang };
      } else {
        toast.error(t("Please upload a file or paste document text.", "فائل اپ لوڈ کریں یا متن چسپاں کریں۔"));
        setIsLoading(false);
        return;
      }
      const res = await translateDocument({ data: payload });
      setResult(res.text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("An error occurred. Please try again.", "ایک خرابی آئی۔ دوبارہ کوشش کریں۔");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tab, file, pasteText, t]);

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
    w.document.write(
      `<!DOCTYPE html><html><head><title>Document Analysis — PakLegal AI</title>` +
        `<style>body{font-family:sans-serif;padding:2cm;line-height:1.7;}pre{white-space:pre-wrap;font-family:sans-serif;font-size:13px;}</style>` +
        `</head><body><pre>${result.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`
    );
    w.document.close();
    w.print();
  }, [result]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPasteText("");
    setResult(null);
    setSelectedLang(null);
    setStep("document");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  if (result) {
    return (
      <PageShell>
        <PageHeader

          titleEn="Court Order Translator"
          titleUr="عدالتی حکم کا ترجمہ"
          descEn="Upload an FIR, summons, court order, or legal notice. Get a plain-language summary, key dates, obligations, and risk flags."
          descUr="ایف آئی آر، سمن، عدالتی حکم یا قانونی نوٹس اپ لوڈ کریں۔ سادہ زبان میں خلاصہ، اہم تاریخیں، ذمہ داریاں اور خطرات حاصل کریں۔"
        />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-16">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className={`font-display text-xl font-semibold ${lang === "ur" ? "urdu" : ""}`}>
              {t("Document Analysis", "دستاویز کا تجزیہ")}
            </h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? t("Copied!", "کاپی ہو گیا!") : t("Copy", "کاپی کریں")}
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                <Printer className="h-4 w-4" />{t("Print", "پرنٹ")}
              </button>
              <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                <RotateCcw className="h-4 w-4" />{t("New Analysis", "نیا تجزیہ")}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <MarkdownResult text={result} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("⚠️ This analysis is AI-generated for informational purposes only. Consult a lawyer for legal advice.", "⚠️ یہ تجزیہ صرف معلوماتی مقاصد کے لیے ہے۔ قانونی مشورے کے لیے وکیل سے رابطہ کریں۔")}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader

        titleEn="Court Order Translator"
        titleUr="عدالتی حکم کا ترجمہ"
        descEn="Upload an FIR, summons, court order, or legal notice. Get a plain-language summary, key dates, obligations, and risk flags."
        descUr="ایف آئی آر، سمن، عدالتی حکم یا قانونی نوٹس اپ لوڈ کریں۔ سادہ زبان میں خلاصہ، اہم تاریخیں، ذمہ داریاں اور خطرات حاصل کریں۔"
      />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-16">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["document", "language"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s ? "bg-primary text-primary-foreground" :
                step === "language" && s === "document" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-xs hidden sm:inline ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t(["Upload Document", "Choose Language"][i], ["دستاویز اپ لوڈ", "زبان منتخب کریں"][i])}
              </span>
              {i < 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload / Paste */}
        {step === "document" && (
          <>
            {/* Tabs */}
            <div className="flex rounded-lg border border-border bg-muted p-1 mb-6 w-fit">
              {([["upload", "Upload File", "فائل اپ لوڈ"], ["paste", "Paste Text", "متن چسپاں"]] as [Tab, string, string][]).map(([id, en, ur]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <span className={lang === "ur" ? "urdu" : ""}>{t(en, ur)}</span>
                </button>
              ))}
            </div>

            {tab === "upload" ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !file && fileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-12 text-center transition-colors ${file ? "border-primary/50 bg-primary/5" : "border-border bg-card cursor-pointer hover:border-primary/50 hover:bg-muted/40"}`}
              >
                {file ? (
                  <div>
                    <FileText className="mx-auto h-10 w-10 text-primary" />
                    <p className="mt-3 font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{(file.size / 1024).toFixed(0)} KB · {file.type || "unknown type"}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="mt-3 text-sm text-muted-foreground hover:text-foreground underline"
                    >
                      {t("Remove file", "فائل ہٹائیں")}
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-10 w-10 text-primary" />
                    <p className={`mt-4 font-display text-xl font-semibold ${lang === "ur" ? "urdu" : ""}`}>
                      {t("Drop a PDF or image here", "یہاں پی ڈی ایف یا تصویر رکھیں")}
                    </p>
                    <p className={`mt-2 text-sm text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
                      {t("Supports PDFs and images. Max 10 MB.", "پی ڈی ایف اور تصاویر کی حمایت۔ زیادہ سے زیادہ ١٠ میگابائٹ۔")}
                    </p>
                    <span className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                      {t("Choose file", "فائل منتخب کریں")}
                    </span>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) acceptFile(f); }} />
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6">
                <label className={`block text-sm font-semibold mb-2 ${lang === "ur" ? "urdu" : ""}`}>
                  {t("Paste the document text below", "دستاویز کا متن نیچے چسپاں کریں")}
                </label>
                <textarea
                  rows={12}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={t("Paste the text of the court order, FIR, summons, or legal notice here...", "عدالتی حکم، ایف آئی آر، سمن یا قانونی نوٹس کا متن یہاں چسپاں کریں...")}
                  className={`w-full rounded-lg border border-input bg-background p-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${lang === "ur" ? "urdu" : ""}`}
                />
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep("language")}
                disabled={!canProceed}
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {t("Next: Choose Language", "اگلا: زبان منتخب کریں")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-10 grid sm:grid-cols-2 gap-4">
              {[
                { en: "Plain-language summary", ur: "سادہ زبان میں خلاصہ" },
                { en: "Key dates & deadlines", ur: "اہم تاریخیں اور آخری تاریخ" },
                { en: "Risk flags & warnings", ur: "خطرات اور انتباہات" },
                { en: "Glossary of legal terms", ur: "قانونی اصطلاحات کی فرہنگ" },
              ].map((x) => (
                <div key={x.en} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
                  <FileText className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <p className={`text-sm ${lang === "ur" ? "urdu" : ""}`}>{t(x.en, x.ur)}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Language selection */}
        {step === "language" && (
          <div>
            <p className={`text-sm text-muted-foreground mb-6 ${lang === "ur" ? "urdu" : ""}`}>
              {t("Choose the language for your document analysis.", "دستاویز کے تجزیے کی زبان منتخب کریں۔")}
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {([
                { val: "en" as LangChoice,   label: "English", sub: "Analysis in English only" },
                { val: "ur" as LangChoice,   label: "اردو",    sub: "صرف اردو میں تجزیہ" },
                { val: "both" as LangChoice, label: "Both / دونوں", sub: "English + Urdu analysis" },
              ]).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => { setSelectedLang(opt.val); handleAnalyze(opt.val); }}
                  disabled={isLoading}
                  className={`rounded-2xl border-2 p-6 text-center transition hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedLang === opt.val ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <p className={`text-xl font-bold mb-1 ${opt.val === "ur" ? "urdu" : ""}`}>{opt.label}</p>
                  <p className="text-sm text-muted-foreground">{opt.sub}</p>
                  {isLoading && selectedLang === opt.val && (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mt-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <button onClick={() => setStep("document")} disabled={isLoading} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition disabled:opacity-50">
                <ChevronLeft className="h-4 w-4" />
                {t("Back", "واپس")}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

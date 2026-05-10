import { createFileRoute } from "@tanstack/react-router";
import { Mic, FileText, Printer, RotateCcw, Loader2, ChevronRight, ChevronLeft, Copy, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { useState, useCallback } from "react";
import { generateFIRDraft, type FIRInput } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/fir")({
  component: Page,
  head: () => ({ meta: [{ title: "FIR Drafting Assistant — PakLegal AI" }] }),
});

type Step = "describe" | "details" | "language";

const DETAIL_FIELDS: { key: keyof FIRInput; en: string; ur: string; placeholder: string }[] = [
  { key: "name",         en: "Your Full Name",       ur: "آپ کا پورا نام",         placeholder: "e.g. Muhammad Ali Khan" },
  { key: "cnic",         en: "CNIC Number",           ur: "شناختی کارڈ نمبر",        placeholder: "e.g. 35202-1234567-1" },
  { key: "address",      en: "Your Address",          ur: "آپ کا پتہ",               placeholder: "e.g. House 12, Street 5, Gulberg, Lahore" },
  { key: "phone",        en: "Phone Number",          ur: "فون نمبر",                placeholder: "e.g. 0300-1234567" },
  { key: "incidentDate", en: "Date of Incident",      ur: "واقعے کی تاریخ",          placeholder: "e.g. 12 May 2026" },
  { key: "incidentTime", en: "Time of Incident",      ur: "واقعے کا وقت",            placeholder: "e.g. 9:00 PM" },
  { key: "place",        en: "Place of Incident",     ur: "واقعے کی جگہ",            placeholder: "e.g. Outside DHA Phase 5 Gate, Lahore" },
  { key: "witness1",     en: "Witness 1 Name",        ur: "گواہ نمبر ۱ کا نام",      placeholder: "e.g. Ahmed Khan, 0301-1234567" },
  { key: "witness2",     en: "Witness 2 Name",        ur: "گواہ نمبر ۲ کا نام",      placeholder: "e.g. Sara Bibi, 0311-9876543" },
];

function Page() {
  const { t, lang } = useLang();
  const [step, setStep] = useState<Step>("describe");
  const [description, setDescription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [details, setDetails] = useState<Partial<Record<keyof FIRInput, string>>>({});
  const [language, setLanguage] = useState<"en" | "ur" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useLocalStorage<string | null>("fir-result", null);
  const [copied, setCopied] = useState(false);

  const setField = (key: keyof FIRInput, value: string) =>
    setDetails((prev) => ({ ...prev, [key]: value }));

  const handleVoiceInput = useCallback(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast.error(t("Voice input not supported in this browser.", "اس براؤزر میں آواز سے اندراج ممکن نہیں۔"));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as any[]).map((r: any) => r[0].transcript).join(" ");
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => {
      setIsListening(false);
      toast.error(t("Voice recognition error. Try again.", "آواز پہچاننے میں خرابی۔"));
    };
    if (isListening) recognition.stop();
    else recognition.start();
  }, [lang, isListening, t]);

  const handleGenerate = useCallback(async (selectedLang: "en" | "ur") => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await generateFIRDraft({
        data: {
          description,
          language: selectedLang,
          ...details,
        } as FIRInput,
      });
      setResult(res.text);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("An error occurred. Please try again.", "ایک خرابی آئی۔ دوبارہ کوشش کریں۔");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [description, details, t]);

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
      `<!DOCTYPE html><html><head><title>FIR Draft — PakLegal AI</title>` +
        `<style>body{font-family:serif;padding:2cm;line-height:1.7;}pre{white-space:pre-wrap;font-family:serif;font-size:13px;}</style>` +
        `</head><body><pre>${result.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`
    );
    w.document.close();
    w.print();
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null);
    setDescription("");
    setDetails({});
    setLanguage(null);
    setStep("describe");
  }, []);

  if (result) {
    return (
      <PageShell>
        <PageHeader

          titleEn="FIR Drafting Assistant"
          titleUr="ایف آئی آر کا مسودہ"
          descEn="Tell us what happened. We will draft a correctly formatted FIR citing relevant PPC sections."
          descUr="ہمیں بتائیں کیا ہوا۔ ہم درست فارمیٹ میں ایف آئی آر تیار کریں گے۔"
        />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className={`font-display text-xl font-semibold ${lang === "ur" ? "urdu" : ""}`}>
              {t("Your FIR Draft", "آپ کا ایف آئی آر مسودہ")}
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
                <RotateCcw className="h-4 w-4" />{t("New FIR", "نئی ایف آئی آر")}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <MarkdownResult text={result} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {t("⚠️ This is an AI-generated draft. Review carefully before submitting to police.", "⚠️ یہ اے آئی سے تیار کردہ مسودہ ہے۔ پولیس میں جمع کرانے سے پہلے احتیاط سے جانچیں۔")}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader

        titleEn="FIR Drafting Assistant"
        titleUr="ایف آئی آر کا مسودہ"
        descEn="Tell us what happened. We will draft a correctly formatted FIR citing relevant PPC sections."
        descUr="ہمیں بتائیں کیا ہوا۔ ہم درست فارمیٹ میں ایف آئی آر تیار کریں گے۔"
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["describe", "details", "language"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s ? "bg-primary text-primary-foreground" :
                (step === "details" && s === "describe") || (step === "language" && s !== "language")
                  ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-xs hidden sm:inline ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t(["Describe", "Your Details", "Language"][i], ["واقعہ بیان کریں", "آپ کی معلومات", "زبان"][i])}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Describe */}
        {step === "describe" && (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-soft)]">
            <label className={`block text-sm font-semibold mb-2 ${lang === "ur" ? "urdu" : ""}`}>
              {t("Describe the incident in your own words", "اپنے الفاظ میں واقعہ بیان کریں")}
            </label>
            <textarea
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t(
                "Example: On 5 May 2026 at around 9 PM, two men on a motorbike snatched my phone outside my house in DHA Phase 5, Lahore...",
                "مثال: ٥ مئی ٢٠٢٦ کو رات تقریباً ٩ بجے، دو افراد نے موٹر سائیکل پر لاہور کے ڈی ایچ اے فیز ٥ میں میرے گھر کے باہر میرا فون چھین لیا..."
              )}
              className={`w-full rounded-lg border border-input bg-background p-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${lang === "ur" ? "urdu" : ""}`}
            />
            <p className="mt-1 text-xs text-muted-foreground text-right">{description.length} {t("characters", "حروف")}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={handleVoiceInput}
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  isListening ? "border-red-400 bg-red-50 text-red-600" : "border-border bg-background hover:bg-muted"
                }`}
              >
                <Mic className={`h-4 w-4 ${isListening ? "text-red-500 animate-pulse" : "text-primary"}`} />
                {isListening ? t("Listening… (click to stop)", "سن رہا ہے…") : t("Speak instead", "بول کر بتائیں")}
              </button>
              <button
                onClick={() => setStep("details")}
                disabled={description.trim().length < 20}
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {t("Next: Your Details", "اگلا: آپ کی معلومات")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Details cards */}
        {step === "details" && (
          <div>
            <p className={`text-sm text-muted-foreground mb-5 ${lang === "ur" ? "urdu" : ""}`}>
              {t("Fill in what you know. You can leave any field blank.", "جو معلومات ہوں وہ بھریں۔ کوئی خانہ خالی بھی چھوڑ سکتے ہیں۔")}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {DETAIL_FIELDS.map((f) => (
                <div key={f.key} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <label className={`block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide ${lang === "ur" ? "urdu normal-case" : ""}`}>
                    {t(f.en, f.ur)}
                  </label>
                  <input
                    type="text"
                    value={(details[f.key] as string) ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep("describe")} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition">
                <ChevronLeft className="h-4 w-4" />
                {t("Back", "واپس")}
              </button>
              <button
                onClick={() => setStep("language")}
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 transition"
              >
                {t("Next: Choose Language", "اگلا: زبان منتخب کریں")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Language selection */}
        {step === "language" && (
          <div>
            <p className={`text-sm text-muted-foreground mb-6 ${lang === "ur" ? "urdu" : ""}`}>
              {t("Choose the language for your FIR draft.", "ایف آئی آر کی زبان منتخب کریں۔")}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                { val: "en" as const, label: "English", sub: "Generate FIR in English only" },
                { val: "ur" as const, label: "اردو", sub: "صرف اردو میں ایف آئی آر تیار کریں" },
              ]).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => {
                    setLanguage(opt.val);
                    handleGenerate(opt.val);
                  }}
                  disabled={isLoading}
                  className={`rounded-2xl border-2 p-6 text-center transition hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed ${
                    language === opt.val ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <p className={`text-2xl font-bold mb-1 ${opt.val === "ur" ? "urdu" : ""}`}>{opt.label}</p>
                  <p className={`text-sm text-muted-foreground ${opt.val === "ur" ? "urdu" : ""}`}>{opt.sub}</p>
                  {isLoading && language === opt.val && (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mt-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <button onClick={() => setStep("details")} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition">
                <ChevronLeft className="h-4 w-4" />
                {t("Back", "واپس")}
              </button>
            </div>
          </div>
        )}

        {/* Feature pills */}
        {step === "describe" && (
          <div className="mt-8 grid sm:grid-cols-3 gap-3 text-sm">
            {[
              { en: "Form 154 CrPC format", ur: "فارم ١٥٤ سی آر پی سی" },
              { en: "Cites PPC sections", ur: "پی پی سی کی دفعات" },
              { en: "English or Urdu", ur: "انگریزی یا اردو" },
            ].map((x) => (
              <div key={x.en} className="rounded-lg bg-secondary px-4 py-3 text-secondary-foreground text-center">
                <FileText className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className={lang === "ur" ? "urdu" : ""}>{t(x.en, x.ur)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

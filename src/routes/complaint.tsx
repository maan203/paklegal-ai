import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, ChevronLeft, Printer, RotateCcw, Loader2, Copy, Check, Zap, Wifi, Landmark, ShieldAlert, CreditCard, ShoppingCart, Globe } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { useState, useCallback } from "react";
import { generateConsumerComplaint, type ComplaintInput } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/complaint")({
  component: Page,
  head: () => ({ meta: [{ title: "Consumer Complaint — PakLegal AI" }] }),
});

type Step = "type" | "details" | "language";

const TYPES = [
  { id: "electricity", icon: Zap,         en: "Electricity / WAPDA",     ur: "بجلی / واپڈا",        desc: "Overbilling, power cuts, meter issues" },
  { id: "telecom",     icon: Wifi,         en: "Telecom / Internet",      ur: "ٹیلی کام / انٹرنیٹ",  desc: "Network, billing, service fraud" },
  { id: "banking",     icon: CreditCard,   en: "Bank / Finance",          ur: "بینک / مالیات",        desc: "Fraud, unauthorized charges, disputes" },
  { id: "consumer",    icon: ShoppingCart, en: "Product / Service",       ur: "مصنوعہ / خدمت",        desc: "Defective goods, refund, warranty" },
  { id: "cybercrime",  icon: Globe,        en: "Online Fraud / Cybercrime", ur: "آن لائن فراڈ",       desc: "Scam, hacking, fake account" },
  { id: "government",  icon: Landmark,     en: "Government Department",   ur: "سرکاری محکمہ",         desc: "NADRA, passport, utility agency" },
  { id: "other",       icon: ShieldAlert,  en: "Other",                   ur: "دیگر",                 desc: "Any other consumer complaint" },
] as const;

type ComplaintTypeId = (typeof TYPES)[number]["id"];

function Page() {
  const { t, lang } = useLang();
  const [step, setStep] = useState<Step>("type");
  const [complaintType, setComplaintType] = useState<ComplaintTypeId | null>(null);
  const [form, setForm] = useState<Partial<ComplaintInput>>({});
  const [selectedLang, setSelectedLang] = useState<"en" | "ur" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useLocalStorage<string | null>("complaint-result", null);
  const [copied, setCopied] = useState(false);

  const setField = (key: keyof ComplaintInput, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleGenerate = useCallback(async (lng: "en" | "ur") => {
    setIsLoading(true);
    setResult(null);
    try {
      const res = await generateConsumerComplaint({
        data: { ...form, complaintType: complaintType ?? "other", language: lng } as ComplaintInput,
      });
      setResult(res.text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
    } finally {
      setIsLoading(false);
    }
  }, [form, complaintType, t, setResult]);

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
    w.document.write(`<!DOCTYPE html><html><head><title>Complaint — PakLegal AI</title><style>body{font-family:sans-serif;padding:2cm;line-height:1.8;}</style></head><body><pre style="white-space:pre-wrap;font-family:sans-serif;">${result.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`);
    w.document.close(); w.print();
  }, [result]);

  const handleReset = useCallback(() => {
    setResult(null); setForm({}); setComplaintType(null); setSelectedLang(null); setStep("type");
  }, [setResult]);

  const canProceed = ["complainantName", "complainantAddress", "complainantPhone", "respondentName", "incidentDate", "description", "reliefSought"].every(
    (k) => (form as Record<string, string>)[k]?.trim()
  );

  if (result) {
    return (
      <PageShell>
        <PageHeader titleEn="Consumer Complaint" titleUr="صارف شکایت"
          descEn="Formal complaint to the relevant Pakistani authority." descUr="متعلقہ پاکستانی ادارے کو باضابطہ شکایت۔" />
        <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="font-display text-xl font-semibold">{t("Your Complaint Letter", "آپ کا شکایتی خط")}</h2>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? t("Copied!", "کاپی ہو گیا!") : t("Copy", "کاپی کریں")}
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                <Printer className="h-4 w-4" />{t("Print", "پرنٹ")}
              </button>
              <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                <RotateCcw className="h-4 w-4" />{t("New Complaint", "نئی شکایت")}
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <MarkdownResult text={result} />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">⚠️ {t("AI-generated complaint. Review before submission.", "اے آئی سے تیار کردہ شکایت۔ جمع کرانے سے پہلے جانچیں۔")}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader titleEn="Consumer Complaint" titleUr="صارف شکایت"
        descEn="Generate a formal complaint to PTA, NEPRA, SBP, FIA Cybercrime, or consumer courts — with the right legal basis." descUr="پی ٹی اے، نیپرا، ایس بی پی، ایف آئی اے سائبر کرائم یا صارف عدالتوں میں باضابطہ شکایت تیار کریں۔" />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pb-16">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(["type", "details", "language"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${step === s ? "bg-primary text-primary-foreground" : (step === "details" && s === "type") || step === "language" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{i + 1}</div>
              <span className={`text-xs hidden sm:inline ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {t(["Complaint Type", "Your Details", "Language"][i], ["شکایت کی قسم", "آپ کی تفصیلات", "زبان"][i])}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step 1: Type */}
        {step === "type" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {TYPES.map((x) => {
              const Icon = x.icon;
              return (
                <button key={x.id} onClick={() => { setComplaintType(x.id); setStep("details"); }}
                  className="text-start rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] transition-all group">
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                    <div>
                      <h3 className={`font-semibold ${lang === "ur" ? "urdu" : ""}`}>{t(x.en, x.ur)}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{x.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Details */}
        {step === "details" && (
          <div>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                { key: "complainantName",    en: "Your Full Name",          ur: "آپ کا پورا نام",         ph: "e.g. Ali Hassan",               req: true },
                { key: "complainantCnic",    en: "Your CNIC",               ur: "آپ کا شناختی کارڈ نمبر", ph: "e.g. 35202-1234567-1" },
                { key: "complainantAddress", en: "Your Address",            ur: "آپ کا پتہ",               ph: "House, Street, City",           req: true },
                { key: "complainantPhone",   en: "Your Phone Number",       ur: "آپ کا فون نمبر",         ph: "e.g. 0300-1234567",             req: true },
                { key: "respondentName",     en: "Company / Department",    ur: "کمپنی / محکمہ",           ph: "e.g. PTCL, LESCO, HBL",         req: true },
                { key: "incidentDate",       en: "Incident Date",           ur: "واقعے کی تاریخ",          ph: "e.g. 1 May 2026",               req: true },
                { key: "amountInvolved",     en: "Amount Involved (PKR)",   ur: "رقم (روپے)",               ph: "e.g. 25000" },
                { key: "reliefSought",       en: "Relief / Remedy Sought",  ur: "مطلوبہ ازالہ",            ph: "e.g. Full refund + compensation", req: true },
              ] as { key: keyof ComplaintInput; en: string; ur: string; ph: string; req?: boolean }[]).map((f) => (
                <div key={f.key} className="rounded-xl border border-border bg-card p-4">
                  <label className={`block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 ${lang === "ur" ? "urdu normal-case" : ""}`}>
                    {t(f.en, f.ur)}{f.req && <span className="text-destructive ms-1">*</span>}
                  </label>
                  <input type="text" value={(form[f.key] as string) ?? ""} onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={f.ph} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              ))}
              <div className="sm:col-span-2 rounded-xl border border-border bg-card p-4">
                <label className={`block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 ${lang === "ur" ? "urdu normal-case" : ""}`}>
                  {t("Complaint Description", "شکایت کی تفصیل")}<span className="text-destructive ms-1">*</span>
                </label>
                <textarea rows={4} value={(form.description as string) ?? ""} onChange={(e) => setField("description", e.target.value)}
                  placeholder={t("Describe what happened in detail…", "تفصیل سے بیان کریں کیا ہوا…")}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep("type")} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition">
                <ChevronLeft className="h-4 w-4" />{t("Back", "واپس")}
              </button>
              <button onClick={() => setStep("language")} disabled={!canProceed}
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition">
                {t("Next: Choose Language", "اگلا: زبان منتخب کریں")}<ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Language */}
        {step === "language" && (
          <div>
            <p className="text-sm text-muted-foreground mb-6">{t("Choose the language for your complaint letter.", "شکایتی خط کی زبان منتخب کریں۔")}</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {([{ val: "en" as const, label: "English", sub: "Complaint in English" }, { val: "ur" as const, label: "اردو", sub: "اردو میں شکایت" }]).map((opt) => (
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

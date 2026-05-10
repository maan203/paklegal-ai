import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { useState, useCallback } from "react";
import {
  Home,
  Briefcase,
  ShoppingBag,
  Map,
  Receipt,
  ArrowRight,
  ArrowLeft,
  Printer,
  RotateCcw,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { generateLegalNotice } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { toast } from "sonner";

export const Route = createFileRoute("/notice")({
  component: Page,
  head: () => ({ meta: [{ title: "Legal Notice Generator — PakLegal AI" }] }),
});

const TYPES = [
  {
    id: "landlord",
    icon: Home,
    en: "Landlord–Tenant",
    ur: "مالک مکان و کرایہ دار",
    descEn: "Eviction or rent recovery",
    descUr: "بے دخلی یا کرایہ کی وصولی",
  },
  {
    id: "employment",
    icon: Briefcase,
    en: "Employment",
    ur: "ملازمت",
    descEn: "Wrongful termination, unpaid wages",
    descUr: "غیر قانونی برطرفی، تنخواہ کی عدم ادائیگی",
  },
  {
    id: "consumer",
    icon: ShoppingBag,
    en: "Consumer Complaint",
    ur: "صارف شکایت",
    descEn: "Defective goods or service fraud",
    descUr: "خراب اشیاء یا فراڈ",
  },
  {
    id: "property",
    icon: Map,
    en: "Property Dispute",
    ur: "جائیداد کا تنازع",
    descEn: "Boundary or encroachment",
    descUr: "حدبندی یا قبضہ",
  },
  {
    id: "cheque",
    icon: Receipt,
    en: "Bounced Cheque",
    ur: "بائونس چیک",
    descEn: "Notice under Section 489-F PPC",
    descUr: "دفعہ ٤٨٩-ایف کے تحت نوٹس",
  },
] as const;

type NoticeTypeId = (typeof TYPES)[number]["id"];

interface FormField {
  key: string;
  labelEn: string;
  labelUr: string;
  type: "text" | "number" | "textarea";
  placeholderEn?: string;
  required?: boolean;
}

const FORM_CONFIG: Record<NoticeTypeId, FormField[]> = {
  landlord: [
    { key: "senderName", labelEn: "Your Full Name (Tenant)", labelUr: "آپ کا پورا نام (کرایہ دار)", type: "text", required: true },
    { key: "landlordName", labelEn: "Landlord's Full Name", labelUr: "مالک مکان کا پورا نام", type: "text", required: true },
    { key: "propertyAddress", labelEn: "Rented Property Address", labelUr: "کرایے کی جائیداد کا پتہ", type: "textarea", required: true },
    { key: "rentAmount", labelEn: "Monthly Rent (PKR)", labelUr: "ماہانہ کرایہ (روپے)", type: "number", required: true },
    { key: "issue", labelEn: "Describe the issue (illegal eviction, non-repair, rent dispute, etc.)", labelUr: "مسئلہ بیان کریں", type: "textarea", required: true },
    { key: "city", labelEn: "City", labelUr: "شہر", type: "text", required: true },
  ],
  employment: [
    { key: "employeeName", labelEn: "Your Name (Employee)", labelUr: "آپ کا نام (ملازم)", type: "text", required: true },
    { key: "employerName", labelEn: "Employer / Company Name", labelUr: "آجر / کمپنی کا نام", type: "text", required: true },
    { key: "position", labelEn: "Your Job Title / Designation", labelUr: "آپ کا عہدہ", type: "text", required: true },
    { key: "employmentDates", labelEn: "Employment Period", labelUr: "ملازمت کا عرصہ", type: "text", placeholderEn: "e.g. Jan 2022 – Apr 2026", required: true },
    { key: "amountOwed", labelEn: "Amount Owed (PKR)", labelUr: "واجب الادا رقم (روپے)", type: "number" },
    { key: "issue", labelEn: "Describe the issue (wrongful termination, unpaid salary, gratuity, etc.)", labelUr: "مسئلہ بیان کریں", type: "textarea", required: true },
    { key: "city", labelEn: "City", labelUr: "شہر", type: "text", required: true },
  ],
  consumer: [
    { key: "senderName", labelEn: "Your Name", labelUr: "آپ کا نام", type: "text", required: true },
    { key: "companyName", labelEn: "Company / Seller Name", labelUr: "کمپنی یا بیچنے والے کا نام", type: "text", required: true },
    { key: "product", labelEn: "Product or Service", labelUr: "مصنوعہ یا خدمت", type: "text", required: true },
    { key: "purchaseDate", labelEn: "Purchase Date", labelUr: "خریداری کی تاریخ", type: "text", placeholderEn: "e.g. 15 March 2026", required: true },
    { key: "amountPaid", labelEn: "Amount Paid (PKR)", labelUr: "ادا کردہ رقم (روپے)", type: "number", required: true },
    { key: "issue", labelEn: "Complaint Details (defect, fraud, non-delivery, etc.)", labelUr: "شکایت کی تفصیل", type: "textarea", required: true },
    { key: "city", labelEn: "City", labelUr: "شہر", type: "text", required: true },
  ],
  property: [
    { key: "senderName", labelEn: "Your Name", labelUr: "آپ کا نام", type: "text", required: true },
    { key: "recipientName", labelEn: "Opposite Party's Name", labelUr: "مخالف فریق کا نام", type: "text", required: true },
    { key: "propertyDescription", labelEn: "Property Description (location, size, khasra/survey no.)", labelUr: "جائیداد کی تفصیل", type: "textarea", required: true },
    { key: "issue", labelEn: "Describe the dispute (encroachment, illegal construction, boundary, etc.)", labelUr: "تنازع بیان کریں", type: "textarea", required: true },
    { key: "city", labelEn: "City", labelUr: "شہر", type: "text", required: true },
  ],
  cheque: [
    { key: "senderName", labelEn: "Your Name (Payee)", labelUr: "وصول کنندہ کا نام", type: "text", required: true },
    { key: "drawerName", labelEn: "Drawer's Name (who wrote the cheque)", labelUr: "چیک لکھنے والے کا نام", type: "text", required: true },
    { key: "drawerAddress", labelEn: "Drawer's Address", labelUr: "چیک لکھنے والے کا پتہ", type: "text", required: true },
    { key: "bankName", labelEn: "Bank Name", labelUr: "بینک کا نام", type: "text", required: true },
    { key: "chequeNumber", labelEn: "Cheque Number", labelUr: "چیک نمبر", type: "text", required: true },
    { key: "chequeAmount", labelEn: "Cheque Amount (PKR)", labelUr: "چیک کی رقم (روپے)", type: "number", required: true },
    { key: "chequeDate", labelEn: "Cheque Date", labelUr: "چیک کی تاریخ", type: "text", placeholderEn: "e.g. 1 May 2026", required: true },
    { key: "city", labelEn: "City", labelUr: "شہر", type: "text", required: true },
  ],
};

function Page() {
  const { t, lang } = useLang();
  const [selectedType, setSelectedType] = useState<NoticeTypeId | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useLocalStorage<string | null>("notice-result", null);
  const [copied, setCopied] = useState(false);

  const handleTypeSelect = useCallback((id: NoticeTypeId) => {
    setSelectedType(id);
    setFormData({});
    setResult(null);
  }, []);

  const handleFieldChange = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;
    const fields = FORM_CONFIG[selectedType];
    const missing = fields.find((f) => f.required && !formData[f.key]?.trim());
    if (missing) {
      toast.error(
        t(`Please fill in: ${missing.labelEn}`, `براہ کرم پُر کریں: ${missing.labelUr}`)
      );
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const res = await generateLegalNotice({
        data: { noticeType: selectedType, ...formData },
      });
      setResult(res.text);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("An error occurred. Please try again.", "ایک خرابی آئی۔ دوبارہ کوشش کریں۔");
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedType, formData, t]);

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
      `<!DOCTYPE html><html><head><title>Legal Notice — PakLegal AI</title>` +
        `<style>body{font-family:serif;padding:2cm;line-height:1.7;}pre{white-space:pre-wrap;font-family:serif;font-size:13px;}</style>` +
        `</head><body><pre>${result.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`
    );
    w.document.close();
    w.print();
  }, [result]);

  const handleReset = useCallback(() => {
    setSelectedType(null);
    setFormData({});
    setResult(null);
  }, []);

  const selectedMeta = selectedType ? TYPES.find((x) => x.id === selectedType) : null;

  return (
    <PageShell>
      <PageHeader

        titleEn="Legal Notice Generator"
        titleUr="قانونی نوٹس تیار کریں"
        descEn="Choose your situation. We generate a properly formatted legal notice with the right legal basis, demand, and remedy — print-ready."
        descUr="اپنی صورتحال منتخب کریں۔ ہم درست قانونی بنیاد، مطالبہ اور حل کے ساتھ باقاعدہ نوٹس تیار کریں گے۔"
      />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        {/* Step 3: Result */}
        {result && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h2 className={`font-display text-xl font-semibold ${lang === "ur" ? "urdu" : ""}`}>
                {t("Your Legal Notice", "آپ کا قانونی نوٹس")}
              </h2>
              <div className="flex gap-2">
                <button onClick={handleCopy} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? t("Copied!", "کاپی ہو گیا!") : t("Copy", "کاپی کریں")}
                </button>
                <button onClick={handlePrint} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                  <Printer className="h-4 w-4" />{t("Print", "پرنٹ")}
                </button>
                <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition">
                  <RotateCcw className="h-4 w-4" />{t("New Notice", "نیا نوٹس")}
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <MarkdownResult text={result} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t(
                "⚠️ This is an AI-generated notice. Have it reviewed by a lawyer before dispatch.",
                "⚠️ یہ اے آئی سے تیار کردہ نوٹس ہے۔ بھیجنے سے پہلے کسی وکیل سے تصدیق کروائیں۔"
              )}
            </p>
          </div>
        )}

        {/* Step 1: Choose type */}
        {!result && !selectedType && (
          <div className="grid sm:grid-cols-2 gap-4">
            {TYPES.map((x) => {
              const Icon = x.icon;
              return (
                <button
                  key={x.id}
                  onClick={() => handleTypeSelect(x.id)}
                  className="text-start group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] transition-all"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent/20 text-accent-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <h3 className={`font-display text-lg font-semibold ${lang === "ur" ? "urdu" : ""}`}>
                        {t(x.en, x.ur)}
                      </h3>
                      <p className={`mt-1 text-sm text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
                        {t(x.descEn, x.descUr)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: Fill form */}
        {!result && selectedType && (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-[var(--shadow-soft)]">
            {/* Back + title */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setSelectedType(null)}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                {t("Back", "واپس")}
              </button>
              <span className="text-muted-foreground">·</span>
              <span className={`font-semibold text-sm ${lang === "ur" ? "urdu" : ""}`}>
                {t(selectedMeta!.en, selectedMeta!.ur)}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {FORM_CONFIG[selectedType].map((field) => (
                <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                  <label
                    className={`block text-sm font-medium mb-1.5 ${lang === "ur" ? "urdu" : ""}`}
                  >
                    {t(field.labelEn, field.labelUr)}
                    {field.required && <span className="text-destructive ms-1">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholderEn || ""}
                      className={`w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${lang === "ur" ? "urdu" : ""}`}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholderEn || ""}
                      className={`w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${lang === "ur" ? "urdu" : ""}`}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("Generating…", "تیار ہو رہا ہے…")}
                  </>
                ) : (
                  t("Generate Legal Notice", "قانونی نوٹس تیار کریں")
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

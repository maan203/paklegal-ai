import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  FileSignature,
  HelpCircle,
  Loader2,
  MessageSquare,
  Mic,
  Pencil,
  RotateCcw,
  Scale,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { MarkdownResult } from "@/components/MarkdownResult";
import { LegalSources } from "@/components/LegalSources";
import { DocumentResult } from "@/components/DocumentResult";
import { ChatThread } from "@/components/ChatThread";
import { useLang } from "@/lib/i18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { useLegalChat } from "@/hooks/useLegalChat";
import { analyzeSituation, type ChatMessage, type SituationAnalysis } from "@/lib/ai-functions";
import { buildFirApplication, buildLawyerBrief } from "@/lib/case-summary";

export const Route = createFileRoute("/situation")({
  component: Page,
  head: () => ({ meta: [{ title: "Explain My Situation | PakLegal AI" }] }),
});

const MAX_CHARS = 4000;

const EXAMPLES = [
  {
    en: "Robbery, police refused FIR",
    ur: "ڈکیتی، پولیس نے ایف آئی آر نہیں لکھی",
    text: "Last Tuesday around 11 at night two men on a motorcycle stopped me outside my shop in Saddar, Rawalpindi. One of them showed a pistol and they took my phone and 35,000 rupees cash. My neighbour Aslam saw it happen. I went to the police station the next morning but the duty officer refused to write my complaint and told me to come back later.",
  },
  {
    en: "Bounced cheque",
    ur: "چیک باؤنس",
    text: "I lent 3 lakh rupees to a business partner in January. In June he gave me a cheque for the full amount but the bank returned it saying insufficient funds. Now he is not answering my calls. I still have the returned cheque and the bank's memo.",
  },
  {
    en: "Landlord threw out my things (Urdu)",
    ur: "مالک مکان نے سامان باہر پھینک دیا",
    text: "میرے مالک مکان نے پچھلے ہفتے بغیر کسی عدالتی حکم کے میرا سامان گھر سے باہر پھینک دیا اور تالا بدل دیا۔ میں نے تین مہینے کا کرایہ ایڈوانس دیا ہوا تھا۔ جب میں نے اعتراض کیا تو اس نے مجھے دھمکی دی کہ اگر دوبارہ آیا تو ٹانگیں توڑ دے گا۔ میرے پاس کرایہ نامہ اور رسیدیں موجود ہیں۔",
  },
];

type Saved = { narrative: string; analysis: SituationAnalysis };
type DocView = "brief" | "fir" | null;

function Page() {
  const { t, lang } = useLang();
  const [narrative, setNarrative] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useLocalStorage<Saved | null>("situation-analysis", null);
  const [docView, setDocView] = useState<DocView>(null);
  const speech = useSpeechInput((text) =>
    setNarrative((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS)),
  );

  const analyze = useCallback(async () => {
    setIsLoading(true);
    try {
      const analysis = await analyzeSituation({ data: { narrative } });
      setSaved({ narrative, analysis });
      setDocView(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
    } finally {
      setIsLoading(false);
    }
  }, [narrative, setSaved, t]);

  const header = (
    <PageHeader
      titleEn="Explain My Situation"
      titleUr="اپنی صورتحال بتائیں"
      descEn="Describe what happened in your own words, typed or spoken, in Urdu or English. We pick out the facts, find the Pakistani law that applies, and explain your rights and next steps."
      descUr="جو ہوا اپنے الفاظ میں لکھیں یا بول کر بتائیں، اردو یا انگریزی میں۔ ہم حقائق سمجھ کر متعلقہ پاکستانی قانون تلاش کریں گے اور آپ کے حقوق اور اگلے اقدامات بتائیں گے۔"
    />
  );

  if (saved) {
    return (
      <PageShell>
        {header}
        <Result
          saved={saved}
          docView={docView}
          setDocView={setDocView}
          onEdit={() => {
            setNarrative(saved.narrative);
            setSaved(null);
          }}
          onNew={() => {
            setNarrative("");
            setSaved(null);
          }}
        />
      </PageShell>
    );
  }

  const tooShort = narrative.trim().length < 40;
  return (
    <PageShell>
      {header}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-[var(--shadow-soft)]">
          <label
            htmlFor="narrative"
            className={`block text-sm font-semibold mb-2 ${lang === "ur" ? "urdu" : ""}`}
          >
            {t("What happened?", "کیا ہوا؟")}
          </label>
          <textarea
            id="narrative"
            dir="auto"
            rows={9}
            maxLength={MAX_CHARS}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder={t(
              "Write it the way you would tell a lawyer: what happened, when and where, who was involved, what you lost, and anything you have already done.",
              "ایسے لکھیں جیسے وکیل کو بتاتے: کیا ہوا، کب اور کہاں، کون شامل تھا، کیا نقصان ہوا، اور آپ اب تک کیا کر چکے ہیں۔",
            )}
            className="w-full rounded-lg border border-input bg-background p-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <p className="mt-1 text-xs text-muted-foreground text-end">
            {narrative.length} / {MAX_CHARS}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={speech.toggle}
              className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                speech.isListening
                  ? "border-red-400 bg-red-50 text-red-600"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <Mic
                className={`h-4 w-4 ${speech.isListening ? "text-red-500 animate-pulse" : "text-primary"}`}
              />
              {speech.isListening
                ? t("Listening… (click to stop)", "سن رہا ہے… (روکنے کے لیے کلک کریں)")
                : t("Speak instead", "بول کر بتائیں")}
            </button>
            <button
              type="button"
              onClick={analyze}
              disabled={tooShort || isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isLoading
                ? t("Analysing…", "تجزیہ ہو رہا ہے…")
                : t("Explain my situation", "میری صورتحال سمجھائیں")}
            </button>
          </div>
          {isLoading && (
            <p className={`mt-4 text-sm text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
              {t(
                "Reading your description, finding the law that applies, and writing the explanation. This takes about 10 seconds.",
                "آپ کا بیان پڑھا جا رہا ہے، متعلقہ قانون تلاش ہو رہا ہے اور وضاحت لکھی جا رہی ہے۔ تقریباً 10 سیکنڈ لگیں گے۔",
              )}
            </p>
          )}
        </div>

        <div className="mt-6">
          <p
            className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 ${lang === "ur" ? "urdu normal-case" : ""}`}
          >
            {t("Or try an example", "یا کوئی مثال آزمائیں")}
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.en}
                type="button"
                onClick={() => setNarrative(ex.text)}
                className={`rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/50 hover:bg-primary/5 transition ${lang === "ur" ? "urdu" : ""}`}
              >
                {t(ex.en, ex.ur)}
              </button>
            ))}
          </div>
        </div>

        <p className={`mt-8 text-xs text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
          {t(
            "Your description is sent to the AI service to be analysed and is not stored on our servers. The result is saved only in this browser.",
            "آپ کا بیان تجزیے کے لیے اے آئی سروس کو بھیجا جاتا ہے اور ہمارے سرور پر محفوظ نہیں ہوتا۔ نتیجہ صرف اسی براؤزر میں محفوظ ہوتا ہے۔",
          )}
        </p>
      </div>
    </PageShell>
  );
}

function Result({
  saved,
  docView,
  setDocView,
  onEdit,
  onNew,
}: {
  saved: Saved;
  docView: DocView;
  setDocView: (v: DocView) => void;
  onEdit: () => void;
  onNew: () => void;
}) {
  const { t, lang } = useLang();
  const { narrative, analysis } = saved;
  const { facts } = analysis;
  const ur = lang === "ur" ? "urdu" : "";

  // Follow-up questions carry the situation and the explanation as context.
  const seed = useMemo<ChatMessage[]>(
    () => [
      { role: "user", content: `My situation: ${facts.summary}` },
      { role: "assistant", content: analysis.text },
    ],
    [facts.summary, analysis.text],
  );
  const chat = useLegalChat(seed);

  const docText = useMemo(() => {
    if (docView === "brief")
      return buildLawyerBrief(facts, analysis.sources, narrative, facts.language);
    if (docView === "fir") return buildFirApplication(facts, narrative, facts.language);
    return "";
  }, [docView, facts, analysis.sources, narrative]);

  const buttonClass =
    "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition";

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEdit} className={buttonClass}>
          <Pencil className="h-4 w-4" />
          {t("Edit description", "بیان میں ترمیم")}
        </button>
        <button type="button" onClick={onNew} className={buttonClass}>
          <RotateCcw className="h-4 w-4" />
          {t("New situation", "نئی صورتحال")}
        </button>
      </div>

      {facts.urgent && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p dir="auto">
            <strong>{t("Urgent: ", "فوری: ")}</strong>
            {facts.urgentReason}
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* What we understood */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h2 className={`flex items-center gap-2 font-display text-lg font-semibold ${ur}`}>
            <ClipboardList className="h-5 w-5 text-primary" />
            {t("What we understood", "ہم نے کیا سمجھا")}
          </h2>
          <div dir="auto" className="doc-result mt-3 space-y-3 text-sm">
            <p>{facts.summary}</p>
            {facts.timeline.length > 0 && (
              <ol className="space-y-1 ps-5 list-decimal">
                {facts.timeline.map((e, i) => (
                  <li key={i} dir="auto">
                    {e.when && <strong>{e.when}: </strong>}
                    {e.what}
                  </li>
                ))}
              </ol>
            )}
            <FactList
              title={t("People", "افراد")}
              items={facts.people.map((p) => `${p.role}: ${p.description}`)}
            />
            <FactList
              title={t("Location", "مقام")}
              items={facts.location ? [facts.location] : []}
            />
            <FactList title={t("Losses", "نقصان")} items={facts.losses} />
            <FactList title={t("Evidence you have", "آپ کے پاس ثبوت")} items={facts.evidence} />
          </div>

          {facts.missingInfo.length > 0 && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className={`flex items-center gap-1.5 font-semibold text-amber-900 ${ur}`}>
                <HelpCircle className="h-4 w-4" />
                {t("A lawyer will also ask", "وکیل یہ بھی پوچھے گا")}
              </p>
              <ul dir="auto" className="doc-result mt-1 ps-5 list-disc text-amber-900">
                {facts.missingInfo.map((q, i) => (
                  <li key={i} dir="auto">
                    {q}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onEdit}
                className="mt-2 text-xs font-medium text-amber-900 underline"
              >
                {t("Add these details to your description", "یہ تفصیلات اپنے بیان میں شامل کریں")}
              </button>
            </div>
          )}
        </section>

        {/* Explanation grounded in the law */}
        <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
          <h2 className={`flex items-center gap-2 font-display text-lg font-semibold mb-2 ${ur}`}>
            <Scale className="h-5 w-5 text-primary" />
            {t("Your legal position", "آپ کی قانونی پوزیشن")}
          </h2>
          <MarkdownResult text={analysis.text} />
          <LegalSources {...analysis} />
        </section>
      </div>

      {/* Documents built from the facts (not by the AI) */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
        <h2 className={`flex items-center gap-2 font-display text-lg font-semibold ${ur}`}>
          <FileSignature className="h-5 w-5 text-primary" />
          {t("Take this with you", "یہ ساتھ لے جائیں")}
        </h2>
        <p className={`mt-1 text-sm text-muted-foreground ${ur}`}>
          {t(
            "Built directly from your own description, so nothing is added that you did not say.",
            "براہ راست آپ کے اپنے بیان سے تیار کردہ، اس لیے اس میں ایسی کوئی بات شامل نہیں جو آپ نے نہیں کہی۔",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDocView(docView === "brief" ? null : "brief")}
            className={buttonClass}
          >
            {t("Case summary for your lawyer", "وکیل کے لیے مقدمے کا خلاصہ")}
          </button>
          {facts.possibleCrime && (
            <button
              type="button"
              onClick={() => setDocView(docView === "fir" ? null : "fir")}
              className={buttonClass}
            >
              {t("Application to the SHO for an FIR", "ایس ایچ او کو ایف آئی آر کی درخواست")}
            </button>
          )}
        </div>
        {docView && (
          <div className="mt-5">
            <DocumentResult
              text={docText}
              heading={
                docView === "brief"
                  ? t("Case summary for your lawyer", "وکیل کے لیے مقدمے کا خلاصہ")
                  : t("Application to the SHO", "ایس ایچ او کو درخواست")
              }
              printTitle={docView === "brief" ? "Case Summary" : "FIR Application"}
              resetLabel={t("Close", "بند کریں")}
              onReset={() => setDocView(null)}
              disclaimer={
                docView === "brief"
                  ? t(
                      "The provisions listed are search results for your lawyer to confirm.",
                      "درج دفعات تلاش کے نتائج ہیں جن کی تصدیق آپ کا وکیل کرے گا۔",
                    )
                  : t(
                      "The police record the FIR itself under Section 154 CrPC. Fill in the blanks, sign, and keep a copy with the receiving stamp.",
                      "ایف آئی آر پولیس دفعہ 154 ضابطہ فوجداری کے تحت خود درج کرتی ہے۔ خالی جگہیں پُر کریں، دستخط کریں اور وصولی کی مہر کے ساتھ ایک نقل اپنے پاس رکھیں۔",
                    )
              }
            />
          </div>
        )}
      </section>

      {/* Follow-up questions */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
        <h2 className={`flex items-center gap-2 font-display text-lg font-semibold mb-3 ${ur}`}>
          <MessageSquare className="h-5 w-5 text-primary" />
          {t("Ask a follow-up question", "مزید سوال پوچھیں")}
        </h2>
        <ChatThread
          chat={chat}
          placeholder={t(
            "e.g. What if the police still refuse?",
            "مثلاً: اگر پولیس پھر بھی انکار کرے تو کیا کروں؟",
          )}
        />
      </section>

      <p className={`text-xs text-muted-foreground ${ur}`}>
        ⚠️{" "}
        {t(
          "PakLegal AI gives legal information from the official text of Pakistani laws, not legal advice. Consult a qualified lawyer for your case.",
          "پاک لیگل اے آئی پاکستانی قوانین کے سرکاری متن سے قانونی معلومات دیتا ہے، قانونی مشورہ نہیں۔ اپنے مقدمے کے لیے مستند وکیل سے رجوع کریں۔",
        )}
      </p>
    </div>
  );
}

function FactList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="font-semibold text-foreground">{title}</p>
      <ul className="ps-5 list-disc">
        {items.map((item, i) => (
          <li key={i} dir="auto">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

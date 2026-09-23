import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
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
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { MarkdownResult } from "@/components/MarkdownResult";
import { LegalSources } from "@/components/LegalSources";
import { DocumentResult } from "@/components/DocumentResult";
import { ChatThread } from "@/components/ChatThread";
import { FactsEditor } from "@/components/FactsEditor";
import { EditableDraft } from "@/components/EditableDraft";
import { useLang } from "@/lib/i18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useLegalChat } from "@/hooks/useLegalChat";
import {
  analyzeSituation,
  type ChatMessage,
  type SituationAnalysis,
  type SituationFacts,
} from "@/lib/ai-functions";
import { buildComplaintDraft, buildLawyerBrief } from "@/lib/case-summary";

export const Route = createFileRoute("/incident")({
  component: Page,
  head: () => ({ meta: [{ title: "Describe Your Incident | PakLegal AI" }] }),
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

type Saved = {
  narrative: string;
  analysis: SituationAnalysis;
  // Facts as corrected by the person; documents are built from these.
  reviewedFacts?: SituationFacts;
  // The person's own edits to the complaint draft.
  draftEdits?: string | null;
};
type DocView = "complaint" | "brief" | null;

function Page() {
  const { t, lang } = useLang();
  const [narrative, setNarrative] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [speaking, setSpeaking] = useState<"ur" | "en">(lang);
  const [saved, setSaved] = useLocalStorage<Saved | null>("incident-analysis", null);
  const recorder = useVoiceRecorder((text) =>
    setNarrative((prev) => (prev ? `${prev} ${text}` : text).slice(0, MAX_CHARS)),
  );
  const ur = lang === "ur" ? "urdu" : "";

  const analyze = useCallback(async () => {
    setIsLoading(true);
    try {
      const analysis = await analyzeSituation({ data: { narrative } });
      setSaved({ narrative, analysis });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
    } finally {
      setIsLoading(false);
    }
  }, [narrative, setSaved, t]);

  const header = (
    <PageHeader
      titleEn="Describe Your Incident"
      titleUr="اپنا واقعہ بیان کریں"
      descEn="Prepare before you go to the police station or a lawyer. Speak or type what happened, in Urdu or English. We structure it, explain the law that applies, and help you prepare a clear written complaint."
      descUr="تھانے یا وکیل کے پاس جانے سے پہلے تیاری کریں۔ جو ہوا اردو یا انگریزی میں بولیں یا لکھیں۔ ہم اسے ترتیب دیں گے، متعلقہ قانون سمجھائیں گے، اور ایک واضح تحریری درخواست تیار کرنے میں مدد کریں گے۔"
    />
  );

  if (saved) {
    return (
      <PageShell>
        {header}
        <Result
          saved={saved}
          onChange={setSaved}
          onEditDescription={() => {
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
  const busy = isLoading || recorder.status !== "idle";
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <PageShell>
      {header}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-[var(--shadow-soft)]">
          {/* Speak */}
          <div className="rounded-xl bg-muted/50 p-4">
            <p className={`text-sm font-semibold ${ur}`}>{t("Speak it", "بول کر بتائیں")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div
                className="inline-flex rounded-md border border-border bg-background p-0.5 text-sm"
                role="group"
                aria-label={t("Language you will speak", "بولنے کی زبان")}
              >
                {(["ur", "en"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    disabled={recorder.status !== "idle"}
                    onClick={() => setSpeaking(l)}
                    aria-pressed={speaking === l}
                    className={`rounded px-3 py-1 ${speaking === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {l === "ur" ? "اردو" : "English"}
                  </button>
                ))}
              </div>
              {recorder.status === "recording" ? (
                <button
                  type="button"
                  onClick={recorder.stop}
                  className="inline-flex items-center gap-2 rounded-md border border-red-400 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
                >
                  <Square className="h-4 w-4 fill-current" />
                  {t("Stop", "روکیں")} ({mmss(recorder.seconds)} / {mmss(recorder.maxSeconds)})
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => recorder.start(speaking)}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {recorder.status === "transcribing" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <Mic className="h-4 w-4 text-primary" />
                  )}
                  {recorder.status === "transcribing"
                    ? t("Transcribing…", "تحریر میں بدلا جا رہا ہے…")
                    : t("Start recording", "ریکارڈنگ شروع کریں")}
                </button>
              )}
            </div>
            <p className={`mt-2 text-xs text-muted-foreground ${ur}`}>
              {t(
                "Your recording is turned into text below. Check names, places, dates and amounts before you continue.",
                "آپ کی ریکارڈنگ نیچے تحریر میں آ جائے گی۔ آگے بڑھنے سے پہلے نام، جگہیں، تاریخیں اور رقم ضرور چیک کریں۔",
              )}
            </p>
          </div>

          {/* Type / review */}
          <label htmlFor="narrative" className={`mt-5 block text-sm font-semibold mb-2 ${ur}`}>
            {t(
              "What happened? (type, or review your recording)",
              "کیا ہوا؟ (لکھیں، یا اپنی ریکارڈنگ چیک کریں)",
            )}
          </label>
          <textarea
            id="narrative"
            dir="auto"
            rows={9}
            maxLength={MAX_CHARS}
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            placeholder={t(
              "Write it the way you would tell the police or a lawyer: what happened, when and where, who was involved, what you lost, and anything you have already done.",
              "ایسے لکھیں جیسے پولیس یا وکیل کو بتاتے: کیا ہوا، کب اور کہاں، کون شامل تھا، کیا نقصان ہوا، اور آپ اب تک کیا کر چکے ہیں۔",
            )}
            className="w-full rounded-lg border border-input bg-background p-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
          />
          <div className="mt-1 flex justify-between gap-3 text-xs text-muted-foreground">
            <span className={ur}>
              {t("Urdu, Roman Urdu or English", "اردو، رومن اردو یا انگریزی")}
            </span>
            <span>
              {narrative.length} / {MAX_CHARS}
            </span>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={analyze}
              disabled={tooShort || busy}
              className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isLoading
                ? t("Analysing…", "تجزیہ ہو رہا ہے…")
                : t("Analyse my incident", "میرے واقعے کا تجزیہ کریں")}
            </button>
          </div>
          {isLoading && (
            <p className={`mt-4 text-sm text-muted-foreground ${ur}`}>
              {t(
                "Structuring your description, finding the law that applies, and writing the explanation. This takes about 10 seconds.",
                "آپ کا بیان ترتیب دیا جا رہا ہے، متعلقہ قانون تلاش ہو رہا ہے اور وضاحت لکھی جا رہی ہے۔ تقریباً 10 سیکنڈ لگیں گے۔",
              )}
            </p>
          )}
        </div>

        <div className="mt-6">
          <p
            className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 ${ur ? "urdu normal-case" : ""}`}
          >
            {t("Or try an example", "یا کوئی مثال آزمائیں")}
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.en}
                type="button"
                onClick={() => setNarrative(ex.text)}
                className={`rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-primary/50 hover:bg-primary/5 transition ${ur}`}
              >
                {t(ex.en, ex.ur)}
              </button>
            ))}
          </div>
        </div>

        <p className={`mt-8 text-xs text-muted-foreground ${ur}`}>
          {t(
            "Your description and recording are sent to the AI service to be processed and are not stored on our servers. Results are saved only in this browser.",
            "آپ کا بیان اور ریکارڈنگ پروسیسنگ کے لیے اے آئی سروس کو بھیجے جاتے ہیں اور ہمارے سرور پر محفوظ نہیں ہوتے۔ نتائج صرف اسی براؤزر میں محفوظ ہوتے ہیں۔",
          )}
        </p>
      </div>
    </PageShell>
  );
}

function Result({
  saved,
  onChange,
  onEditDescription,
  onNew,
}: {
  saved: Saved;
  onChange: (s: Saved) => void;
  onEditDescription: () => void;
  onNew: () => void;
}) {
  const { t, lang } = useLang();
  const { narrative, analysis } = saved;
  const facts = saved.reviewedFacts ?? analysis.facts;
  const [editingFacts, setEditingFacts] = useState(false);
  const [docView, setDocView] = useState<DocView>(null);
  const ur = lang === "ur" ? "urdu" : "";

  // Follow-up questions carry the incident and the explanation as context.
  const seed = useMemo<ChatMessage[]>(
    () => [
      { role: "user", content: `My incident: ${facts.summary}` },
      { role: "assistant", content: analysis.text },
    ],
    [facts.summary, analysis.text],
  );
  const chat = useLegalChat(seed);

  const complaint = useMemo(() => buildComplaintDraft(facts, facts.language), [facts]);
  const brief = useMemo(
    () => buildLawyerBrief(facts, analysis.sources, narrative, facts.language),
    [facts, analysis.sources, narrative],
  );

  const buttonClass =
    "inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition";
  const tabClass = (active: boolean) =>
    `${buttonClass} ${active ? "border-primary bg-primary/10 text-primary" : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16 space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEditDescription} className={buttonClass}>
          <Pencil className="h-4 w-4" />
          {t("Change my description", "بیان تبدیل کریں")}
        </button>
        <button type="button" onClick={onNew} className={buttonClass}>
          <RotateCcw className="h-4 w-4" />
          {t("New incident", "نیا واقعہ")}
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
        {/* Step 1: what we understood, reviewed by the person */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className={`flex items-center gap-2 font-display text-lg font-semibold ${ur}`}>
              <ClipboardList className="h-5 w-5 text-primary" />
              {t("What we understood", "ہم نے کیا سمجھا")}
            </h2>
            {!editingFacts && (
              <button
                type="button"
                onClick={() => setEditingFacts(true)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t("Review and correct", "جائزہ اور درستی")}
              </button>
            )}
          </div>

          {saved.reviewedFacts && !editingFacts && (
            <p className={`mt-2 flex items-start gap-1.5 text-xs text-green-700 ${ur}`}>
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {t(
                "Corrected by you. Your documents use these facts; the explanation is based on your original description.",
                "آپ نے درست کیا۔ آپ کی دستاویزات انہی حقائق پر مبنی ہیں؛ وضاحت آپ کے اصل بیان پر مبنی ہے۔",
              )}
            </p>
          )}

          {editingFacts ? (
            <FactsEditor
              facts={facts}
              onCancel={() => setEditingFacts(false)}
              onSave={(reviewed) => {
                onChange({ ...saved, reviewedFacts: reviewed, draftEdits: null });
                setEditingFacts(false);
                toast.success(t("Facts saved.", "حقائق محفوظ ہو گئے۔"));
              }}
            />
          ) : (
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
              <FactList
                title={t("Witnesses and evidence", "گواہ اور ثبوت")}
                items={facts.evidence}
              />
            </div>
          )}

          {facts.missingInfo.length > 0 && !editingFacts && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
              <p className={`flex items-center gap-1.5 font-semibold text-amber-900 ${ur}`}>
                <HelpCircle className="h-4 w-4" />
                {t("The police or a lawyer will also ask", "پولیس یا وکیل یہ بھی پوچھیں گے")}
              </p>
              <ul dir="auto" className="doc-result mt-1 ps-5 list-disc text-amber-900">
                {facts.missingInfo.map((q, i) => (
                  <li key={i} dir="auto">
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Step 2: the law, grounded in retrieved provisions */}
        <section className="lg:col-span-3 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
          <h2 className={`flex items-center gap-2 font-display text-lg font-semibold mb-2 ${ur}`}>
            <Scale className="h-5 w-5 text-primary" />
            {t("The law that may apply", "متعلقہ قانون")}
          </h2>
          <MarkdownResult text={analysis.text} />
          <LegalSources {...analysis} />
        </section>
      </div>

      {/* Step 3: documents built by code from the reviewed facts */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-soft)]">
        <h2 className={`flex items-center gap-2 font-display text-lg font-semibold ${ur}`}>
          <FileSignature className="h-5 w-5 text-primary" />
          {t("Prepare your documents", "اپنی دستاویزات تیار کریں")}
        </h2>
        <p className={`mt-1 text-sm text-muted-foreground ${ur}`}>
          {t(
            "Built from the facts above, so they contain only what you said. Review the facts first, then edit the draft as needed.",
            "اوپر دیے گئے حقائق سے تیار کردہ، اس لیے ان میں صرف وہی ہے جو آپ نے کہا۔ پہلے حقائق کا جائزہ لیں، پھر ضرورت کے مطابق مسودے میں ترمیم کریں۔",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {facts.possibleCrime && (
            <button
              type="button"
              onClick={() => setDocView(docView === "complaint" ? null : "complaint")}
              className={tabClass(docView === "complaint")}
            >
              {t("Draft complaint for FIR registration", "اندراجِ مقدمہ کی درخواست کا مسودہ")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDocView(docView === "brief" ? null : "brief")}
            className={tabClass(docView === "brief")}
          >
            {t("Case summary for your lawyer", "وکیل کے لیے مقدمے کا خلاصہ")}
          </button>
        </div>

        {docView === "complaint" && (
          <div className="mt-5">
            <EditableDraft
              generated={complaint}
              value={saved.draftEdits ?? null}
              onChange={(text) => onChange({ ...saved, draftEdits: text })}
              printTitle="Draft complaint for FIR registration"
              note={t(
                "A draft you prepare yourself, not an FIR. The police record the FIR under Section 154 CrPC and decide which offences apply, so this draft names no PPC sections. Fill in the blanks, check every detail, sign it, and keep a stamped copy.",
                "یہ آپ کا اپنا تیار کردہ مسودہ ہے، ایف آئی آر نہیں۔ ایف آئی آر پولیس دفعہ 154 ضابطہ فوجداری کے تحت درج کرتی ہے اور جرم کی دفعات کا فیصلہ بھی وہی کرتی ہے، اس لیے اس مسودے میں تعزیرات کی کوئی دفعہ نہیں۔ خالی جگہیں پُر کریں، ہر تفصیل چیک کریں، دستخط کریں اور مہر شدہ نقل اپنے پاس رکھیں۔",
              )}
            />
          </div>
        )}
        {docView === "brief" && (
          <div className="mt-5">
            <DocumentResult
              text={brief}
              heading={t("Case summary for your lawyer", "وکیل کے لیے مقدمے کا خلاصہ")}
              printTitle="Case Summary"
              resetLabel={t("Close", "بند کریں")}
              onReset={() => setDocView(null)}
              disclaimer={t(
                "The provisions listed are search results for your lawyer to confirm.",
                "درج دفعات تلاش کے نتائج ہیں جن کی تصدیق آپ کا وکیل کرے گا۔",
              )}
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
          "PakLegal AI gives legal information from the official text of Pakistani laws, not legal advice. It does not file anything. Consult a qualified lawyer for your case.",
          "پاک لیگل اے آئی پاکستانی قوانین کے سرکاری متن سے قانونی معلومات دیتا ہے، قانونی مشورہ نہیں۔ یہ کچھ بھی درج یا جمع نہیں کرتا۔ اپنے مقدمے کے لیے مستند وکیل سے رجوع کریں۔",
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

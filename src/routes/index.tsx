import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  MessageSquareText,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  ListChecks,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useLang } from "@/lib/i18n";
import stats from "@/lib/rag/stats.json";
import hero from "@/assets/hero-justice.jpg";

export const Route = createFileRoute("/")({ component: Index });

// Real numbers from the knowledge base (written by scripts/rag/build-knowledge.mjs).
const PROVISION_COUNT = stats.provisions;

function Index() {
  const { t, lang } = useLang();
  const ur = lang === "ur" ? "urdu" : "";

  const problems = [
    {
      to: "/incident" as const,
      icon: MessageSquareText,
      problemEn:
        "When you report an incident at a police station or to a lawyer, you explain it out loud while someone writes it down. Under stress, details get missed and you don't know which laws or rights apply.",
      problemUr:
        "تھانے یا وکیل کے پاس آپ واقعہ زبانی بتاتے ہیں اور کوئی اور لکھتا ہے۔ پریشانی میں تفصیلات رہ جاتی ہیں اور آپ کو معلوم نہیں ہوتا کہ کون سے قوانین اور حقوق لاگو ہوتے ہیں۔",
      titleEn: "Describe Your Incident",
      titleUr: "اپنا واقعہ بیان کریں",
      solutionEn:
        "Speak or type what happened, in Urdu or English, before you go. PakLegal AI structures it into clear facts for you to check, explains the provisions that may apply, and helps you prepare a written complaint and a summary for your lawyer.",
      solutionUr:
        "جانے سے پہلے جو ہوا اردو یا انگریزی میں بولیں یا لکھیں۔ پاک لیگل اے آئی اسے واضح حقائق میں ترتیب دیتا ہے جنہیں آپ چیک کر سکیں، متعلقہ دفعات سمجھاتا ہے، اور تحریری درخواست اور وکیل کے لیے خلاصہ تیار کرنے میں مدد کرتا ہے۔",
    },
    {
      to: "/translator" as const,
      icon: FileText,
      problemEn:
        "You pay a lawyer just to find out what a legal notice, summons or court order actually says.",
      problemUr:
        "صرف یہ جاننے کے لیے کہ قانونی نوٹس، سمن یا عدالتی حکم میں کیا لکھا ہے، آپ کو وکیل کو فیس دینی پڑتی ہے۔",
      titleEn: "Document Explainer",
      titleUr: "دستاویز کی وضاحت",
      solutionEn:
        "Upload a PDF or a photo. Get a plain Urdu or English summary, the deadlines, what you must do, and the laws the document mentions explained from their official text.",
      solutionUr:
        "پی ڈی ایف یا تصویر اپ لوڈ کریں۔ سادہ اردو یا انگریزی خلاصہ، مہلتیں، آپ کی ذمہ داریاں، اور دستاویز میں مذکور قوانین کی سرکاری متن سے وضاحت حاصل کریں۔",
    },
  ];

  const steps = [
    {
      icon: Mic,
      en: "Describe",
      ur: "بتائیں",
      descEn:
        "Speak or type in Urdu or English (speech is transcribed with Whisper), or upload a document.",
      descUr: "اردو یا انگریزی میں لکھیں یا بولیں، یا دستاویز اپ لوڈ کریں۔",
    },
    {
      icon: ListChecks,
      en: "Understand",
      ur: "سمجھنا",
      descEn:
        "The AI turns it into structured facts (events, people, losses, evidence, what is missing) that you review and correct.",
      descUr: "اے آئی اسے منظم حقائق میں بدلتا ہے: واقعات، افراد، نقصانات، ثبوت، اور کیا باقی ہے۔",
    },
    {
      icon: Search,
      en: "Find the law",
      ur: "قانون تلاش",
      descEn: `The relevant provisions are retrieved from ${PROVISION_COUNT.toLocaleString()} Articles and Sections of official Pakistani law.`,
      descUr: `پاکستانی قانون کی ${PROVISION_COUNT.toLocaleString()} سرکاری دفعات میں سے متعلقہ دفعات تلاش کی جاتی ہیں۔`,
    },
    {
      icon: BookOpenCheck,
      en: "Explain with sources",
      ur: "حوالوں کے ساتھ وضاحت",
      descEn: "A plain answer that cites the law it used, with any unverified citation flagged.",
      descUr:
        "سادہ جواب جو استعمال شدہ قانون کا حوالہ دیتا ہے، اور غیر تصدیق شدہ حوالے کی نشاندہی کرتا ہے۔",
    },
  ];

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-16 lg:pt-24 lg:pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t(
                "Free • Urdu + English • Grounded in official Pakistani law",
                "مفت • اردو اور انگریزی • سرکاری پاکستانی قانون پر مبنی",
              )}
            </div>
            <h1
              className={`mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight ${ur}`}
            >
              {t(
                "Understand your legal situation before you see a lawyer.",
                "وکیل کے پاس جانے سے پہلے اپنی قانونی صورتحال سمجھیں۔",
              )}
            </h1>
            <p className={`mt-6 max-w-xl text-lg text-muted-foreground ${ur}`}>
              {t(
                "Tell PakLegal AI what happened, or show it a document you received. It explains the law that applies in plain language, and shows you exactly where each answer comes from.",
                "پاک لیگل اے آئی کو بتائیں کیا ہوا، یا ملنے والی دستاویز دکھائیں۔ یہ متعلقہ قانون سادہ زبان میں سمجھاتا ہے اور بتاتا ہے کہ ہر جواب کس قانون سے لیا گیا ہے۔",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/incident"
                className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:opacity-95 transition"
              >
                {t("Describe your incident", "اپنا واقعہ بیان کریں")}{" "}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link
                to="/translator"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted transition"
              >
                {t("Explain a document", "دستاویز سمجھیں")}
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-[var(--shadow-elevated)]">
              <img
                src={hero}
                alt="Justice and Pakistani legal heritage"
                width={1536}
                height={1024}
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMS -> SOLUTIONS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">
          {t("Two everyday problems", "دو روزمرہ مسائل")}
        </p>
        <h2 className={`mt-2 font-display text-3xl sm:text-4xl font-semibold ${ur}`}>
          {t("What it solves", "یہ کیا حل کرتا ہے")}
        </h2>
        <div className="mt-8 grid lg:grid-cols-2 gap-5">
          {problems.map((p) => {
            const Icon = p.icon;
            return (
              <Link
                key={p.to}
                to={p.to}
                className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] transition-all"
              >
                <div className="bg-muted/60 px-6 py-4 border-b border-border">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide text-muted-foreground ${ur ? "urdu normal-case" : ""}`}
                  >
                    {t("The problem", "مسئلہ")}
                  </p>
                  <p className={`mt-1 text-sm text-foreground ${ur}`}>
                    {t(p.problemEn, p.problemUr)}
                  </p>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className={`font-display text-xl font-semibold ${ur}`}>
                      {t(p.titleEn, p.titleUr)}
                    </h3>
                    <ArrowRight className="ms-auto h-4 w-4 text-muted-foreground group-hover:text-primary rtl:rotate-180 transition" />
                  </div>
                  <p className={`mt-3 text-sm text-muted-foreground leading-relaxed ${ur}`}>
                    {t(p.solutionEn, p.solutionUr)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        <Link
          to="/law"
          className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 hover:border-primary/40 transition group"
        >
          <Search className="h-5 w-5 text-primary shrink-0" />
          <p className={`text-sm ${ur}`}>
            <span className="font-semibold">{t("Search the Law: ", "قانون تلاش کریں: ")}</span>
            <span className="text-muted-foreground">
              {t(
                "look up what the Constitution, PPC, CrPC or PECA actually says, by meaning, in Urdu or English.",
                "آئین، تعزیرات، ضابطہ فوجداری یا پیکا میں اصل میں کیا لکھا ہے، اردو یا انگریزی میں تلاش کریں۔",
              )}
            </span>
          </p>
          <ArrowRight className="ms-auto h-4 w-4 text-muted-foreground group-hover:text-primary rtl:rotate-180 transition shrink-0" />
        </Link>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <h2 className={`font-display text-3xl font-semibold ${ur}`}>
          {t("How it works", "یہ کیسے کام کرتا ہے")}
        </h2>
        <ol className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={s.en} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 text-primary">
                  <span className="text-xs font-semibold">{i + 1}</span>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className={`mt-3 font-semibold ${ur}`}>{t(s.en, s.ur)}</h3>
                <p className={`mt-1 text-sm text-muted-foreground leading-relaxed ${ur}`}>
                  {t(s.descEn, s.descUr)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* WHAT IT IS BASED ON */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-border bg-[image:var(--gradient-primary)] text-primary-foreground p-8 sm:p-10 grid sm:grid-cols-3 gap-6">
          <div>
            <p className="font-display text-4xl font-semibold">{stats.laws}</p>
            <p className={`mt-1 text-sm opacity-90 ${ur}`}>
              {t(
                "Official Pakistani laws, from Pakistan Code",
                "پاکستان کوڈ سے سرکاری پاکستانی قوانین",
              )}
            </p>
          </div>
          <div>
            <p className="font-display text-4xl font-semibold">
              {PROVISION_COUNT.toLocaleString()}
            </p>
            <p className={`mt-1 text-sm opacity-90 ${ur}`}>
              {t("Articles and Sections searchable", "قابلِ تلاش دفعات")}
            </p>
          </div>
          <div>
            <ShieldCheck className="h-9 w-9" />
            <p className={`mt-1 text-sm opacity-90 ${ur}`}>
              {t(
                "Every answer shows its sources; citations not found in them are flagged",
                "ہر جواب اپنے حوالے دکھاتا ہے، اور غیر مصدقہ حوالوں کی نشاندہی ہوتی ہے",
              )}
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

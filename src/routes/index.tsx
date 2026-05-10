import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ScrollText, ShieldCheck, Gavel, ArrowRight, Sparkles, Scale, AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useLang } from "@/lib/i18n";
import hero from "@/assets/hero-justice.jpg";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const { t, lang } = useLang();

  const features = [
    {
      to: "/translator", icon: FileText,
      en: { title: "Court Order Translator", desc: "Upload any FIR, summons, or court order. Get a plain-language summary in Urdu and English." },
      ur: { title: "عدالتی حکم کا ترجمہ", desc: "کوئی بھی ایف آئی آر، سمن یا عدالتی حکم اپ لوڈ کریں۔ آسان زبان میں اردو اور انگریزی خلاصہ حاصل کریں۔" },
    },
    {
      to: "/fir", icon: ScrollText,
      en: { title: "FIR Drafting Assistant", desc: "Describe what happened. We draft a correctly formatted FIR citing PPC and CrPC sections." },
      ur: { title: "ایف آئی آر کا مسودہ", desc: "اپنا واقعہ بتائیں۔ ہم درست فارمیٹ میں ایف آئی آر تیار کرتے ہیں۔" },
    },
    {
      to: "/bail", icon: Scale,
      en: { title: "Bail Application", desc: "Generate a complete bail application with legal grounds and relevant case law citations." },
      ur: { title: "ضمانت کی درخواست", desc: "قانونی بنیادوں اور متعلقہ مقدمات کے ساتھ مکمل ضمانت کی درخواست تیار کریں۔" },
    },
    {
      to: "/notice", icon: Gavel,
      en: { title: "Legal Notice Generator", desc: "Generate formal notices: rent recovery, wrongful termination, bounced cheques and more." },
      ur: { title: "قانونی نوٹس", desc: "کرایہ، ملازمت، بائونس چیک اور مزید کے لیے باقاعدہ نوٹس تیار کریں۔" },
    },
    {
      to: "/complaint", icon: AlertTriangle,
      en: { title: "Consumer Complaint", desc: "File complaints against utilities, banks, telecom companies, and government departments." },
      ur: { title: "صارفین کی شکایت", desc: "یوٹیلیٹی، بینک، ٹیلی کام کمپنیوں اور سرکاری محکموں کے خلاف شکایات درج کریں۔" },
    },
    {
      to: "/rights", icon: ShieldCheck,
      en: { title: "Know Your Rights", desc: "Your rights under the Constitution of Pakistan 1973 — searchable, in plain language." },
      ur: { title: "اپنے حقوق جانیں", desc: "آئین پاکستان ١٩٧٣ کے تحت آپ کے حقوق، آسان زبان میں۔" },
    },
  ];

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t("AI-powered • Free • Urdu + English", "اے آئی • مفت • اردو اور انگریزی")}
            </div>
            <h1 className={`mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight ${lang === "ur" ? "urdu" : ""}`}>
              {t("The law belongs to everyone — not just those who can afford it.", "قانون سب کا حق ہے، صرف امیروں کا نہیں۔")}
            </h1>
            <p className={`mt-6 max-w-xl text-lg text-muted-foreground ${lang === "ur" ? "urdu" : ""}`}>
              {t(
                "PakLegal AI helps Pakistani citizens understand court documents, file FIRs, and exercise their constitutional rights — for free, in their own language.",
                "پاک لیگل اے آئی پاکستانی شہریوں کو عدالتی دستاویزات سمجھنے، ایف آئی آر درج کرنے، اور آئینی حقوق استعمال کرنے میں مدد دیتا ہے — مفت، آپ کی اپنی زبان میں۔"
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/chat" className="inline-flex items-center gap-2 rounded-md bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-elevated)] hover:opacity-95 transition">
                {t("Ask a Legal Question", "قانونی سوال پوچھیں")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </Link>
              <Link to="/rights" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-semibold hover:bg-muted transition">
                {t("Know Your Rights", "اپنے حقوق جانیں")}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-[var(--shadow-elevated)]">
              <img src={hero} alt="Justice and Pakistani legal heritage" width={1536} height={1024} className="w-full h-auto" />
              <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">{t("What we offer", "ہماری خدمات")}</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold">{t("Six tools. One purpose.", "چھ اوزار، ایک مقصد")}</h2>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = f.icon;
            const c = lang === "ur" ? f.ur : f.en;
            return (
              <Link key={f.to} to={f.to}
                className="group relative rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] transition-all">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className={`font-display text-xl font-semibold ${lang === "ur" ? "urdu" : ""}`}>{c.title}</h3>
                    <p className={`mt-2 text-sm text-muted-foreground leading-relaxed ${lang === "ur" ? "urdu" : ""}`}>{c.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition-all flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TRUST BAND */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <div className="rounded-2xl border border-border bg-[image:var(--gradient-primary)] text-primary-foreground p-8 sm:p-10 grid sm:grid-cols-3 gap-6">
          {[
            { n: "100%", en: "Free, forever", ur: "ہمیشہ مفت" },
            { n: "6", en: "Legal tools available", ur: "قانونی اوزار" },
            { n: "1973", en: "Constitutional rights coverage", ur: "آئینی حقوق" },
          ].map((s) => (
            <div key={s.n}>
              <p className="font-display text-4xl font-semibold">{s.n}</p>
              <p className={`mt-1 text-sm opacity-90 ${lang === "ur" ? "urdu" : ""}`}>{t(s.en, s.ur)}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

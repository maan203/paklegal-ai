// Documents built from the extracted facts and retrieved sources by plain code, not by the AI,
// so they can only contain what the person said and provisions that really exist.

import type { SituationFacts } from "@/lib/ai-functions";
import type { LegalSource } from "@/lib/rag/retrieve";

type Lang = "en" | "ur";

const LABELS = {
  en: {
    briefTitle: "Case summary for your lawyer",
    prepared: "Prepared on",
    note: "Prepared by the client with PakLegal AI from their own description. The legal provisions are search results for the lawyer to confirm, not legal advice.",
    summary: "Summary",
    timeline: "What happened, in order",
    people: "People involved",
    location: "Location",
    losses: "Losses and injuries",
    evidence: "Evidence the client has",
    provisions: "Possibly relevant provisions (to be confirmed by the lawyer)",
    questions: "Details still missing",
    account: "The client's own account",
    notStated: "Not stated",
    urgent: "Urgent",
  },
  ur: {
    briefTitle: "وکیل کے لیے مقدمے کا خلاصہ",
    prepared: "تیاری کی تاریخ",
    note: "یہ خلاصہ موکل نے اپنے بیان سے پاک لیگل اے آئی کی مدد سے تیار کیا ہے۔ قانونی دفعات تلاش کے نتائج ہیں جن کی تصدیق وکیل کرے گا، یہ قانونی مشورہ نہیں۔",
    summary: "خلاصہ",
    timeline: "واقعات ترتیب وار",
    people: "متعلقہ افراد",
    location: "مقام",
    losses: "نقصانات اور چوٹیں",
    evidence: "موکل کے پاس موجود ثبوت",
    provisions: "ممکنہ متعلقہ دفعات (وکیل تصدیق کرے)",
    questions: "جو تفصیلات ابھی باقی ہیں",
    account: "موکل کا اپنا بیان",
    notStated: "بیان نہیں کیا گیا",
    urgent: "فوری",
  },
} as const;

function list(items: string[], empty: string): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : `- ${empty}`;
}

function provisionLabel(s: LegalSource): string {
  return `${s.unit} ${s.displayNumber}, ${s.lawName}: ${s.title}`;
}

function uniqueProvisions(sources: LegalSource[]): LegalSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = `${s.law}:${s.number}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function today(lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "ur" ? "ur-PK" : "en-GB", { dateStyle: "long" }).format(
    new Date(),
  );
}

export function buildLawyerBrief(
  facts: SituationFacts,
  sources: LegalSource[],
  narrative: string,
  lang: Lang,
): string {
  const L = LABELS[lang];
  const sections = [
    `# ${L.briefTitle}`,
    `*${L.prepared}: ${today(lang)}*\n\n*${L.note}*`,
    facts.urgent && facts.urgentReason ? `**${L.urgent}:** ${facts.urgentReason}` : "",
    `## ${L.summary}\n${facts.summary}`,
    `## ${L.timeline}\n${
      facts.timeline.length
        ? facts.timeline
            .map((e, i) => `${i + 1}. ${e.when ? `**${e.when}:** ` : ""}${e.what}`)
            .join("\n")
        : `- ${L.notStated}`
    }`,
    `## ${L.people}\n${list(
      facts.people.map((p) => `**${p.role}:** ${p.description}`),
      L.notStated,
    )}`,
    `## ${L.location}\n${facts.location || L.notStated}`,
    `## ${L.losses}\n${list(facts.losses, L.notStated)}`,
    `## ${L.evidence}\n${list(facts.evidence, L.notStated)}`,
    `## ${L.provisions}\n${list(uniqueProvisions(sources).map(provisionLabel), L.notStated)}`,
    `## ${L.questions}\n${list(facts.missingInfo, L.notStated)}`,
    `## ${L.account}\n> ${narrative.trim().replace(/\n+/g, "\n> ")}`,
  ];
  return sections.filter(Boolean).join("\n\n");
}

// A citizen does not write the FIR itself: the police record it under s.154 CrPC. What the citizen
// submits is an application to the SHO, in their own words. Built only for possible crimes.
export function buildFirApplication(facts: SituationFacts, narrative: string, lang: Lang): string {
  const blank = "____________";
  if (lang === "ur") {
    return [
      `بخدمت جناب ایس ایچ او صاحب`,
      `تھانہ ${blank}، ${facts.location || blank}`,
      `**عنوان: درخواست برائے اندراج مقدمہ (دفعہ 154، ضابطہ فوجداری 1898)**`,
      `جناب عالی!`,
      `گزارش ہے کہ سائل/سائلہ ${blank} ولد/بنت ${blank}، شناختی کارڈ نمبر ${blank}، سکنہ ${blank} کا بیان درج ذیل ہے:`,
      narrative.trim(),
      facts.evidence.length ? `**ثبوت:**\n${list(facts.evidence, "")}` : "",
      `لہٰذا استدعا ہے کہ مقدمہ درج کر کے قانونی کارروائی کی جائے۔`,
      `العارض\n\nنام: ${blank}\nشناختی کارڈ نمبر: ${blank}\nفون نمبر: ${blank}\nدستخط: ${blank}\nتاریخ: ${today("ur")}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return [
    `To,\nThe Station House Officer (SHO),\nPolice Station ${blank}, ${facts.location || blank}`,
    `**Subject: Application for registration of FIR (Section 154, Code of Criminal Procedure, 1898)**`,
    `Respected Sir/Madam,`,
    `I, ${blank}, son/daughter of ${blank}, CNIC No. ${blank}, resident of ${blank}, respectfully state as follows:`,
    narrative.trim(),
    facts.evidence.length ? `**Evidence available:**\n${list(facts.evidence, "")}` : "",
    `It is therefore requested that an FIR be registered and legal action be taken according to law.`,
    `Yours faithfully,\n\nName: ${blank}\nCNIC: ${blank}\nPhone: ${blank}\nSignature: ${blank}\nDate: ${today("en")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

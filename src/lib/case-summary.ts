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

// Draft complaint for FIR registration. The police record the FIR itself under s.154 CrPC; this is
// the written complaint the person brings to the SHO, built from the facts they reviewed.
// Deliberately contains no PPC sections: deciding the offence is for the police, and a wrong
// section in a complainant's own statement can hurt their case. Plain text, so it can be edited.
const DRAFT_LABELS = {
  en: {
    to: "To,\nThe Station House Officer (SHO),",
    station: "Police Station",
    subject:
      "Subject: Complaint for registration of FIR (Section 154, Code of Criminal Procedure, 1898)",
    salutation: "Respected Sir/Madam,",
    intro: (b: string) =>
      `I, ${b}, son/daughter of ${b}, CNIC No. ${b}, resident of ${b}, phone ${b}, respectfully state as follows:`,
    events: "What happened:",
    people: "Persons involved:",
    losses: "Loss / injury:",
    evidence: "Witnesses and evidence:",
    request:
      "I request that an FIR be registered and the matter investigated according to law. I will cooperate fully with the investigation.",
    closing: (b: string, date: string) =>
      `Yours faithfully,\n\nName: ${b}\nCNIC: ${b}\nPhone: ${b}\nSignature: ${b}\nDate: ${date}`,
  },
  ur: {
    to: "بخدمت جناب ایس ایچ او صاحب،",
    station: "تھانہ",
    subject: "عنوان: درخواست برائے اندراج مقدمہ (دفعہ 154، ضابطہ فوجداری 1898)",
    salutation: "جناب عالی!",
    intro: (b: string) =>
      `گزارش ہے کہ سائل/سائلہ ${b} ولد/بنت ${b}، شناختی کارڈ نمبر ${b}، سکنہ ${b}، فون ${b} کا بیان درج ذیل ہے:`,
    events: "واقعہ:",
    people: "متعلقہ افراد:",
    losses: "نقصان / چوٹ:",
    evidence: "گواہ اور ثبوت:",
    request:
      "لہٰذا استدعا ہے کہ مقدمہ درج کر کے قانون کے مطابق تفتیش کی جائے۔ میں تفتیش میں مکمل تعاون کروں گا/گی۔",
    closing: (b: string, date: string) =>
      `العارض\n\nنام: ${b}\nشناختی کارڈ نمبر: ${b}\nفون نمبر: ${b}\nدستخط: ${b}\nتاریخ: ${date}`,
  },
} as const;

export function buildComplaintDraft(facts: SituationFacts, lang: Lang): string {
  const L = DRAFT_LABELS[lang];
  const blank = "____________";
  const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");
  const events = facts.timeline.length
    ? facts.timeline.map((e, i) => `${i + 1}. ${e.when ? `${e.when}: ` : ""}${e.what}`).join("\n")
    : facts.summary;
  return [
    `${L.to}\n${L.station} ${blank}, ${facts.location || blank}`,
    L.subject,
    L.salutation,
    L.intro(blank),
    `${L.events}\n${events}`,
    facts.people.length
      ? `${L.people}\n${bullets(facts.people.map((p) => `${p.role}: ${p.description}`))}`
      : "",
    facts.losses.length ? `${L.losses}\n${bullets(facts.losses)}` : "",
    facts.evidence.length ? `${L.evidence}\n${bullets(facts.evidence)}` : "",
    L.request,
    L.closing(blank, today(lang)),
  ]
    .filter(Boolean)
    .join("\n\n");
}

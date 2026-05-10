import { createFileRoute } from "@tanstack/react-router";
import { Search, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { PageHeader } from "@/components/PageHeader";
import { useLang } from "@/lib/i18n";
import { useState } from "react";

export const Route = createFileRoute("/rights")({
  component: Page,
  head: () => ({ meta: [{ title: "Know Your Rights — PakLegal AI" }] }),
});

const RIGHTS = [
  // Arrest
  { cat: "Arrest", catUr: "گرفتاری", en: "Right to know grounds of arrest", ur: "گرفتاری کی وجہ جاننے کا حق", refEn: "Article 10(1), Constitution of Pakistan", descEn: "No one shall be detained without being informed of the grounds for arrest as soon as possible.", descUr: "کسی شخص کو گرفتاری کی وجوہات جلد از جلد بتانا لازمی ہے۔" },
  { cat: "Arrest", catUr: "گرفتاری", en: "Right to consult a lawyer", ur: "وکیل سے ملاقات کا حق", refEn: "Article 10(1), Constitution of Pakistan", descEn: "Every arrested person has the right to consult and be defended by a legal practitioner of their choice.", descUr: "ہر گرفتار شخص کو اپنی پسند کے وکیل سے مشورہ اور دفاع کا حق حاصل ہے۔" },
  { cat: "Arrest", catUr: "گرفتاری", en: "Right to be produced before magistrate within 24 hours", ur: "۲۴ گھنٹے میں مجسٹریٹ کے سامنے پیشی", refEn: "Article 10(2), Constitution & Section 61 CrPC", descEn: "An arrested person must be produced before a magistrate within 24 hours. Detention beyond this without magistrate's order is illegal.", descUr: "گرفتار شخص کو ۲۴ گھنٹے میں مجسٹریٹ کے سامنے پیش کرنا لازمی ہے۔ اس کے بغیر حراست غیر قانونی ہے۔" },
  { cat: "Arrest", catUr: "گرفتاری", en: "Right to bail in bailable offences", ur: "قابلِ ضمانت جرائم میں ضمانت کا حق", refEn: "Section 496 CrPC", descEn: "In bailable offences, a person is entitled to bail as a matter of right. Police cannot refuse bail in such cases.", descUr: "قابل ضمانت جرائم میں ضمانت حق ہے — پولیس انکار نہیں کر سکتی۔" },
  { cat: "Arrest", catUr: "گرفتاری", en: "Protection from torture and cruel treatment", ur: "تشدد سے تحفظ", refEn: "Article 14, Constitution of Pakistan", descEn: "Dignity of man is inviolable. Torture for the purpose of extracting evidence is prohibited by law.", descUr: "انسانی وقار ناقابل تنسیخ ہے۔ اعتراف لینے کے لیے تشدد قانوناً ممنوع ہے۔" },
  // Fair Trial
  { cat: "Fair Trial", catUr: "منصفانہ مقدمہ", en: "Right to fair trial and due process", ur: "منصفانہ مقدمہ کا حق", refEn: "Article 10A, Constitution of Pakistan", descEn: "For the determination of civil rights or any criminal charge, every person is entitled to a fair trial and due process.", descUr: "کسی بھی معاملے میں ہر شخص کو منصفانہ مقدمے کا حق حاصل ہے۔" },
  { cat: "Fair Trial", catUr: "منصفانہ مقدمہ", en: "Right to be presumed innocent until proven guilty", ur: "بے گناہی کا قیاس", refEn: "Fundamental principle of Pakistani criminal law", descEn: "Every accused person is presumed innocent until proven guilty by a court of law beyond reasonable doubt.", descUr: "ہر ملزم اس وقت تک بے گناہ سمجھا جاتا ہے جب تک عدالت جرم ثابت نہ کر دے۔" },
  { cat: "Fair Trial", catUr: "منصفانہ مقدمہ", en: "Right against double jeopardy", ur: "دوہرے مقدمے سے تحفظ", refEn: "Article 13, Constitution of Pakistan", descEn: "No person shall be prosecuted or punished for the same offence more than once.", descUr: "کسی شخص کو ایک ہی جرم کے لیے دو بار مقدمے کا سامنا نہیں کرنا پڑے گا۔" },
  { cat: "Fair Trial", catUr: "منصفانہ مقدمہ", en: "Right against self-incrimination", ur: "خود پر الزام لگانے پر مجبور نہ کرنا", refEn: "Article 13(b), Constitution of Pakistan", descEn: "No person shall be compelled to be a witness against himself.", descUr: "کسی شخص کو اپنے خلاف گواہی دینے پر مجبور نہیں کیا جا سکتا۔" },
  // Liberty
  { cat: "Liberty", catUr: "آزادی", en: "Security of person", ur: "ذاتی تحفظ کا حق", refEn: "Article 9, Constitution of Pakistan", descEn: "No person shall be deprived of life or liberty save in accordance with law.", descUr: "کسی شخص کو سوائے قانون کے، زندگی یا آزادی سے محروم نہیں کیا جا سکتا۔" },
  { cat: "Liberty", catUr: "آزادی", en: "Freedom of movement", ur: "نقل و حرکت کی آزادی", refEn: "Article 15, Constitution of Pakistan", descEn: "Every citizen has the right to move freely throughout Pakistan and to reside and settle in any part thereof.", descUr: "ہر شہری پاکستان میں آزادانہ نقل و حرکت اور کہیں بھی رہنے کا حق رکھتا ہے۔" },
  // Women
  { cat: "Women", catUr: "خواتین", en: "Protection against workplace harassment", ur: "کام کی جگہ ہراسانی سے تحفظ", refEn: "Protection Against Harassment of Women at Workplace Act, 2010", descEn: "Women have the legal right to a harassment-free workplace and can file complaints with the inquiry committee or Federal Ombudsperson.", descUr: "خواتین کو ہراسانی سے پاک ماحول کا قانونی حق حاصل ہے اور وہ شکایت درج کرا سکتی ہیں۔" },
  { cat: "Women", catUr: "خواتین", en: "Right to dower (mehr) and maintenance", ur: "حقِ مہر اور نفقہ کا حق", refEn: "Muslim Family Laws Ordinance, 1961", descEn: "A wife is legally entitled to her dower (mehr) and maintenance from her husband. These are enforceable through Family Courts.", descUr: "بیوی کو مہر اور نفقہ کا قانونی حق حاصل ہے۔ یہ حقوق فیملی کورٹ سے حاصل کیے جا سکتے ہیں۔" },
  { cat: "Women", catUr: "خواتین", en: "Right to inheritance", ur: "وراثت کا حق", refEn: "Muslim Personal Law (Shariat) Application Act, 1962", descEn: "Female heirs are entitled to their Islamic share of inheritance. Denying this is a criminal offence under Section 498-A PPC.", descUr: "خواتین وارثوں کو شرعی وراثت کا حق حاصل ہے۔ اس سے محروم کرنا دفعہ ۴۹۸-اے تعزیراتِ پاکستان کے تحت جرم ہے۔" },
  // Tenancy
  { cat: "Tenancy", catUr: "کرایہ داری", en: "Protection from illegal eviction", ur: "غیر قانونی بے دخلی سے تحفظ", refEn: "Provincial Rent Restriction Ordinances", descEn: "A landlord cannot evict a tenant without a proper court order under the relevant provincial rent law.", descUr: "مالک مکان عدالتی حکم کے بغیر کرایہ دار کو بے دخل نہیں کر سکتا۔" },
  { cat: "Tenancy", catUr: "کرایہ داری", en: "Right to receipt for rent paid", ur: "کرایہ رسید کا حق", refEn: "Provincial Rent Restriction Ordinances", descEn: "A tenant is entitled to a written receipt for every rent payment made. Landlords are legally required to provide this.", descUr: "کرایہ دار ہر ادائیگی پر تحریری رسید کا حقدار ہے۔" },
  // Labour
  { cat: "Labour", catUr: "مزدور", en: "Right to minimum wage", ur: "کم از کم اجرت کا حق", refEn: "Minimum Wages Ordinance, 1961 & Provincial notifications", descEn: "Every worker is entitled to the government-notified minimum wage. Paying below this is punishable under labour law.", descUr: "ہر مزدور کو حکومت کی مقررہ کم از کم اجرت کا حق حاصل ہے۔" },
  { cat: "Labour", catUr: "مزدور", en: "Right to gratuity after service", ur: "ملازمت کے بعد گریجویٹی کا حق", refEn: "West Pakistan Industrial and Commercial Employment Ordinance, 1968", descEn: "Workers completing one year of continuous service are entitled to gratuity upon termination or resignation.", descUr: "ایک سال مسلسل ملازمت کے بعد برطرفی یا استعفیٰ پر گریجویٹی کا حق حاصل ہے۔" },
  { cat: "Labour", catUr: "مزدور", en: "Right to form or join a union", ur: "ٹریڈ یونین بنانے کا حق", refEn: "Article 17, Constitution & Industrial Relations Act 2012", descEn: "Workers have the constitutional right to form associations and trade unions for collective bargaining.", descUr: "مزدوروں کو آئینی حق ہے کہ وہ انجمنیں اور ٹریڈ یونینیں بنائیں۔" },
  // Consumer
  { cat: "Consumer", catUr: "صارف", en: "Right to refund for defective goods", ur: "خراب اشیاء پر واپسی کا حق", refEn: "Sale of Goods Act, 1930 & Provincial Consumer Protection Acts", descEn: "A buyer has the right to reject defective goods and claim a refund or replacement within a reasonable time.", descUr: "خریدار خراب اشیاء واپس کر کے رقم یا تبادلہ کا مطالبہ کر سکتا ہے۔" },
  { cat: "Consumer", catUr: "صارف", en: "Right to file complaint with consumer court", ur: "صارف عدالت میں شکایت کا حق", refEn: "Punjab Consumer Protection Act 2005 (and provincial equivalents)", descEn: "Consumers can file complaints against sellers, manufacturers, or service providers in Consumer Protection Courts for compensation.", descUr: "صارف بیچنے والے یا خدمت فراہم کنندہ کے خلاف صارف عدالت میں معاوضے کے لیے شکایت کر سکتا ہے۔" },
  // Cybercrime
  { cat: "Cybercrime", catUr: "سائبر کرائم", en: "Right to report online fraud to FIA", ur: "آن لائن فراڈ کی رپورٹ کا حق", refEn: "Prevention of Electronic Crimes Act (PECA), 2016", descEn: "Victims of online fraud, harassment, or hacking can file a complaint with FIA Cybercrime Wing at cybercrime.gov.pk.", descUr: "آن لائن فراڈ یا ہراسانی کا شکار ہونے والا شخص ایف آئی اے سائبر کرائم ونگ میں شکایت درج کر سکتا ہے۔" },
  { cat: "Cybercrime", catUr: "سائبر کرائم", en: "Protection from online defamation", ur: "آن لائن بدنامی سے تحفظ", refEn: "Section 20, PECA 2016", descEn: "Sharing false information online to harm someone's reputation is a criminal offence punishable with up to 3 years imprisonment.", descUr: "کسی کی بدنامی کے لیے جھوٹی معلومات آن لائن پھیلانا جرم ہے — ۳ سال قید تک سزا۔" },
];

function Page() {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [activecat, setActiveCat] = useState<string | null>(null);

  const categories = [...new Set(RIGHTS.map((r) => r.cat))];

  const filtered = RIGHTS.filter((r) => {
    const matchQ = !q || (r.en + r.ur + r.cat + r.catUr + r.descEn + r.descUr).toLowerCase().includes(q.toLowerCase());
    const matchCat = !activecat || r.cat === activecat;
    return matchQ && matchCat;
  });

  return (
    <PageShell>
      <PageHeader
        titleEn="Know Your Rights" titleUr="اپنے حقوق جانیں"
        descEn="Your fundamental rights as a Pakistani citizen — explained in plain language, with constitutional and statutory references."
        descUr="پاکستانی شہری کی حیثیت سے آپ کے بنیادی حقوق، آسان زبان میں، آئینی اور قانونی حوالوں کے ساتھ۔" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <div className="relative mb-5">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t("Search rights, e.g. 'arrest', 'tenant', 'wage'…", "تلاش کریں: گرفتاری، کرایہ، اجرت…")}
            className={`w-full rounded-lg border border-input bg-card ps-11 pe-4 py-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${lang === "ur" ? "urdu" : ""}`}
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => setActiveCat(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${!activecat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {t("All", "سب")}
          </button>
          {categories.map((cat) => {
            const catUr = RIGHTS.find((r) => r.cat === cat)?.catUr ?? cat;
            return (
              <button key={cat} onClick={() => setActiveCat(activecat === cat ? null : cat)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${activecat === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {t(cat, catUr)}
              </button>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((r, i) => (
            <article key={i} className="rounded-xl border border-border bg-card p-5 hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1">{t(r.cat, r.catUr)}</span>
                <ShieldCheck className="h-4 w-4 text-primary ms-auto" />
              </div>
              <h3 className={`mt-3 font-display text-base font-semibold ${lang === "ur" ? "urdu" : ""}`}>{t(r.en, r.ur)}</h3>
              <p className={`mt-2 text-sm text-muted-foreground leading-relaxed ${lang === "ur" ? "urdu" : ""}`}>{t(r.descEn, r.descUr)}</p>
              <p className="mt-3 text-xs text-primary font-medium">{r.refEn}</p>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">{t("No rights matched your search.", "کوئی نتیجہ نہیں ملا۔")}</p>
        )}
      </div>
    </PageShell>
  );
}

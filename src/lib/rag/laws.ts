// Registry of the Pakistani laws in the knowledge base.
// To add a law: add an entry here, then run `npm run rag:build` and `npm run rag:ingest`.
// Kept dependency-free so the Node build scripts can import it directly.

export type LawId = "constitution" | "ppc" | "crpc" | "peca";

export interface Law {
  id: LawId;
  name: string;
  shortName: string;
  urduName: string;
  unit: "Article" | "Section";
  urduUnit: string;
  // How a letter suffix is written: "489-F" (hyphen) or "10A" (plain).
  suffixStyle: "hyphen" | "plain";
  sourceUrl: string;
  pdfUrl: string;
  // Lower-case names people use for the law, in English and Urdu (for reference detection).
  aliases: string[];
}

export const LAWS: Law[] = [
  {
    id: "constitution",
    name: "Constitution of the Islamic Republic of Pakistan, 1973",
    shortName: "Constitution",
    urduName: "آئینِ پاکستان",
    unit: "Article",
    urduUnit: "آرٹیکل",
    suffixStyle: "plain",
    sourceUrl:
      "https://pakistancode.gov.pk/english/UY2FqaJw1-apaUY2Fqa-apaUY2Fvbpw%3D-sg-jjjjjjjjjjjjj",
    pdfUrl:
      "https://pakistancode.gov.pk/pdffiles/administrator9d8e2ecc414c6d3371ac41114b61a2c4.pdf",
    aliases: ["constitution", "آئین", "دستور"],
  },
  {
    id: "ppc",
    name: "Pakistan Penal Code, 1860",
    shortName: "PPC",
    urduName: "تعزیراتِ پاکستان",
    unit: "Section",
    urduUnit: "دفعہ",
    suffixStyle: "hyphen",
    sourceUrl:
      "https://pakistancode.gov.pk/english/UY2FqaJw1-apaUY2Fqa-apaUY2Npa5lo-sg-jjjjjjjjjjjjj",
    pdfUrl:
      "https://pakistancode.gov.pk/pdffiles/administratord5622ea3f15bfa00b17d2cf7770a8434.pdf",
    aliases: [
      "ppc",
      "p.p.c",
      "pakistan penal code",
      "penal code",
      "تعزیرات پاکستان",
      "تعزیراتِ پاکستان",
      "تعزیرات",
      "مجموعہ تعزیرات",
    ],
  },
  {
    id: "crpc",
    name: "Code of Criminal Procedure, 1898",
    shortName: "CrPC",
    urduName: "ضابطہ فوجداری",
    unit: "Section",
    urduUnit: "دفعہ",
    suffixStyle: "hyphen",
    sourceUrl:
      "https://pakistancode.gov.pk/english/UY2FqaJw1-apaUY2Fqa-apaUY2Npa5lp-sg-jjjjjjjjjjjjj",
    pdfUrl:
      "https://pakistancode.gov.pk/pdffiles/administrator7db1e56f0f1d39a6e67573ec6b0944e2.pdf",
    aliases: [
      "crpc",
      "cr.p.c",
      "cr. p.c",
      "code of criminal procedure",
      "criminal procedure code",
      "ضابطہ فوجداری",
      "ضابطۂ فوجداری",
      "فوجداری کارروائی",
      "قانونِ فوجداری",
      "قانون فوجداری",
    ],
  },
  {
    id: "peca",
    name: "Prevention of Electronic Crimes Act, 2016",
    shortName: "PECA",
    urduName: "پیکا ایکٹ",
    unit: "Section",
    urduUnit: "دفعہ",
    suffixStyle: "plain",
    sourceUrl:
      "https://pakistancode.gov.pk/english/UY2FqaJw1-apaUY2Fqa-apaUY2Jvbp8%3D-sg-jjjjjjjjjjjjj",
    pdfUrl:
      "https://pakistancode.gov.pk/pdffiles/administrator6a061efe0ed5bd153fa8b79b8eb4cba7.pdf",
    aliases: [
      "peca",
      "electronic crimes act",
      "prevention of electronic crimes",
      "پیکا",
      "الیکٹرانک کرائمز",
    ],
  },
];

export const LAW_BY_ID = Object.fromEntries(LAWS.map((l) => [l.id, l])) as Record<LawId, Law>;

// "489F" -> "489-F" for hyphen-style laws; "10A" stays "10A".
export function displayNumber(lawId: LawId, number: string): string {
  const m = /^(\d+)([A-Z]+)$/.exec(number);
  if (!m || LAW_BY_ID[lawId].suffixStyle === "plain") return number;
  return `${m[1]}-${m[2]}`;
}

// Stable vector ID for a provision, e.g. ("ppc", "489F") -> "ppc-489f".
export function provisionId(lawId: LawId, number: string): string {
  return `${lawId}-${number.toLowerCase()}`;
}

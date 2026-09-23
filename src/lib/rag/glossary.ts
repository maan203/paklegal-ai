// Everyday words (English and Urdu) -> the wording the statutes use.
// Appended to the search text so a question like "How do I register an FIR?" also matches
// CrPC s.154 "Information in cognizable cases". Extend as new gaps are found.

const GLOSSARY: [RegExp, string][] = [
  [
    /\bfir\b|ایف آئی آر|پرچہ/i,
    "first information report; information relating to a cognizable offence given to the officer in charge of a police station",
  ],
  [
    /refus\w*.{0,40}(register|write|record|lodge|file|take|accept)|(register|lodge|record|file)\w*.{0,25}(complaint|case|report)|درج نہیں|مقدمہ درج/i,
    "police refusing to register an FIR; information in cognizable cases to officer in charge of police station; Justice of the Peace directions to police to register a case",
  ],
  [/bounc|چیک/i, "dishonestly issuing a cheque which is dishonoured on presentation"],
  [/ضمانت/, "bail"],
  [/گرفتار/, "arrest"],
  [/وارنٹ/, "warrant"],
  [/ریمانڈ|\bremand\b/i, "detention in custody; remand by magistrate"],
  [/چوری/, "theft"],
  [/ڈکیتی|\brobbery\b/i, "robbery; dacoity"],
  [/قتل|\bmurder\b/i, "qatl-i-amd; causing death"],
  [
    /fake news|جھوٹی خبر|بدنام|defam/i,
    "false information harming the reputation or dignity of a person",
  ],
  [/ہراس|harass/i, "harassment; stalking; outraging modesty"],
  [/تشدد|\btorture\b/i, "torture; dignity of man"],
  [/تعلیم/, "right to education"],
  [/وکیل|\blawyer\b/i, "legal practitioner"],
];

export function expandQuery(query: string): string {
  const extra = GLOSSARY.filter(([pattern]) => pattern.test(query)).map(([, terms]) => terms);
  return extra.length ? `${query}\n${extra.join("; ")}` : query;
}

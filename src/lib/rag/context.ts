// Turns retrieved provisions into the CONTEXT given to the model, the rules for using it,
// and a check that the answer only cites provisions that were actually retrieved.

import { LAWS, LAW_BY_ID, displayNumber } from "./laws";
import { findReferenceMentions } from "./references";
import type { LegalSource, RetrievalResult } from "./retrieve";

const COVERED_LAWS = LAWS.map((l) => l.name).join("; ");

// Shared by every feature that answers from retrieved law.
export const CITATION_RULES = `You are given LEGAL CONTEXT: numbered extracts from the official text of Pakistani laws, retrieved from a knowledge base that currently covers: ${COVERED_LAWS}.

How to use it:
- Treat the LEGAL CONTEXT as your primary source. Base every statement about what the law says on it.
- Cite provisions exactly as given, followed by the extract number in plain square brackets, e.g. "Section 489-F PPC [1]" or "Article 10A of the Constitution [2]".
- Never cite an Article, Section, law or court case that is not in the LEGAL CONTEXT, and never invent numbers.
- If the LEGAL CONTEXT is empty or does not cover the matter, say clearly that the available legal sources do not provide enough information on this. You may then give brief general guidance without citing any section numbers, and suggest consulting a lawyer.`;

export const LEGAL_CONTEXT_RULES = `${CITATION_RULES}
- Skip the "not enough information" statement for greetings or non-legal messages.
- Keep the law and its explanation separate. For legal questions, use two headings:
  "What the law says": what the cited provisions state, close to their wording, with citations.
  "In simple words": a plain-language explanation and practical next steps.
- Reply in the language of the user's latest question. For Urdu, write in Urdu (headings "قانون کیا کہتا ہے" and "آسان الفاظ میں") but keep provision numbers as written, e.g. "دفعہ 489-F، تعزیراتِ پاکستان".`;

export function buildContextBlock(result: RetrievalResult): string {
  if (result.status === "unavailable") {
    return "LEGAL CONTEXT: unavailable (the legal source search failed). Do not cite any section numbers.";
  }
  if (!result.sources.length) {
    return "LEGAL CONTEXT: none. No provision in the knowledge base matched this question.";
  }
  const extracts = result.sources.map(
    (s, i) =>
      `[${i + 1}] ${s.lawName}, ${s.unit} ${s.displayNumber} (${s.title})${s.parts > 1 ? `, part ${s.part} of ${s.parts}` : ""}:\n${s.text}`,
  );
  return `LEGAL CONTEXT:\n\n${extracts.join("\n\n")}`;
}

// The model sometimes writes citations as 【1】; show them as [1] to match the sources list.
export function normalizeCitationMarks(answer: string): string {
  return answer.replace(/【\s*(\d+)\s*】/g, "[$1]");
}

// Provisions the answer cites that were not among the retrieved sources (or do not exist).
// A citation counts as supported when it matches a retrieved provision, or when the retrieved
// text itself mentions that number (e.g. s.54 CrPC refers to "section 565").
export function findUnsupportedCitations(answer: string, sources: LegalSource[]): string[] {
  const retrieved = new Set(sources.map((s) => `${s.law}:${s.number}`));
  const retrievedText = sources.map((s) => s.text).join("\n");
  const labels = new Set<string>();
  for (const mention of findReferenceMentions(answer)) {
    const supported = mention.options.some(
      (r) =>
        retrieved.has(`${r.law}:${r.number}`) ||
        new RegExp(`(?<![\\dA-Za-z])${r.number}(?![\\dA-Za-z])`).test(retrievedText),
    );
    if (supported) continue;
    const ref = mention.options[0];
    const law = LAW_BY_ID[ref.law];
    // Name the law only when the answer did (a single option); otherwise just the provision.
    const lawLabel = mention.options.length === 1 ? ` ${law.shortName}` : "";
    labels.add(
      `${law.unit} ${displayNumber(ref.law, ref.number)}${lawLabel}${ref.known ? "" : " (not found in the knowledge base)"}`,
    );
  }
  return [...labels];
}

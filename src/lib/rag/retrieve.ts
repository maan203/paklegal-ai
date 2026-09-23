// Retrieval: finds the Pakistani legal provisions most relevant to a question.
//
//  1. Direct lookup - provisions the question names ("Section 489-F PPC", "دفعہ 302").
//  2. Meaning search - embed the question (plus glossary terms) and find the closest chunks.
//  3. Keep the best few within a size budget (the free Groq tier allows ~8,000 tokens/min).

import { embed, getRagBindings, type VectorMatch } from "./cloudflare";
import { expandQuery } from "./glossary";
import { LAW_BY_ID, displayNumber, type LawId } from "./laws";
import { chunkIdsFor, findReferences } from "./references";

export interface LegalSource {
  id: string;
  law: LawId;
  lawName: string;
  unit: "Article" | "Section";
  number: string;
  displayNumber: string;
  title: string;
  text: string;
  url: string;
  // Long provisions are stored in parts; part 1 of 1 for most.
  part: number;
  parts: number;
  // "reference" = the user named it; "search" = found by meaning (with similarity score).
  matchedBy: "reference" | "search";
  score?: number;
}

export type RetrievalStatus = "ok" | "no_match" | "unavailable";

export interface RetrievalResult {
  status: RetrievalStatus;
  sources: LegalSource[];
}

const TOP_K = 8;
// Cosine similarity below this is treated as "not relevant". On test questions relevant
// provisions scored 0.53-0.77 and off-topic questions ("hello", recipes, visas) at most 0.43.
const MIN_SCORE = 0.5;
// Also drop matches much weaker than the best one, so loosely related provisions are not sent.
const MAX_GAP_FROM_BEST = 0.1;
const MAX_SOURCES = 5;
const MAX_CONTEXT_CHARS = 7000;
const MAX_DIRECT_IDS = 6;

function toSource(
  id: string,
  metadata: Record<string, unknown> | undefined,
  matchedBy: LegalSource["matchedBy"],
  score?: number,
): LegalSource | null {
  if (!metadata) return null;
  const law = LAW_BY_ID[metadata.law as LawId];
  if (!law) return null;
  const number = String(metadata.number);
  return {
    id,
    law: law.id,
    lawName: law.name,
    unit: law.unit,
    number,
    displayNumber: displayNumber(law.id, number),
    title: String(metadata.title ?? ""),
    text: String(metadata.text ?? ""),
    url: law.sourceUrl,
    part: Number(metadata.part ?? 1),
    parts: Number(metadata.parts ?? 1),
    matchedBy,
    score,
  };
}

export async function retrieveLegalSources(
  query: string,
  options: { laws?: LawId[] } = {},
): Promise<RetrievalResult> {
  const bindings = await getRagBindings();
  if (!bindings) return { status: "unavailable", sources: [] };

  try {
    const directIds = chunkIdsFor(findReferences(query)).slice(0, MAX_DIRECT_IDS);
    const [direct, [vector]] = await Promise.all([
      directIds.length ? bindings.index.getByIds(directIds) : Promise.resolve([]),
      embed(bindings.ai, [expandQuery(query)]),
    ]);
    const { matches } = await bindings.index.query(vector, {
      topK: TOP_K,
      returnMetadata: "all",
      filter: options.laws?.length ? { law: { $in: options.laws } } : undefined,
    });

    const best = Math.max(0, ...matches.map((m) => m.score));
    const cutoff = Math.max(MIN_SCORE, best - MAX_GAP_FROM_BEST);
    const candidates = [
      ...direct.map((v) => toSource(v.id, v.metadata, "reference")),
      ...matches
        .filter((m: VectorMatch) => m.score >= cutoff)
        .map((m) => toSource(m.id, m.metadata, "search", m.score)),
    ];

    const sources: LegalSource[] = [];
    const seen = new Set<string>();
    let size = 0;
    for (const s of candidates) {
      if (!s || seen.has(s.id)) continue;
      if (sources.length >= MAX_SOURCES || size + s.text.length > MAX_CONTEXT_CHARS) continue;
      seen.add(s.id);
      size += s.text.length;
      sources.push(s);
    }
    return { status: sources.length ? "ok" : "no_match", sources };
  } catch (err) {
    console.error("Legal source retrieval failed:", err);
    return { status: "unavailable", sources: [] };
  }
}

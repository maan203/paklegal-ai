// Access to the Cloudflare bindings used by retrieval (declared in wrangler.jsonc):
//   AI        - Workers AI, used to embed text with a multilingual model
//   VECTORIZE - the vector index holding the law chunks
// Only the parts of their APIs that we use are typed here.

export interface VectorMatch {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface VectorIndex {
  query(
    vector: number[],
    options: {
      topK: number;
      returnMetadata?: "all" | "indexed" | "none";
      filter?: Record<string, unknown>;
    },
  ): Promise<{ matches: VectorMatch[] }>;
  getByIds(ids: string[]): Promise<{ id: string; metadata?: Record<string, unknown> }[]>;
}

export interface WorkersAI {
  run(model: string, input: { text: string[] }): Promise<{ data: number[][] }>;
}

// Multilingual (incl. Urdu) embedding model; 1024 dimensions, must match the index.
export const EMBEDDING_MODEL = "@cf/baai/bge-m3";

export async function embed(ai: WorkersAI, texts: string[]): Promise<number[][]> {
  const { data } = await ai.run(EMBEDDING_MODEL, { text: texts });
  if (!data?.length) throw new Error("Embedding model returned no vectors");
  return data;
}

type RagBindings = { ai: WorkersAI; index: VectorIndex };
let provided: RagBindings | null = null;

// Lets scripts (e.g. the evaluation) supply bindings from wrangler's getPlatformProxy.
export function provideRagBindings(bindings: RagBindings) {
  provided = bindings;
}

// Returns null when the bindings are unavailable (e.g. `vite dev` without the Cloudflare
// runtime), so callers can fall back instead of crashing.
export async function getRagBindings(): Promise<RagBindings | null> {
  if (provided) return provided;
  try {
    const { env } = (await import(/* @vite-ignore */ "cloudflare:workers")) as {
      env: { AI?: WorkersAI; VECTORIZE?: VectorIndex };
    };
    if (env?.AI && env?.VECTORIZE) return { ai: env.AI, index: env.VECTORIZE };
  } catch {
    /* not running on Cloudflare */
  }
  return null;
}

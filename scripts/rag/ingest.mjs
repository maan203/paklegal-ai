// Uploads the knowledge base to Cloudflare Vectorize.
//
//   npm run rag:ingest            (all laws)
//   npm run rag:ingest -- ppc     (one law)
//
// Reads knowledge/chunks/<law>.json (made by build-knowledge.mjs), embeds each chunk with
// Workers AI and upserts it into the "paklegal-laws" index. Uses your `wrangler login`
// session through the AI and VECTORIZE bindings in wrangler.jsonc. Safe to re-run:
// chunk IDs are stable, so existing vectors are overwritten.

import fs from "node:fs";
import path from "node:path";
import { getPlatformProxy } from "wrangler";
import { LAWS, LAW_BY_ID } from "../../src/lib/rag/laws.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EMBEDDING_MODEL = "@cf/baai/bge-m3"; // must match src/lib/rag/cloudflare.ts
const EMBED_BATCH = 50;
const UPSERT_BATCH = 100;

// Text that gets embedded: the provision's name and title give the vector useful context.
function embeddingText(c) {
  const law = LAW_BY_ID[c.law];
  return `${law.name}, ${c.unit} ${c.displayNumber}: ${c.title}\n${c.text}`;
}

const { env, dispose } = await getPlatformProxy({
  configPath: path.join(ROOT, "wrangler.jsonc"),
  remoteBindings: true,
});

try {
  const only = process.argv.slice(2);
  let total = 0;
  for (const law of LAWS.filter((l) => !only.length || only.includes(l.id))) {
    const file = path.join(ROOT, "knowledge/chunks", `${law.id}.json`);
    if (!fs.existsSync(file)) {
      console.log(`${law.shortName}: no chunks file, run "npm run rag:build" first`);
      continue;
    }
    const { chunks } = JSON.parse(fs.readFileSync(file, "utf8"));
    console.log(`${law.shortName}: embedding ${chunks.length} chunks`);

    const vectors = [];
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const { data } = await env.AI.run(EMBEDDING_MODEL, { text: batch.map(embeddingText) });
      batch.forEach((c, j) =>
        vectors.push({
          id: c.id,
          values: data[j],
          metadata: {
            law: c.law,
            number: c.number,
            title: c.title,
            text: c.text,
            part: c.part,
            parts: c.parts,
          },
        }),
      );
      process.stdout.write(
        `\r  embedded ${Math.min(i + EMBED_BATCH, chunks.length)}/${chunks.length}`,
      );
    }
    for (let i = 0; i < vectors.length; i += UPSERT_BATCH) {
      await env.VECTORIZE.upsert(vectors.slice(i, i + UPSERT_BATCH));
    }
    console.log(`\n  uploaded ${vectors.length} vectors`);
    total += vectors.length;
  }
  console.log(
    `\nDone: ${total} vectors uploaded to "paklegal-laws". New vectors can take a minute to become searchable.`,
  );
} finally {
  await dispose();
}

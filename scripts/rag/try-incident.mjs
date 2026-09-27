// Runs one incident description through the app's real pipeline (fact extraction -> retrieval ->
// explanation) and prints the result, for manual testing without the browser.
//
//   npm run rag:try -- "Kal raat koi ghar ki deewar phand kar andar aya..."
//
// Uses about 8,000-10,000 Groq tokens per run. Needs `wrangler login` and GROQ_API_KEY in .env.local.

import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { getPlatformProxy } from "wrangler";

const ROOT = path.resolve(import.meta.dirname, "../..");
const narrative = process.argv.slice(2).join(" ").trim();
if (!narrative) {
  console.error('Usage: npm run rag:try -- "<incident description>"');
  process.exit(1);
}

const envFile = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
process.env.GROQ_API_KEY = envFile.match(/GROQ_API_KEY=(.*)/)?.[1]?.trim();
if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing in .env.local");

const vite = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: "error",
  resolve: { alias: { "@": path.join(ROOT, "src") } },
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  plugins: [
    {
      // analyzeIncident is private in the app (see scripts/rag/eval-answers.mjs).
      name: "expose-analyze-incident",
      transform(code, id) {
        if (id.replace(/\\/g, "/").endsWith("/src/lib/ai-functions.ts")) {
          return `${code}\nexport { analyzeIncident };\n`;
        }
      },
    },
  ],
});
const { env, dispose } = await getPlatformProxy({
  configPath: path.join(ROOT, "wrangler.jsonc"),
  remoteBindings: true,
});

try {
  const cloudflare = await vite.ssrLoadModule("/src/lib/rag/cloudflare.ts");
  cloudflare.provideRagBindings({ ai: env.AI, index: env.VECTORIZE });
  const { analyzeIncident } = await vite.ssrLoadModule("/src/lib/ai-functions.ts");
  const { citedSources } = await vite.ssrLoadModule("/src/lib/rag/context.ts");

  const a = await analyzeIncident(narrative);
  const cited = new Set(citedSources(a.text, a.sources));
  console.log("\n── Facts ──");
  console.log(
    JSON.stringify(
      {
        category: a.facts.category,
        possibleCrime: a.facts.possibleCrime,
        language: a.facts.language,
      },
      null,
      1,
    ),
  );
  console.log("Search phrases:", a.facts.searchPhrases.join(" | "));
  console.log("\n── Explanation ──\n" + a.text);
  console.log("\n── Sources ──");
  a.sources.forEach((s, i) =>
    console.log(
      `[${i + 1}] ${cited.has(s) ? "CITED " : "unused"} ${s.unit} ${s.displayNumber} ${s.lawName}: ${s.title} (score ${s.score?.toFixed(2) ?? "direct"})`,
    ),
  );
  if (a.unsupportedCitations.length) {
    console.log("\nUnsupported citations:", a.unsupportedCitations.join(", "));
  }
  console.log(
    `\nDocuments tab: police complaint draft ${a.facts.possibleCrime ? "SHOWN" : "hidden"}`,
  );
} finally {
  await dispose();
  await vite.close();
}

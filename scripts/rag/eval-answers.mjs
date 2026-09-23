// Measures explanation quality for Describe Your Incident, with and without RAG.
//
//   npm run rag:eval-answers
//
// For each incident in knowledge/eval/incidents.json:
//   with RAG    = the app's real pipeline (analyzeIncident: extraction -> retrieval -> answer)
//   without RAG = the same model and answer structure, citing law from its own knowledge
// and scores both with simple, checkable rules (see metrics below). Answers are cached in
// knowledge/eval/.cache so the run can resume after a rate limit. Writes
// knowledge/eval/answers-results.md. Needs `wrangler login` and GROQ_API_KEY in .env.local.

import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { getPlatformProxy } from "wrangler";
import OpenAI from "openai";

const ROOT = path.resolve(import.meta.dirname, "../..");
const EVAL_DIR = path.join(ROOT, "knowledge/eval");
const CACHE_FILE = path.join(EVAL_DIR, ".cache/answers.json");
const MODEL = "openai/gpt-oss-120b"; // same model as the app
const PAUSE_SECONDS = 45; // stay inside the free tier's tokens-per-minute limit

const envFile = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
process.env.GROQ_API_KEY = envFile.match(/GROQ_API_KEY=(.*)/)?.[1]?.trim();
if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY missing in .env.local");

const BASELINE_PROMPT = `You are PakLegal AI. A person in Pakistan has described an incident. Explain their legal position in plain, calm language.

Write these sections as Markdown "##" headings:
## What the law says
Which Pakistani laws and Sections/Articles apply to these facts, and why. Cite them by name and number.
## Your rights
## What you can do next
Numbered, practical steps.
## Before you see a lawyer

Write in the same language as the description (Urdu or English). Keep it under about 450 words. This is legal information, not legal advice.`;

const pause = (s) => new Promise((r) => setTimeout(r, s * 1000));
const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};
const saveCache = () => {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
};

// Load the app's own modules (TypeScript, "@/" paths, JSON) through Vite.
const vite = await createServer({
  root: ROOT,
  configFile: false,
  logLevel: "error",
  resolve: { alias: { "@": path.join(ROOT, "src") } },
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  plugins: [
    {
      // analyzeIncident is private in the app (exporting it would put server code in the
      // client bundle); expose it here only.
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
  const { findReferenceMentions } = await vite.ssrLoadModule("/src/lib/rag/references.ts");
  const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });

  const { incidents } = JSON.parse(fs.readFileSync(path.join(EVAL_DIR, "incidents.json"), "utf8"));

  // ── run (or resume) ────────────────────────────────────────────────────────
  // Stops cleanly on a rate limit (the free tier allows 200,000 tokens a day); answers already
  // collected stay in the cache, so running the script again continues where it stopped.
  let stopped = null;
  for (const inc of incidents) {
    cache[inc.id] ??= {};
    const entry = cache[inc.id];
    try {
      if (!entry.rag) {
        console.log(`${inc.id}: with RAG`);
        const a = await analyzeIncident(inc.narrative);
        entry.rag = {
          text: a.text,
          facts: a.facts,
          sources: a.sources.map((s) => s.id),
          unsupported: a.unsupportedCitations,
        };
        saveCache();
        await pause(PAUSE_SECONDS);
      }
      if (!entry.baseline) {
        console.log(`${inc.id}: without RAG`);
        const r = await groq.chat.completions.create({
          model: MODEL,
          messages: [
            { role: "system", content: BASELINE_PROMPT },
            { role: "user", content: inc.narrative },
          ],
        });
        entry.baseline = { text: r.choices[0].message.content ?? "" };
        saveCache();
        await pause(PAUSE_SECONDS / 2);
      }
    } catch (err) {
      const message = String(err?.message ?? err);
      if (!/rate|quota|429/i.test(message)) throw err;
      stopped = message.slice(0, 160);
      break;
    }
  }
  const done = incidents.filter((inc) => cache[inc.id]?.rag && cache[inc.id]?.baseline).length;
  if (done < incidents.length) {
    console.log(`\nStopped after ${done} of ${incidents.length} incidents: ${stopped}`);
    console.log("Answers so far are saved in knowledge/eval/.cache. Run again later to continue.");
    process.exitCode = 1;
  }

  // ── score (once every incident has both answers) ───────────────────────
  if (done === incidents.length) {
    // Non-breaking spaces (the model uses them) become normal spaces before matching.
    const clean = (t) => t.replace(new RegExp("[\\u00a0\\u202f\\u2007]", "g"), " ");
    const cited = (text) => {
      const mentions = findReferenceMentions(clean(text));
      return {
        ids: new Set(
          mentions.flatMap((m) =>
            m.options.filter((o) => o.known).map((o) => `${o.law}-${o.number.toLowerCase()}`),
          ),
        ),
        nonexistent: mentions
          .filter((m) => m.options.every((o) => !o.known))
          .map((m) => m.text.trim()),
      };
    };
    const INDIAN = /\b(IPC|Indian Penal Code|Bharatiya|BNS|BNSS)\b/i;
    const NOT_COVERED =
      /(do not|does not|don't) (provide|cover|contain)|not (covered|included)|no (relevant )?provision|not enough information|insufficient|فراہم نہیں|شامل نہیں|کافی معلومات نہیں|موجود نہیں/i;
    const SECTION_NUMBER = /(?<![A-Za-z])(sections?|s\.|articles?|دفعہ|آرٹیکل)\s*\d+/gi;
    const urduShare = (t) =>
      (t.match(new RegExp("[\\u0600-\\u06ff]", "g"))?.length ?? 0) /
      Math.max(1, t.match(/[\p{L}]/gu)?.length ?? 1);
    const digitsIn = (t) =>
      clean(t)
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/,/g, "")
        .match(/\d+/g) ?? [];

    function score(inc, answer, withRag) {
      const text = clean(answer.text);
      const c = cited(text);
      const issuesHit = inc.issues.filter((group) => group.some((id) => c.ids.has(id))).length;
      const langOk = inc.lang === "ur" ? urduShare(text) > 0.5 : urduShare(text) < 0.2;
      const r = {
        issues: inc.issues.length,
        issuesHit,
        invented: c.nonexistent.length > 0 || INDIAN.test(text),
        inventedList: [...c.nonexistent, ...(INDIAN.test(text) ? ["Indian law"] : [])],
        nextStep: new RegExp(inc.nextStep, "i").test(text),
        langOk,
        saysNotCovered: NOT_COVERED.test(text),
        sectionNumbers: text.match(SECTION_NUMBER)?.length ?? 0,
      };
      if (withRag) {
        const narrativeDigits = new Set(digitsIn(inc.narrative));
        const factDigits = digitsIn(JSON.stringify({ ...answer.facts, searchPhrases: [] }));
        r.inventedNumbers = factDigits.filter((d) => !narrativeDigits.has(d));
        r.unsupported = answer.unsupported;
      }
      return r;
    }

    const rows = incidents.map((inc) => ({
      inc,
      rag: score(inc, cache[inc.id].rag, true),
      base: score(inc, cache[inc.id].baseline, false),
    }));
    const inScope = rows.filter((r) => !r.inc.outOfScope);
    const outScope = rows.filter((r) => r.inc.outOfScope);
    const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : "-");
    const sum = (list, f) => list.reduce((s, x) => s + f(x), 0);
    const totalIssues = sum(inScope, (r) => r.rag.issues);

    const table = [
      "| Metric | With RAG (the app) | Without RAG |",
      "|---|---|---|",
      `| Legal issues where a correct provision is cited (${totalIssues} issues) | ${pct(
        sum(inScope, (r) => r.rag.issuesHit),
        totalIssues,
      )} | ${pct(
        sum(inScope, (r) => r.base.issuesHit),
        totalIssues,
      )} |`,
      `| Answers citing a provision that does not exist, or Indian law | ${pct(rows.filter((r) => r.rag.invented).length, rows.length)} | ${pct(rows.filter((r) => r.base.invented).length, rows.length)} |`,
      `| Answers with the expected next step | ${pct(rows.filter((r) => r.rag.nextStep).length, rows.length)} | ${pct(rows.filter((r) => r.base.nextStep).length, rows.length)} |`,
      `| Answers in the person's language | ${pct(rows.filter((r) => r.rag.langOk).length, rows.length)} | ${pct(rows.filter((r) => r.base.langOk).length, rows.length)} |`,
      `| Out-of-scope incidents: says its sources do not cover it (${outScope.length}) | ${pct(outScope.filter((r) => r.rag.saysNotCovered).length, outScope.length)} | ${pct(outScope.filter((r) => r.base.saysNotCovered).length, outScope.length)} |`,
      `| Out-of-scope incidents: section numbers cited anyway | ${sum(outScope, (r) => r.rag.sectionNumbers)} | ${sum(outScope, (r) => r.base.sectionNumbers)} |`,
      `| Answers the app flagged with an unsupported citation | ${pct(rows.filter((r) => r.rag.unsupported.length).length, rows.length)} | n/a (no sources to check against) |`,
      `| Fact extraction: incidents with a number not in the description | ${pct(rows.filter((r) => r.rag.inventedNumbers.length).length, rows.length)} | n/a |`,
    ].join("\n");

    const perIncident = [
      "| Incident | Lang | Issues hit (RAG / no RAG) | Invented citations (RAG / no RAG) | Retrieved by RAG |",
      "|---|---|---|---|---|",
      ...rows.map(
        (r) =>
          `| ${r.inc.id}${r.inc.outOfScope ? " (out of scope)" : ""} | ${r.inc.lang} | ${r.inc.outOfScope ? "-" : `${r.rag.issuesHit}/${r.rag.issues} / ${r.base.issuesHit}/${r.base.issues}`} | ${r.rag.inventedList.join(", ") || "none"} / ${r.base.inventedList.join(", ") || "none"} | ${cache[r.inc.id].rag.sources.join(", ") || "none"} |`,
      ),
    ].join("\n");

    const report = [
      "# Explanation evaluation",
      "",
      `Generated by \`npm run rag:eval-answers\` on ${new Date().toISOString().slice(0, 10)}. ${rows.length} incidents from [\`incidents.json\`](incidents.json) (${inScope.length} in scope, ${outScope.length} deliberately out of scope; ${rows.filter((r) => r.inc.lang === "ur").length} in Urdu). Both versions use \`${MODEL}\`; "without RAG" is the same model and answer structure citing law from its own knowledge.`,
      "",
      table,
      "",
      "How each metric is checked:",
      "- *Correct provision*: the answer cites one of the provisions listed for that legal issue (found with the app's own reference parser).",
      "- *Does not exist*: the answer names a Section/Article that is not in the loaded law it names, or cites Indian law.",
      "- *Next step* and *not covered*: simple text patterns; *language*: share of Urdu script.",
      "- *Number not in the description*: a digit sequence in the extracted facts that the person never wrote.",
      "",
      "## Per incident",
      "",
      perIncident,
      "",
    ].join("\n");
    fs.writeFileSync(path.join(EVAL_DIR, "answers-results.md"), report);
    console.log(`\n${table}\n\nWritten to knowledge/eval/answers-results.md`);
  }
} finally {
  await dispose();
  await vite.close();
}

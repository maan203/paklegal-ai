// Builds the legal knowledge base from the official Pakistan Code PDFs.
//
//   npm run rag:build            (all laws)
//   npm run rag:build -- ppc     (one law)
//
// For each law in src/lib/rag/laws.ts it:
//   1. downloads the PDF into knowledge/raw/ (skipped if already there),
//   2. extracts the text and removes page headers, amendment footnotes and the table of contents,
//   3. splits the text into one chunk per Section/Article (long ones into parts),
//   4. writes knowledge/chunks/<law>.json and updates src/lib/rag/catalog.json.

import fs from "node:fs";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import { LAWS, displayNumber, provisionId } from "../../src/lib/rag/laws.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");
const RAW_DIR = path.join(ROOT, "knowledge/raw");
const CHUNK_DIR = path.join(ROOT, "knowledge/chunks");
const CATALOG_FILE = path.join(ROOT, "src/lib/rag/catalog.json");

// Chunks longer than this are split into parts at paragraph boundaries.
const MAX_CHUNK_CHARS = 3000;

// Footnotes at the bottom of each page start with one of these (e.g. "12 Subs. by Act II of 1988").
const FOOTNOTE_START =
  /^(Subs|Ins|Added|Omitted|Omit|Rep\b|Renumbered|Re-numbered|Deleted|Inserted|Substituted|The\s+(original\s+)?words?|The\s+(figure|comma|brackets|full|semicolon|colon|proviso|explanation|original)|Certain|Existing|Now\b|Ibid|See\b|Vide|For\b|Proviso|Explanation\s+(ins|added|subs|omitted)|Para|Clause|Sub-section|Section\s+\d|Full stop|Comma|Semicolon|Colon|Brackets|Figure|Earlier|Original|Amended|Corrected|Declared|Struck)/i;

async function download(law) {
  const file = path.join(RAW_DIR, `${law.id}.pdf`);
  if (!fs.existsSync(file)) {
    console.log(`  downloading ${law.pdfUrl}`);
    const res = await fetch(law.pdfUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`Download failed for ${law.id}: HTTP ${res.status}`);
    fs.mkdirSync(RAW_DIR, { recursive: true });
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

function cleanPage(page) {
  const lines = page.split("\n").map((l) => l.replace(/\s+$/, ""));
  // Cut the page at the first footnote line.
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const next = (lines[i + 1] ?? "").trim();
    if (
      (/^\d{1,3}$/.test(line) && FOOTNOTE_START.test(next)) ||
      (/^\d{1,3}\s?(?=[A-Z])/.test(line) && FOOTNOTE_START.test(line.replace(/^\d{1,3}\s?/, "")))
    ) {
      end = i;
      break;
    }
  }
  return lines
    .slice(0, end)
    .filter((l) => !/^\s*Page \d+ of \d+\s*$/.test(l))
    .join("\n");
}

// Removes amendment markers such as "4[489F." and "...]]" and "[:]6".
function stripMarkers(text) {
  return text
    .replace(/\d{1,3}\[/g, "")
    .replace(/\[(?=[^\]]*\])/g, "")
    .replace(/\]\d{0,3}/g, "")
    .replace(/[ \t]+/g, " ");
}

// Every Pakistan Code PDF starts with a table of contents ("489F. Dishonestly issuing a cheque").
const TOC_LINE = /^(\d{1,3}[A-Z]{0,3})\.\s+(\S.*)$/gm;

// Matches a title loosely: its first words, in order, with any punctuation or line breaks between.
function titlePattern(title, words = 3) {
  const parts = title.match(/[A-Za-z0-9]+/g)?.slice(0, words) ?? [];
  // Separators may be empty: PDF extraction sometimes drops hyphens ("Police-officer" -> "Policeofficer").
  return parts.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^A-Za-z0-9]*");
}

function headingPattern(number, title) {
  // Up to 4 marker characters (quotes, footnote digits) may sit between the number and the title.
  return `(^|\\n)[ \\t\\d[]{0,6}${number}\\.\\s*[^A-Za-z\\n]{0,4}${titlePattern(title)}`;
}

function parseProvisions(text) {
  // The body starts where the first contents entry (provision 1) appears a second time.
  const first = TOC_LINE.exec(text);
  TOC_LINE.lastIndex = 0;
  if (!first) throw new Error("Could not find the table of contents");
  const firstHeading = new RegExp(headingPattern(first[1], first[2]), "gi");
  firstHeading.exec(text);
  const second = firstHeading.exec(text);
  if (!second) throw new Error("Could not find the start of the body");
  const bodyStart = second.index + second[1].length;

  // Table of contents entries, skipping ones already marked repealed/omitted.
  const toc = [...text.slice(0, bodyStart).matchAll(TOC_LINE)]
    .map((m) => ({ number: m[1], title: m[2].replace(/\s+/g, " ").trim() }))
    .filter((e) => !/^\[?\s*(Repealed|Omitted|Deleted)/i.test(e.title) && titlePattern(e.title));

  // Pass 1: find each entry's heading in the body by number + title, in order. A stray footnote
  // digit may precede the number (e.g. "11. The Republic" for Article 1).
  let cursor = bodyStart;
  for (const entry of toc) {
    const m = new RegExp(headingPattern(entry.number, entry.title), "i").exec(
      text.slice(cursor, cursor + 150000),
    );
    if (m) {
      entry.start = cursor + m.index + m[1].length;
      cursor = entry.start + 1;
    }
  }
  // Pass 2: titles sometimes differ between contents and body ("Qatl-i-amd" / "Qatl-e-amd").
  // Accept a heading with just the right number, but only between its found neighbours.
  for (let i = 0; i < toc.length; i++) {
    if (toc[i].start !== undefined) continue;
    const from = toc.slice(0, i).findLast((e) => e.start !== undefined)?.start ?? bodyStart;
    const to = toc.slice(i + 1).find((e) => e.start !== undefined)?.start ?? text.length;
    const m = new RegExp(
      `(^|\\n)[ \\t\\d[]{0,6}${toc[i].number}\\.\\s*[^\\n]{2,160}?(\\.\\s*_{2,}|\\.\\s*[—–]|\\.\\s+(?=[A-Z(]))`,
    ).exec(text.slice(from + 1, to));
    if (m) toc[i].start = from + 1 + m.index + m[1].length;
  }
  const provisions = toc.filter((e) => e.start !== undefined);
  const missing = toc.filter((e) => e.start === undefined).map((e) => e.number);
  if (missing.length) console.log(`  not found in body (${missing.length}): ${missing.join(", ")}`);

  for (let i = 0; i < provisions.length; i++) {
    const end = i + 1 < provisions.length ? provisions[i + 1].start : text.length;
    provisions[i].body = text.slice(provisions[i].start, end).trim();
  }
  // The final provision can run into schedules; keep it to a sensible length.
  const tail = provisions[provisions.length - 1];
  if (tail && tail.body.length > MAX_CHUNK_CHARS * 3)
    tail.body = tail.body.slice(0, MAX_CHUNK_CHARS * 3);
  return provisions;
}

function splitIntoParts(body) {
  if (body.length <= MAX_CHUNK_CHARS) return [body];
  const parts = [];
  let current = "";
  for (const para of body.split(/\n(?=\(\d+\)|\([a-z]\)|Provided|Explanation|Illustration)/)) {
    if (current && current.length + para.length > MAX_CHUNK_CHARS) {
      parts.push(current.trim());
      current = "";
    }
    current += `${para}\n`;
  }
  if (current.trim()) parts.push(current.trim());
  // A single very long paragraph: hard-split.
  return parts.flatMap((p) =>
    p.length <= MAX_CHUNK_CHARS * 1.5
      ? [p]
      : p.match(new RegExp(`[\\s\\S]{1,${MAX_CHUNK_CHARS}}`, "g")),
  );
}

async function buildLaw(law) {
  console.log(`\n${law.name}`);
  const pdfFile = await download(law);
  const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(pdfFile)));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const text = stripMarkers(pages.map(cleanPage).join("\n"));

  const chunks = [];
  let repealed = 0;
  for (const p of parseProvisions(text)) {
    const body = p.body.replace(/\n{2,}/g, "\n").trim();
    if (
      /^\d+[A-Z]*\.\s*(Repealed|Omitted|Deleted)/i.test(body) ||
      body.length < p.title.length + 25
    ) {
      repealed++;
      continue;
    }
    const parts = splitIntoParts(body);
    const baseId = provisionId(law.id, p.number);
    parts.forEach((part, i) => {
      chunks.push({
        id: parts.length > 1 ? `${baseId}-p${i + 1}` : baseId,
        law: law.id,
        unit: law.unit,
        number: p.number,
        displayNumber: displayNumber(law.id, p.number),
        title: p.title.replace(/[.\s]+$/, ""),
        part: i + 1,
        parts: parts.length,
        text: part,
      });
    });
  }
  const provisionCount = new Set(chunks.map((c) => c.number)).size;
  console.log(
    `  ${provisionCount} ${law.unit.toLowerCase()}s, ${chunks.length} chunks (${repealed} repealed/omitted skipped)`,
  );

  fs.mkdirSync(CHUNK_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(CHUNK_DIR, `${law.id}.json`),
    JSON.stringify(
      {
        law: law.id,
        name: law.name,
        sourceUrl: law.sourceUrl,
        pdfUrl: law.pdfUrl,
        builtAt: new Date().toISOString().slice(0, 10),
        chunks,
      },
      null,
      1,
    ),
  );
  return chunks;
}

// catalog.json: every provision that exists, with its chunk IDs. Bundled into the app for
// direct lookups ("Section 489-F") and for checking citations in answers.
function writeCatalog() {
  const catalog = {};
  for (const law of LAWS) {
    const file = path.join(CHUNK_DIR, `${law.id}.json`);
    if (!fs.existsSync(file)) continue;
    const { chunks } = JSON.parse(fs.readFileSync(file, "utf8"));
    const entries = {};
    for (const c of chunks) {
      entries[c.number] ??= { title: c.title, ids: [] };
      entries[c.number].ids.push(c.id);
    }
    catalog[law.id] = entries;
  }
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog));
  console.log(`\nCatalog written: ${path.relative(ROOT, CATALOG_FILE)}`);
}

const only = process.argv.slice(2);
for (const law of LAWS.filter((l) => !only.length || only.includes(l.id))) {
  await buildLaw(law);
}
writeCatalog();

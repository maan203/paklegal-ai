import { describe, expect, it } from "vitest";
import { chunkIdsFor, findReferences } from "@/lib/rag/references";

const refs = (text: string) =>
  findReferences(text)
    .filter((r) => r.known)
    .map((r) => `${r.law}:${r.number}`);

describe("findReferences", () => {
  it.each([
    ["What is Section 489-F PPC?", ["ppc:489F"]],
    ["punishment under 302 PPC", ["ppc:302"]],
    ["Explain Article 10A of the Constitution", ["constitution:10A"]],
    ["section 154 of the CrPC", ["crpc:154"]],
    ["section 20 PECA", ["peca:20"]],
    ["Under Section 489‑F PPC [1]", ["ppc:489F"]],
  ])("finds the provision in %j", (text, expected) => {
    expect(refs(text)).toEqual(expected);
  });

  it.each([
    ["دفعہ ۴۸۹-F تعزیرات پاکستان کیا ہے", ["ppc:489F"]],
    ["آرٹیکل 25 کیا کہتا ہے", ["constitution:25"]],
    // Urdu names the law before the section.
    ["تعزیراتِ پاکستان کی دفعہ 302 اور ضابطہ فوجداری کی دفعہ 154", ["ppc:302", "crpc:154"]],
  ])("handles Urdu: %j", (text, expected) => {
    expect(refs(text)).toEqual(expected);
  });

  it("does not treat years or ordinary words as references", () => {
    expect(refs("Pakistan Penal Code 1860 overview")).toEqual([]);
    expect(refs("In such cases. 3 people were there")).toEqual([]);
  });

  it("resolves an unnamed section only to laws where it exists", () => {
    // PPC 497 was repealed, so only CrPC 497 (bail) matches.
    expect(refs("section 497")).toEqual(["crpc:497"]);
  });

  it("reports provisions that do not exist as unknown", () => {
    expect(findReferences("Section 999 PPC")).toEqual([
      { law: "ppc", number: "999", known: false },
    ]);
  });

  it("maps references to chunk ids, including split provisions", () => {
    expect(chunkIdsFor(findReferences("Section 489-F PPC"))).toEqual(["ppc-489f"]);
    expect(chunkIdsFor(findReferences("section 497 CrPC"))).toEqual(["crpc-497-p1", "crpc-497-p2"]);
  });
});

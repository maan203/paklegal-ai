import { describe, expect, it } from "vitest";
import {
  buildContextBlock,
  findUnsupportedCitations,
  normalizeCitationMarks,
} from "@/lib/rag/context";
import type { LegalSource } from "@/lib/rag/retrieve";

function source(law: LegalSource["law"], number: string, text = ""): LegalSource {
  return {
    id: `${law}-${number}`.toLowerCase(),
    law,
    lawName: "Law",
    unit: law === "constitution" ? "Article" : "Section",
    number,
    displayNumber: number,
    title: "Title",
    text,
    url: "https://pakistancode.gov.pk",
    part: 1,
    parts: 1,
    matchedBy: "search",
  };
}

describe("findUnsupportedCitations", () => {
  it("accepts citations of retrieved provisions", () => {
    expect(
      findUnsupportedCitations("Section 489-F PPC [1] applies.", [source("ppc", "489F")]),
    ).toEqual([]);
  });

  it("flags invented and non-retrieved provisions", () => {
    const answer = "See Section 489-F PPC [1], Article 14(1)(d) and Section 999 PPC.";
    expect(findUnsupportedCitations(answer, [source("ppc", "489F")])).toEqual([
      "Article 14 Constitution",
      "Section 999 PPC (not found in the knowledge base)",
    ]);
  });

  it("accepts numbers that appear inside the retrieved text", () => {
    const s54 = source("crpc", "54", "...rule made under section 565, sub-section (3)...");
    expect(findUnsupportedCitations("دفعہ 54، ضابطہ فوجداری اور سیکشن 565(3)", [s54])).toEqual([]);
  });

  it("treats an unnamed section as supported if any matching law was retrieved", () => {
    expect(
      findUnsupportedCitations("Section 302 and Section 154 CrPC", [
        source("ppc", "302"),
        source("crpc", "154"),
      ]),
    ).toEqual([]);
  });
});

describe("buildContextBlock", () => {
  it("numbers the extracts so the answer can cite them", () => {
    const block = buildContextBlock({
      status: "ok",
      sources: [source("ppc", "379", "Whoever commits theft...")],
    });
    expect(block).toContain("[1] Law, Section 379 (Title):");
    expect(block).toContain("Whoever commits theft");
  });

  it("tells the model when nothing matched or search failed", () => {
    expect(buildContextBlock({ status: "no_match", sources: [] })).toMatch(/none/i);
    expect(buildContextBlock({ status: "unavailable", sources: [] })).toMatch(
      /do not cite any section numbers/i,
    );
  });
});

describe("normalizeCitationMarks", () => {
  it("rewrites full-width citation brackets", () => {
    expect(normalizeCitationMarks("as stated 【1】 and 【 2 】")).toBe("as stated [1] and [2]");
  });
});

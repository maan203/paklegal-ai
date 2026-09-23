import { describe, expect, it } from "vitest";
import { buildFirApplication, buildLawyerBrief } from "@/lib/case-summary";
import type { SituationFacts } from "@/lib/ai-functions";
import type { LegalSource } from "@/lib/rag/retrieve";

const facts: SituationFacts = {
  language: "en",
  summary: "Two men robbed the complainant at gunpoint.",
  category: "theft_or_robbery",
  possibleCrime: true,
  timeline: [{ when: "last Tuesday, 11 pm", what: "Robbed outside the shop" }],
  people: [{ role: "witness", description: "Neighbour Aslam" }],
  location: "Saddar, Rawalpindi",
  losses: ["phone", "Rs. 35,000"],
  evidence: ["Neighbour Aslam saw it"],
  missingInfo: ["What did the men look like?"],
  searchPhrases: ["robbery with firearm"],
  urgent: false,
  urgentReason: "",
};

const s392: LegalSource = {
  id: "ppc-392",
  law: "ppc",
  lawName: "Pakistan Penal Code, 1860",
  unit: "Section",
  number: "392",
  displayNumber: "392",
  title: "Punishment for robbery",
  text: "",
  url: "",
  part: 1,
  parts: 1,
  matchedBy: "search",
};

const narrative = "Two men on a motorcycle took my phone and cash.";

describe("buildLawyerBrief", () => {
  const brief = buildLawyerBrief(facts, [s392, { ...s392, id: "ppc-392-p2" }], narrative, "en");

  it("contains the extracted facts and the client's own words", () => {
    expect(brief).toContain(facts.summary);
    expect(brief).toContain("**last Tuesday, 11 pm:** Robbed outside the shop");
    expect(brief).toContain("- Rs. 35,000");
    expect(brief).toContain("- What did the men look like?");
    expect(brief).toContain(`> ${narrative}`);
  });

  it("lists each retrieved provision once, marked for the lawyer to confirm", () => {
    expect(brief).toContain("to be confirmed by the lawyer");
    expect(brief.match(/Section 392, Pakistan Penal Code/g)).toHaveLength(1);
  });

  it("says 'Not stated' rather than inventing missing facts", () => {
    const empty = buildLawyerBrief({ ...facts, location: "", losses: [] }, [], narrative, "en");
    expect(empty).toContain("## Location\nNot stated");
    expect(empty).toContain("## Losses and injuries\n- Not stated");
  });
});

describe("buildFirApplication", () => {
  it("is an application to the SHO under Section 154, with blanks for personal details", () => {
    const app = buildFirApplication(facts, narrative, "en");
    expect(app).toContain("Station House Officer");
    expect(app).toContain("Section 154, Code of Criminal Procedure, 1898");
    expect(app).toContain(narrative);
    expect(app).toContain("CNIC No. ____________");
  });

  it("has an Urdu version", () => {
    const app = buildFirApplication({ ...facts, language: "ur" }, "کل رات چوری ہوئی", "ur");
    expect(app).toContain("درخواست برائے اندراج مقدمہ");
    expect(app).toContain("کل رات چوری ہوئی");
  });
});

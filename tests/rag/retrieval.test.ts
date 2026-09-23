import { describe, expect, it } from "vitest";
import { expandQuery } from "@/lib/rag/glossary";
import { retrieveLegalSources } from "@/lib/rag/retrieve";

describe("expandQuery", () => {
  it("adds statutory wording for everyday terms", () => {
    expect(expandQuery("How do I register an FIR?")).toMatch(
      /information relating to a cognizable offence/,
    );
    expect(expandQuery("چیک باؤنس ہو گیا")).toMatch(/dishonoured on presentation/);
    expect(expandQuery("the police refused to register my complaint")).toMatch(
      /Justice of the Peace/,
    );
    expect(expandQuery("police refusing to file complaint")).toMatch(/Justice of the Peace/);
  });

  it("leaves unrelated questions unchanged", () => {
    expect(expandQuery("What does Article 25 say?")).toBe("What does Article 25 say?");
  });
});

describe("retrieveLegalSources", () => {
  it("reports 'unavailable' instead of throwing outside the Cloudflare runtime", async () => {
    await expect(retrieveLegalSources("What is Section 489-F PPC?")).resolves.toEqual({
      status: "unavailable",
      sources: [],
    });
  });

  it("returns no_match for an empty query without calling any service", async () => {
    await expect(retrieveLegalSources(["  "])).resolves.toEqual({
      status: "no_match",
      sources: [],
    });
  });
});

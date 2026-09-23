import { describe, expect, it } from "vitest";
import { cleanAiText } from "@/lib/utils";

describe("cleanAiText", () => {
  it("turns non-breaking spaces into normal spaces so Markdown headings and lists render", () => {
    expect(cleanAiText("##\u00a0What the law says\n-\u202fRs.\u202f35,000")).toBe(
      "## What the law says\n- Rs. 35,000",
    );
  });

  it("replaces em dashes", () => {
    expect(cleanAiText("Section 380 \u2014 theft")).toBe("Section 380 - theft");
  });
});

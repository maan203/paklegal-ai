// Non-breaking spaces (U+00A0, U+202F, U+2007), written as escapes so they stay visible in code.
const NON_BREAKING_SPACES = new RegExp("[\\u00a0\\u202f\\u2007]", "g");
const EM_DASH = new RegExp("\\s*\\u2014\\s*", "g");

// Cleans AI-written Markdown before it is shown:
// - The model often uses non-breaking spaces. Markdown only treats "## Heading" or "- item" as
//   structure when a normal space follows, so these would render as literal "##" text.
// - The site's style avoids em dashes, which the model uses heavily.
export function cleanAiText(text: string): string {
  return text.replace(NON_BREAKING_SPACES, " ").replace(EM_DASH, " - ");
}

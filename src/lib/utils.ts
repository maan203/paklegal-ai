// The site's style avoids em dashes; AI models use them heavily.
export function removeEmDashes(text: string): string {
  return text.replace(/\s*\u2014\s*/g, " - ");
}

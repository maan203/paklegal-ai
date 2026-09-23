// Copy and print helpers shared by the document generator pages.

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API is unavailable on insecure origins and some mobile browsers.
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

const PRINT_STYLES = `
  body { font-family: Georgia, "Times New Roman", "Noto Nastaliq Urdu", serif; padding: 2cm; line-height: 1.7; color: #111; font-size: 13px; }
  h1, h2, h3 { line-height: 1.4; margin: 1.2em 0 0.4em; }
  h1 { font-size: 18px; } h2 { font-size: 16px; } h3 { font-size: 14px; }
  p, li, h1, h2, h3, td, th { unicode-bidi: plaintext; text-align: start; }
  ul, ol { padding-inline-start: 1.5em; }
  table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #999; padding: 4px 8px; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 1.2em 0; }
  :lang(ur), [dir="rtl"] { line-height: 2.2; }
`;

// Prints the already-rendered (and React-escaped) result HTML in a clean window.
// Returns false when the browser blocked the popup.
export function printDocument(title: string, element: HTMLElement | null): boolean {
  if (!element) return false;
  const w = window.open("", "_blank");
  if (!w) return false;
  const safeTitle = title.replace(/[<>&]/g, "");
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap">` +
      `<style>${PRINT_STYLES}</style></head><body>${element.innerHTML}</body></html>`,
  );
  w.document.close();
  w.focus();
  // Wait for the stylesheet and Urdu web font so Nastaliq text prints correctly,
  // but never longer than 3 seconds (e.g. when offline).
  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    w.print();
  };
  const whenLoaded = () => w.document.fonts.ready.then(print, print);
  if (w.document.readyState === "complete") whenLoaded();
  else w.addEventListener("load", whenLoaded);
  setTimeout(print, 3000);
  return true;
}

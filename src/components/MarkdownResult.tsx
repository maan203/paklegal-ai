import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cleanAiText } from "@/lib/utils";

// dir="auto" lets each block follow its own script, so Urdu lines read right-to-left
// even when the rest of the page is in English (and vice versa).
const components: Components = {
  p: ({ node: _node, ...props }) => <p dir="auto" {...props} />,
  li: ({ node: _node, ...props }) => <li dir="auto" {...props} />,
  h1: ({ node: _node, ...props }) => <h1 dir="auto" {...props} />,
  h2: ({ node: _node, ...props }) => <h2 dir="auto" {...props} />,
  h3: ({ node: _node, ...props }) => <h3 dir="auto" {...props} />,
  td: ({ node: _node, ...props }) => <td dir="auto" {...props} />,
  th: ({ node: _node, ...props }) => <th dir="auto" {...props} />,
  a: ({ node: _node, ...props }) => (
    <a target="_blank" rel="noopener noreferrer" className="text-primary underline" {...props} />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  ),
};

export function MarkdownResult({ text }: { text: string }) {
  return (
    <div
      className="doc-result prose prose-sm max-w-none text-foreground break-words
      [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-foreground
      [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1
      [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-foreground
      [&_p]:mb-3 [&_p]:text-foreground
      [&_ul]:my-2 [&_ul]:ps-5 [&_ul]:list-disc
      [&_ol]:my-2 [&_ol]:ps-5 [&_ol]:list-decimal
      [&_li]:mb-1 [&_li]:text-foreground
      [&_strong]:font-semibold [&_strong]:text-foreground
      [&_hr]:my-4 [&_hr]:border-border
      [&_blockquote]:border-s-4 [&_blockquote]:border-primary/40 [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
      [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs
      [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted
    "
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {cleanAiText(text)}
      </ReactMarkdown>
    </div>
  );
}

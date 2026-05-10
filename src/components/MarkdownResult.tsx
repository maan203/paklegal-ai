import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownResult({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none text-foreground
      [&_h1]:font-display [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:text-foreground
      [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-foreground [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-1
      [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_h3]:text-foreground
      [&_p]:leading-relaxed [&_p]:mb-3 [&_p]:text-foreground
      [&_ul]:my-2 [&_ul]:ps-5 [&_ul]:list-disc
      [&_ol]:my-2 [&_ol]:ps-5 [&_ol]:list-decimal
      [&_li]:mb-1 [&_li]:leading-relaxed [&_li]:text-foreground
      [&_strong]:font-semibold [&_strong]:text-foreground
      [&_hr]:my-4 [&_hr]:border-border
      [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
      [&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { MarkdownResult } from "@/components/MarkdownResult";
import { LegalSources } from "@/components/LegalSources";
import type { useLegalChat } from "@/hooks/useLegalChat";

type Props = {
  chat: ReturnType<typeof useLegalChat>;
  placeholder: string;
  // Shown before the first message (e.g. suggested questions).
  emptyState?: ReactNode;
  // Scrolls within this box instead of growing the page.
  scrollable?: boolean;
};

// Message list with legal sources under each answer, plus the input box.
export function ChatThread({ chat, placeholder, emptyState, scrollable = false }: Props) {
  const { t, lang } = useLang();
  const { messages, input, setInput, isLoading, send } = chat;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length || isLoading)
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ignore Enter while an IME (e.g. Urdu keyboard) is still composing a word.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      <div className={`space-y-3 ${scrollable ? "flex-1 overflow-y-auto px-3 py-3" : ""}`}>
        {messages.length === 0 && emptyState}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              {m.role === "user" ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}
            >
              {m.role === "assistant" ? (
                <>
                  <MarkdownResult text={m.content} />
                  {m.answer && <LegalSources {...m.answer} />}
                </>
              ) : (
                <p className="leading-relaxed whitespace-pre-line">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">
                {t("Searching the law and thinking…", "قانون تلاش کر رہا ہے…")}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        className={scrollable ? "flex-shrink-0 border-t border-border bg-card px-3 py-2.5" : "mt-3"}
      >
        <div className="flex gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <textarea
            rows={scrollable ? 1 : 2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 bg-transparent resize-none text-sm focus:outline-none max-h-24 ${lang === "ur" ? "urdu" : ""}`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={isLoading || !input.trim()}
            aria-label={t("Send", "بھیجیں")}
            className="self-end rounded-lg bg-primary p-1.5 text-primary-foreground hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageCircle, X, Send, Loader2, Bot, User, RotateCcw } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { askLegalQuestion, type ChatAnswer, type ChatMessage } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { LegalSources } from "@/components/LegalSources";

// Assistant messages also keep the legal sources their answer was based on.
type UiMessage = ChatMessage & { answer?: Omit<ChatAnswer, "text"> };
import { toast } from "sonner";

const SUGGESTIONS = [
  { en: "What are my rights if I'm arrested?", ur: "گرفتاری پر میرے کیا حقوق ہیں؟" },
  { en: "My landlord wants to evict me illegally. What can I do?", ur: "مالک مکان مجھے غیر قانونی طور پر بے دخل کر رہا ہے، کیا کروں؟" },
  { en: "How do I file a complaint against my employer for unpaid salary?", ur: "تنخواہ نہ ملنے پر آجر کے خلاف شکایت کیسے کروں؟" },
  { en: "What is Section 420 PPC?", ur: "دفعہ ٤٢٠ تعزیرات پاکستان کیا ہے؟" },
];

export function ChatWidget() {
  const { t, lang } = useLang();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, t]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: UiMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    try {
      // Only the conversation text goes to the server, not the sources shown in the UI.
      const history = updated.map(({ role, content }) => ({ role, content }));
      const { text: answerText, ...answer } = await askLegalQuestion({ data: { messages: history } });
      setMessages([...updated, { role: "assistant", content: answerText, answer }]);
    } catch (err) {
      // Drop the unanswered question and give it back so the user can retry.
      setMessages(messages);
      setInput(text);
      toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ignore Enter while an IME (e.g. Urdu keyboard) is still composing a word.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(input);
    }
  };

  // The full chat page has its own input; the floating button would cover it.
  if (pathname === "/chat") return null;

  return (
    <>
      {/* Popup */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(92vw,380px)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          style={{ height: "min(600px, calc(100vh - 120px))" }}>
          {/* Header */}
          <div className="flex items-center justify-between gap-3 bg-[image:var(--gradient-primary)] px-4 py-3 text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">{t("Legal Assistant", "قانونی معاون")}</p>
                <p className="text-xs opacity-80 mt-0.5">{t("Ask anything about Pakistani law", "پاکستانی قانون کے بارے میں پوچھیں")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button onClick={() => setMessages([])}
                  className="p-1.5 rounded-md hover:bg-white/20 transition" title={t("Clear chat", "چیٹ صاف کریں")} aria-label={t("Clear chat", "چیٹ صاف کریں")}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-white/20 transition" aria-label={t("Close", "بند کریں")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className={`text-xs text-muted-foreground text-center pb-1 ${lang === "ur" ? "urdu" : ""}`}>
                  {t("Try a question below or type your own", "نیچے سے سوال چنیں یا اپنا سوال لکھیں")}
                </p>
                {SUGGESTIONS.map((s) => (
                  <button key={s.en} onClick={() => send(t(s.en, s.ur))}
                    className={`w-full text-start rounded-xl border border-border bg-card px-3 py-2.5 text-xs hover:border-primary/50 hover:bg-primary/5 transition ${lang === "ur" ? "urdu" : ""}`}>
                    {t(s.en, s.ur)}
                  </button>
                ))}
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-full flex-shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                  {m.role === "assistant"
                    ? <>
                      <MarkdownResult text={m.content} />
                      {m.answer && <LegalSources {...m.answer} />}
                    </>
                    : <p className="leading-relaxed">{m.content}</p>
                  }
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
                  <span className="text-xs text-muted-foreground">{t("Thinking…", "سوچ رہا ہے…")}</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border bg-card px-3 py-2.5">
            <div className="flex gap-2 rounded-xl border border-border bg-background px-3 py-2">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("Type your question…", "اپنا سوال لکھیں…")}
                className={`flex-1 bg-transparent resize-none text-sm focus:outline-none max-h-24 ${lang === "ur" ? "urdu" : ""}`}
                disabled={isLoading}
              />
              <button
                onClick={() => send(input)}
                disabled={isLoading || !input.trim()}
                aria-label={t("Send", "بھیجیں")}
                className="self-end rounded-lg bg-primary p-1.5 text-primary-foreground hover:opacity-90 disabled:opacity-40 transition flex-shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              {t("AI guidance only. Consult a lawyer for your case.", "صرف عمومی رہنمائی۔ اپنے مقدمے کے لیے وکیل سے رابطہ کریں")}
            </p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-4 sm:right-6 z-50 h-14 w-14 rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-elevated)] hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
        aria-label={t("Open Legal Chat", "قانونی چیٹ کھولیں")}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

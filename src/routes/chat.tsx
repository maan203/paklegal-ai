import { createFileRoute } from "@tanstack/react-router";
import { Send, Loader2, RotateCcw, Bot, User } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useLang } from "@/lib/i18n";
import { useState, useRef, useEffect, useCallback } from "react";
import { askLegalQuestion, type ChatMessage } from "@/lib/ai-functions";
import { MarkdownResult } from "@/components/MarkdownResult";
import { toast } from "sonner";

export const Route = createFileRoute("/chat")({
  component: Page,
  head: () => ({ meta: [{ title: "Legal Chat Assistant — PakLegal AI" }] }),
});

const SUGGESTIONS = [
  { en: "What are my rights if I'm arrested?", ur: "گرفتاری پر میرے کیا حقوق ہیں؟" },
  { en: "My landlord wants to evict me illegally — what can I do?", ur: "مالک مکان مجھے غیر قانونی طور پر بے دخل کر رہا ہے — کیا کروں؟" },
  { en: "How do I file a complaint against my employer for unpaid salary?", ur: "تنخواہ نہ ملنے پر آجر کے خلاف شکایت کیسے کروں؟" },
  { en: "What is Section 420 PPC?", ur: "دفعہ ٤٢٠ تعزیرات پاکستان کیا ہے؟" },
];

function Page() {
  const { t, lang } = useLang();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);
    try {
      const res = await askLegalQuestion({ data: { messages: updated } });
      setMessages([...updated, { role: "assistant", content: res.text }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 flex flex-col" style={{ minHeight: "calc(100vh - 4rem - 200px)" }}>
        {/* Header */}
        <div className="pt-10 pb-6 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">{t("Feature 05", "خصوصیت ۰۵")}</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold">{t("Legal Chat Assistant", "قانونی چیٹ اسسٹنٹ")}</h1>
            <p className={`mt-2 text-muted-foreground max-w-xl ${lang === "ur" ? "urdu" : ""}`}>
              {t("Ask any question about Pakistani law — in English or Urdu.", "پاکستانی قانون کے بارے میں انگریزی یا اردو میں کوئی بھی سوال پوچھیں۔")}
            </p>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 hover:bg-muted transition">
              <RotateCcw className="h-3.5 w-3.5" />
              {t("Clear", "صاف کریں")}
            </button>
          )}
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.en}
                onClick={() => send(t(s.en, s.ur))}
                className={`text-start rounded-xl border border-border bg-card p-4 text-sm hover:border-primary/50 hover:bg-primary/5 transition ${lang === "ur" ? "urdu" : ""}`}
              >
                {t(s.en, s.ur)}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-4 mb-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm"}`}>
                {m.role === "assistant"
                  ? <MarkdownResult text={m.content} />
                  : <p className="text-sm leading-relaxed">{m.content}</p>
                }
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{t("Thinking…", "سوچ رہا ہے…")}</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-background pb-6 pt-2">
          <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-soft)]">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("Ask a legal question… (Enter to send)", "قانونی سوال پوچھیں… (بھیجنے کے لیے Enter دبائیں)")}
              className={`flex-1 bg-transparent resize-none px-3 py-2 text-sm focus:outline-none ${lang === "ur" ? "urdu" : ""}`}
              disabled={isLoading}
            />
            <button
              onClick={() => send(input)}
              disabled={isLoading || !input.trim()}
              className="self-end rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {t("⚠️ AI-generated legal information only. Consult a qualified lawyer for your case.", "⚠️ یہ عمومی قانونی معلومات ہیں۔ اپنے مقدمے کے لیے وکیل سے رابطہ کریں۔")}
          </p>
        </div>
      </div>
    </PageShell>
  );
}

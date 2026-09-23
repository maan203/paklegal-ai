import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { MessageCircle, X, Bot, RotateCcw } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { useLegalChat } from "@/hooks/useLegalChat";
import { ChatThread } from "@/components/ChatThread";

const SUGGESTIONS = [
  { en: "What are my rights if I'm arrested?", ur: "گرفتاری پر میرے کیا حقوق ہیں؟" },
  {
    en: "Can the police refuse to register my FIR?",
    ur: "کیا پولیس میری ایف آئی آر درج کرنے سے انکار کر سکتی ہے؟",
  },
  { en: "What is the punishment for a bounced cheque?", ur: "چیک باؤنس ہونے کی سزا کیا ہے؟" },
  { en: "What is Section 420 PPC?", ur: "دفعہ ٤٢٠ تعزیرات پاکستان کیا ہے؟" },
];

// Floating "quick question" chat, available on every page except the incident page
// (which has its own follow-up chat).
export function ChatWidget() {
  const { t, lang } = useLang();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [open, setOpen] = useState(false);
  const chat = useLegalChat();

  if (pathname === "/incident") return null;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(92vw,380px)] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden"
          style={{ height: "min(600px, calc(100vh - 120px))" }}
        >
          <div className="flex items-center justify-between gap-3 bg-[image:var(--gradient-primary)] px-4 py-3 text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">
                  {t("Quick legal question", "فوری قانونی سوال")}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {t("Answers cite Pakistani law", "جوابات پاکستانی قانون کے حوالے سے")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chat.messages.length > 0 && (
                <button
                  onClick={chat.reset}
                  className="p-1.5 rounded-md hover:bg-white/20 transition"
                  title={t("Clear chat", "چیٹ صاف کریں")}
                  aria-label={t("Clear chat", "چیٹ صاف کریں")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-white/20 transition"
                aria-label={t("Close", "بند کریں")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <ChatThread
            chat={chat}
            scrollable
            placeholder={t("Type your question…", "اپنا سوال لکھیں…")}
            emptyState={
              <div className="space-y-2 pt-1">
                <p
                  className={`text-xs text-muted-foreground text-center pb-1 ${lang === "ur" ? "urdu" : ""}`}
                >
                  {t(
                    "Try a question below or type your own",
                    "نیچے سے سوال چنیں یا اپنا سوال لکھیں",
                  )}
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.en}
                    onClick={() => chat.send(t(s.en, s.ur))}
                    className={`w-full text-start rounded-xl border border-border bg-card px-3 py-2.5 text-xs hover:border-primary/50 hover:bg-primary/5 transition ${lang === "ur" ? "urdu" : ""}`}
                  >
                    {t(s.en, s.ur)}
                  </button>
                ))}
              </div>
            }
          />
        </div>
      )}

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

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { askLegalQuestion, type ChatAnswer, type ChatMessage } from "@/lib/ai-functions";
import { useLang } from "@/lib/i18n";

// Assistant messages also keep the legal sources their answer was based on.
export type UiMessage = ChatMessage & { answer?: ChatAnswer };

// Conversation state for a legal chat. `seed` messages (e.g. an analysed situation) are sent
// as history but not shown, so follow-up questions have that context.
export function useLegalChat(seed: ChatMessage[] = []) {
  const { t } = useLang();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      const updated: UiMessage[] = [...messages, { role: "user", content: text.trim() }];
      setMessages(updated);
      setInput("");
      setIsLoading(true);
      try {
        // Only the conversation text goes to the server, not the sources shown in the UI.
        const history = [...seed, ...updated].map(({ role, content }) => ({ role, content }));
        const answer = await askLegalQuestion({ data: { messages: history } });
        setMessages([...updated, { role: "assistant", content: answer.text, answer }]);
      } catch (err) {
        // Drop the unanswered question and give it back so the user can retry.
        setMessages(messages);
        setInput(text);
        toast.error(err instanceof Error ? err.message : t("An error occurred.", "خرابی آئی۔"));
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, seed, t],
  );

  return { messages, input, setInput, isLoading, send, reset: () => setMessages([]) };
}

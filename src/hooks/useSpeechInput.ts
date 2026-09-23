import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";

// Browser speech-to-text (Chrome/Edge). Calls onText with each finished phrase.
// toggle() starts listening, or stops if already listening.
export function useSpeechInput(onText: (text: string) => void) {
  const { t, lang } = useLang();
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // Release the microphone if the component unmounts mid-recording.
  useEffect(() => () => recognitionRef.current?.abort(), []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      toast.error(
        t(
          "Voice input not supported in this browser. Try Chrome.",
          "اس براؤزر میں آواز سے اندراج ممکن نہیں۔ کروم استعمال کریں۔",
        ),
      );
      return;
    }
    const recognition = new SR();
    recognition.lang = lang === "ur" ? "ur-PK" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // Only take results added by this event; earlier ones were already delivered.
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) transcript += event.results[i][0].transcript;
      }
      if (transcript.trim()) onTextRef.current(transcript.trim());
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      toast.error(
        event.error === "not-allowed"
          ? t(
              "Microphone access was blocked. Allow it in your browser settings.",
              "مائیکروفون کی اجازت نہیں ملی۔ براؤزر کی ترتیبات میں اجازت دیں۔",
            )
          : t("Voice recognition error. Try again.", "آواز پہچاننے میں خرابی۔"),
      );
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
    }
  }, [lang, t]);

  return { isListening, toggle };
}

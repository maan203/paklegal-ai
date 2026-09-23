import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLang } from "@/lib/i18n";
import { transcribeAudio } from "@/lib/ai-functions";

const MAX_SECONDS = 180;
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

type Status = "idle" | "recording" | "transcribing";

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Records the microphone and transcribes it with Whisper on the server. onText receives the
// transcript, which the page shows for the user to correct before it is analysed.
export function useVoiceRecorder(onText: (text: string) => void) {
  const { t } = useLang();
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  // Release the microphone if the page is left mid-recording.
  useEffect(
    () => () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    },
    [],
  );

  // Auto-stop at the time limit.
  useEffect(() => {
    if (status !== "recording") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);
  useEffect(() => {
    if (seconds >= MAX_SECONDS) recorderRef.current?.stop();
  }, [seconds]);

  const start = useCallback(
    async (language: "ur" | "en") => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        toast.error(
          t("Recording is not supported in this browser.", "اس براؤزر میں ریکارڈنگ ممکن نہیں۔"),
        );
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        toast.error(
          t(
            "Microphone access was blocked. Allow it in your browser settings.",
            "مائیکروفون کی اجازت نہیں ملی۔ براؤزر کی ترتیبات میں اجازت دیں۔",
          ),
        );
        return;
      }
      const mimeType = MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setStatus("transcribing");
        try {
          const { text } = await transcribeAudio({
            data: { audioBase64: await toBase64(blob), mimeType: blob.type, language },
          });
          onTextRef.current(text);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? err.message
              : t("Could not transcribe.", "ٹرانسکرائب نہیں ہو سکا۔"),
          );
        } finally {
          setStatus("idle");
        }
      };
      recorderRef.current = recorder;
      setSeconds(0);
      recorder.start();
      setStatus("recording");
    },
    [t],
  );

  const stop = useCallback(() => recorderRef.current?.stop(), []);

  return { status, seconds, maxSeconds: MAX_SECONDS, start, stop };
}

import { useLang } from "@/lib/i18n";
export function SiteFooter() {
  const { t } = useLang();
  return (
    <footer className="mt-24 border-t border-border/60 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">PakLegal AI</p>
        <p className="mt-2 max-w-2xl">
          {t(
            "Free legal aid for every Pakistani citizen. PakLegal AI is an information tool, not a substitute for a qualified lawyer.",
            "ہر پاکستانی شہری کے لیے مفت قانونی مدد۔ پاک لیگل اے آئی صرف معلومات فراہم کرتا ہے، یہ کسی مستند وکیل کا متبادل نہیں ہے۔"
          )}
        </p>
        <p className="mt-6 text-xs">© {new Date().getFullYear()} PakLegal AI</p>
      </div>
    </footer>
  );
}

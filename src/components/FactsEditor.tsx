import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { SituationFacts } from "@/lib/ai-functions";

type Props = {
  facts: SituationFacts;
  onSave: (facts: SituationFacts) => void;
  onCancel: () => void;
};

const input =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

// One item per line, for simple lists.
const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

// The review step: the person corrects what the AI extracted before any document is built from it.
export function FactsEditor({ facts, onSave, onCancel }: Props) {
  const { t, lang } = useLang();
  const [draft, setDraft] = useState(facts);
  const [losses, setLosses] = useState(toLines(facts.losses));
  const [evidence, setEvidence] = useState(toLines(facts.evidence));
  const ur = lang === "ur" ? "urdu" : "";
  const set = <K extends keyof SituationFacts>(key: K, value: SituationFacts[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const label = (en: string, urText: string) => (
    <span className={`block text-xs font-semibold text-muted-foreground mb-1 ${ur}`}>
      {t(en, urText)}
    </span>
  );
  const removeButton = (onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("Remove", "ہٹائیں")}
      className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
  const addButton = (onClick: () => void, en: string, urText: string) => (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary"
    >
      <Plus className="h-3.5 w-3.5" />
      {t(en, urText)}
    </button>
  );

  return (
    <div dir="auto" className="mt-3 space-y-4 text-sm">
      <label className="block">
        {label("Summary", "خلاصہ")}
        <textarea
          dir="auto"
          rows={3}
          className={input}
          value={draft.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </label>

      <div>
        {label("What happened, in order", "واقعات ترتیب وار")}
        <div className="space-y-2">
          {draft.timeline.map((ev, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                dir="auto"
                className={`${input} w-32 shrink-0`}
                placeholder={t("When", "کب")}
                value={ev.when}
                onChange={(e) =>
                  set(
                    "timeline",
                    draft.timeline.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)),
                  )
                }
              />
              <textarea
                dir="auto"
                rows={2}
                className={input}
                value={ev.what}
                onChange={(e) =>
                  set(
                    "timeline",
                    draft.timeline.map((x, j) => (j === i ? { ...x, what: e.target.value } : x)),
                  )
                }
              />
              {removeButton(() =>
                set(
                  "timeline",
                  draft.timeline.filter((_, j) => j !== i),
                ),
              )}
            </div>
          ))}
        </div>
        {addButton(
          () => set("timeline", [...draft.timeline, { when: "", what: "" }]),
          "Add event",
          "واقعہ شامل کریں",
        )}
      </div>

      <div>
        {label("People involved", "متعلقہ افراد")}
        <div className="space-y-2">
          {draft.people.map((p, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                dir="auto"
                className={`${input} w-32 shrink-0`}
                placeholder={t("Role", "کردار")}
                value={p.role}
                onChange={(e) =>
                  set(
                    "people",
                    draft.people.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)),
                  )
                }
              />
              <input
                dir="auto"
                className={input}
                value={p.description}
                onChange={(e) =>
                  set(
                    "people",
                    draft.people.map((x, j) =>
                      j === i ? { ...x, description: e.target.value } : x,
                    ),
                  )
                }
              />
              {removeButton(() =>
                set(
                  "people",
                  draft.people.filter((_, j) => j !== i),
                ),
              )}
            </div>
          ))}
        </div>
        {addButton(
          () => set("people", [...draft.people, { role: "", description: "" }]),
          "Add person",
          "فرد شامل کریں",
        )}
      </div>

      <label className="block">
        {label("Location", "مقام")}
        <input
          dir="auto"
          className={input}
          value={draft.location}
          onChange={(e) => set("location", e.target.value)}
        />
      </label>

      <label className="block">
        {label("Losses and injuries (one per line)", "نقصانات اور چوٹیں (ہر سطر میں ایک)")}
        <textarea
          dir="auto"
          rows={3}
          className={input}
          value={losses}
          onChange={(e) => setLosses(e.target.value)}
        />
      </label>

      <label className="block">
        {label("Witnesses and evidence (one per line)", "گواہ اور ثبوت (ہر سطر میں ایک)")}
        <textarea
          dir="auto"
          rows={3}
          className={input}
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onSave({
              ...draft,
              timeline: draft.timeline.filter((ev) => ev.what.trim()),
              people: draft.people.filter((p) => p.role.trim() || p.description.trim()),
              losses: fromLines(losses),
              evidence: fromLines(evidence),
            })
          }
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("Save facts", "حقائق محفوظ کریں")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          {t("Cancel", "منسوخ")}
        </button>
      </div>
    </div>
  );
}

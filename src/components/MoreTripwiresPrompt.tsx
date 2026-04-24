"use client";
import { Card } from "@/components/ui";
import { useEntries, type FlagEvent } from "@/lib/store";
import { useSession } from "@/lib/session";
import { isToday, parseISO } from "date-fns";
import { AlertTriangle, Check } from "lucide-react";
import { useMemo } from "react";

/** Shown on Daily Trace when the user is redirected here after tapping a
 *  tripwire. Lists the full trigger set so they can log additional flags
 *  without switching back to the Tripwires screen. */

const TRIGGERS = [
  "Temperature 37.8°C or higher",
  "Chills, sweats, shivers, or shakes",
  "Shortness of breath, wheeze, chest pain, arm tingling/discomfort",
  "Uncontrolled vomiting or diarrhoea",
  "Sudden deterioration, confusion, faintness, severe weakness",
  "Severe rash, swelling, allergic reaction, or anaphylaxis symptoms",
  "New bleeding, black stools, blood in urine",
  "Severe left upper abdominal pain",
];

export function MoreTripwiresPrompt() {
  const { addEntry } = useSession();
  const flags = useEntries("flag");

  const todaysFlagLabels = useMemo(
    () =>
      new Set(
        flags
          .filter((f) => isToday(parseISO(f.createdAt)))
          .map((f) => f.triggerLabel),
      ),
    [flags],
  );

  const logTrigger = async (trigger: string) => {
    if (todaysFlagLabels.has(trigger)) return;
    await addEntry({
      kind: "flag",
      triggerLabel: trigger,
    } as Omit<FlagEvent, "id" | "createdAt">);
  };

  return (
    <Card className="mb-4 border-[var(--alert)] bg-[var(--alert-soft)]">
      <div className="flex items-start gap-3 mb-3">
        <AlertTriangle size={20} className="text-[var(--alert)] shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-[var(--alert)]">
            A tripwire was logged — any others happening?
          </div>
          <div className="text-xs text-[var(--ink-soft)] mt-0.5">
            Tap any that also apply so the whole picture is captured in one go.
          </div>
        </div>
      </div>
      <div className="space-y-1.5">
        {TRIGGERS.map((t) => {
          const logged = todaysFlagLabels.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => logTrigger(t)}
              disabled={logged}
              className={`w-full text-left rounded-xl border px-3 py-2.5 text-sm transition ${
                logged
                  ? "border-[var(--primary)] bg-[var(--surface)] opacity-75"
                  : "border-[var(--border)] bg-[var(--surface)] active:bg-[var(--alert-soft)]"
              }`}
            >
              <span className="flex items-start gap-2">
                {logged && <Check size={14} className="text-[var(--primary)] shrink-0 mt-0.5" />}
                <span className="flex-1">{t}</span>
                {logged && <span className="text-[11px] text-[var(--primary)] font-semibold">logged</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

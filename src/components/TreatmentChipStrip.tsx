"use client";
import type { TreatmentRow } from "@/lib/store";

/** Reusable chip strip for the treatment-log picker. Renders one
 *  chip per option; tapping toggles the row in/out of `treatments`.
 *  Used on /admissions and /emergency for the Tests / investigations
 *  and Medications / treatments sub-strips. The Med Deck strip uses
 *  its own component because it carries extra badges (PRN / hosp /
 *  stopped) and pulls dose into the row's details on add. */
export function TreatmentChipStrip({
  label,
  options,
  treatments,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  treatments: TreatmentRow[];
  onToggle: (option: string, isAdded: boolean) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const added = treatments.some((x) => x.treatment === opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt, added)}
              className={
                added
                  ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1.5 text-xs font-medium text-white"
                  : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]"
              }
            >
              {added ? "✓" : "+"} {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

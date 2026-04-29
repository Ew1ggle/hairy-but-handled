"use client";
import { TextInput } from "@/components/ui";

/** Common AU hospital teams an HCL patient is likely to land under.
 *  "Other" deliberately sits on the end and clears the field so the
 *  TextInput becomes the obvious next tap target — matches the
 *  presentation-picker pattern used elsewhere. */
const TREATING_TEAMS = [
  "Haematology",
  "Oncology",
  "Infectious Diseases",
  "General Medicine",
  "Respiratory",
  "Gastroenterology",
  "Cardiology",
  "Renal",
  "ICU / HDU",
  "Surgery",
  "Other",
];

/** Picker for the admitting team / consultant. Chip taps set the
 *  field to the team name; user can type freely on top to add a
 *  consultant ("Haematology — Dr Patel") or override entirely. */
export function TreatingTeamPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // A chip is "on" when its label matches the start of the current
  // value — so typing "Haematology — Dr Patel" keeps the
  // Haematology chip highlighted.
  const matchedChip = TREATING_TEAMS.find(
    (t) => t !== "Other" && value.toLowerCase().startsWith(t.toLowerCase()),
  );

  const pick = (team: string) => {
    if (team === "Other") {
      // Clear so the user can type. If they had a non-chip value
      // already, keep it (Other isn't a destructive action).
      if (matchedChip) onChange("");
      return;
    }
    // If the user already had "Haematology — Dr Patel" and they
    // tap Oncology, swap the team prefix but keep the consultant
    // tail.
    if (matchedChip) {
      const tail = value.slice(matchedChip.length).trimStart();
      onChange(tail ? `${team} ${tail}` : team);
    } else {
      onChange(team);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {TREATING_TEAMS.map((t) => {
          const on = matchedChip === t || (t === "Other" && !matchedChip && value.trim() !== "");
          return (
            <button
              key={t}
              type="button"
              onClick={() => pick(t)}
              className={
                on
                  ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                  : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
              }
            >
              {on ? "✓" : "+"} {t}
            </button>
          );
        })}
      </div>
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={matchedChip ? `${matchedChip} — Dr Patel` : "e.g. Haematology — Dr Patel"}
      />
    </div>
  );
}

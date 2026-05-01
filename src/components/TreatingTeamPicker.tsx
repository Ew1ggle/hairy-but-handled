"use client";
import { TextInput } from "@/components/ui";
import { useCareTeamMembers } from "@/lib/useCareTeam";

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

/** Picker for the admitting team / consultant. Two chip strips:
 *  - Top: the patient's care-team practitioners (haematologist, GP,
 *    coordinator, customPractitioners). Tapping fills "Role — Name"
 *    so the admission record carries the actual doctor's name and
 *    position, not just a specialty bucket.
 *  - Bottom: generic specialty buckets for cases where the team
 *    isn't a known practitioner (an inpatient consultant the
 *    patient hasn't met before, an ICU team, etc).
 *  Free-text input below either strip lets the user override or add
 *  more detail ("Haematology — Dr Patel and Dr Smith"). */
export function TreatingTeamPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const careTeam = useCareTeamMembers();

  // A specialty chip is "on" when its label matches the start of
  // the current value — so typing "Haematology — Dr Patel" keeps
  // the Haematology chip highlighted.
  const matchedChip = TREATING_TEAMS.find(
    (t) => t !== "Other" && value.toLowerCase().startsWith(t.toLowerCase()),
  );

  // A care-team chip is "on" when its label matches the value
  // exactly (case-insensitively).
  const matchedCareTeam = careTeam.find(
    (m) => value.trim().toLowerCase() === m.label.toLowerCase(),
  );

  const pickSpecialty = (team: string) => {
    if (team === "Other") {
      if (matchedChip || matchedCareTeam) onChange("");
      return;
    }
    if (matchedChip) {
      const tail = value.slice(matchedChip.length).trimStart();
      onChange(tail ? `${team} ${tail}` : team);
    } else {
      onChange(team);
    }
  };

  const pickCareTeam = (label: string) => {
    onChange(matchedCareTeam?.label === label ? "" : label);
  };

  return (
    <div className="space-y-2">
      {careTeam.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
            From care team
          </div>
          <div className="flex flex-wrap gap-1.5">
            {careTeam.map((m) => {
              const on = matchedCareTeam?.label === m.label;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => pickCareTeam(m.label)}
                  className={
                    on
                      ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                      : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                  }
                >
                  {on ? "✓" : "+"} {m.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div>
        {careTeam.length > 0 && (
          <div className="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
            Or pick a specialty
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {TREATING_TEAMS.map((t) => {
            const on = matchedChip === t || (t === "Other" && !matchedChip && !matchedCareTeam && value.trim() !== "");
            return (
              <button
                key={t}
                type="button"
                onClick={() => pickSpecialty(t)}
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
      </div>
      <TextInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={matchedChip ? `${matchedChip} — Dr Patel` : "e.g. Haematology — Dr Patel"}
      />
    </div>
  );
}

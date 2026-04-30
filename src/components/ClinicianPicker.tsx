"use client";

/** Generic chip-picker for any clinician name field. Shows one chip
 *  per known clinician (passed in by the parent — typically pulled
 *  from the patient profile's care team + names already used on the
 *  current row + "Other"). Tap a chip to set the value; the free-text
 *  input remains editable on top so consultant detail can be appended.
 *
 *  Used on /emergency (doctors / nurses arrays), /treatment/[day]
 *  (nurse), /appointments (provider), /meds (prescriber) — keeps the
 *  pattern consistent everywhere a name is captured. */
export function ClinicianPicker({
  value,
  onChange,
  known,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  known: string[];
  placeholder?: string;
}) {
  const matchedChip = known.find(
    (d) => value.trim() && d.toLowerCase() === value.trim().toLowerCase(),
  );
  return (
    <div className="space-y-1.5">
      {known.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {known.map((d) => {
            const on = matchedChip === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChange(on ? "" : d)}
                className={
                  on
                    ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                    : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                }
              >
                {on ? "✓" : "+"} {d}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              // "Other" clears any chip selection so the text input is
              // the obvious next tap target. Doesn't blow away typed
              // values that aren't on the chip list.
              if (matchedChip) onChange("");
            }}
            className={
              !matchedChip && value.trim()
                ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
            }
          >
            {!matchedChip && value.trim() ? "✓" : "+"} Other
          </button>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          placeholder ?? (
            known.length > 0
              ? "Pick a chip above or type a name"
              : "Doctor / nurse name"
          )
        }
        className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
      />
    </div>
  );
}

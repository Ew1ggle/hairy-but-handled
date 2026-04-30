"use client";
import { DateInput, TextInput } from "@/components/ui";
import type { TreatmentCourse } from "@/lib/store";
import { addHours, format, parse } from "date-fns";
import { useState } from "react";

/** Common AU prescribing frequencies and how many hours apart each
 *  administration sits. Maps directly to the gap used to step through
 *  the schedule when generating courses. */
const FREQUENCY_OPTIONS: { label: string; hours: number; helper: string }[] = [
  { label: "q4h", hours: 4, helper: "every 4 hours" },
  { label: "q6h", hours: 6, helper: "every 6 hours / QID" },
  { label: "q8h", hours: 8, helper: "every 8 hours / TDS" },
  { label: "q12h", hours: 12, helper: "every 12 hours / BD" },
  { label: "OD (daily)", hours: 24, helper: "once daily" },
  { label: "Every 2 days", hours: 48, helper: "every 2 days" },
  { label: "Weekly", hours: 168, helper: "every 7 days" },
];

/** Inline form that turns a "drug q6h × 5 days" plan into the right
 *  number of TreatmentCourse rows. Start date + optional start time
 *  drive the schedule; if time is unset, courses get a date only. */
export function TreatmentPlanForm({
  defaultDrugName,
  defaultDose,
  onGenerate,
  onCancel,
}: {
  defaultDrugName: string;
  defaultDose: string;
  onGenerate: (courses: TreatmentCourse[], replaceExisting: boolean) => void;
  onCancel: () => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [drugName, setDrugName] = useState(defaultDrugName);
  const [dose, setDose] = useState(defaultDose);
  const [frequencyHours, setFrequencyHours] = useState<number>(6);
  const [totalDoses, setTotalDoses] = useState<string>("20");
  const [startDate, setStartDate] = useState<string>(today);
  const [startTimeKnown, setStartTimeKnown] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<string>(format(new Date(), "HH:mm"));
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);

  const numDoses = Math.max(0, Math.min(200, parseInt(totalDoses, 10) || 0));
  const freqLabel = FREQUENCY_OPTIONS.find((f) => f.hours === frequencyHours)?.label ?? `${frequencyHours}h`;
  const durationDays = Math.ceil((numDoses * frequencyHours) / 24);

  const generate = () => {
    if (!drugName.trim() || numDoses < 1) return;
    const out: TreatmentCourse[] = [];
    // Anchor the schedule. With a known start time we compute exact
    // datetime per course; without one we just step the date and
    // leave time blank.
    const baseDateTime = startTimeKnown
      ? parse(`${startDate} ${startTime}`, "yyyy-MM-dd HH:mm", new Date())
      : parse(startDate, "yyyy-MM-dd", new Date());
    for (let i = 0; i < numDoses; i += 1) {
      const at = addHours(baseDateTime, i * frequencyHours);
      out.push({
        id: crypto.randomUUID(),
        name: drugName.trim(),
        date: format(at, "yyyy-MM-dd"),
        time: startTimeKnown ? format(at, "HH:mm") : undefined,
        details: dose.trim() || `Course ${i + 1}`,
      });
    }
    onGenerate(out, replaceExisting);
  };

  return (
    <div className="rounded-xl border-2 border-[var(--primary)] bg-[var(--surface)] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
          Treatment plan — auto-generate courses
        </div>
        <button type="button" onClick={onCancel} className="text-xs text-[var(--ink-soft)] font-medium">
          Cancel
        </button>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
          Drug name
        </label>
        <input
          type="text"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          placeholder="e.g. Tazocin, Augmentin"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
          Dose / route (applied to every course)
        </label>
        <input
          type="text"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          placeholder="e.g. 4.5g IV"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-1">
          Frequency
        </label>
        <div className="flex flex-wrap gap-1.5">
          {FREQUENCY_OPTIONS.map((f) => {
            const on = frequencyHours === f.hours;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => setFrequencyHours(f.hours)}
                className={
                  on
                    ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-semibold text-white"
                    : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                }
                title={f.helper}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
            Total doses
          </label>
          <input
            type="number"
            min={1}
            max={200}
            value={totalDoses}
            onChange={(e) => setTotalDoses(e.target.value)}
            className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
          />
        </div>
        <div className="text-[11px] text-[var(--ink-soft)] self-end pb-1">
          ≈ {durationDays} day{durationDays === 1 ? "" : "s"} of cover
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-0.5">
          First dose
        </label>
        <div className="grid grid-cols-2 gap-2">
          <DateInput
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none px-1">
            <input
              type="checkbox"
              checked={startTimeKnown}
              onChange={(e) => setStartTimeKnown(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--primary)]"
            />
            <span>Start time known</span>
          </label>
        </div>
        {startTimeKnown && (
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1.5 w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
          />
        )}
      </div>

      <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(e) => setReplaceExisting(e.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--primary)]"
        />
        <span>Replace existing courses (otherwise append)</span>
      </label>

      <button
        type="button"
        onClick={generate}
        disabled={!drugName.trim() || numDoses < 1}
        className="w-full rounded-xl bg-[var(--primary)] text-white font-semibold py-2 text-sm disabled:opacity-50"
      >
        Generate {numDoses} {drugName.trim() || "drug"} course{numDoses === 1 ? "" : "s"}
        <span className="opacity-80 font-normal"> · {freqLabel}</span>
      </button>
    </div>
  );
}

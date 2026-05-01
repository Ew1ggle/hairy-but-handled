"use client";
import { DateInput } from "@/components/ui";
import { useEntries, type TreatmentCourse } from "@/lib/store";
import { isMedEffectivelyStopped } from "@/lib/meds";
import { addHours, format, parse } from "date-fns";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

/** Common AU prescribing frequencies as plain English chips. The
 *  abbreviations the prescriber writes (q6h, BD, TDS, QID) live in
 *  the helper line so the user can match what's on the chart, but
 *  the chip itself reads the way the patient or carer would say it
 *  out loud. */
const FREQUENCY_OPTIONS: { label: string; hours: number; helper: string }[] = [
  { label: "Every 4 hours", hours: 4, helper: "Q4H — six times a day" },
  { label: "Every 6 hours", hours: 6, helper: "Q6H / QID — four times a day" },
  { label: "Every 8 hours", hours: 8, helper: "Q8H / TDS — three times a day" },
  { label: "Every 12 hours", hours: 12, helper: "Q12H / BD — twice a day" },
  { label: "Once a day", hours: 24, helper: "OD — daily" },
  { label: "Every 2 days", hours: 48, helper: "alternate days" },
  { label: "Once a week", hours: 168, helper: "weekly" },
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

  // Pull active meds from the deck so a plan can be tied to a med
  // already in the patient's home regimen instead of free-text. When
  // the typed drug name doesn't match any deck entry, surface a link
  // to /meds so the carer can add it (and come back to fill in the
  // plan once it's saved). Stopped meds are excluded — bringing back
  // a plan for something the team has stopped is a re-prescription
  // decision, not a deck-pick.
  const meds = useEntries("med");
  const activeMeds = useMemo(
    () => meds.filter((m) => !isMedEffectivelyStopped(m)),
    [meds],
  );
  const matchingMed = useMemo(() => {
    const q = drugName.trim().toLowerCase();
    if (!q) return null;
    return activeMeds.find((m) =>
      m.name.toLowerCase() === q
      || (m.brand && m.brand.toLowerCase() === q),
    ) ?? null;
  }, [activeMeds, drugName]);
  // Suggest decks chips when the field is blank. After the user
  // types we trust their value (free text on top of the chips is
  // already an accepted pattern across the app).
  const suggestedMeds = drugName.trim() ? [] : activeMeds.slice(0, 8);

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
        {suggestedMeds.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {suggestedMeds.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setDrugName(m.name);
                  if (!dose.trim() && m.dose) setDose(m.dose);
                }}
                className="rounded-full px-2.5 py-1 text-xs border border-dashed border-[var(--border)] text-[var(--ink-soft)] active:bg-[var(--surface-soft)]"
              >
                + {m.name}{m.dose && <span className="opacity-70"> · {m.dose}</span>}
              </button>
            ))}
          </div>
        )}
        <input
          type="text"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          placeholder="e.g. Tazocin, Augmentin"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
        />
        {matchingMed && (
          <div className="mt-1 text-[10px] text-[var(--primary)] font-semibold">
            Linked to Med Deck — {matchingMed.name}{matchingMed.dose ? ` · ${matchingMed.dose}` : ""}
          </div>
        )}
        {drugName.trim() && !matchingMed && (
          <Link
            href="/meds"
            target="_blank"
            className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--ink-soft)] underline"
          >
            <ExternalLink size={10} /> Not in the Med Deck — open Med Deck to add it
          </Link>
        )}
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
          How often
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
        {/* Surface the abbreviation that's likely written on the chart
             so the carer can confirm they've picked the right option. */}
        <div className="text-[10px] text-[var(--ink-soft)] mt-1.5">
          {FREQUENCY_OPTIONS.find((f) => f.hours === frequencyHours)?.helper}
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

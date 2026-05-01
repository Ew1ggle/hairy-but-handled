"use client";
import { DateInput } from "@/components/ui";
import { useEntries, type MedEntry, type TreatmentCourse } from "@/lib/store";
import { isMedEffectivelyStopped } from "@/lib/meds";
import { useSession } from "@/lib/session";
import { addHours, format, parse } from "date-fns";
import { useMemo, useState } from "react";

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
  // already in the patient's home regimen instead of free-text.
  // Stopped meds are excluded — bringing back a plan for something
  // the team has stopped is a re-prescription decision, not a
  // deck-pick.
  const meds = useEntries("med");
  const { addEntry } = useSession();
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

  // Inline "add to Med Deck" mini-form. Surfaces when the user
  // types a name not in the deck, or taps the "+ Add to Med Deck"
  // button. Saves a MedEntry inline so the user doesn't have to
  // jump pages and lose the treatment plan they were drafting.
  const [addingToDeck, setAddingToDeck] = useState(false);
  const [newMedInstructions, setNewMedInstructions] = useState("");
  const [savingToDeck, setSavingToDeck] = useState(false);
  const saveToMedDeck = async () => {
    if (!drugName.trim()) return;
    setSavingToDeck(true);
    await addEntry({
      kind: "med",
      name: drugName.trim(),
      dose: dose.trim() || undefined,
      instructions: newMedInstructions.trim() || undefined,
      schedule: "short-course",
      status: "active",
      startDate: format(new Date(), "yyyy-MM-dd"),
    } as unknown as Omit<MedEntry, "id" | "createdAt">);
    setSavingToDeck(false);
    setAddingToDeck(false);
    setNewMedInstructions("");
  };

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
        {activeMeds.length > 0 && (
          <div className="mb-1.5">
            <div className="text-[10px] text-[var(--ink-soft)] mb-1">
              From Med Deck — tap to use
            </div>
            <div className="flex flex-wrap gap-1">
              {activeMeds.map((m) => {
                const on = matchingMed?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setDrugName(m.name);
                      if (m.dose && !dose.trim()) setDose(m.dose);
                      setAddingToDeck(false);
                    }}
                    className={
                      on
                        ? "rounded-full px-2.5 py-1 text-xs font-semibold bg-[var(--primary)] text-white border border-[var(--primary)]"
                        : "rounded-full px-2.5 py-1 text-xs border border-dashed border-[var(--border)] text-[var(--ink-soft)] active:bg-[var(--surface-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {m.name}{m.dose && <span className="opacity-70"> · {m.dose}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <input
          type="text"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          placeholder="Or type a drug name"
          className="w-full rounded border border-[var(--border)] bg-[var(--surface-soft)] px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-[var(--primary)]"
        />
        {matchingMed && (
          <div className="mt-1 text-[10px] text-[var(--primary)] font-semibold">
            ✓ Linked to Med Deck — {matchingMed.name}{matchingMed.dose ? ` · ${matchingMed.dose}` : ""}
          </div>
        )}
        {drugName.trim() && !matchingMed && !addingToDeck && (
          <button
            type="button"
            onClick={() => setAddingToDeck(true)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--accent)] font-semibold underline"
          >
            + Add &quot;{drugName.trim()}&quot; to Med Deck
          </button>
        )}
        {addingToDeck && (
          <div className="mt-2 rounded-lg border-2 border-[var(--accent)] bg-[var(--surface-soft)] p-2 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">
              Save to Med Deck — also keeps it in this plan
            </div>
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              placeholder="Drug name"
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
            />
            <input
              type="text"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="Dose / strength (e.g. 500 mg, 4.5g IV)"
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
            />
            <input
              type="text"
              value={newMedInstructions}
              onChange={(e) => setNewMedInstructions(e.target.value)}
              placeholder="Instructions — e.g. 1 tab QID, 7 days (optional)"
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
            />
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={!drugName.trim() || savingToDeck}
                onClick={saveToMedDeck}
                className="flex-1 rounded bg-[var(--accent)] text-white text-xs font-semibold py-1.5 disabled:opacity-50"
              >
                {savingToDeck ? "Saving…" : "Save to Med Deck"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingToDeck(false);
                  setNewMedInstructions("");
                }}
                className="rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-medium px-3"
              >
                Cancel
              </button>
            </div>
          </div>
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

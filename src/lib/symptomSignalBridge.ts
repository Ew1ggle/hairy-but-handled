import { format } from "date-fns";
import type { Signal, SymptomCard, SymptomCardStatusEntry, SymptomDailyStatus } from "./store";

/** Map a daily-status tap to the long-running pattern field on the
 *  parent SymptomCard. Better → improving, Same → steady, Worse →
 *  worsening. */
const STATUS_TO_PATTERN: Record<SymptomDailyStatus, "improving" | "steady" | "worsening"> = {
  better: "improving",
  same: "steady",
  worse: "worsening",
};

/** Map a daily-status tap to the severity descriptor used on the
 *  Other signal. The Other signal stores its severity as a `choice`
 *  picked from SEVERITY_LIKERT (None / Mild / Moderate / Severe /
 *  Worst). We use Mild for "better", Moderate for "same", Severe
 *  for "worse" so the auto-mirrored signal carries useful intensity
 *  info even though the carer only tapped one button. */
const STATUS_TO_SEVERITY: Record<SymptomDailyStatus, string> = {
  better: "Mild",
  same: "Moderate",
  worse: "Severe",
};

export type AddEntryFn = <K extends "symptom" | "signal">(
  payload: K extends "symptom"
    ? Omit<SymptomCard, "id" | "createdAt">
    : Omit<Signal, "id" | "createdAt">,
) => Promise<{ id: string } | null | undefined>;

export type UpdateEntryFn = (id: string, patch: Partial<SymptomCard | Signal>) => Promise<unknown>;

/** Look for an existing SymptomCard by case-insensitive name match.
 *  Used by the Signal → Symptom auto-create flow so a second log of
 *  the same side effect doesn't create a duplicate card. */
export function findSymptomByName(symptoms: readonly SymptomCard[], name: string): SymptomCard | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  return symptoms.find((s) => s.name.trim().toLowerCase() === q) ?? null;
}

/** Append today's status to a SymptomCard's dailyStatuses array. If
 *  the card already has an entry for today, that entry is replaced
 *  so the array stays one-per-date. The most recent entry drives
 *  the card's pattern field. */
export function appendStatus(
  card: SymptomCard,
  status: SymptomDailyStatus,
): Pick<SymptomCard, "dailyStatuses" | "pattern" | "stillActive"> {
  const today = format(new Date(), "yyyy-MM-dd");
  const existing = (card.dailyStatuses ?? []).filter((d) => d.date !== today);
  const next: SymptomCardStatusEntry[] = [
    ...existing,
    { date: today, status },
  ].sort((a, b) => a.date.localeCompare(b.date));
  return {
    dailyStatuses: next,
    pattern: STATUS_TO_PATTERN[status],
    // Re-activate if the card had been resolved — a fresh status
    // tap means the symptom is back.
    stillActive: true,
  };
}

/** Build the Signal payload that mirrors a SymptomCard status into
 *  Signal Sweep. signalType="other" with the symptom name as the
 *  customLabel and the severity descriptor as the choice; tagged
 *  autoFromSymptom so the bridge doesn't loop. Caller passes
 *  status="same" when bridging a fresh symptom-deck add (no
 *  trajectory info yet). */
export function buildMirroredSignal({
  symptomName,
  status,
  edVisitId,
}: {
  symptomName: string;
  status: SymptomDailyStatus;
  edVisitId?: string | null;
}): Omit<Signal, "id" | "createdAt"> {
  return {
    kind: "signal",
    signalType: "other",
    customLabel: symptomName,
    choice: STATUS_TO_SEVERITY[status],
    autoFromSymptom: true,
    ...(edVisitId ? { loggedDuringEd: true, edVisitId } : {}),
  };
}

/** Build the SymptomCard payload that mirrors a Signal Sweep "Other"
 *  entry into the Symptom Deck. Auto-created cards start as still-
 *  active with firstNoticed=today; the bridge tags autoFromSignal so
 *  the reverse link doesn't fire a duplicate signal. */
export function buildMirroredSymptom(name: string): Omit<SymptomCard, "id" | "createdAt"> {
  return {
    kind: "symptom",
    name: name.trim(),
    firstNoticed: format(new Date(), "yyyy-MM-dd"),
    stillActive: true,
    autoFromSignal: true,
  };
}

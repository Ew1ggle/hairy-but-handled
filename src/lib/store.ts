/** Shared entry types. Runtime data access lives in session.tsx. */

export type EntryBase = {
  id: string;
  createdAt: string;
  enteredBy?: string;
};

export type DailyLog = EntryBase & {
  kind: "daily";
  temperatureC?: number | null;
  fatigue?: number | null;
  pain?: number | null;
  nausea?: number | null;
  appetite?: number | null;
  breathlessness?: number | null;
  mood?: number | null;
  sleepHours?: number | null;
  brainFog?: number | null;
  weightKg?: number | null;
  weighedAt?: string; // HH:MM
  tags?: string[];
  notes?: string;
  /** Overall self-rating — red / yellow / green. Set from the home page. */
  dayColour?: "red" | "yellow" | "green" | "";
  /** true when the patient/carer has actually filled in the log form (not just auto-created from background activity) */
  manuallyLogged?: boolean;
};

export type InfusionLog = EntryBase & {
  kind: "infusion";
  cycleDay: number;
  drugs: string;
  plannedTime?: string;
  actualStart?: string;
  actualEnd?: string;
  completed?: boolean;
  reaction?: boolean;
  reactionSymptoms?: string[];
  reactionTimeAfterStart?: string;
  paused?: boolean;
  meds?: string;
  outcome?: string;
  notes?: string;
};

export type BloodResult = EntryBase & {
  kind: "bloods";
  takenAt: string;
  hb?: number | null;
  wcc?: number | null;
  neutrophils?: number | null;
  lymphocytes?: number | null;
  monocytes?: number | null;
  platelets?: number | null;
  creatinine?: number | null;
  crp?: number | null;
  notes?: string;
};

export type MedEntry = EntryBase & {
  kind: "med";
  name: string;
  dose?: string;
  reason?: string;
  timeTaken?: string;
  helped?: boolean | null;
  sideEffects?: string;
  stopped?: boolean;
};

export type QuestionEntry = EntryBase & {
  kind: "question";
  question: string;
  askedAt?: string;
  answer?: string;
  unclear?: boolean;
  followUp?: string;
  /** Source entry id this question was auto-generated from. Used to dedupe. */
  autoFrom?: string;
  /** Which source kind triggered it — "bloods", "side-effect", etc. */
  autoKind?: string;
};

export type FlagEvent = EntryBase & {
  kind: "flag";
  triggerLabel: string;
  temperature?: number | null;
  whatHappened?: string;
  whoCalled?: string;
  adviceGiven?: string;
  wentToED?: boolean;
  outcome?: string;
};

export type Appointment = EntryBase & {
  kind: "appointment";
  date: string; // yyyy-mm-dd
  time?: string; // HH:MM
  provider?: string;
  type?: string;
  location?: string;
  notes?: string;
  /** Protocol cycle day this appointment was auto-seeded from — used to dedupe on re-sync. */
  protocolDay?: number;
  /** Protocol id that seeded this appointment (e.g. "cladribine"). */
  protocolId?: string;
};

export type Admission = EntryBase & {
  kind: "admission";
  admissionDate: string;
  hospital: string;
  reason: string;
  dischargeDate?: string;
  dischargeDetails?: string;
  dischargeMedications?: string;
  treatments?: { id: string; treatment: string; details: string }[];
  notes?: string;
};

export type InventoryItem = EntryBase & {
  kind: "inventory";
  name: string;
  zone: "white" | "yellow" | "orange" | "red";
  category: string;
  quantity: number;
  threshold: number;
  unit?: string;
  store?: "chemist" | "supermarket" | "department" | "other";
  notes?: string;
};

/** Signal Sweep reading — one timestamped multi-times-per-day entry.
 *  signalType matches an id in src/lib/signals.ts; the populated fields
 *  depend on the signal's input mode (number / pick / multipick / slider). */
export type Signal = EntryBase & {
  kind: "signal";
  signalType: string;
  /** Free-text label for signalType === "other". */
  customLabel?: string;
  value?: number | null;
  unit?: string;
  choice?: string;
  choices?: string[];
  score?: number | null;
  /** Optional follow-up multipick selections (e.g. pulse feel). */
  followUps?: string[];
  /** For locatedRating signals (pain) — 0-10 score per selected body area. */
  locationScores?: { area: string; score: number }[];
  /** For multipick signals where specific options carry a body location
   *  (e.g. Infection clues "Hot red skin" or Bleeding "New bruise"):
   *  map from picked option → body areas. */
  optionLocations?: Record<string, string[]>;
  notes?: string;
  autoFlag?: boolean;
};

export type AnyEntry = DailyLog | InfusionLog | BloodResult | MedEntry | QuestionEntry | FlagEvent | Appointment | Admission | InventoryItem | Signal;

import { useMemo } from "react";
import { useSession } from "./session";

export function useEntries<K extends AnyEntry["kind"]>(kind: K): Extract<AnyEntry, { kind: K }>[] {
  const { entries } = useSession();
  return useMemo(
    () => entries.filter((e): e is Extract<AnyEntry, { kind: K }> => e.kind === kind),
    [entries, kind]
  );
}

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

export type MedCategory =
  | "cancer-treatment"
  | "infection-prevention"
  | "symptom-relief"
  | "other-prescribed"
  | "otc-supplement";

/** Physical form / route — distinct from the React component named
 *  MedForm in /meds/page.tsx. */
export type MedDeliveryForm =
  | "tablet"
  | "capsule"
  | "liquid"
  | "injection"
  | "infusion"
  | "cream"
  | "mouth-rinse"
  | "inhaler"
  | "other";

/** When the med is given. Replaces the old free-text "purpose" notion
 *  so the Med Deck can group/filter cleanly. */
export type MedSchedule = "regular" | "prn" | "treatment-day-only" | "short-course";

export type MedStatus = "active" | "paused" | "stopped";

export type MedEntry = EntryBase & {
  kind: "med";
  name: string;
  /** Brand / trade name when different from the generic name. */
  brand?: string;
  dose?: string;
  reason?: string;
  /** Free-text usual timing (kept for backward compat — e.g. "8 am, 8 pm"). */
  timeTaken?: string;
  helped?: boolean | null;
  sideEffects?: string;
  /** Replaced by status === "stopped" but kept so historical entries still
   *  filter correctly. New entries should set status. */
  stopped?: boolean;
  category?: MedCategory;
  form?: MedDeliveryForm;
  schedule?: MedSchedule;
  prescriber?: string;
  startDate?: string;
  stopDate?: string;
  status?: MedStatus;
  /** True if the patient has had a previous bad reaction to this med —
   *  shown as a banner so it can't be missed when cross-referencing. */
  allergyFlag?: boolean;
  /** Free-text "important notes" — separate from the per-dose sideEffects
   *  field. For things like "must take with food" or "do not crush". */
  importantNotes?: string;
  /** Prescriber's directions exactly as written — e.g. "take 1 tablet 4
   *  times daily", "2 puffs every 4 hours as needed". Distinct from
   *  dose (the strength) and schedule (the category). */
  instructions?: string;
};

export type DoseStatus =
  | "taken"
  | "late"
  | "missed"
  | "vomited-after"
  | "withheld"
  | "refused";

export type DoseHelpedRating = "Yes" | "A bit" | "No" | "Not sure";

/** A single dose-taking event — the day-by-day med log. Each MedEntry
 *  in the Med Deck describes a med that's "in the mix"; each DoseEntry
 *  is one specific time it landed (or didn't land) so the team can see
 *  what was actually delivered, what shifted afterwards, and where a
 *  miss / vomit / withhold lines up with a Tripwire. */
export type DoseEntry = EntryBase & {
  kind: "dose";
  /** Foreign key to MedEntry.id when picked from the Med Deck. Optional
   *  for one-off doses logged before the Med Deck has the med listed. */
  medId?: string;
  /** Med name snapshot at the time of dosing — preserves history if the
   *  source MedEntry is later edited or removed. */
  medName: string;
  /** Dose strength as taken, snapshot from MedEntry.dose. */
  doseTaken?: string;
  /** Prescriber instructions as taken, snapshot from MedEntry.instructions
   *  ("take 1 tablet 4 times daily" etc.). If different from the source
   *  med at save time, the diff is also appended to notes for visibility. */
  instructions?: string;
  /** Time the dose was due (HH:mm). */
  timeDue?: string;
  /** Time the dose was actually taken (HH:mm). */
  timeTaken?: string;
  status?: DoseStatus;
  /** PRN-only: what symptom or trigger prompted the dose. */
  whyPrn?: string;
  /** Missed / delayed / withheld / refused — why. */
  reasonMissed?: string;
  helped?: DoseHelpedRating;
  /** Free text — what changed in the patient after this dose landed. */
  whatChanged?: string;
  /** Free text — any post-dose reaction or side effect. */
  reactionAfter?: string;
  notes?: string;
  /** True if this dose was logged in connection with a Tripwire flag. */
  linkedTripwire?: boolean;
  /** Signal entry id this dose was given in response to — set when the
   *  dose is created from a signal-sweep entry's inline 'took a med'
   *  mini-form. Lets a future view answer "this nausea got ondansetron
   *  4mg, helped: yes" by joining signals to doses. */
  linkedSignalId?: string;
};

export type FuelAmount = "none" | "few-bites" | "half" | "most" | "full";

/** Fuel Check — one entry per food/fluid intake event, with
 *  nausea-before/after and did-it-stay-down so we can see what landed,
 *  what held, and what helped. */
export type FuelEntry = EntryBase & {
  kind: "fuel";
  /** HH:mm of the intake event (separate from the auto createdAt). */
  time?: string;
  food?: string;
  amount?: FuelAmount;
  fluids?: string;
  nauseaBefore?: number | null;
  nauseaAfter?: number | null;
  stayedDown?: boolean | null;
  vomitedAfter?: string;
  notes?: string;
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
  /** For Sleep signals — primary state */
  sleepState?: "slept-in" | "awake";
  /** For Sleep signals — how they came out of it */
  wokeBy?: "auto" | "woken";
  /** For Sleep signals — HH:mm. With sleepState=slept-in this is the wake
   *  time. With sleepState=awake this is the start of the awake period. */
  timeFrom?: string;
  /** For Sleep signals — HH:mm end of the awake period (awake state only). */
  timeTo?: string;
  /** For Other signals — free-text "what makes it better or worse" so
   *  triggers and relievers don't have to be jammed into the notes blob. */
  triggers?: string;
  /** For Other signals — pattern over time (steady / improving / worsening
   *  / comes and goes). */
  pattern?: string;
};

/** Rule-detected pattern across signals / daily / bloods / flags.
 *  Persisted so the trends page can distinguish active (resolvedAt == null)
 *  from past (resolvedAt != null). The detector upserts by ruleId so a rule
 *  that re-fires later creates a new entry. */
export type Trend = EntryBase & {
  kind: "trend";
  ruleId: string;
  title: string;
  category:
    | "vitals" | "mind" | "weight" | "sweats" | "infection"
    | "bloods" | "intake" | "bowel" | "autoimmune" | "flags";
  severity: "watch" | "discuss" | "urgent";
  interpretation: string;
  why: string;
  metric: string;
  unit?: string;
  baseline?: number;
  threshold?: number;
  dataPoints: { t: string; v?: number | null; label?: string }[];
  detectedAt: string;
  resolvedAt?: string;
};

export type AnyEntry = DailyLog | InfusionLog | BloodResult | MedEntry | DoseEntry | QuestionEntry | FlagEvent | Appointment | Admission | InventoryItem | Signal | Trend | FuelEntry;

import { useMemo } from "react";
import { useSession } from "./session";

export function useEntries<K extends AnyEntry["kind"]>(kind: K): Extract<AnyEntry, { kind: K }>[] {
  const { entries } = useSession();
  return useMemo(
    () => entries.filter((e): e is Extract<AnyEntry, { kind: K }> => e.kind === kind),
    [entries, kind]
  );
}

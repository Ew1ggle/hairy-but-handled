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
  /** HH:mm times of day this med is scheduled. When set, Dose Trace
   *  generates one slot per time and shows status (logged / pending /
   *  missed) for each. Combined with daysOfWeek for week-pattern meds. */
  times?: string[];
  /** Days of week (0=Sun..6=Sat) when this med is scheduled. Empty or
   *  undefined means every day. */
  daysOfWeek?: number[];
  /** Cap on doses per 24h — typically the '4' in 'up to 4× daily as
   *  needed' for PRN paracetamol/ibuprofen. Dose Trace renders today's
   *  count vs this cap and tints the PRN row warn / alert as it
   *  approaches / reaches the limit. */
  maxPerDay?: number;
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
  /** True if a Tripwire was raised in connection with this fuel entry —
   *  e.g. couldn't keep anything down, hasn't eaten in 24h. addEntry
   *  auto-creates a kind='flag' entry when this is set. */
  linkedTripwire?: boolean;
};

export type ReliefRating = "Yes" | "A bit" | "No";

/** Relief Log — one entry per attempt at relieving a symptom, so the
 *  team can separate what actually helped from random trial-and-error. */
export type ReliefEntry = EntryBase & {
  kind: "relief";
  /** What symptom this attempt was for. Free text — optionally references
   *  a Symptom Deck card by name (no FK so it survives card edits). */
  symptom: string;
  /** What was tried — med, position, food, anything. */
  triedWhat: string;
  /** HH:mm of the attempt. */
  time?: string;
  helped?: ReliefRating;
  /** How quickly any relief was felt (free text — "5 min", "an hour"). */
  howQuickly?: string;
  /** Any downside of trying it (drowsy, upset stomach, etc). */
  downside?: string;
  notes?: string;
  /** True if a Tripwire was raised in connection with this attempt — e.g.
   *  the relief failed and the underlying symptom escalated. addEntry
   *  auto-creates a kind='flag' entry when this is set. */
  linkedTripwire?: boolean;
};

export type SymptomCardSeverity = "mild" | "moderate" | "severe";
export type SymptomCardPattern = "steady" | "improving" | "worsening" | "comes-and-goes";

/** Symptom Deck — the master ongoing-symptom registry. Distinct from
 *  Signal Sweep (point-in-time readings) and side-effects library
 *  (reference content): this is "what's currently going on with the
 *  patient", with first-noticed date, still-active flag, pattern,
 *  what seems to trigger it, what seems to help. */
export type SymptomCard = EntryBase & {
  kind: "symptom";
  name: string;
  firstNoticed?: string;
  stillActive?: boolean | null;
  pattern?: SymptomCardPattern;
  severity?: SymptomCardSeverity;
  triggers?: string;
  relievers?: string;
  notes?: string;
  linkedTripwire?: boolean;
};

export type UrineColour = "clear" | "pale" | "medium" | "dark";
export type UrineAmount = "normal" | "less" | "very-little";

export type HydrationDrink = "water" | "softdrink" | "energy" | "coffee" | "tea" | "other";

/** Hydration Line — track fluid intake by tapping drink chips with a
 *  glass counter per type, so the day's actual mix is captured rather
 *  than a free-text guess. Out-signals (urine colour, dry mouth,
 *  dizziness, GI losses) live on Signal Sweep instead — keeping
 *  Hydration Line focused on intake. */
export type HydrationEntry = EntryBase & {
  kind: "hydration";
  /** HH:mm of the check (separate from auto createdAt). */
  time?: string;
  /** Tapped drink counts (glasses or units of each drink type). */
  drinks?: Partial<Record<HydrationDrink, number>>;
  /** Free text describing the "Other" drink type when otherCount > 0. */
  otherDrinkLabel?: string;
  /** Free text on top of the chips, retained for back-compat with
   *  pre-refactor entries that captured a single fluidsSinceLast string. */
  fluidsSinceLast?: string;
  /** Legacy out-signals — kept on the type for back-compat reads only.
   *  Not captured by the form post-refactor; new entries should log these
   *  via Signal Sweep's Dry mouth / Dizziness / Urine signals. */
  urineColour?: UrineColour;
  urineAmount?: UrineAmount;
  dryMouth?: boolean | null;
  dizziness?: boolean | null;
  intakeStrugglingDueToGiSymptoms?: boolean | null;
  notes?: string;
  /** True if a Tripwire was raised in connection with this check. */
  linkedTripwire?: boolean;
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

/** Per-course log row for medication treatments — lets a single row
 *  on the treatments list capture e.g. multiple antibiotic doses
 *  across the visit. Defaults to inheriting the row's name unless
 *  overridden (e.g. switched antibiotic mid-stay). */
export type TreatmentCourse = {
  id: string;
  /** Course label/medication name. Defaults to the parent treatment
   *  name; user can override (e.g. switched from amoxicillin to
   *  augmentin between courses). */
  name: string;
  /** yyyy-MM-dd if known. */
  date?: string;
  /** HH:mm if known. */
  time?: string;
  /** Free-text — dose, route, prescriber, anything else for that
   *  course. */
  details?: string;
};

/** Doctor / team update logged during an admission — each round, plan
 *  change, or conversation gets a row so the timeline of clinical
 *  decision-making is visible. Date + time captured so a daily round
 *  at 09:30 and a phone call at 14:00 don't blur into one. */
export type DoctorUpdate = {
  id: string;
  /** yyyy-MM-dd. Required — defaults to entry day on creation. */
  date: string;
  /** HH:mm. Required — defaults to entry time on creation. */
  time: string;
  /** Doctor / team member who gave the update. Free text. */
  doctor?: string;
  /** What was said. Required — this is the actual content. */
  update: string;
};

/** One entry in an admission's proposedDischargeHistory log. */
export type ProposedDischargeChange = {
  /** yyyy-MM-dd. */
  date: string;
  /** ISO timestamp the change was recorded. */
  recordedAt: string;
  /** Optional reason given for the new date (e.g. "Awaiting bloods",
   *  "Source not yet identified"). */
  note?: string;
};

export type TreatmentRow = {
  id: string;
  treatment: string;
  details: string;
  result?: string;
  /** For imaging (CT, Xray, Ultrasound) — body areas covered. */
  areas?: string[];
  /** For CT only — contrast administered. */
  contrast?: boolean;
  /** For Blood Cultures and similar — short count description
   *  ("6 sets", "2 peripheral + 1 line"). */
  count?: string;
  /** For Blood Cultures — pathogen identified once results come back. */
  organism?: string;
  /** For medication-style treatments (antibiotics, panadol, anti-
   *  emetics) — per-course log so multiple doses sit on one row. */
  courses?: TreatmentCourse[];
};

export type Admission = EntryBase & {
  kind: "admission";
  admissionDate: string;
  hospital: string;
  reason: string;
  dischargeDate?: string;
  dischargeDetails?: string;
  dischargeMedications?: string;
  /** Most recent proposed / planned discharge date as told to the
   *  patient. Distinct from dischargeDate (the actual day they
   *  leave). Slipping plans are clinically meaningful — a stay
   *  that keeps moving signals either deterioration, the team
   *  reassessing, or communication churn. */
  proposedDischargeDate?: string;
  /** Append-only history of every value proposedDischargeDate has
   *  taken, so the user can see at a glance whether the plan has
   *  been moved. Each entry stamps the time the change was logged
   *  plus an optional reason. */
  proposedDischargeHistory?: ProposedDischargeChange[];
  /** Timeline of doctor / team updates during the admission. Each
   *  ward round, plan change, or conversation gets one entry. */
  doctorUpdates?: DoctorUpdate[];
  /** Ward name + bed number, only set once admitted from ED to a ward
   *  (or for direct admissions). Captured on /emergency outcome=admitted
   *  and editable on /admissions. */
  ward?: string;
  bedNumber?: string;
  /** Admitting team / treating consultant once on the ward. */
  admittingTeam?: string;
  /** Each treatment row tracks: name, free-text details (dose, route),
   *  and a result field for bloods/imaging/etc. once the result comes
   *  back. Optional structured sub-fields capture treatment-specific
   *  data: imaging areas + contrast (CT/Xray/US), culture count and
   *  organism (blood cultures), and per-course logs (antibiotics and
   *  other repeated medication doses). */
  treatments?: TreatmentRow[];
  notes?: string;
  /** True when this admission row was created via the ED visit form on
   *  /emergency. Lets /emergency list its own past entries and lets
   *  /admissions visually distinguish ED visits from regular admissions. */
  edVisit?: boolean;
  /** ED-visit-only fields preserved so /emergency can re-open in edit
   *  mode with the same picker data the user originally entered. */
  arrivalTime?: string;
  presentations?: string[];
  doctors?: string[];
  nurses?: string[];
  /** ED outcome: "discharged" home (with optional letter + meds) or
   *  "admitted" (kicks the user to /admissions to continue). Empty when
   *  unset (visit still in progress). */
  outcome?: "discharged" | "admitted";
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
  /** For Sleep signals — primary state.
   *  - slept-in: stayed asleep through to a normal/late wake time.
   *  - awake: was awake during a period that should've been sleep.
   *  - broken: slept but woke multiple times overnight. */
  sleepState?: "slept-in" | "awake" | "broken";
  /** For Sleep signals — how they came out of it. "na" covers cases
   *  where it doesn't apply (e.g. broken sleep with no single wake). */
  wokeBy?: "auto" | "woken" | "na";
  /** For Sleep signals — overall quality 1-5 (1 poor, 5 great). */
  sleepQuality?: number;
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
  /** True when this reading was captured during an ED visit. Lets the
   *  daily trace + trends views badge the row, and lets the ED log
   *  surface "signals captured this visit" tied back via edVisitId. */
  loggedDuringEd?: boolean;
  /** Admission row id for the ED visit this signal was captured during. */
  edVisitId?: string;
  /** Infusion entry id this signal belongs to — set when /signal-sweep
   *  was opened from a treatment day. Allows the treatment-day view
   *  to show "signals captured this infusion" the same way the ED log
   *  surfaces per-visit signals. Independent of edVisitId so a signal
   *  can be linked to both an admission and an infusion if relevant. */
  infusionId?: string;
  /** Exposure signal — free-text location name (or geocoded result). */
  location?: string;
  /** Exposure signal — risks the user picked from the curated list
   *  (e.g. "Sick contacts", "Public transport", "Pets"). */
  exposureRisks?: string[];
  /** Exposure signal — free-text details about the exposure
   *  (duration, who, masked, etc.). */
  exposureDetails?: string;
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

export type AnyEntry = DailyLog | InfusionLog | BloodResult | MedEntry | DoseEntry | QuestionEntry | FlagEvent | Appointment | Admission | InventoryItem | Signal | Trend | FuelEntry | HydrationEntry | SymptomCard | ReliefEntry;

import { useMemo } from "react";
import { useSession } from "./session";

export function useEntries<K extends AnyEntry["kind"]>(kind: K): Extract<AnyEntry, { kind: K }>[] {
  const { entries } = useSession();
  return useMemo(
    () => entries.filter((e): e is Extract<AnyEntry, { kind: K }> => e.kind === kind),
    [entries, kind]
  );
}

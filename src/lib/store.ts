/** Shared entry types. Runtime data access lives in session.tsx. */

import type { Attachment } from "./attachments";

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
  /** Photos attached to the day's log — useful for tracking
   *  visible changes (rash photos, swelling, weight readings). */
  attachments?: Attachment[];
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
  /** Photos / docs from the treatment day — cannulation site,
   *  reaction marks, the printed schedule, etc. */
  attachments?: Attachment[];
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
  /** Viral surveillance — relevant for HCL on cladribine + rituximab.
   *  HBV reactivation risk in seropositive patients = 25-85% on
   *  rituximab (eviQ 1382). CMV reactivation is the classical
   *  purine-analogue opportunistic. EBV less common but watched. */
  hbvDna?: string;
  cmvPcr?: string;
  ebvPcr?: string;
  /** Baseline serology — usually a one-off at start of treatment but
   *  re-checked when needed. Free text so qualitative (positive /
   *  negative / weak positive) values fit. */
  hbsAg?: string;
  antiHbc?: string;
  antiHbs?: string;
  /** Photos / PDFs of the lab report — used to keep the source
   *  document handy when only some fields fit the structured
   *  schema. Was previously cast through `as unknown as { ... }`
   *  on the bloods page; now formally part of the type. */
  attachments?: Attachment[];
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
  /** Clinical purpose tag — drives the Prophylaxis strip on Daily
   *  Trace and the dedicated "compliance matters here" highlight
   *  on the dose tracker. Set explicitly on the med form; defaults
   *  to undefined for non-prophylaxis meds. */
  purpose?: "prophylaxis-pjp" | "prophylaxis-antiviral" | "prophylaxis-antifungal" | "hbv-suppression" | "treatment" | "supportive";
  /** When this med was auto-created from a course-style treatment on
   *  /emergency or /admissions, this is the admission row's id. Lets
   *  the sync logic keep the med up to date as the admission is
   *  edited, and lets /meds visually distinguish "in-hospital meds"
   *  from the patient's home regimen. */
  linkedAdmissionId?: string;
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
  /** When this dose was auto-created from a course on a treatment row
   *  during /emergency or /admissions save, these point back to the
   *  admission + the course. Used by the sync logic to keep the
   *  generated dose in step with edits. */
  linkedAdmissionId?: string;
  linkedCourseId?: string;
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
export type SymptomDailyStatus = "better" | "same" | "worse";

/** One quick day-status tap on an ongoing symptom. Lets the carer
 *  log that a rash is a bit better today / about the same / worse
 *  without having to re-add the side effect every day. The most
 *  recent entry drives the card's display pattern; the array as
 *  a whole becomes a tiny trajectory log for review. */
export type SymptomCardStatusEntry = {
  /** yyyy-MM-dd of the day the status was logged. */
  date: string;
  status: SymptomDailyStatus;
  /** Free-text note from that day, optional. */
  note?: string;
};

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
  /** Day-by-day quick-tap status log. Appending an entry here is the
   *  shortcut for "rash still here today, a bit better" — no need to
   *  re-add the side effect each day. The most recent entry's
   *  status drives the card's pattern automatically. */
  dailyStatuses?: SymptomCardStatusEntry[];
  /** True when this card was auto-created from a Signal Sweep entry
   *  (e.g. user picked "Rash" via the Other signal). Lets the link
   *  flow distinguish user-created cards from auto-mirrors so the
   *  reverse-link doesn't loop back into a duplicate signal. */
  autoFromSignal?: boolean;
  /** Photos attached to the symptom — e.g. a series of rash photos
   *  to show progression. The most recent attachment surfaces as a
   *  thumbnail on the Daily Trace ongoing-symptoms card so the
   *  carer can see the trajectory at a glance. */
  attachments?: Attachment[];
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
  /** When set, the question is targeted at a specific appointment.
   *  /agenda?for=<apptId> filters the running agenda by this so the
   *  patient walks into clinic with everything they meant to ask. */
  targetAppointmentId?: string;
};

/** Vaccination record — for the patient or a household contact.
 *  HCL on cladribine forbids LIVE vaccines for the patient + needs
 *  household contacts to be planned around shedding windows
 *  (rotavirus in infants, varicella, MMR). Tracking both populations
 *  on one timeline lets the carer see "the kids' MMR is due in 2
 *  weeks — keep them out of the bedroom for 2 weeks after". */
/** Government / agency paperwork log — Centrelink (DSP, Carer
 *  Payment, JobSeeker medical certificates), NDIS access requests,
 *  MyHealthRecord nominated rep, hospital paperwork. AU-specific
 *  carer pain — none of these have a sensible single home and they
 *  all rot if the next-action date isn't tracked. */
export type Paperwork = EntryBase & {
  kind: "paperwork";
  /** Issuing agency / system. Free text but typically Centrelink /
   *  NDIS / MyHealthRecord / Hospital / Insurance / Other. */
  agency: string;
  /** Type of paperwork (e.g. "DSP Medical Certificate", "NDIS
   *  Access Request", "Carer Allowance application"). */
  type: string;
  /** yyyy-MM-dd. Date submitted / last action taken. */
  submittedDate?: string;
  /** Reference number / case ID issued by the agency. */
  reference?: string;
  /** yyyy-MM-dd. Next thing to do / review date — surfaces in
   *  reminders + the agenda. */
  nextActionDate?: string;
  /** Status: draft / submitted / approved / rejected / completed. */
  status?: "draft" | "submitted" | "in-review" | "approved" | "rejected" | "completed";
  notes?: string;
};

export type Vaccination = EntryBase & {
  kind: "vaccination";
  /** "patient" | "contact". */
  recipient: "patient" | "contact";
  /** Set when recipient="contact". */
  contactName?: string;
  /** Relationship to the patient ("Husband", "Daughter 6yo"). */
  relationship?: string;
  /** Free-text vaccine name (e.g. "MMR", "Influenza inactivated"). */
  vaccine: string;
  /** Live-attenuated marker — drives the alert badge. */
  isLive?: boolean;
  /** yyyy-MM-dd. */
  date: string;
  /** Free text on shedding / contact precautions to observe. */
  riskWindow?: string;
  notes?: string;
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

export type AppointmentCategory =
  | "haematology" | "gp" | "specialist" | "dental" | "imaging" | "allied" | "telehealth" | "other";

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
  /** Category — drives badges on the list, the "safe-to-proceed?"
   *  hint on dental against latest FBC, and join-link UI for
   *  telehealth. Defaults to "specialist" when unset. */
  category?: AppointmentCategory;
  /** Telehealth join URL — surfaced as a "join now" tile when the
   *  appointment is within 10 min of starting. */
  joinUrl?: string;
  /** Photos / PDFs attached to the appointment — letters, referrals,
   *  scans the patient was given, etc. */
  attachments?: Attachment[];
};

/** Per-course log row for medication treatments — lets a single row
 *  on the treatments list capture e.g. multiple antibiotic doses
 *  across the visit. Defaults to inheriting the row's name unless
 *  overridden (e.g. switched antibiotic mid-stay). */
export type TreatmentCourse = {
  id: string;
  /** Course label/medication name. Defaults to the parent treatment
   *  name; user can override (e.g. switched from amoxicillin to
   *  augmentin between courses). Can be left blank when the team
   *  changed the drug but didn't tell the patient what it was —
   *  pair with drugSwitched=true. */
  name: string;
  /** yyyy-MM-dd if known. */
  date?: string;
  /** HH:mm if known. */
  time?: string;
  /** Free-text — dose, route, prescriber, anything else for that
   *  course. */
  details?: string;
  /** True when the team changed the drug at this course. Lets the
   *  user log "drug switched at 06:00, name TBC" without breaking
   *  the inheritance chain — subsequent courses can still pick up
   *  the new name once it's known. Surfaced as a Switched badge
   *  on the course and a → switch arrow on the summary line. */
  drugSwitched?: boolean;
};

/** One row in the discharge medication reconciliation. Captures the
 *  decision the team / patient made about each med on the way out:
 *  whether a med already in the deck should continue, was stopped at
 *  discharge, or whether a brand-new prescription started in hospital
 *  needs to be added to the deck. The reconciliation runs as part of
 *  the admission save so the Med Deck stays in lock-step with what
 *  the patient is actually taking after they leave. */
export type DischargeMedDecision = {
  id: string;
  /** When set, points at an existing MedEntry. Empty for new
   *  prescriptions started during the admission — those create a
   *  fresh MedEntry on save. */
  medId?: string;
  /** Snapshot of the med name for display + free-text new meds. */
  medName: string;
  dose?: string;
  instructions?: string;
  /**
   *  - continue: med stays active, no change to the Med Deck.
   *  - stop: med is marked stopped on save with stopDate = dischargeDate.
   *  - new: a fresh MedEntry is created in the Med Deck on save. */
  decision: "continue" | "stop" | "new";
};

/** Single blood culture draw. A patient with FN may end up with
 *  multiple sets across an admission (peripheral on day 1, line +
 *  peripheral on day 3, repeat on day 5 if positive). Each draw
 *  needs its own timestamp, source, organism, and result so the
 *  team can see the trajectory at a glance. */
export type BloodCultureEntry = {
  id: string;
  /** yyyy-MM-dd if known. */
  date?: string;
  /** HH:mm if known. */
  time?: string;
  /** Where the blood was drawn from. Common values are "Peripheral",
   *  "Central line", "Port", "Mixed peripheral + line"; free text
   *  allowed. */
  source?: string;
  /** Set count description ("2 sets", "1 aerobic + 1 anaerobic"). */
  count?: string;
  /** Pathogen identified once results come back, free text. */
  organism?: string;
  /** Result status — Pending / No growth / Positive / Contaminant.
   *  Free string so future statuses ("Mixed flora") don't need a
   *  schema change. */
  result?: string;
  /** Anything else (gram stain timing, sensitivities pending, etc). */
  notes?: string;
};

/** What kind of change a doctor update represents — drives chip
 *  badges so the timeline scans clearly even when the carer didn't
 *  catch the specifics. */
export type DoctorUpdateChangeType =
  | "med-added"
  | "med-stopped"
  | "med-switched"
  | "dose-changed"
  | "frequency-changed"
  | "plan-changed"
  | "other";

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
  /** Doctor name (e.g. "Dr Patel"). Free text. Used for the "who said
   *  what" timeline. */
  doctor?: string;
  /** Role / position (e.g. "Haematology consultant", "Oncology reg",
   *  "Cancer care coordinator"). Free text — picked from care-team
   *  chips when the doctor is already on the patient profile, otherwise
   *  typed. Together with `doctor` this captures both the name AND the
   *  position so the carer can see who in the team gave the update. */
  doctorRole?: string;
  /** What was said. Required — this is the actual content. */
  update: string;
  /** Optional structured tag for "what kind of change" — e.g. the
   *  team swapped meds without telling the carer the new name; logging
   *  changeType="med-switched" + detailsKnown=false captures that
   *  something happened so the timeline doesn't go silent. Carer
   *  fills in the actual details once they find out. */
  changeType?: DoctorUpdateChangeType;
  /** False when the carer logged that a change happened but doesn't
   *  know what specifically — surfaces a "details TBC" badge until
   *  the entry is updated with the missing info. */
  detailsKnown?: boolean;
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
  /** Legacy single-entry fields kept for backward compatibility with
   *  rows saved before the running-log refactor. New blood-culture
   *  data lives on `cultures` below. */
  count?: string;
  organism?: string;
  /** Running log of blood culture draws. Each draw is one entry with
   *  its own date / time, source (peripheral / line / mixed), set
   *  count, organism (once results come back), and result status. */
  cultures?: BloodCultureEntry[];
  /** For medication-style treatments (antibiotics, panadol, anti-
   *  emetics) — per-course log so multiple doses sit on one row. */
  courses?: TreatmentCourse[];
  /** True when the row was added via "Other" — keeps the name input
   *  visible and editable even after the user types over the
   *  default "Other" placeholder. Prevents the editor flipping out
   *  of custom mode the moment treatment !== "Other". */
  isCustom?: boolean;
  /** Force per-administration course logging on a row whose name
   *  doesn't match the auto-detect regex. The course-style UI
   *  triggers for "Antibiotics", "Steroids", etc. by default; this
   *  flag flips it on for anything else (a steroid cream named
   *  "Hydrocortisone 1%", an inhaler, eye drops) when the carer
   *  wants per-application logging. */
  forceCourse?: boolean;
};

export type Admission = EntryBase & {
  kind: "admission";
  admissionDate: string;
  hospital: string;
  reason: string;
  dischargeDate?: string;
  dischargeDetails?: string;
  dischargeMedications?: string;
  /** Structured discharge med reconciliation — one row per med with a
   *  continue / stop / new decision. On save the parent flow updates
   *  the Med Deck so the patient's home med list lines up with what
   *  they're actually taking after they leave. Legacy admissions just
   *  have the free-text dischargeMedications above. */
  dischargeMedReconciliation?: DischargeMedDecision[];
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
  /** Photos / docs attached to the admission — discharge letters,
   *  scan reports, photos of the rash that brought them in, etc.
   *  Previously cast through `as unknown as { ... }` on /admissions
   *  and /emergency; now formally part of the type. */
  attachments?: Attachment[];
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
  /** TreatmentRow on the current admission this signal is being
   *  treated by / responding to (e.g. the fever entry that's being
   *  treated by the Tazocin row, the pain entry being managed by
   *  the IV Paracetamol row). Lets the admission and export views
   *  show "linked symptoms" alongside the treatment, and lets the
   *  signal timeline show "→ Tazocin" so the trajectory of a
   *  course's effectiveness is visible. */
  linkedTreatmentRowId?: string;
  /** Optional course-level link for course-style treatment rows
   *  (antibiotics, panadol, etc.) — narrows the signal to a single
   *  administration rather than the row as a whole. */
  linkedTreatmentCourseId?: string;
  /** Exposure signal — free-text location name (or geocoded result). */
  location?: string;
  /** Exposure signal — risks the user picked from the curated list
   *  (e.g. "Sick contacts", "Public transport", "Pets"). */
  exposureRisks?: string[];
  /** Exposure signal — free-text details about the exposure
   *  (duration, who, masked, etc.). */
  exposureDetails?: string;
  /** True when this signal was auto-created from a SymptomCard
   *  status update or the symptom-deck add flow. Pairs with
   *  SymptomCard.autoFromSignal to break the bidirectional link
   *  loop — auto-created entries don't trigger another auto-mirror. */
  autoFromSymptom?: boolean;
  /** Photos / docs attached to this reading — e.g. a photo of a
   *  rash to track over time, a screenshot of a vitals reading.
   *  Each carries kind + documentDate metadata via the FileUpload
   *  component. */
  attachments?: Attachment[];
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

export type AnyEntry = DailyLog | InfusionLog | BloodResult | MedEntry | DoseEntry | QuestionEntry | FlagEvent | Appointment | Admission | InventoryItem | Signal | Trend | FuelEntry | HydrationEntry | SymptomCard | ReliefEntry | Vaccination | Paperwork;

import { useMemo } from "react";
import { useSession } from "./session";

export function useEntries<K extends AnyEntry["kind"]>(kind: K): Extract<AnyEntry, { kind: K }>[] {
  const { entries } = useSession();
  return useMemo(
    () => entries.filter((e): e is Extract<AnyEntry, { kind: K }> => e.kind === kind),
    [entries, kind]
  );
}

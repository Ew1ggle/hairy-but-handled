import { differenceInCalendarDays, parseISO } from "date-fns";
import type { InfusionLog } from "./store";

/** State of the patient's neutrophil curve relative to the most recent
 *  infusion. Cladribine 5-day IV puts the granulocyte nadir at roughly
 *  day 7-14 post-infusion (single-cycle) and rituximab adds a late-
 *  onset neutropenia window from day ~60 to day ~210. We don't have
 *  serial FBCs in real time so the curve is estimated from days-since-
 *  infusion alone — better than a single fever threshold for every
 *  day post-treatment.
 *
 *  - "pre": no recent infusion or <5 days since one. Standard care.
 *  - "nadir": days 5-21 post most recent infusion. Lower fever
 *    threshold, mask in shared spaces, escalate any rigor regardless
 *    of temp. The single highest-risk window for febrile neutropenia.
 *  - "recovery": days 22-59. Counts recovering but still cautious.
 *  - "late": days 60-210. Watch for late-onset rituximab neutropenia;
 *    re-check FBC if any infection-flag fires.
 *  - "stable": >210 days post last infusion.
 *
 *  Reference: eviQ 364 (cladribine), Saven 1999 (FN incidence ~42%
 *  cladri 5-day), Voog 2003 (late-onset neutropenia post-rituximab).
 */
export type NadirState = "pre" | "nadir" | "recovery" | "late" | "stable";

export type NadirContext = {
  state: NadirState;
  daysSinceInfusion: number;
  lastInfusion?: InfusionLog;
  /** Lower fever threshold to call (°C). Single fever reading at or
   *  above this should trigger Tripwires + a call. */
  feverThreshold: number;
  /** Short status line (e.g. "Day 4 post-infusion · pre-nadir"). */
  headline: string;
  /** "What's happening now" framing — clinical context for where on
   *  the curve the patient sits. Surfaces under a "What's happening"
   *  sub-header on the banner. */
  context: string;
  /** "What this means" — the implication for the carer. The most
   *  important piece of pre-nadir copy: even when feeling fine, the
   *  next 7-10 days are the highest-risk window. Surfaces under a
   *  "What this means" sub-header on the banner. */
  whatItMeans: string;
  /** Concrete actions for today. Bulleted list under an "Actions" sub-
   *  header. Empty array hides the section. */
  actionsToday: string[];
};

export function getNadirContext(infusions: readonly InfusionLog[], now: Date = new Date()): NadirContext {
  // Most recent infusion (any kind — completed or otherwise).
  const sorted = infusions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const last = sorted[0];
  if (!last) {
    return {
      state: "pre",
      daysSinceInfusion: 0,
      feverThreshold: 38.0,
      headline: "Standard care",
      context: "No infusions logged yet.",
      whatItMeans: "Standard fever threshold applies — call the team for 38.0°C single reading or 37.5°C sustained for an hour.",
      actionsToday: [],
    };
  }
  const days = differenceInCalendarDays(now, parseISO(last.createdAt));
  if (days < 5) {
    return {
      state: "pre",
      daysSinceInfusion: days,
      lastInfusion: last,
      feverThreshold: 38.0,
      headline: `Day ${days} post-infusion · pre-nadir`,
      context:
        "Counts haven't dropped yet. Cladribine works slowly — neutrophils typically reach their lowest point at days 7-14.",
      whatItMeans:
        "Even if the patient feels fine today, this is the lead-in to the highest-risk window for infection. The next 7-10 days are when fever, rigors, or new infection signs need to be acted on immediately. Use this window to set the household up so nothing has to be sorted out under pressure.",
      actionsToday: [
        "Watch for infusion reactions today (fever, rash, breathlessness, chest tightness)",
        "Push fluids — cladribine is hard on the kidneys without enough water",
        "Get the household ready for nadir week: deep-clean Zone 1 + Zone 2, stock easy food, confirm transport plan to ED",
        "Confirm prophylaxis (Bactrim / aciclovir / antifungal) is on hand and being taken",
        "Save / pin the on-call haematology number somewhere reachable from the bedroom",
      ],
    };
  }
  if (days <= 21) {
    return {
      state: "nadir",
      daysSinceInfusion: days,
      lastInfusion: last,
      // eviQ + RACGP guidance: any 38.0°C single reading is FN until
      // proven otherwise during the cladribine nadir. Don't wait for
      // 38.5 the way you might off-treatment.
      feverThreshold: 38.0,
      headline: `Day ${days} post-infusion · NADIR WINDOW`,
      context:
        "Highest-risk fortnight. Counts are at or near their lowest point. Even minor infection signs can escalate within hours.",
      whatItMeans:
        "Call the team for ANY fever ≥38.0°C, ANY rigor (uncontrollable shaking), or any new infection sign — don't wait to see if it passes. The standard \"watch and wait\" advice does not apply during this window.",
      actionsToday: [
        "Take temperature 3-4× today, log every reading",
        "Mask in shared spaces; avoid sick contacts and crowds",
        "Push fluids; small frequent meals if appetite is low",
        "Keep a packed bag near the door for an unplanned ED trip",
        "If anything feels off, call rather than wait",
      ],
    };
  }
  if (days <= 59) {
    return {
      state: "recovery",
      daysSinceInfusion: days,
      lastInfusion: last,
      feverThreshold: 38.0,
      headline: `Day ${days} post-infusion · recovery`,
      context: "Counts should be recovering. The acute infection-risk window has passed.",
      whatItMeans:
        "Standard fever threshold (38.0°C single reading or 37.5°C sustained for an hour). Keep prophylaxis going — CD4 lymphocytes recover slowly so cover stays in place for months.",
      actionsToday: [
        "Keep prophylaxis doses on schedule",
        "Watch for slow-burn signs (low-grade fever, weight loss, persistent cough) — flag at the next clinic",
      ],
    };
  }
  if (days <= 210) {
    return {
      state: "late",
      daysSinceInfusion: days,
      lastInfusion: last,
      feverThreshold: 38.0,
      headline: `Day ${days} · late-onset window (rituximab)`,
      context:
        "Rituximab can cause late-onset neutropenia from roughly day 60 to day 210 post-infusion. Counts can drop without warning even when the patient feels well.",
      whatItMeans:
        "Don't assume the risk is over. If any infection sign fires (fever, rigors, new cough, mouth ulcers, line-site issues), ask for an FBC the same day — don't wait for the next routine clinic.",
      actionsToday: [
        "Watch for shingles (band of rash on one side of the body) — early antiviral matters",
        "If anyone in the house is unwell, mask up around the patient",
        "Bring up any new symptom at the next clinic visit even if it seems minor",
      ],
    };
  }
  return {
    state: "stable",
    daysSinceInfusion: days,
    lastInfusion: last,
    feverThreshold: 38.0,
    headline: `Day ${days} post-last-infusion · stable`,
    context: "Beyond the cladribine + rituximab acute risk windows.",
    whatItMeans:
      "Standard care for an immune-compromised HCL patient. Keep up the surveillance bloods schedule and any maintenance prophylaxis the team has set.",
    actionsToday: [],
  };
}

/** Pretty label for a state — used by badges. */
export const NADIR_LABEL: Record<NadirState, string> = {
  pre: "Pre-nadir",
  nadir: "Nadir window",
  recovery: "Recovery",
  late: "Late-onset window",
  stable: "Stable",
};

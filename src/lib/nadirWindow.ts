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
  /** Short, actionable headline copy. */
  headline: string;
  /** Longer guidance for the banner expansion. */
  detail: string;
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
      detail: "No infusions logged yet — standard fever threshold (38.0°C single reading or 37.5°C sustained 1h).",
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
      detail: "Counts haven't dropped yet. Watch for infusion reactions (fever, rash, breathlessness). Push fluids today.",
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
      detail: "Highest-risk fortnight. Call team for ANY fever ≥38.0°C, ANY rigor, or new infection signs — don't wait. Mask in shared spaces. Push fluids. Avoid sick contacts and crowds.",
    };
  }
  if (days <= 59) {
    return {
      state: "recovery",
      daysSinceInfusion: days,
      lastInfusion: last,
      feverThreshold: 38.0,
      headline: `Day ${days} post-infusion · recovery`,
      detail: "Counts should be recovering. Standard fever threshold (38.0°C). Keep prophylaxis going.",
    };
  }
  if (days <= 210) {
    return {
      state: "late",
      daysSinceInfusion: days,
      lastInfusion: last,
      feverThreshold: 38.0,
      headline: `Day ${days} · late-onset window (rituximab)`,
      detail: "Rituximab can cause late-onset neutropenia day 60-210. If any infection signs fire, ask the team for an FBC — counts can drop without warning.",
    };
  }
  return {
    state: "stable",
    daysSinceInfusion: days,
    lastInfusion: last,
    feverThreshold: 38.0,
    headline: `Day ${days} post-last-infusion · stable`,
    detail: "Standard care. Keep up with the surveillance bloods schedule.",
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

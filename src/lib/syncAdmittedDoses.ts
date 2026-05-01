import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { isMedEffectivelyStopped } from "./meds";
import type { Admission, DoseEntry, MedEntry } from "./store";

/** During an active ward admission, hospital staff administer the
 *  patient's regular scheduled meds — but the home dose tracker
 *  doesn't know that, so doses look "missed" and the missed-dose
 *  trend rule fires spuriously. This planner walks the patient's
 *  scheduled meds across the admission window and synthesises
 *  status="taken" DoseEntry rows for any slot that doesn't already
 *  have one.
 *
 *  Idempotent — checks for an existing dose at each slot before
 *  creating, so re-running on every /doses page mount or on every
 *  admission save just fills any gaps and never duplicates.
 *
 *  Tags every auto-created dose with linkedAdmissionId AND a
 *  consistent notes prefix so they can be filtered or removed in
 *  bulk if needed (e.g. if a med was clinically held during the
 *  stay and the carer wants to undo the auto-log).
 *
 *  Doesn't sync course-style treatment doses — those go through
 *  syncTreatmentMeds.ts which is a separate cycle. Keeps the two
 *  flows (regular home meds vs in-hospital antibiotic courses) on
 *  independent paths so a bug in one doesn't break the other. */

export const ADMITTED_DOSE_NOTE = "Hospital administered (auto-logged during admission)";

/** Returns true when the admission's window covers the date AND the
 *  patient is on the ward (outcome="admitted"). ED-only days don't
 *  qualify — hospital nurses aren't running the home med roster
 *  while the patient is in the ED waiting room. */
function admissionCoversDay(admission: Admission, isoDay: string): boolean {
  if (admission.outcome !== "admitted") return false;
  if (!admission.admissionDate) return false;
  if (admission.admissionDate > isoDay) return false;
  if (admission.dischargeDate && admission.dischargeDate < isoDay) return false;
  return true;
}

/** Should this med generate scheduled slots? */
function isScheduledMed(m: MedEntry): boolean {
  if (isMedEffectivelyStopped(m)) return false;
  if (!m.times || m.times.length === 0) return false;
  // PRN-style entries with maxPerDay don't generate fixed slots —
  // they're tap-when-needed, not a scheduled administration.
  if (m.schedule === "prn") return false;
  return true;
}

/** Day-of-week filter — daysOfWeek is 0=Sun..6=Sat. Undefined or
 *  empty means every day. */
function medCoversDay(m: MedEntry, date: Date): boolean {
  if (!m.daysOfWeek || m.daysOfWeek.length === 0) return true;
  return m.daysOfWeek.includes(date.getDay());
}

export type AdmittedDoseSyncPlan = {
  dosesToCreate: Omit<DoseEntry, "id" | "createdAt">[];
};

/** Walk the active admission window and return the doses to create.
 *  `now` is injected for testing. */
export function planAdmittedDoseSync(opts: {
  admission: Admission;
  meds: readonly MedEntry[];
  existingDoses: readonly DoseEntry[];
  now?: Date;
}): AdmittedDoseSyncPlan {
  const now = opts.now ?? new Date();
  const plan: AdmittedDoseSyncPlan = { dosesToCreate: [] };
  const { admission, meds, existingDoses } = opts;

  if (admission.outcome !== "admitted") return plan;
  if (!admission.id || !admission.admissionDate) return plan;

  const fromDate = parseISO(`${admission.admissionDate}T00:00:00`);
  // Walk through to today (or dischargeDate, whichever is earlier).
  const through = admission.dischargeDate
    ? parseISO(`${admission.dischargeDate}T00:00:00`)
    : now;
  const totalDays = differenceInCalendarDays(through, fromDate);
  if (totalDays < 0) return plan;
  // Cap to 60 days so a stale admission row doesn't generate
  // thousands of doses if the user forgot to discharge it.
  const safeDays = Math.min(totalDays, 60);

  const scheduled = meds.filter(isScheduledMed);
  if (scheduled.length === 0) return plan;

  for (let d = 0; d <= safeDays; d += 1) {
    const day = addDays(fromDate, d);
    const isoDay = format(day, "yyyy-MM-dd");
    if (!admissionCoversDay(admission, isoDay)) continue;
    for (const m of scheduled) {
      if (!medCoversDay(m, day)) continue;
      for (const t of m.times ?? []) {
        if (!t || !/^\d{2}:\d{2}$/.test(t)) continue;
        const slotIso = `${isoDay}T${t}:00`;
        const slotDate = parseISO(slotIso);
        if (slotDate.getTime() > now.getTime()) continue; // future slot — leave for later
        // Skip if a dose row already exists for this med + this date
        // + this time (logged or auto-logged).
        const already = existingDoses.some((dose) => {
          if (dose.medId !== m.id) return false;
          const doseDay = (dose.createdAt ?? "").slice(0, 10);
          if (doseDay !== isoDay) return false;
          // Match by either timeTaken (most reliable) or by the
          // dose's createdAt minute (for entries without timeTaken).
          if (dose.timeTaken === t) return true;
          if (!dose.timeTaken && dose.createdAt && dose.createdAt.slice(11, 16) === t) return true;
          return false;
        });
        if (already) continue;
        plan.dosesToCreate.push({
          kind: "dose",
          medId: m.id,
          medName: m.name,
          doseTaken: m.dose,
          instructions: m.instructions,
          timeDue: t,
          timeTaken: t,
          status: "taken",
          notes: ADMITTED_DOSE_NOTE,
          linkedAdmissionId: admission.id,
          // createdAt is part of EntryBase but addEntry accepts it as
          // an optional override — we want the dose to land on the
          // exact slot's timestamp so it shows up on the right day.
          createdAt: slotDate.toISOString(),
        } as unknown as Omit<DoseEntry, "id" | "createdAt">);
      }
    }
  }
  return plan;
}

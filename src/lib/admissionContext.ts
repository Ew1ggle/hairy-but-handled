import type { Admission, Signal } from "./store";

/** True when this admission row was an ED visit — covers rows
 *  saved with `edVisit=true` AND legacy rows whose `reason` starts
 *  with "ED ". Centralised so every check uses the same predicate
 *  instead of the original combo being repeated across pages. */
export function isEdVisit(admission: Admission): boolean {
  return !!admission.edVisit || !!admission.reason?.toLowerCase().startsWith("ed ");
}

/** ED visit that's still in progress — i.e. outcome hasn't been
 *  decided. Once outcome="admitted" lands the row is a ward
 *  admission even if it began as an ED visit. */
export function isEdInProgress(admission: Admission): boolean {
  return isEdVisit(admission) && admission.outcome !== "admitted";
}

/** Most recent admission row that has no discharge date set. Used
 *  by Nav, home, /signal-sweep, /handover to decide what state the
 *  patient is in. Returns undefined when no active stay. */
export function getActiveStay(admissions: readonly Admission[]): Admission | undefined {
  return admissions
    .filter((a) => !a.dischargeDate)
    .sort((a, b) => (b.admissionDate ?? b.createdAt ?? "").localeCompare(a.admissionDate ?? a.createdAt ?? ""))[0];
}

/** Most recent OPEN ED visit (still in progress, not yet discharged
 *  or admitted to ward). Used to dedupe / suppress "log a new ED
 *  visit" affordances when one is already underway. */
export function getOpenEdVisit(admissions: readonly Admission[]): Admission | undefined {
  return admissions
    .filter((a) => isEdVisit(a) && !a.outcome && !a.dischargeDate)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))[0];
}


/** Resolve whether a signal sits inside any admission window — and
 *  if so, whether the patient was in ED phase or already on the
 *  ward at that moment. Returns a label + the matched admission so
 *  badge copy can adapt ("during ED" vs "during admission") even on
 *  signals that pre-date the loggedDuringEd flag.
 *
 *  Match logic:
 *   - Direct edVisitId link wins (explicit tag at save time).
 *   - Otherwise the signal's createdAt has to fall within an
 *     admission window (admissionDate <= ts AND (no dischargeDate
 *     or dischargeDate >= ts on a date-only basis)).
 *   - Phase: ED if the matched admission was an ED visit and its
 *     outcome != "admitted"; "admission" otherwise. */
export function resolveAdmissionContext(
  signal: Pick<Signal, "createdAt" | "edVisitId">,
  admissions: readonly Admission[],
): { label: string; admission: Admission } | null {
  let match: Admission | undefined;
  if (signal.edVisitId) {
    match = admissions.find((a) => a.id === signal.edVisitId);
  }
  if (!match) {
    const day = signal.createdAt.slice(0, 10); // yyyy-MM-dd
    match = admissions.find((a) => {
      if (!a.admissionDate) return false;
      if (a.admissionDate > day) return false;
      if (a.dischargeDate && a.dischargeDate < day) return false;
      return true;
    });
  }
  if (!match) return null;
  const wasEd = !!match.edVisit || match.reason?.toLowerCase().startsWith("ed ");
  const stillEd = wasEd && match.outcome !== "admitted";
  return { label: stillEd ? "during ED" : "during admission", admission: match };
}

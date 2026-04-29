import type { Admission, Signal } from "./store";

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

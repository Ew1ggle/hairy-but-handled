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

/** Whether an admission is "still in progress" right now — drives
 *  the home-page warning banners, the Nav strip, the cleaning-
 *  protocol copy, the auto-link of signals to admissions. Logic:
 *   - No dischargeDate → still admitted (open-ended stay).
 *   - dischargeDate in the future → still admitted (discharge
 *     scheduled but hasn't happened).
 *   - dischargeDate in the past → discharged.
 *   - dischargeDate is today: check dischargeTime if set; if the
 *     discharge time hasn't arrived yet they're still in hospital,
 *     otherwise they're home.
 *   - dischargeDate is today, no dischargeTime: assume already
 *     home (logging a discharge date without a time means the
 *     event has happened). */
export function isAdmissionStillActive(
  admission: Admission,
  now: Date = new Date(),
): boolean {
  if (!admission.dischargeDate) return true;
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (admission.dischargeDate > todayIso) return true;
  if (admission.dischargeDate < todayIso) return false;
  // Same day — defer to dischargeTime.
  if (admission.dischargeTime) {
    const nowHHmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return admission.dischargeTime > nowHHmm;
  }
  return false;
}

/** Most recent admission row that's still in progress (see
 *  isAdmissionStillActive). Returns undefined once the patient is
 *  discharged so the home page, Nav, and cleaning prompt revert
 *  to default state. */
export function getActiveStay(admissions: readonly Admission[]): Admission | undefined {
  const now = new Date();
  return admissions
    .filter((a) => isAdmissionStillActive(a, now))
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

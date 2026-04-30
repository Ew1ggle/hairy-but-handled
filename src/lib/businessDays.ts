import { addDays, format } from "date-fns";

/** AU (QLD) public holidays through 2027. Day clinic infusions don't
 *  run on these days, so a treatment falling on one needs to shift to
 *  the next business day. Hardcoded rather than computed because the
 *  list is short, the rules are fiddly (Easter, observed-on-Monday
 *  for weekend holidays, Brisbane Show), and the dates don't change.
 *
 *  When a holiday falls on a weekend the OBSERVED date is what matters
 *  — that's the day the clinic is shut. Both rows are listed where
 *  applicable so either lookup matches. Brisbane Show is QLD-only and
 *  applies in greater Brisbane; left in because that's where the
 *  primary user's friend is treated.
 *
 *  Update this list yearly. */
const AU_PUBLIC_HOLIDAYS = new Set<string>([
  // 2025
  "2025-01-01", // New Year's Day
  "2025-01-27", // Australia Day (observed Mon 27, falls Sun 26)
  "2025-04-18", // Good Friday
  "2025-04-19", // Easter Saturday
  "2025-04-20", // Easter Sunday
  "2025-04-21", // Easter Monday
  "2025-04-25", // Anzac Day
  "2025-05-05", // Labour Day (QLD)
  "2025-08-13", // Brisbane Show (RNA)
  "2025-10-06", // King's Birthday (QLD)
  "2025-12-25", // Christmas Day
  "2025-12-26", // Boxing Day
  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-26", // Australia Day
  "2026-04-03", // Good Friday
  "2026-04-04", // Easter Saturday
  "2026-04-05", // Easter Sunday
  "2026-04-06", // Easter Monday
  "2026-04-25", // Anzac Day
  "2026-05-04", // Labour Day (QLD)
  "2026-08-12", // Brisbane Show (RNA)
  "2026-10-05", // King's Birthday (QLD)
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (observed Mon, falls Sat 26)
  // 2027
  "2027-01-01", // New Year's Day
  "2027-01-26", // Australia Day
  "2027-03-26", // Good Friday
  "2027-03-27", // Easter Saturday
  "2027-03-28", // Easter Sunday
  "2027-03-29", // Easter Monday
  "2027-04-26", // Anzac Day (observed Mon, falls Sun 25)
  "2027-05-03", // Labour Day (QLD)
  "2027-08-11", // Brisbane Show (RNA)
  "2027-10-04", // King's Birthday (QLD)
  "2027-12-27", // Christmas Day (observed Mon, falls Sat 25)
  "2027-12-28", // Boxing Day (observed Tue, falls Sun 26)
]);

/** True when the date is a Mon-Fri AND not on the holiday list. Used
 *  by the scheduler to decide whether a treatment date needs to shift. */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay(); // 0 = Sun, 6 = Sat
  if (day === 0 || day === 6) return false;
  return !AU_PUBLIC_HOLIDAYS.has(format(date, "yyyy-MM-dd"));
}

/** Shift a date to the next business day if it falls on a weekend or
 *  public holiday. If the date is already a business day, returns it
 *  unchanged. Walks forward one day at a time — fine for typical
 *  shifts of 1-3 days; not optimised for huge gaps. */
export function shiftToNextBusinessDay(date: Date): Date {
  let cur = date;
  let safety = 14; // hard stop in case the holiday list ever has a 2-week run
  while (!isBusinessDay(cur) && safety > 0) {
    cur = addDays(cur, 1);
    safety -= 1;
  }
  return cur;
}

/** Why a date was shifted, for display. Returns null when no shift
 *  was needed. Looks back at the original date (before the shift)
 *  and explains in user-friendly terms. */
export function describeShift(originalDate: Date, shiftedDate: Date): string | null {
  if (originalDate.getTime() === shiftedDate.getTime()) return null;
  const originalIso = format(originalDate, "yyyy-MM-dd");
  const day = originalDate.getDay();
  if (AU_PUBLIC_HOLIDAYS.has(originalIso)) {
    return `moved from ${format(originalDate, "EEE d MMM")} (public holiday)`;
  }
  if (day === 0 || day === 6) {
    return `moved from ${format(originalDate, "EEE d MMM")} (weekend)`;
  }
  return `moved from ${format(originalDate, "EEE d MMM")}`;
}

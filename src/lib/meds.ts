import { format } from "date-fns";
import type { MedEntry } from "./store";

/** A med is treated as stopped if its status field says so, the legacy
 *  stopped boolean is set, OR its stopDate has been reached. The auto-
 *  stop on stopDate happens at read time so we don't need a cron / DB
 *  write to flip the flag — every page that filters by "currently
 *  taking" should call this helper instead of checking m.stopped alone. */
export function isMedEffectivelyStopped(m: MedEntry): boolean {
  if (m.status === "stopped") return true;
  if (m.stopped) return true;
  if (m.stopDate) {
    const today = format(new Date(), "yyyy-MM-dd");
    if (m.stopDate <= today) return true;
  }
  return false;
}

/** True when the med has a stopDate equal to today's date — used by
 *  the Daily Trace transition notice. */
export function medStoppedToday(m: MedEntry): boolean {
  if (!m.stopDate) return false;
  const today = format(new Date(), "yyyy-MM-dd");
  return m.stopDate === today;
}

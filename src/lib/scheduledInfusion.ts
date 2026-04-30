"use client";
import { addDays, format, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { supabase } from "./supabase";
import { PROTOCOLS, type TreatmentDay } from "./treatmentProtocols";
import { describeShift, shiftToNextBusinessDay } from "./businessDays";
import type { InfusionLog } from "./store";

export type ScheduledInfusion = {
  cycleDay: number;
  scheduled: TreatmentDay;
  entry: InfusionLog | undefined;
  /** true when no entry exists OR the existing entry has completed !== true */
  isIncomplete: boolean;
  /** The actual date this treatment was scheduled for after any shift
   *  to dodge weekends + public holidays. */
  scheduledDate: Date;
  /** The protocol's raw date before shifting. Equal to scheduledDate
   *  when no shift was needed. */
  originalDate: Date;
  /** Human-friendly explanation of the shift, or null if none. */
  shiftReason: string | null;
};

/** Build the full list of scheduled treatment dates, with each cycle
 *  day shifted to the next business day if its raw date falls on a
 *  weekend or AU public holiday. Order preserved from the protocol's
 *  cycleDay sort. */
function buildScheduledDates(opts: {
  startDate: string;
  treatmentDays: readonly TreatmentDay[];
}): Array<{ cycleDay: number; scheduled: TreatmentDay; scheduledDate: Date; originalDate: Date; shiftReason: string | null }> {
  const start = parseISO(`${opts.startDate}T00:00:00`);
  if (isNaN(start.getTime())) return [];
  return opts.treatmentDays.slice().sort((a, b) => a.day - b.day).map((day) => {
    const original = addDays(start, day.day - 1);
    const shifted = shiftToNextBusinessDay(original);
    return {
      cycleDay: day.day,
      scheduled: day,
      scheduledDate: shifted,
      originalDate: original,
      shiftReason: describeShift(original, shifted),
    };
  });
}

/** Pure lookup — given the patient's regimen + start date, does the supplied
 *  date fall on a scheduled treatment day (after shifting)? And if so, is it
 *  done? Matches against the SHIFTED date so a clinic visit on Monday can
 *  pick up a treatment that protocol-wise was scheduled for the prior
 *  Sunday or public holiday. */
export function getScheduledInfusion(opts: {
  date: string;
  startDate?: string;
  regimen?: string;
  customTreatmentDays?: TreatmentDay[];
  infusions: readonly InfusionLog[];
}): ScheduledInfusion | null {
  const { date, startDate, regimen, customTreatmentDays, infusions } = opts;
  if (!startDate || !regimen) return null;
  const protocol = PROTOCOLS[regimen];
  const treatmentDays = protocol?.days ?? customTreatmentDays ?? [];
  if (treatmentDays.length === 0) return null;
  const targetIso = date;
  const all = buildScheduledDates({ startDate, treatmentDays });
  const match = all.find((d) => format(d.scheduledDate, "yyyy-MM-dd") === targetIso);
  if (!match) return null;
  const entry = infusions.find((i) => i.cycleDay === match.cycleDay);
  const isIncomplete = !entry || !entry.completed;
  return {
    cycleDay: match.cycleDay,
    scheduled: match.scheduled,
    entry,
    isIncomplete,
    scheduledDate: match.scheduledDate,
    originalDate: match.originalDate,
    shiftReason: match.shiftReason,
  };
}

/** Find the next scheduled treatment day on or after `fromDate` that isn't
 *  already logged as completed. Used on the home Coming-Up tile. */
export function getNextScheduledInfusion(opts: {
  fromDate: string;
  startDate?: string;
  regimen?: string;
  customTreatmentDays?: TreatmentDay[];
  infusions: readonly InfusionLog[];
}): { cycleDay: number; scheduled: TreatmentDay; date: Date; originalDate: Date; shiftReason: string | null } | null {
  const { fromDate, startDate, regimen, customTreatmentDays, infusions } = opts;
  if (!startDate || !regimen) return null;
  const protocol = PROTOCOLS[regimen];
  const treatmentDays = protocol?.days ?? customTreatmentDays ?? [];
  if (treatmentDays.length === 0) return null;
  const from = parseISO(`${fromDate}T00:00:00`);
  const all = buildScheduledDates({ startDate, treatmentDays });
  for (const d of all) {
    if (d.scheduledDate < from) continue;
    const entry = infusions.find((i) => i.cycleDay === d.cycleDay);
    if (entry?.completed) continue;
    return {
      cycleDay: d.cycleDay,
      scheduled: d.scheduled,
      date: d.scheduledDate,
      originalDate: d.originalDate,
      shiftReason: d.shiftReason,
    };
  }
  return null;
}

/** Hook that pulls regimen + startDate + customTreatmentDays off the active
 *  patient profile once per mount, so pages can call getScheduledInfusion
 *  without duplicating the fetch. */
export function useTreatmentProfile() {
  const { activePatientId } = useSession();
  const [regimen, setRegimen] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [customDays, setCustomDays] = useState<TreatmentDay[] | undefined>();

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles")
      .select("data")
      .eq("patient_id", activePatientId)
      .maybeSingle()
      .then(({ data }) => {
        const p = data?.data as
          | { regimen?: string; startDate?: string; customTreatmentDays?: TreatmentDay[] }
          | undefined;
        if (p?.regimen) setRegimen(p.regimen);
        if (p?.startDate) setStartDate(p.startDate);
        if (p?.customTreatmentDays) setCustomDays(p.customTreatmentDays);
      });
  }, [activePatientId]);

  return { regimen, startDate, customDays };
}

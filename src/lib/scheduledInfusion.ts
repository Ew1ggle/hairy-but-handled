"use client";
import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { supabase } from "./supabase";
import { PROTOCOLS, type TreatmentDay } from "./treatmentProtocols";
import type { InfusionLog } from "./store";

export type ScheduledInfusion = {
  cycleDay: number;
  scheduled: TreatmentDay;
  entry: InfusionLog | undefined;
  /** true when no entry exists OR the existing entry has completed !== true */
  isIncomplete: boolean;
};

/** Pure lookup — given the patient's regimen + start date, does the supplied
 *  date fall on a scheduled treatment day? And if so, is it done? */
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
  const target = parseISO(`${date}T00:00:00`);
  const start = parseISO(`${startDate}T00:00:00`);
  if (isNaN(target.getTime()) || isNaN(start.getTime())) return null;
  const cycleDay = differenceInCalendarDays(target, start) + 1;
  if (cycleDay < 1) return null;
  const scheduled = treatmentDays.find((d) => d.day === cycleDay);
  if (!scheduled) return null;
  const entry = infusions.find((i) => i.cycleDay === cycleDay);
  const isIncomplete = !entry || !entry.completed;
  return { cycleDay, scheduled, entry, isIncomplete };
}

/** Find the next scheduled treatment day on or after `fromDate` that isn't
 *  already logged as completed. Used on the home Coming-Up tile. */
export function getNextScheduledInfusion(opts: {
  fromDate: string;
  startDate?: string;
  regimen?: string;
  customTreatmentDays?: TreatmentDay[];
  infusions: readonly InfusionLog[];
}): { cycleDay: number; scheduled: TreatmentDay; date: Date } | null {
  const { fromDate, startDate, regimen, customTreatmentDays, infusions } = opts;
  if (!startDate || !regimen) return null;
  const protocol = PROTOCOLS[regimen];
  const treatmentDays = protocol?.days ?? customTreatmentDays ?? [];
  if (treatmentDays.length === 0) return null;
  const from = parseISO(`${fromDate}T00:00:00`);
  const start = parseISO(`${startDate}T00:00:00`);
  if (isNaN(start.getTime())) return null;
  for (const day of treatmentDays.slice().sort((a, b) => a.day - b.day)) {
    const date = addDays(start, day.day - 1);
    if (date < from) continue;
    const entry = infusions.find((i) => i.cycleDay === day.day);
    if (entry?.completed) continue;
    return { cycleDay: day.day, scheduled: day, date };
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

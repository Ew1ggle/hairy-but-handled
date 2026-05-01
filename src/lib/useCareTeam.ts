"use client";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { supabase } from "./supabase";

const CORE_PRACTITIONER_KEYS = [
  { key: "hematologist", label: "Hematologist" },
  { key: "immunologist", label: "Immunologist" },
  { key: "psychologist", label: "Psychologist" },
  { key: "psychiatrist", label: "Psychiatrist" },
  { key: "gp", label: "GP" },
  { key: "coordinator", label: "Cancer care coordinator" },
] as const;

type CustomPractitioner = { id: string; role?: string; name?: string };

export type CareTeamMember = { value: string; label: string; role?: string };

/** Reads the patient profile and returns the care-team members as a
 *  list of name+role pairs. `value` is the raw name (used to fill an
 *  input or compare against existing values); `label` is the display
 *  string ("GP — Dr Patel"). Skips practitioners marked NA or missing
 *  a name. Includes any customPractitioners with a name set. */
export function useCareTeamMembers(): CareTeamMember[] {
  const { activePatientId } = useSession();
  const [members, setMembers] = useState<CareTeamMember[]>([]);
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = (data?.data ?? {}) as Record<string, unknown>;
        const list: CareTeamMember[] = [];
        for (const { key, label } of CORE_PRACTITIONER_KEYS) {
          if (p[`${key}NA`]) continue;
          const name = p[key];
          if (typeof name === "string" && name.trim()) {
            list.push({ value: name.trim(), label: `${label} — ${name.trim()}`, role: label });
          }
        }
        const custom = p.customPractitioners;
        if (Array.isArray(custom)) {
          for (const c of custom as CustomPractitioner[]) {
            const name = c?.name?.trim();
            if (!name) continue;
            const role = c?.role?.trim();
            list.push({ value: name, label: role ? `${role} — ${name}` : name, role });
          }
        }
        setMembers(list);
      });
  }, [activePatientId]);
  return members;
}

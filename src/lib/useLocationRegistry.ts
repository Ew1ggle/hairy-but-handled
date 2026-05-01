"use client";
import { useEffect, useMemo, useState } from "react";
import { useEntries } from "./store";
import { useSession } from "./session";
import { supabase } from "./supabase";

/** Builds a registry of hospitals and wards from the patient's
 *  history — past admissions, past ED visits, past appointments,
 *  and the profile's treating hospital. Returns chip-ready name
 *  arrays plus a wardsByHospital index so a chosen hospital can
 *  narrow the ward suggestions to ones the patient has actually
 *  been on. Names are deduped case-insensitively but the original
 *  casing of the first occurrence is preserved. */
export function useLocationRegistry() {
  const admissions = useEntries("admission");
  const appointments = useEntries("appointment");
  const { activePatientId } = useSession();
  const [profileHospital, setProfileHospital] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = (data?.data ?? {}) as Record<string, unknown>;
        if (typeof p.hospital === "string") setProfileHospital(p.hospital);
      });
  }, [activePatientId]);

  return useMemo(() => {
    const hospitals = new Map<string, string>();
    const wards = new Map<string, string>();
    const wardsByHospital = new Map<string, Map<string, string>>();
    const addHospital = (raw: string | undefined) => {
      const t = (raw ?? "").trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (!hospitals.has(k)) hospitals.set(k, t);
    };
    const addWard = (raw: string | undefined, hospital?: string) => {
      const t = (raw ?? "").trim();
      if (!t) return;
      const k = t.toLowerCase();
      if (!wards.has(k)) wards.set(k, t);
      const hk = (hospital ?? "").trim().toLowerCase();
      if (hk) {
        if (!wardsByHospital.has(hk)) wardsByHospital.set(hk, new Map());
        const sub = wardsByHospital.get(hk)!;
        if (!sub.has(k)) sub.set(k, t);
      }
    };
    addHospital(profileHospital);
    for (const a of admissions) {
      addHospital(a.hospital);
      addWard(a.ward, a.hospital);
    }
    for (const a of appointments) {
      // Appointment.location is a free-text venue; treat hospital
      // appointments as hospital chips. Non-hospital venues fall in
      // alongside (a "GP clinic" still counts as a known location).
      addHospital(a.location);
    }
    return {
      hospitals: Array.from(hospitals.values()).sort(),
      wards: Array.from(wards.values()).sort(),
      wardsForHospital(hospital: string): string[] {
        const k = hospital.trim().toLowerCase();
        if (!k) return Array.from(wards.values()).sort();
        const sub = wardsByHospital.get(k);
        return sub ? Array.from(sub.values()).sort() : [];
      },
    };
  }, [admissions, appointments, profileHospital]);
}

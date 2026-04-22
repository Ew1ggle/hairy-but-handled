"use client";
import { useEffect, useState } from "react";
import { useSession } from "./session";
import { supabase } from "./supabase";

/**
 * Returns the active patient's name and whether the current user is viewing
 * someone else's record (i.e. they are support/doctor, not the patient).
 *
 * When `isSupport` is true, UI should refer to the patient by name
 * rather than "you" / "I".
 */
export function usePatientName() {
  const { activePatientId, role } = useSession();
  const [name, setName] = useState("");

  const [preferredName, setPreferredName] = useState("");

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles")
      .select("data")
      .eq("patient_id", activePatientId)
      .maybeSingle()
      .then(({ data }) => {
        const d = data?.data as { name?: string; preferredName?: string } | undefined;
        setName(d?.name ?? "");
        setPreferredName(d?.preferredName ?? "");
      });
  }, [activePatientId]);

  const isSupport = role === "support" || role === "doctor";
  // Prefer the preferred name; fall back to first word of full name; fall back to full name
  const firstName = preferredName.trim() || name.split(" ")[0] || name;
  // `displayName` is what UI should use as the primary label for this patient
  const displayName = preferredName.trim() || name;

  return { name, firstName, displayName, preferredName, isSupport };
}

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

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles")
      .select("data")
      .eq("patient_id", activePatientId)
      .maybeSingle()
      .then(({ data }) => {
        const n = (data?.data as { name?: string })?.name;
        setName(n ?? "");
      });
  }, [activePatientId]);

  const isSupport = role === "support" || role === "doctor";
  const firstName = name.split(" ")[0] || name;

  return { name, firstName, isSupport };
}

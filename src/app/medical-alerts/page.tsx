"use client";
import AppShell from "@/components/AppShell";
import { PageTitle } from "@/components/ui";
import { MedicalAlertCard } from "@/components/MedicalAlertCard";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function MedicalAlertsPage() {
  const { activePatientId } = useSession();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as { name?: string; preferredName?: string } | undefined;
        const display = p?.preferredName?.trim() || p?.name?.trim();
        if (display) setName(display);
      });
  }, [activePatientId]);

  return (
    <AppShell>
      <PageTitle sub="Show in person, share as text, or tap-to-share over NFC.">
        Medical alerts
      </PageTitle>

      <p className="text-sm text-[var(--ink-soft)] mb-4">
        For emergency staff, triage nurses, or anyone handling body fluids. Non-hospital-specific.
      </p>

      <div className="space-y-4">
        <MedicalAlertCard kind="neutropenic" name={name} />
        <MedicalAlertCard kind="cytotoxic" name={name} />
      </div>
    </AppShell>
  );
}

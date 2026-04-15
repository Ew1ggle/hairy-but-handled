"use client";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { ChevronDown, User } from "lucide-react";

/**
 * Shown in the app header only when the signed-in user is a member of MORE than one care circle.
 * Lets them flip which patient's record they're viewing.
 */
export default function PatientSwitcher() {
  const { memberships, activePatientId, setActivePatientId } = useSession();
  const [names, setNames] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sb = supabase();
    if (!sb || memberships.length <= 1) return;
    const ids = memberships.map((m) => m.patient_id);
    sb.from("patient_profiles").select("patient_id, data").in("patient_id", ids)
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data ?? []).forEach((r: { patient_id: string; data: { name?: string } }) => {
          if (r.data?.name) map[r.patient_id] = r.data.name;
        });
        setNames(map);
      });
  }, [memberships]);

  if (memberships.length <= 1) return null;

  const activeLabel = activePatientId
    ? (names[activePatientId] || memberships.find((m) => m.patient_id === activePatientId)?.role || "Patient")
    : "Choose patient";

  return (
    <div className="relative no-print">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-sm"
      >
        <User size={14} />
        <span className="truncate max-w-[180px]">Viewing: <b>{activeLabel}</b></span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg min-w-[220px] py-1">
          {memberships.map((m) => {
            const label = names[m.patient_id] || m.patient_id.slice(0, 8) + "…";
            return (
              <button
                key={m.patient_id}
                onClick={() => { setActivePatientId(m.patient_id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-soft)] ${m.patient_id === activePatientId ? "font-semibold" : ""}`}
              >
                <div>{label}</div>
                <div className="text-xs text-[var(--ink-soft)]">{m.role}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

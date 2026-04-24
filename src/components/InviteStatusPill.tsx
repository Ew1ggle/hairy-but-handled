"use client";
import { CheckCircle2, Clock } from "lucide-react";
import { STATUS_LABEL, type InviteStatus } from "@/lib/supportStatus";

/** Compact status badge for a support person's invite state.
 *  Used in the patient profile (Supports section) and the Care tab. */
export function InviteStatusPill({ status }: { status: InviteStatus }) {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium";
  if (status === "accepted") {
    return (
      <span className={`${base} bg-[var(--primary)] text-white`}>
        <CheckCircle2 size={10} /> {STATUS_LABEL[status]}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className={`${base} bg-[var(--pink)] text-[var(--pink-ink)]`}>
        <Clock size={10} /> {STATUS_LABEL[status]}
      </span>
    );
  }
  return (
    <span className={`${base} bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--ink-soft)]`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

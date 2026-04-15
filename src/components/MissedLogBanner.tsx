"use client";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { isToday, parseISO, differenceInHours } from "date-fns";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

/**
 * Surface a reminder when the patient's daily log hasn't been done yet today.
 * Visible to everyone in the care circle — most useful for support people / carers.
 */
export default function MissedLogBanner() {
  const { role, memberships } = useSession();
  const daily = useEntries("daily");
  const today = daily.find((d) => isToday(parseISO(d.createdAt)));
  if (!role) return null;
  if (today) return null;
  const latest = daily[0];
  const hoursSince = latest ? differenceInHours(new Date(), parseISO(latest.createdAt)) : null;
  const patientMembership = memberships.find((m) => m.role === "patient");

  return (
    <div className="no-print mb-3 rounded-xl bg-[var(--alert-soft)] border border-[var(--alert)] px-3 py-2.5 text-sm flex items-start gap-2">
      <AlertCircle size={16} className="text-[var(--alert)] shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="font-semibold text-[var(--alert)]">
          {role === "patient" ? "You haven't logged today yet" : `${patientMembership ? "The patient" : "Nobody"} hasn't logged today yet`}
        </div>
        {hoursSince != null && (
          <div className="text-xs text-[var(--ink-soft)]">Last entry was {hoursSince}h ago.</div>
        )}
      </div>
      <Link href="/log" className="shrink-0 text-xs font-medium text-[var(--primary)] underline underline-offset-2">Log now</Link>
    </div>
  );
}

"use client";
import { Card } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { medStoppedToday } from "@/lib/meds";
import { Pill } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

/** Compact notice on Daily Trace listing any medications whose stopDate
 *  is today, so a transition isn't a silent state change. Tap to open
 *  /meds and confirm. */
export function MedTransitionsCard() {
  const meds = useEntries("med");

  const stoppedToday = useMemo(
    () => meds.filter(medStoppedToday).sort((a, b) => a.name.localeCompare(b.name)),
    [meds],
  );

  if (stoppedToday.length === 0) return null;

  return (
    <Card className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Pill size={14} className="text-[var(--alert)]" />
          Medication transitions today
        </h3>
        <Link href="/meds" className="text-xs text-[var(--primary)] font-medium">
          Open Med Deck →
        </Link>
      </div>
      <p className="text-xs text-[var(--ink-soft)] mb-2">
        These meds reached their stop date today. Confirm they were actually stopped.
      </p>
      <ul className="text-sm space-y-1">
        {stoppedToday.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--alert)] shrink-0" />
            <span className="font-medium">{m.name}</span>
            {m.dose && <span className="text-[var(--ink-soft)]">· {m.dose}</span>}
            {m.reason && <span className="text-xs text-[var(--ink-soft)] truncate">— {m.reason}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

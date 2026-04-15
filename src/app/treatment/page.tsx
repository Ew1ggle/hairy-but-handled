"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { useEntries } from "@/lib/store";
import Link from "next/link";
import { CheckCircle2, Circle, Droplet, AlertTriangle } from "lucide-react";

const CYCLE: { day: number; drugs: string }[] = [
  { day: 1, drugs: "Rituximab + Cladribine" },
  { day: 2, drugs: "Cladribine" },
  { day: 3, drugs: "Cladribine" },
  { day: 4, drugs: "Cladribine" },
  { day: 5, drugs: "Cladribine" },
  { day: 8, drugs: "Rituximab" },
  { day: 15, drugs: "Rituximab" },
  { day: 22, drugs: "Rituximab" },
  { day: 29, drugs: "Rituximab" },
  { day: 36, drugs: "Rituximab" },
  { day: 43, drugs: "Rituximab" },
  { day: 50, drugs: "Rituximab" },
];

export default function Treatment() {
  const infusions = useEntries("infusion");
  const byDay = new Map(infusions.map((i) => [i.cycleDay, i]));

  return (
    <AppShell>
      <PageTitle sub="56-day cycle. Tap a day to log the infusion or a reaction.">
        Treatment calendar
      </PageTitle>

      <div className="space-y-2">
        {CYCLE.map(({ day, drugs }) => {
          const entry = byDay.get(day);
          const done = !!entry?.completed;
          const reaction = !!entry?.reaction;
          return (
            <Link
              key={day}
              href={`/treatment/${day}`}
              className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5"
            >
              <div className="shrink-0">
                {done ? (
                  <CheckCircle2 className="text-[var(--good)]" size={24} />
                ) : (
                  <Circle className="text-[var(--ink-soft)]" size={24} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Day {day}</span>
                  <span className="text-sm text-[var(--ink-soft)]">· {drugs}</span>
                </div>
                {entry && (
                  <div className="text-xs text-[var(--ink-soft)] mt-0.5 flex gap-2 items-center">
                    {entry.actualStart && <span>Started {new Date(entry.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                    {reaction && (
                      <span className="inline-flex items-center gap-1 text-[var(--alert)]">
                        <AlertTriangle size={12} /> reaction
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Droplet size={18} className="text-[var(--ink-soft)]" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

"use client";
import { Card } from "@/components/ui";
import { useEntries, type SymptomCardSeverity, type SymptomCardPattern } from "@/lib/store";
import { isToday, parseISO } from "date-fns";
import { Sparkles, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

const SEVERITY_TONE: Record<SymptomCardSeverity, "ok" | "warn" | "alert"> = {
  mild: "ok",
  moderate: "warn",
  severe: "alert",
};

const PATTERN_TONE: Record<SymptomCardPattern, "ok" | "warn" | "alert"> = {
  steady: "warn",
  improving: "ok",
  worsening: "alert",
  "comes-and-goes": "warn",
};

/** Compact summary of active Symptom Deck cards + today's relief
 *  attempts, embedded on Daily Trace so the patient/support person can
 *  see what's currently going on without leaving the day's log. */
export function ActiveSymptomsCard() {
  const symptoms = useEntries("symptom");
  const relief = useEntries("relief");

  const active = useMemo(
    () => symptoms.filter((s) => s.stillActive !== false).slice(0, 6),
    [symptoms],
  );
  const todaysRelief = useMemo(
    () => relief.filter((r) => isToday(parseISO(r.createdAt))),
    [relief],
  );

  if (active.length === 0 && todaysRelief.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href="/symptoms"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--purple)] text-[var(--purple-ink)] flex items-center justify-center shrink-0">
              <Stethoscope size={14} />
            </div>
            <div className="font-medium text-sm">Symptom Deck</div>
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            Add ongoing symptoms to track
          </div>
        </Link>
        <Link
          href="/relief"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 active:scale-[0.99] transition"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="font-medium text-sm">Relief Log</div>
          </div>
          <div className="text-[11px] text-[var(--ink-soft)] mt-1 truncate">
            Log what actually helped
          </div>
        </Link>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Stethoscope size={14} className="text-[var(--purple)]" />
          Symptoms &amp; relief
        </h3>
        <div className="text-xs text-[var(--ink-soft)]">
          {active.length > 0 && <Link href="/symptoms" className="text-[var(--primary)] font-medium">{active.length} active</Link>}
          {active.length > 0 && todaysRelief.length > 0 && " · "}
          {todaysRelief.length > 0 && <Link href="/relief" className="text-[var(--primary)] font-medium">{todaysRelief.length} relief today</Link>}
        </div>
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {active.map((s) => {
            const sevTone = s.severity ? SEVERITY_TONE[s.severity] : null;
            const patTone = s.pattern ? PATTERN_TONE[s.pattern] : null;
            const isAlert = sevTone === "alert" || patTone === "alert";
            return (
              <Link
                key={s.id}
                href="/symptoms"
                className={`text-xs rounded-full px-2.5 py-1 font-medium ${
                  isAlert
                    ? "bg-[var(--alert-soft)] text-[var(--alert)]"
                    : "bg-[var(--surface-soft)] text-[var(--ink)]"
                }`}
              >
                {s.name}
                {s.severity && <span className="opacity-70"> · {s.severity}</span>}
              </Link>
            );
          })}
        </div>
      )}

      {todaysRelief.length > 0 && (
        <ul className="text-xs space-y-0.5">
          {todaysRelief.slice(0, 3).map((r) => (
            <li key={r.id} className="flex gap-1 text-[var(--ink-soft)]">
              <Sparkles size={11} className="shrink-0 mt-0.5 text-[var(--primary)]" />
              <span><b className="text-[var(--ink)]">{r.triedWhat}</b> for {r.symptom}{r.helped && ` · helped: ${r.helped}`}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

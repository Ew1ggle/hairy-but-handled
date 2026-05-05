"use client";
import { Card } from "@/components/ui";
import { useEntries, type Signal, type SymptomCard, type SymptomCardSeverity, type SymptomCardPattern, type SymptomDailyStatus, type SymptomCardStatusEntry } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, isToday, parseISO, differenceInCalendarDays } from "date-fns";
import { Sparkles, Stethoscope, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { searchSideEffects } from "@/lib/sideEffects";
import { buildMirroredSignal } from "@/lib/symptomSignalBridge";

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

/** Map a daily-status tap to the long-running pattern field on the
 *  parent SymptomCard. Better → improving, Same → steady, Worse →
 *  worsening. The "comes-and-goes" pattern lives on the full
 *  /symptoms editor — this quick-tap doesn't try to express it. */
const STATUS_TO_PATTERN: Record<SymptomDailyStatus, SymptomCardPattern> = {
  better: "improving",
  same: "steady",
  worse: "worsening",
};

/** Compact summary of active Symptom Deck cards + today's relief
 *  attempts, embedded on Daily Trace. Each ongoing symptom now
 *  carries quick-tap Better / Same / Worse / Resolved buttons so
 *  the carer can update status in one tap without re-adding the
 *  side effect to today's tags. */
export function ActiveSymptomsCard() {
  const { addEntry, updateEntry } = useSession();
  const symptoms = useEntries("symptom");
  const relief = useEntries("relief");

  const active = useMemo(
    () => symptoms.filter((s) => s.stillActive !== false),
    [symptoms],
  );
  const todaysRelief = useMemo(
    () => relief.filter((r) => isToday(parseISO(r.createdAt))),
    [relief],
  );

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const newSuggestions = useMemo(
    () => (newName.trim().length >= 2 ? searchSideEffects(newName, { limit: 5 }) : []),
    [newName],
  );

  const today = format(new Date(), "yyyy-MM-dd");

  const setStatus = async (s: SymptomCard, status: SymptomDailyStatus) => {
    // Replace today's entry if one exists, otherwise append. Keeps
    // the array de-duplicated by date so a flurry of taps doesn't
    // bloat the log.
    const existing = (s.dailyStatuses ?? []).filter((d) => d.date !== today);
    const next: SymptomCardStatusEntry[] = [
      ...existing,
      { date: today, status },
    ].sort((a, b) => a.date.localeCompare(b.date));
    await updateEntry(s.id, {
      dailyStatuses: next,
      pattern: STATUS_TO_PATTERN[status],
    } as Partial<SymptomCard>);
    // Bridge the status tap into Signal Sweep so today's signals
    // list also reflects "rash — same today". autoFromSymptom flag
    // breaks the loop so the signal-sweep handler doesn't bounce a
    // duplicate symptom card back.
    await addEntry(buildMirroredSignal({ symptomName: s.name, status }) as Omit<Signal, "id" | "createdAt">);
  };

  const markResolved = async (s: SymptomCard) => {
    await updateEntry(s.id, {
      stillActive: false,
    } as Partial<SymptomCard>);
  };

  const addOngoing = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addEntry({
      kind: "symptom",
      name: trimmed,
      firstNoticed: today,
      stillActive: true,
    } as Omit<SymptomCard, "id" | "createdAt">);
    // Bridge into Signal Sweep so the symptom shows up on today's
    // signal log without a second tap.
    await addEntry(buildMirroredSignal({ symptomName: trimmed, status: "same" }) as Omit<Signal, "id" | "createdAt">);
    setShowAdd(false);
    setNewName("");
  };

  if (active.length === 0 && todaysRelief.length === 0 && !showAdd) {
    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 active:scale-[0.99] transition text-left"
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
        </button>
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
    <Card className="mb-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Stethoscope size={14} className="text-[var(--purple)]" />
          Ongoing symptoms
        </h3>
        <Link href="/symptoms" className="text-xs text-[var(--primary)] font-medium">
          {active.length} active · open Deck
        </Link>
      </div>

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((s) => {
            const sevTone = s.severity ? SEVERITY_TONE[s.severity] : null;
            const patTone = s.pattern ? PATTERN_TONE[s.pattern] : null;
            const isAlert = sevTone === "alert" || patTone === "alert";
            const todayStatus = (s.dailyStatuses ?? []).find((d) => d.date === today)?.status;
            const lastEntry = (s.dailyStatuses ?? []).slice(-1)[0];
            const daysActive = s.firstNoticed
              ? differenceInCalendarDays(new Date(today), parseISO(s.firstNoticed))
              : null;
            return (
              <div
                key={s.id}
                className={
                  isAlert
                    ? "rounded-xl border border-[var(--alert)] bg-[var(--alert-soft)] p-2.5"
                    : "rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-2.5"
                }
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[10px] text-[var(--ink-soft)] shrink-0">
                    {daysActive != null && `Day ${daysActive + 1}`}
                    {s.severity && ` · ${s.severity}`}
                    {s.pattern && s.pattern !== STATUS_TO_PATTERN[todayStatus ?? "same"] && ` · ${s.pattern}`}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(["better", "same", "worse"] as const).map((status) => {
                    const on = todayStatus === status;
                    const label = status === "better" ? "Better today" : status === "same" ? "Same" : "Worse";
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStatus(s, status)}
                        className={
                          on
                            ? "rounded-full px-2.5 py-1 text-[11px] font-semibold border bg-[var(--primary)] text-white border-[var(--primary)]"
                            : "rounded-full px-2.5 py-1 text-[11px] font-medium border border-dashed border-[var(--border)] text-[var(--ink-soft)]"
                        }
                      >
                        {on ? "✓" : "+"} {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => markResolved(s)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium border border-dashed border-[var(--border)] text-[var(--ink-soft)]"
                  >
                    ✓ Resolved
                  </button>
                </div>
                {!todayStatus && lastEntry && (
                  <div className="text-[10px] text-[var(--ink-soft)] mt-1">
                    Last status {lastEntry.date}: {lastEntry.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showAdd ? (
        <div className="rounded-xl border-2 border-[var(--accent)] bg-[var(--surface-soft)] p-2.5 space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">
            New ongoing symptom
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Rash, Mouth ulcers, Itchy skin"
            autoFocus
            className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)]"
          />
          {newSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {newSuggestions.map((s) => (
                <button
                  key={s.title}
                  type="button"
                  onClick={() => setNewName(s.title)}
                  className="rounded-full px-2 py-0.5 text-[11px] border border-dashed border-[var(--border)] text-[var(--ink-soft)]"
                >
                  + {s.title}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => addOngoing(newName)}
              disabled={!newName.trim()}
              className="flex-1 rounded bg-[var(--accent)] text-white text-xs font-semibold py-1.5 disabled:opacity-50"
            >
              Track from today
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(""); }}
              className="rounded border border-[var(--border)] bg-[var(--surface)] text-xs font-medium px-3"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs font-semibold text-[var(--accent)] flex items-center justify-center gap-1"
        >
          <Plus size={12} /> Add ongoing symptom
        </button>
      )}

      {todaysRelief.length > 0 && (
        <ul className="text-xs space-y-0.5 pt-2 border-t border-[var(--border)]">
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

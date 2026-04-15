"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle, TextInput } from "@/components/ui";
import { SIDE_EFFECTS, PHASE_LABEL, type SideEffect, type Phase } from "@/lib/sideEffects";
import { useSession } from "@/lib/session";
import { useEntries, type DailyLog, type FlagEvent } from "@/lib/store";
import { isToday, parseISO } from "date-fns";
import { AlertTriangle, Phone, Search, Check } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function SideEffectsPage() {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SIDE_EFFECTS;
    return SIDE_EFFECTS.filter((s) =>
      s.title.toLowerCase().includes(term)
      || s.keywords.some((k) => k.toLowerCase().includes(term))
      || s.description.toLowerCase().includes(term)
      || (s.symptoms ?? []).some((x) => x.toLowerCase().includes(term))
    );
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<Phase, SideEffect[]> = { immediate: [], early: [], late: [] };
    filtered.forEach((s) => g[s.phase].push(s));
    return g;
  }, [filtered]);

  return (
    <AppShell>
      <PageTitle sub="Search symptoms or browse. Tap a side effect for what to do.">
        Side-effect finder
      </PageTitle>

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. rash, fever, tired, bruising…"
          className="pl-9"
        />
      </div>

      {(["immediate","early","late"] as Phase[]).map((phase) => {
        const items = grouped[phase];
        if (items.length === 0) return null;
        return (
          <section key={phase} className="mb-5">
            <h2 className="text-xs uppercase tracking-widest text-[var(--ink-soft)] mb-2">{PHASE_LABEL[phase]}</h2>
            <div className="space-y-2">
              {items.map((s) => (
                <SideEffectCard key={s.id} s={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <Card className="text-center text-[var(--ink-soft)]">No matches. Try another word.</Card>
      )}
    </AppShell>
  );
}

function SideEffectCard({ s, open, onToggle }: { s: SideEffect; open: boolean; onToggle: () => void }) {
  const isUrgent = s.urgentAction === "ed";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="font-semibold">{s.title}</div>
          {s.subtitle && <div className="text-xs text-[var(--ink-soft)]">{s.subtitle}</div>}
        </div>
        {isUrgent && (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-[var(--alert)] px-2 py-0.5 rounded-full bg-[var(--alert-soft)]">
            Urgent
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3 text-sm">
          <p>{s.description}</p>

          {s.symptoms && s.symptoms.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Symptoms may include</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {s.symptoms.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          {s.whatToDo && s.whatToDo.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">What helps</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {s.whatToDo.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          {s.urgent && s.urgent.length > 0 && (
            <div className={`rounded-xl p-3 ${isUrgent ? "bg-[var(--alert-soft)] border border-[var(--alert)]" : "bg-[var(--surface-soft)]"}`}>
              <div className={`flex items-center gap-1 text-xs font-semibold mb-1 ${isUrgent ? "text-[var(--alert)]" : ""}`}>
                <AlertTriangle size={12} /> {isUrgent ? "Go to ED / call the team" : "Call the treating team"}
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[13px]">
                {s.urgent.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          <ExperiencingControls s={s} />
        </div>
      )}
    </div>
  );
}

function ExperiencingControls({ s }: { s: SideEffect }) {
  const { addEntry, updateEntry } = useSession();
  const daily = useEntries("daily");
  const today = daily.find((d) => isToday(parseISO(d.createdAt)));
  const [saved, setSaved] = useState(false);

  const addToLog = async () => {
    const tag = `Side effect: ${s.title}`;
    if (today) {
      const existing = today.tags ?? [];
      if (!existing.includes(tag)) {
        await updateEntry(today.id, { tags: [...existing, tag] });
      }
    } else {
      await addEntry({ kind: "daily", tags: [tag], notes: `Flagged via side-effect finder: ${s.title}` } as Omit<DailyLog, "id" | "createdAt">);
    }
    if (s.urgentAction === "ed") {
      await addEntry({ kind: "flag", triggerLabel: s.title } as Omit<FlagEvent, "id" | "createdAt">);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="pt-1">
      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">Are you experiencing this now?</div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={addToLog}
          className="rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
        >
          {saved ? <><Check size={14} /> Added to today's log</> : "Yes — log it"}
        </button>
        {s.urgentAction === "ed" && (
          <Link href="/ed-triggers" className="rounded-xl bg-[var(--alert)] text-white px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Phone size={14} /> Call / go to ED
          </Link>
        )}
      </div>
    </div>
  );
}

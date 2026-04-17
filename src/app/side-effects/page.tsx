"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle, TextInput } from "@/components/ui";
import { SIDE_EFFECTS, PHASE_LABEL, PHASE_COLOUR, type SideEffect, type Phase } from "@/lib/sideEffects";
import { useSession } from "@/lib/session";
import { useEntries, type DailyLog, type FlagEvent } from "@/lib/store";
import { isToday, parseISO } from "date-fns";
import { AlertTriangle, Phone, Search, Check } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePatientName } from "@/lib/usePatientName";
import { MedicalDisclaimerFull } from "@/components/MedicalDisclaimer";

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
      || (s.whatToDo ?? []).some((x) => x.toLowerCase().includes(term))
      || (s.urgent ?? []).some((x) => x.toLowerCase().includes(term))
      || (s.subtitle ?? "").toLowerCase().includes(term)
    );
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<Phase, SideEffect[]> = { green: [], amber: [], red: [] };
    filtered.forEach((s) => g[s.phase].push(s));
    return g;
  }, [filtered]);

  return (
    <AppShell>
      <PageTitle sub="Search symptoms or browse. Tap a side effect for what to do.">
        Side-effect finder
      </PageTitle>

      <MedicalDisclaimerFull />

      <div className="mb-4 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)]" />
        <TextInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. rash, fever, tired, bruising…"
          className="pl-9"
        />
      </div>

      {(["green","amber","red"] as Phase[]).map((phase) => {
        const items = grouped[phase];
        if (items.length === 0) return null;
        const colours = PHASE_COLOUR[phase];
        return (
          <section key={phase} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colours.border }} />
              <h2 className="text-xs uppercase tracking-widest font-semibold" style={{ color: colours.text }}>{PHASE_LABEL[phase]}</h2>
            </div>
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
  const colours = PHASE_COLOUR[s.phase];
  const phaseLabel = s.phase === "green" ? "Watch" : s.phase === "amber" ? "Call team" : "ED now";
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: colours.border, borderLeftWidth: 4 }}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3 bg-[var(--surface)]">
        <div className="flex-1">
          <div className="font-semibold">{s.title}</div>
          {s.subtitle && <div className="text-xs text-[var(--ink-soft)]">{s.subtitle}</div>}
        </div>
        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: colours.bg, color: colours.text }}>
          {phaseLabel}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3 text-sm bg-[var(--surface)]">
          <p>{s.description}</p>

          {s.symptoms && s.symptoms.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">What it may look like</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {s.symptoms.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          {s.whatToDo && s.whatToDo.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">What may help</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {s.whatToDo.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          <div className="rounded-xl p-3" style={{ backgroundColor: colours.bg, borderLeft: `3px solid ${colours.border}` }}>
            <div className="flex items-center gap-1 text-xs font-semibold mb-1" style={{ color: colours.text }}>
              <AlertTriangle size={12} />
              {s.phase === "green" ? "Recommendation: Watch" : s.phase === "amber" ? "Recommendation: Call the treating team" : "Recommendation: Go to ED now"}
            </div>
            {s.urgent && s.urgent.length > 0 && (
              <ul className="list-disc pl-5 space-y-0.5 text-[13px]">
                {s.urgent.map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
          </div>

          {/* Escalation note */}
          {(s as SideEffect & { escalation?: string }).escalation && (
            <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-xs text-[var(--ink-soft)]">
              <span className="font-semibold">Escalation:</span> {(s as SideEffect & { escalation?: string }).escalation}
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
  const { firstName, isSupport } = usePatientName();
  const daily = useEntries("daily");
  const today = daily.find((d) => isToday(parseISO(d.createdAt)));
  const [saved, setSaved] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [checkedSymptoms, setCheckedSymptoms] = useState<Record<string, boolean>>({});
  const [showCallLog, setShowCallLog] = useState(false);
  const [callDetails, setCallDetails] = useState("");
  const [callSaved, setCallSaved] = useState(false);

  const toggleSymptom = (symptom: string) => {
    setCheckedSymptoms((prev) => ({ ...prev, [symptom]: !prev[symptom] }));
  };

  const selectedSymptoms = Object.entries(checkedSymptoms).filter(([, v]) => v).map(([k]) => k);

  const addToLog = async () => {
    // Build a detailed tag that includes specific symptoms
    const symptomDetail = selectedSymptoms.length > 0
      ? ` (${selectedSymptoms.join(", ")})`
      : "";
    const tag = `Side effect: ${s.title}${symptomDetail}`;

    if (today) {
      const existingTags = today.tags ?? [];
      if (!existingTags.includes(tag)) {
        await updateEntry(today.id, { tags: [...existingTags, tag] });
      }
    } else {
      await addEntry({ kind: "daily", tags: [tag] } as Omit<DailyLog, "id" | "createdAt">);
    }
    // Log as flag for both amber (call) and red (ed) items
    if (s.urgentAction === "ed" || s.urgentAction === "call") {
      const flagLabel = selectedSymptoms.length > 0
        ? `${s.phase === "amber" ? "Amber" : "Red"}: ${s.title} — ${selectedSymptoms.join(", ")}`
        : `${s.phase === "amber" ? "Amber" : "Red"}: ${s.title}`;
      await addEntry({ kind: "flag", triggerLabel: flagLabel } as Omit<FlagEvent, "id" | "createdAt">);
    }
    setSaved(true);
    setShowSymptoms(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const saveCallDetails = async () => {
    if (!callDetails.trim()) return;
    await addEntry({
      kind: "flag",
      triggerLabel: `Team contacted: ${s.title}`,
      adviceGiven: callDetails,
      whoCalled: "Care team",
    } as Omit<FlagEvent, "id" | "createdAt">);
    setCallSaved(true);
    setShowCallLog(false);
  };

  return (
    <div className="pt-1 space-y-2">
      <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1.5">{isSupport ? `Is ${firstName} experiencing this now?` : "Are you experiencing this now?"}</div>

      {/* Symptom checklist — shown when user clicks Yes */}
      {showSymptoms && s.symptoms && s.symptoms.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-2">
          <div className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide">Which symptoms? (tick all that apply)</div>
          <div className="space-y-1.5">
            {s.symptoms.map((symptom) => (
              <label key={symptom} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 shrink-0"
                  checked={!!checkedSymptoms[symptom]}
                  onChange={() => toggleSymptom(symptom)}
                />
                <span>{symptom}</span>
              </label>
            ))}
          </div>
          <button
            onClick={addToLog}
            className="w-full rounded-xl bg-[var(--primary)] text-white px-3 py-2.5 text-sm font-medium mt-2"
          >
            Add to log{selectedSymptoms.length > 0 ? ` (${selectedSymptoms.length} selected)` : ""}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!showSymptoms && !saved && (
          <button
            onClick={() => s.symptoms && s.symptoms.length > 0 ? setShowSymptoms(true) : addToLog()}
            className="rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
          >
            Yes — log it
          </button>
        )}
        {saved && (
          <div className="rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Check size={14} /> Added to log
          </div>
        )}
        {s.urgentAction === "call" && (
          <button
            onClick={() => setShowCallLog(true)}
            className="rounded-xl text-white px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5"
            style={{ backgroundColor: "#d4a017" }}
          >
            <Phone size={14} /> Call the team
          </button>
        )}
        {s.urgentAction === "ed" && (
          <Link href="/ed-triggers" className="rounded-xl bg-[var(--alert)] text-white px-3 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Phone size={14} /> Call / go to ED
          </Link>
        )}
      </div>

      {/* Call log — record what the team said */}
      {showCallLog && !callSaved && (
        <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "#d4a017", backgroundColor: "#fef9e7" }}>
          <div className="text-sm font-semibold" style={{ color: "#b8860b" }}>Record the call</div>
          <p className="text-xs text-[var(--ink-soft)]">Who did you speak to and what was the advice?</p>
          <textarea
            value={callDetails}
            onChange={(e) => setCallDetails(e.target.value)}
            placeholder="e.g. Spoke to nurse on haem ward. Advised to monitor temp and come in if it reaches 38..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm min-h-[60px]"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCallLog(false)} className="flex-1 rounded-xl border border-[var(--border)] py-2 text-sm">Cancel</button>
            <button onClick={saveCallDetails} className="flex-1 rounded-xl text-white py-2 text-sm font-medium" style={{ backgroundColor: "#d4a017" }}>Save</button>
          </div>
        </div>
      )}
      {callSaved && (
        <div className="rounded-xl p-2 text-xs text-center" style={{ backgroundColor: "#e8f5e9", color: "#2d7a4f" }}>
          Call details saved to your record
        </div>
      )}
    </div>
  );
}

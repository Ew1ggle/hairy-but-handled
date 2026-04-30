"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TagToggles, TextArea, TextInput } from "@/components/ui";
import { SideEffectPicker } from "@/components/SideEffectPicker";
import { useEntries, type Admission, type InfusionLog } from "@/lib/store";
import { SIGNAL_BY_ID } from "@/lib/signals";
import { ClinicianPicker } from "@/components/ClinicianPicker";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { detectTrends, type TrendSeverity } from "@/lib/trends";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Timer, ClipboardList, Plus, Trash2, AlertTriangle, Activity, ChevronRight, Stethoscope } from "lucide-react";

const SEVERITY_TONE: Record<TrendSeverity, { bg: string; text: string; label: string }> = {
  watch: { bg: "var(--surface-soft)", text: "var(--ink)", label: "Watch" },
  discuss: { bg: "var(--alert-soft)", text: "var(--alert)", label: "Discuss with team" },
  urgent: { bg: "var(--alert)", text: "white", label: "Urgent" },
};

const CYCLE_DRUGS: Record<number, string> = {
  1: "Rituximab + Cladribine",
  2: "Cladribine", 3: "Cladribine", 4: "Cladribine", 5: "Cladribine",
  8: "Rituximab", 15: "Rituximab", 22: "Rituximab", 29: "Rituximab",
  36: "Rituximab", 43: "Rituximab", 50: "Rituximab",
};

const PREMEDS = [
  "Paracetamol",
  "Antihistamine (e.g. phenergan, loratadine)",
  "Steroid (e.g. hydrocortisone, dexamethasone)",
  "Anti-emetic (e.g. ondansetron)",
  "IV fluids",
];

const CANNULA_ISSUES = [
  "Pain",
  "Stinging",
  "Swelling",
  "Redness",
  "Warmth",
  "Hardness",
  "Leaking",
  "Bruising",
];

type NurseLog = { id: string; issue?: string; addressed?: "Yes" | "No" | "Partly" | ""; response?: string };

type InfusionExtra = {
  premedsGiven?: string[];
  premedsOther?: string;
  noPremedsGiven?: boolean;
  cannulaSite?: string;
  cannulaIssues?: string[];
  cannulaIssuesOther?: string;
  noCannulaIssues?: boolean;
  nurse?: string;
  nurseLogs?: NurseLog[];
  reactionSymptomsOther?: string;
  pausedAt?: string;
  recommenced?: boolean;
  recommencedAt?: string;
};

export default function InfusionDay({ params }: { params: Promise<{ day: string }> }) {
  const { day } = use(params);
  const router = useRouter();
  const { addEntry, updateEntry, role, activePatientId } = useSession();
  const cycleDay = Number(day);
  const drugs = CYCLE_DRUGS[cycleDay] ?? "Rituximab";
  const all = useEntries("infusion");
  const existing = all.find((i) => i.cycleDay === cycleDay);
  const admissions = useEntries("admission");

  // Live trends — detect against the current data so the treatment day
  // page surfaces what's been happening between infusions, not just on
  // /trends. Baselines come from the patient profile.
  const signals = useEntries("signal");
  const daily = useEntries("daily");
  const bloods = useEntries("bloods");
  const flags = useEntries("flag");
  const [baselines, setBaselines] = useState<{ temp?: number; hr?: number; weight?: number }>({});

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = (data?.data ?? {}) as Record<string, string | undefined>;
        const parse = (s?: string) => {
          if (!s) return undefined;
          const n = Number(s);
          return Number.isFinite(n) ? n : undefined;
        };
        setBaselines({
          temp: parse(p.baselineTemp),
          hr: parse(p.baselineHR),
          weight: parse(p.baselineWeight),
        });
      });
  }, [activePatientId]);

  const detectedTrends = useMemo(() => {
    return detectTrends({
      signals, daily, bloods, flags,
      baselineTemp: baselines.temp,
      baselineHR: baselines.hr,
      baselineWeight: baselines.weight,
    });
  }, [signals, daily, bloods, flags, baselines]);

  // If an admission was logged on the same day as this infusion entry,
  // show a cross-link banner so the two records are connected.
  const sameDayAdmission = useMemo(() => {
    if (!existing) return undefined;
    const infusionDate = format(parseISO(existing.createdAt), "yyyy-MM-dd");
    return admissions.find((a) => a.admissionDate === infusionDate);
  }, [existing, admissions]);

  /** Known nurses pulled from any admission that's logged a nurse on
   *  it. Drives the ClinicianPicker chip suggestions on the nurse
   *  field so repeat infusion days don't require re-typing. */
  const knownNurses = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of admissions) {
      for (const n of (a.nurses ?? [])) {
        if (!n?.trim()) continue;
        const k = n.trim().toLowerCase();
        if (!seen.has(k)) seen.set(k, n.trim());
      }
    }
    return Array.from(seen.values()).sort();
  }, [admissions]);

  const [plannedTime, setPlanned] = useState("");
  const [actualStart, setStart] = useState("");
  const [actualEnd, setEnd] = useState("");
  const [completed, setCompleted] = useState(false);
  const [reaction, setReaction] = useState(false);
  const [reactionSymptoms, setSymptoms] = useState<string[]>([]);
  const [reactionTimeAfterStart, setReactTime] = useState("");
  const [paused, setPaused] = useState(false);
  const [meds, setMeds] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [extra, setExtra] = useState<InfusionExtra>({ premedsGiven: [], cannulaIssues: [] });

  useEffect(() => {
    if (existing) {
      setPlanned(existing.plannedTime ?? "");
      setStart(existing.actualStart ?? "");
      setEnd(existing.actualEnd ?? "");
      setCompleted(!!existing.completed);
      setReaction(!!existing.reaction);
      setSymptoms(existing.reactionSymptoms ?? []);
      setReactTime(existing.reactionTimeAfterStart ?? "");
      setPaused(!!existing.paused);
      setMeds(existing.meds ?? "");
      setOutcome(existing.outcome ?? "");
      setNotes(existing.notes ?? "");
      const ex = existing as unknown as InfusionExtra;
      setExtra({
        premedsGiven: ex.premedsGiven ?? [],
        premedsOther: ex.premedsOther ?? "",
        noPremedsGiven: !!ex.noPremedsGiven,
        cannulaSite: ex.cannulaSite ?? "",
        cannulaIssues: ex.cannulaIssues ?? [],
        cannulaIssuesOther: ex.cannulaIssuesOther ?? "",
        noCannulaIssues: !!ex.noCannulaIssues,
        nurse: ex.nurse ?? "",
        nurseLogs: ex.nurseLogs ?? [],
        reactionSymptomsOther: ex.reactionSymptomsOther ?? "",
        pausedAt: ex.pausedAt ?? "",
        recommenced: !!ex.recommenced,
        recommencedAt: ex.recommencedAt ?? "",
      });
    }
  }, [existing?.id]);

  const uid = () => Math.random().toString(36).slice(2, 10);
  const addNurseLog = () => setExtra({ ...extra, nurseLogs: [...(extra.nurseLogs ?? []), { id: uid() }] });
  const updNurseLog = (id: string, patch: Partial<NurseLog>) =>
    setExtra({ ...extra, nurseLogs: (extra.nurseLogs ?? []).map((n) => n.id === id ? { ...n, ...patch } : n) });
  const delNurseLog = (id: string) =>
    setExtra({ ...extra, nurseLogs: (extra.nurseLogs ?? []).filter((n) => n.id !== id) });

  const nowLocal = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const nowStart = () => setStart(nowLocal());
  const nowEnd = () => setEnd(nowLocal());

  const save = async () => {
    const payload = {
      kind: "infusion" as const,
      cycleDay, drugs,
      plannedTime, actualStart, actualEnd, completed,
      reaction, reactionSymptoms, reactionTimeAfterStart, paused,
      meds, outcome, notes, ...extra,
    };
    if (existing) await updateEntry(existing.id, payload);
    else await addEntry(payload as Omit<InfusionLog, "id" | "createdAt">);
    router.push("/treatment");
  };

  /** Open Signal Sweep tagged to this infusion. If the row hasn't been
   *  saved yet (first-time logging), save what's been entered so far
   *  as a stub so the signals have an id to attach to. The user can
   *  back-date signals via the Time of reading control once on the
   *  sweep page — useful for catching up retrospectively. */
  const launchSignalSweep = async () => {
    let id: string | undefined = existing?.id;
    if (!id) {
      const stub = await addEntry({
        kind: "infusion",
        cycleDay,
        drugs,
        plannedTime, actualStart, actualEnd, completed,
        reaction, reactionSymptoms, reactionTimeAfterStart, paused,
        meds, outcome, notes, ...extra,
      } as Omit<InfusionLog, "id" | "createdAt">);
      id = stub?.id;
    }
    if (id && typeof window !== "undefined") {
      window.location.href = `/signal-sweep?infusionId=${id}&returnTo=/treatment/${cycleDay}`;
    }
  };

  /** Signals previously captured for this infusion — tagged via
   *  infusionId on /signal-sweep. Newest first. */
  const linkedSignals = useMemo(() => {
    if (!existing?.id) return [] as typeof signals;
    return signals
      .filter((s) => s.infusionId === existing.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [signals, existing?.id]);

  return (
    <AppShell>
      <PageTitle sub={drugs}>Day {cycleDay}</PageTitle>

      {sameDayAdmission && (
        <Link
          href="/admissions"
          className="flex items-center gap-3 rounded-2xl border-2 border-[var(--alert)] bg-[var(--surface)] px-4 py-3 mb-4 active:scale-[0.99] transition"
        >
          <AlertTriangle size={20} className="text-[var(--alert)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--alert)]">
              ED / hospital visit on this day
            </div>
            <div className="text-xs text-[var(--ink-soft)] truncate">
              {sameDayAdmission.hospital}
              {sameDayAdmission.reason ? ` · ${sameDayAdmission.reason}` : ""}
              {sameDayAdmission.dischargeDate ? " · discharged" : " · ongoing"}
            </div>
          </div>
        </Link>
      )}

      {/* Signal Sweep launcher — capture vital readings tied to this
           infusion. Works whether the infusion is being logged live
           or backfilled; for new rows we save a stub first so the
           signals have something to attach to, and the sweep page's
           Time of reading control lets the user backdate. */}
      <Card className="mb-4 space-y-3 border-2 border-[var(--primary)]">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[var(--primary)]" />
          <div className="text-sm font-bold text-[var(--primary)] uppercase tracking-wide">
            Signal Sweep
          </div>
        </div>
        <p className="text-xs text-[var(--ink-soft)]">
          Capture vitals, mood, pain or any other signal for this infusion. Each one is timestamped, lands on the daily trace, and is tagged to Day {cycleDay} so it shows up here next time.
        </p>
        <button
          type="button"
          onClick={launchSignalSweep}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-3 text-sm font-semibold active:scale-[0.99] transition"
        >
          <Stethoscope size={16} /> Open Signal Sweep
        </button>
        {!existing && (
          <p className="text-[11px] text-[var(--ink-soft)]">
            Tapping will save the infusion first so the signals can be linked.
          </p>
        )}
        {linkedSignals.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
            <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] font-semibold">
              Captured for this infusion ({linkedSignals.length})
            </div>
            <ul className="space-y-1">
              {linkedSignals.slice(0, 8).map((s) => {
                const def = SIGNAL_BY_ID[s.signalType];
                const label = def?.label ?? s.customLabel ?? s.signalType;
                const time = format(parseISO(s.createdAt), "d MMM HH:mm");
                const value = s.value != null
                  ? `${s.value}${s.unit ? ` ${s.unit}` : ""}`
                  : s.choice ? s.choice
                  : s.score != null ? `${s.score}/10`
                  : s.choices?.length ? s.choices.join(", ")
                  : "";
                return (
                  <li key={s.id} className="text-xs flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-2.5 py-1.5">
                    <span className="font-medium">{label}</span>
                    <span className="text-[var(--ink-soft)] truncate">{value}</span>
                    <span className="shrink-0 text-[var(--ink-soft)]">{time}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Card>

      {/* What's been happening — live trend engine output, surfaced here
           so the treatment-day view shows what the team should know about
           between infusions, not just buried on /trends. */}
      {detectedTrends.length > 0 && (
        <Card className="mb-4">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-1.5">
              <Activity size={16} className="text-[var(--primary)]" />
              What&apos;s been happening
            </h2>
            <Link href="/trends" className="text-xs text-[var(--primary)] font-medium">
              See all →
            </Link>
          </div>
          <p className="text-xs text-[var(--ink-soft)] mb-2.5">
            Active trends detected from your signals, daily logs, and bloods.
          </p>
          <div className="space-y-2">
            {detectedTrends.map((t) => {
              const tone = SEVERITY_TONE[t.severity];
              return (
                <Link
                  key={t.ruleId}
                  href="/trends"
                  className="flex gap-3 items-start rounded-xl border border-[var(--border)] p-3 active:bg-[var(--surface-soft)] transition"
                >
                  <span
                    className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-semibold shrink-0 mt-0.5"
                    style={{ backgroundColor: tone.bg, color: tone.text }}
                  >
                    {tone.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-xs text-[var(--ink-soft)] mt-0.5">{t.interpretation}</div>
                  </div>
                  <ChevronRight size={14} className="text-[var(--ink-soft)] shrink-0 mt-1" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {role === "support" && (
        <Card className="mb-4 border-[var(--accent)] bg-[var(--surface-soft)]">
          <div className="flex items-start gap-2.5">
            <ClipboardList size={18} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold mb-1">Reminder for the support person</div>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--ink)]">
                <li>Tap <b>Use now</b> as soon as the infusion starts, and again when it ends.</li>
                <li>If any reaction begins, open your phone's <b>Clock → Timer</b>, start it, and note how long after the infusion started it happened.</li>
                <li>Record symptoms in real time. Note the exact times the infusion is paused + recommenced.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="space-y-4 mb-4">
        <h2 className="font-semibold">Timing</h2>
        <Field label="Planned time">
          <TextInput type="text" placeholder="e.g. 10:00 am" value={plannedTime} onChange={(e) => setPlanned(e.target.value)} />
        </Field>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium">Actual start</span>
            <button type="button" onClick={nowStart} className="text-xs text-[var(--primary)] font-medium">Use now</button>
          </div>
          <TextInput type="datetime-local" value={actualStart} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm font-medium">Actual end</span>
            <button type="button" onClick={nowEnd} className="text-xs text-[var(--primary)] font-medium">Use now</button>
          </div>
          <TextInput type="datetime-local" value={actualEnd} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <label className="flex items-center gap-3 pt-1">
          <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} className="w-5 h-5" />
          <span>Infusion completed</span>
        </label>
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Premeds given</h2>
        <p className="text-xs text-[var(--ink-soft)]">Tick everything they gave you before / during the infusion.</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="w-4 h-4"
            checked={!!extra.noPremedsGiven}
            onChange={(e) => setExtra({
              ...extra,
              noPremedsGiven: e.target.checked,
              ...(e.target.checked ? { premedsGiven: [], premedsOther: "" } : {}),
            })}
          />
          <span>No premeds given</span>
        </label>
        {!extra.noPremedsGiven && (
          <>
            <TagToggles options={PREMEDS} value={extra.premedsGiven ?? []} onChange={(v) => setExtra({ ...extra, premedsGiven: v })} />
            <Field label="Other (please specify)">
              <TextArea rows={2} value={extra.premedsOther ?? ""} onChange={(e) => setExtra({ ...extra, premedsOther: e.target.value })} placeholder="Anything else given that isn't on the list…" />
            </Field>
          </>
        )}
      </Card>

      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Cannula / line site</h2>
        <Field label="Site used" hint="e.g. left forearm, back of right hand, port">
          <TextInput value={extra.cannulaSite ?? ""} onChange={(e) => setExtra({ ...extra, cannulaSite: e.target.value })} />
        </Field>
        <div>
          <div className="text-sm font-medium mb-2">Any issues at the site?</div>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={!!extra.noCannulaIssues}
              onChange={(e) => setExtra({
                ...extra,
                noCannulaIssues: e.target.checked,
                ...(e.target.checked ? { cannulaIssues: [], cannulaIssuesOther: "" } : {}),
              })}
            />
            <span>No issues at the site</span>
          </label>
          {!extra.noCannulaIssues && (
            <TagToggles options={CANNULA_ISSUES} value={extra.cannulaIssues ?? []} onChange={(v) => setExtra({ ...extra, cannulaIssues: v })} />
          )}
        </div>
        {!extra.noCannulaIssues && (
          <Field label="Other issue (please specify)">
            <TextArea rows={2} value={extra.cannulaIssuesOther ?? ""} onChange={(e) => setExtra({ ...extra, cannulaIssuesOther: e.target.value })} placeholder="Anything else not on the list…" />
          </Field>
        )}
        <Field label="Nurse (optional)">
          <ClinicianPicker
            value={extra.nurse ?? ""}
            onChange={(v) => setExtra({ ...extra, nurse: v })}
            known={knownNurses}
            placeholder="Who's looking after you"
          />
        </Field>
      </Card>

      <Card className="space-y-3 mb-4">
        <div>
          <h2 className="font-semibold">Issues raised with the nurse</h2>
          <p className="text-xs text-[var(--ink-soft)]">Log what was raised, whether it was addressed, and what they said.</p>
        </div>
        {(extra.nurseLogs ?? []).map((n, idx) => (
          <div key={n.id} className="rounded-xl border border-[var(--border)] p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-[var(--ink-soft)]">Item {idx + 1}</div>
              <button onClick={() => delNurseLog(n.id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
            </div>
            <Field label="Issue raised">
              <TextArea rows={2} value={n.issue ?? ""} onChange={(e) => updNurseLog(n.id, { issue: e.target.value })} placeholder="What you asked / flagged" />
            </Field>
            <div className="mt-2">
              <div className="text-sm font-medium mb-1.5">Was it addressed?</div>
              <div className="flex gap-2">
                {(["Yes","No","Partly"] as const).map((opt) => {
                  const on = n.addressed === opt;
                  return (
                    <button key={opt} type="button"
                      onClick={() => updNurseLog(n.id, { addressed: on ? "" : opt })}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2">
              <Field label="What was said / done">
                <TextArea rows={2} value={n.response ?? ""} onChange={(e) => updNurseLog(n.id, { response: e.target.value })} placeholder="Their answer or action" />
              </Field>
            </div>
          </div>
        ))}
        <button onClick={addNurseLog} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-sm inline-flex items-center justify-center gap-2">
          <Plus size={14} /> Add item
        </button>
      </Card>

      <Card className="mb-4 space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={reaction} onChange={(e) => setReaction(e.target.checked)} className="w-5 h-5" />
          <span className="font-medium">Any reaction during the infusion?</span>
        </label>

        {reaction && (
          <>
            <div>
              <div className="text-sm font-medium mb-2">Symptoms</div>
              <SideEffectPicker
                selected={reactionSymptoms}
                onChange={setSymptoms}
                placeholder="Type a symptom — rash, breathless, dizzy, fever…"
                showWhatToDo
              />
            </div>
            <Field label="Time after start" hint="e.g. 20 min">
              <TextInput value={reactionTimeAfterStart} onChange={(e) => setReactTime(e.target.value)} />
            </Field>

            <div className="border-t border-[var(--border)] pt-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} className="w-5 h-5" />
                <span className="font-medium">Infusion paused</span>
              </label>
              {paused && (
                <div className="mt-2">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium">Paused at</span>
                    <button type="button" onClick={() => setExtra({ ...extra, pausedAt: nowLocal() })} className="text-xs text-[var(--primary)] font-medium">
                      <Timer size={12} className="inline mr-1" />Use now
                    </button>
                  </div>
                  <TextInput type="datetime-local" value={extra.pausedAt ?? ""} onChange={(e) => setExtra({ ...extra, pausedAt: e.target.value })} />
                </div>
              )}
            </div>

            <Field label="Medications given for reaction">
              <TextInput value={meds} onChange={(e) => setMeds(e.target.value)} placeholder="e.g. hydrocortisone, antihistamine" />
            </Field>

            <div className="border-t border-[var(--border)] pt-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={!!extra.recommenced} onChange={(e) => setExtra({ ...extra, recommenced: e.target.checked })} className="w-5 h-5" />
                <span className="font-medium">Infusion recommenced</span>
              </label>
              {extra.recommenced && (
                <div className="mt-2">
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-sm font-medium">Recommenced at</span>
                    <button type="button" onClick={() => setExtra({ ...extra, recommencedAt: nowLocal() })} className="text-xs text-[var(--primary)] font-medium">
                      <Timer size={12} className="inline mr-1" />Use now
                    </button>
                  </div>
                  <TextInput type="datetime-local" value={extra.recommencedAt ?? ""} onChange={(e) => setExtra({ ...extra, recommencedAt: e.target.value })} />
                </div>
              )}
            </div>

            <Field label="Outcome">
              <TextArea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What happened next…" />
            </Field>
          </>
        )}
      </Card>

      <Card className="mb-6">
        <Field label="Notes">
          <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering…" />
        </Field>
      </Card>

      <Submit onClick={save}>{existing ? "Update" : "Save"}</Submit>
    </AppShell>
  );
}

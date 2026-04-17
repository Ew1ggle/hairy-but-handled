"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { PROTOCOLS, type TreatmentDay } from "@/lib/treatmentProtocols";
import Link from "next/link";
import { CheckCircle2, Circle, Droplet, AlertTriangle, Calendar, Info, Plus, Trash2 } from "lucide-react";
import { addDays, format, parseISO, isToday, isPast } from "date-fns";
import { useEffect, useState } from "react";

export default function Treatment() {
  const infusions = useEntries("infusion");
  const byDay = new Map(infusions.map((i) => [i.cycleDay, i]));
  const { activePatientId } = useSession();
  const [regimen, setRegimen] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [customDays, setCustomDays] = useState<TreatmentDay[]>([]);
  const [saving, setSaving] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Load regimen and start date from profile
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as { regimen?: string; startDate?: string; customTreatmentDays?: TreatmentDay[] } | undefined;
        if (p?.regimen) setRegimen(p.regimen);
        if (p?.startDate) setStartDate(p.startDate);
        if (p?.customTreatmentDays) setCustomDays(p.customTreatmentDays);
      });
  }, [activePatientId]);

  const saveStartDate = async (date: string) => {
    setStartDate(date);
    const sb = supabase();
    if (!sb || !activePatientId) return;
    setSaving(true);
    const { data: existing } = await sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle();
    const currentData = (existing?.data ?? {}) as Record<string, unknown>;
    await sb.from("patient_profiles").upsert({
      patient_id: activePatientId,
      data: { ...currentData, startDate: date },
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  const saveCustomDays = async (days: TreatmentDay[]) => {
    setCustomDays(days);
    const sb = supabase();
    if (!sb || !activePatientId) return;
    const { data: existing } = await sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle();
    const currentData = (existing?.data ?? {}) as Record<string, unknown>;
    await sb.from("patient_profiles").upsert({
      patient_id: activePatientId,
      data: { ...currentData, customTreatmentDays: days },
      updated_at: new Date().toISOString(),
    });
  };

  const protocol = PROTOCOLS[regimen];
  const isCustom = regimen === "Other" || (!protocol && regimen);
  const treatmentDays: TreatmentDay[] = protocol ? protocol.days : customDays;
  const cycleDays = protocol?.cycleLengthDays ?? (treatmentDays.length > 0 ? Math.max(...treatmentDays.map((d) => d.day)) : 0);

  const getCycleDate = (cycleDay: number): Date | null => {
    if (!startDate) return null;
    return addDays(parseISO(startDate), cycleDay - 1);
  };

  return (
    <AppShell>
      <PageTitle sub={protocol ? `${protocol.source}` : "Track your treatment schedule"}>
        Treatment calendar
      </PageTitle>

      {/* Start date */}
      <Card className="mb-4">
        <Field label="Treatment start date" hint={saving ? "Saving..." : ""}>
          <TextInput type="date" value={startDate} onChange={(e) => saveStartDate(e.target.value)} />
        </Field>
        {startDate && cycleDays > 0 && (
          <div className="text-xs text-[var(--ink-soft)] mt-2">
            {protocol ? `${protocol.name} — ` : ""}{cycleDays}-day cycle: {format(parseISO(startDate), "d MMM yyyy")} to {format(addDays(parseISO(startDate), cycleDays - 1), "d MMM yyyy")}
          </div>
        )}
        {!regimen && (
          <div className="mt-3 rounded-xl bg-[var(--surface-soft)] p-3 text-sm text-[var(--ink-soft)]">
            No treatment regimen selected. Go to <Link href="/profile" className="text-[var(--primary)] font-medium underline">Profile</Link> to choose your regimen.
          </div>
        )}
      </Card>

      {/* Protocol info */}
      {protocol && (
        <Card className="mb-4">
          <button onClick={() => setShowInfo(!showInfo)} className="w-full flex items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-[var(--primary)]" />
              <span className="text-sm font-medium">Protocol details</span>
            </div>
            <span className="text-xs text-[var(--ink-soft)]">{showInfo ? "Hide" : "Show"}</span>
          </button>
          {showInfo && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3 text-sm">
              {protocol.prophylaxis && protocol.prophylaxis.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Prophylaxis</div>
                  <ul className="space-y-1">
                    {protocol.prophylaxis.map((p, i) => <li key={i} className="text-[var(--ink-soft)]">{p}</li>)}
                  </ul>
                </div>
              )}
              {protocol.monitoring && protocol.monitoring.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">Monitoring</div>
                  <ul className="space-y-1">
                    {protocol.monitoring.map((m, i) => <li key={i} className="text-[var(--ink-soft)]">{m}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Custom treatment builder for "Other" */}
      {isCustom && <CustomTreatmentBuilder days={customDays} onSave={saveCustomDays} />}

      {/* Treatment days list */}
      {treatmentDays.length > 0 && (
        <div className="space-y-2">
          {treatmentDays.map((td) => {
            const entry = byDay.get(td.day);
            const done = !!entry?.completed;
            const reaction = !!entry?.reaction;
            const cycleDate = getCycleDate(td.day);
            const isDateToday = cycleDate && isToday(cycleDate);
            const isDatePast = cycleDate && isPast(cycleDate) && !isToday(cycleDate);

            return (
              <Link
                key={td.day}
                href={`/treatment/${td.day}`}
                className={`block rounded-2xl border bg-[var(--surface)] px-4 py-3.5 ${isDateToday ? "border-[var(--primary)] border-2" : "border-[var(--border)]"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    {done ? (
                      <CheckCircle2 className="text-[var(--good)]" size={24} />
                    ) : (
                      <Circle className={isDatePast && !done ? "text-[var(--alert)]" : "text-[var(--ink-soft)]"} size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Day {td.day}</span>
                      <span className="text-sm text-[var(--ink-soft)]">· {td.drugs}</span>
                    </div>
                    {td.dose && (
                      <div className="text-xs text-[var(--ink-soft)]">{td.dose}{td.route && ` · ${td.route}`}{td.duration && ` · ${td.duration}`}</div>
                    )}
                    <div className="text-xs text-[var(--ink-soft)] mt-0.5 flex gap-2 items-center flex-wrap">
                      {cycleDate && (
                        <span className={`inline-flex items-center gap-1 ${isDateToday ? "text-[var(--primary)] font-semibold" : ""}`}>
                          <Calendar size={11} /> {format(cycleDate, "EEE d MMM yyyy")}
                          {isDateToday && " — today"}
                        </span>
                      )}
                      {entry?.actualStart && <span>· Started {new Date(entry.actualStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                      {reaction && (
                        <span className="inline-flex items-center gap-1 text-[var(--alert)]">
                          <AlertTriangle size={12} /> reaction
                        </span>
                      )}
                    </div>
                    {td.premeds && td.premeds.length > 0 && (
                      <div className="mt-1 text-xs text-[var(--accent)]">
                        Premeds: {td.premeds.join(", ")}
                      </div>
                    )}
                  </div>
                  <Droplet size={18} className="text-[var(--ink-soft)] shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {treatmentDays.length === 0 && !isCustom && regimen && (
        <Card className="text-center text-[var(--ink-soft)]">
          No treatment calendar available for this regimen.
        </Card>
      )}
    </AppShell>
  );
}

function CustomTreatmentBuilder({ days, onSave }: { days: TreatmentDay[]; onSave: (d: TreatmentDay[]) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [day, setDay] = useState("");
  const [drugs, setDrugs] = useState("");
  const [dose, setDose] = useState("");
  const [route, setRoute] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");

  const add = () => {
    if (!day || !drugs) return;
    const newDay: TreatmentDay = {
      day: Number(day),
      drugs,
      dose: dose || undefined,
      route: route || undefined,
      duration: duration || undefined,
      notes: notes || undefined,
    };
    const updated = [...days, newDay].sort((a, b) => a.day - b.day);
    onSave(updated);
    setDay(""); setDrugs(""); setDose(""); setRoute(""); setDuration(""); setNotes("");
    setShowForm(false);
  };

  const remove = (dayNum: number) => {
    onSave(days.filter((d) => d.day !== dayNum));
  };

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-sm">Custom treatment calendar</div>
          <div className="text-xs text-[var(--ink-soft)]">Add each treatment day for your regimen</div>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-sm text-[var(--primary)] font-medium">
            <Plus size={14} /> Add day
          </button>
        )}
      </div>

      {days.length > 0 && !showForm && (
        <div className="space-y-1 mb-3">
          {days.map((d) => (
            <div key={d.day} className="flex items-center justify-between text-sm rounded-lg bg-[var(--surface-soft)] px-3 py-2">
              <span><b>Day {d.day}</b> — {d.drugs}{d.dose && ` (${d.dose})`}</span>
              <button onClick={() => remove(d.day)} className="text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="space-y-3 pt-3 border-t border-[var(--border)]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Day number">
              <TextInput type="number" value={day} onChange={(e) => setDay(e.target.value)} placeholder="e.g. 1" />
            </Field>
            <Field label="Drug(s)">
              <TextInput value={drugs} onChange={(e) => setDrugs(e.target.value)} placeholder="e.g. Pembrolizumab" />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Dose">
              <TextInput value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 200mg" />
            </Field>
            <Field label="Route">
              <TextInput value={route} onChange={(e) => setRoute(e.target.value)} placeholder="e.g. IV" />
            </Field>
            <Field label="Duration">
              <TextInput value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 30 min" />
            </Field>
          </div>
          <Field label="Notes">
            <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details" />
          </Field>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-medium">Cancel</button>
            <Submit onClick={add} disabled={!day || !drugs}>Add treatment day</Submit>
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";
import AppShell from "@/components/AppShell";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { Printer } from "lucide-react";

export default function ExportPage() {
  const daily = useEntries("daily").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const infusions = useEntries("infusion").slice().sort((a, b) => a.cycleDay - b.cycleDay);
  const bloods = useEntries("bloods").slice().sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  const meds = useEntries("med");
  const questions = useEntries("question");
  const flags = useEntries("flag").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const cutoff = subDays(new Date(), 14).toISOString();
  const recentDaily = daily.filter((d) => d.createdAt >= cutoff);
  const recentFlags = flags.filter((f) => f.createdAt >= cutoff);

  const { activePatientId } = useSession();
  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => setProfile((data?.data as Record<string, string>) ?? null));
  }, [activePatientId]);

  return (
    <AppShell>
      <div className="no-print flex items-center justify-between mb-5">
        <div>
          <h1 className="display text-3xl">Summary for the team</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">Last 14 days. Tap print → Save as PDF on iPad.</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-medium">
          <Printer size={16} /> Print / PDF
        </button>
      </div>

      <div className="print-root space-y-6">
        {profile && (
          <section>
            <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Patient</h2>
            <div className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
              {profile.name && <div><b>Name:</b> {profile.name}</div>}
              {profile.dob && <div><b>DOB:</b> {profile.dob}</div>}
              {profile.mrn && <div><b>MRN:</b> {profile.mrn}</div>}
              {profile.diagnosis && <div><b>Diagnosis:</b> {profile.diagnosis}{profile.diagnosisDate ? ` (${profile.diagnosisDate})` : ""}</div>}
              {profile.hematologist && <div><b>Hematologist:</b> {profile.hematologist}</div>}
              {profile.hospital && <div><b>Hospital:</b> {profile.hospital}</div>}
              {profile.regimen && <div><b>Regimen:</b> {profile.regimen}</div>}
              {profile.startDate && <div><b>Start:</b> {profile.startDate}</div>}
              {profile.allergies && <div className="col-span-2"><b>Allergies:</b> {profile.allergies}</div>}
              {profile.pastMedical && <div className="col-span-2"><b>Past medical:</b> {profile.pastMedical}</div>}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Flags (last 14 days)</h2>
          {recentFlags.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">None logged.</p> : (
            <ul className="text-sm space-y-1">
              {recentFlags.map((f) => (
                <li key={f.id}>
                  <span className="text-[var(--ink-soft)]">{format(parseISO(f.createdAt), "d MMM h:mm a")}</span> — {f.triggerLabel}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Daily log trend</h2>
          {recentDaily.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">No entries.</p> : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[var(--ink-soft)]">
                  <th className="py-1 pr-2">Date</th><th>°C</th><th>Fat</th><th>Pain</th><th>Naus</th><th>App</th><th>SOB</th><th>Mood</th><th>Fog</th><th>Sleep</th><th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {recentDaily.map((d) => (
                  <tr key={d.id} className="border-t border-[var(--border)]">
                    <td className="py-1 pr-2">{format(parseISO(d.createdAt), "d MMM")}</td>
                    <td>{d.temperatureC ?? "—"}</td>
                    <td>{d.fatigue ?? "—"}</td>
                    <td>{d.pain ?? "—"}</td>
                    <td>{d.nausea ?? "—"}</td>
                    <td>{d.appetite ?? "—"}</td>
                    <td>{d.breathlessness ?? "—"}</td>
                    <td>{d.mood ?? "—"}</td>
                    <td>{d.brainFog ?? "—"}</td>
                    <td>{d.sleepHours ?? "—"}</td>
                    <td className="text-[10px]">{d.tags?.join(", ") || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Bloods</h2>
          {bloods.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">None.</p> : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[var(--ink-soft)]">
                  <th className="py-1 pr-2">Date</th><th>Hb</th><th>WCC</th><th>Neut</th><th>Lymph</th><th>Mono</th><th>Plt</th><th>Creat</th><th>CRP</th>
                </tr>
              </thead>
              <tbody>
                {bloods.map((b) => (
                  <tr key={b.id} className="border-t border-[var(--border)]">
                    <td className="py-1 pr-2">{format(parseISO(b.takenAt), "d MMM")}</td>
                    <td>{b.hb ?? "—"}</td><td>{b.wcc ?? "—"}</td><td>{b.neutrophils ?? "—"}</td>
                    <td>{b.lymphocytes ?? "—"}</td><td>{b.monocytes ?? "—"}</td><td>{b.platelets ?? "—"}</td>
                    <td>{b.creatinine ?? "—"}</td><td>{b.crp ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Treatment calendar</h2>
          <ul className="text-sm space-y-1">
            {infusions.map((i) => (
              <li key={i.id}>
                <span className="font-medium">Day {i.cycleDay}</span> · {i.drugs} · {i.completed ? "✓ completed" : "— not yet"} {i.reaction && <span className="text-[var(--alert)]">· reaction: {i.reactionSymptoms?.join(", ")}</span>}
                {i.notes && <span className="text-[var(--ink-soft)]"> — {i.notes}</span>}
              </li>
            ))}
            {infusions.length === 0 && <li className="text-[var(--ink-soft)]">No infusion days logged.</li>}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Current medications</h2>
          {meds.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">None.</p> : (
            <ul className="text-sm space-y-1">
              {meds.filter((m) => !m.stopped).map((m) => (
                <li key={m.id}><span className="font-medium">{m.name}</span>{m.dose && ` · ${m.dose}`}{m.reason && ` · ${m.reason}`}</li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold border-b border-[var(--border)] pb-1 mb-2">Questions</h2>
          {questions.length === 0 ? <p className="text-sm text-[var(--ink-soft)]">None.</p> : (
            <ul className="text-sm space-y-2">
              {questions.map((q) => (
                <li key={q.id}>
                  <div className="font-medium">Q: {q.question}</div>
                  {q.answer && <div className="text-[var(--ink-soft)]">A: {q.answer}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-[10px] text-[var(--ink-soft)] pt-6">
          Generated {format(new Date(), "d MMM yyyy, h:mm a")} · Hairy but Handled
        </p>
      </div>
    </AppShell>
  );
}

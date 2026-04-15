"use client";
import AppShell from "@/components/AppShell";
import { Card, PageTitle } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { format, isToday, parseISO, subDays } from "date-fns";
import { Calendar, Clock, MapPin, User, Printer } from "lucide-react";
import Link from "next/link";

export default function AgendaPage() {
  const apps = useEntries("appointment");
  const today = apps.filter((a) => a.date && isToday(parseISO(a.date))).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const questions = useEntries("question").filter((q) => !q.answer);
  const flags = useEntries("flag").filter((f) => f.createdAt >= subDays(new Date(), 14).toISOString()).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const daily = useEntries("daily").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestDaily = daily[0];
  const bloods = useEntries("bloods").slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""));
  const latestBloods = bloods[0];

  return (
    <AppShell>
      <div className="flex items-center justify-between mb-3 no-print">
        <div>
          <h1 className="display text-3xl">Today's agenda</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">{format(new Date(), "EEEE d MMMM yyyy")}</p>
        </div>
        <button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-4 py-2.5 font-medium">
          <Printer size={16} /> Print
        </button>
      </div>

      {today.length === 0 ? (
        <Card className="mb-4 text-sm">
          No appointments scheduled for today. <Link href="/appointments" className="text-[var(--primary)] font-medium">Manage appointments →</Link>
        </Card>
      ) : (
        <Card className="mb-4">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Appointments today</div>
          <div className="space-y-2">
            {today.map((a) => (
              <div key={a.id} className="text-sm">
                <div className="font-semibold flex items-center gap-2">
                  <Clock size={14} className="text-[var(--ink-soft)]" />{a.time || "Time not set"}
                  {a.type && <span className="text-[var(--ink-soft)] font-normal">· {a.type}</span>}
                </div>
                {a.provider && <div className="flex items-center gap-1 text-[var(--ink-soft)] ml-5"><User size={12} /> {a.provider}</div>}
                {a.location && <div className="flex items-center gap-1 text-[var(--ink-soft)] ml-5"><MapPin size={12} /> {a.location}</div>}
                {a.notes && <div className="ml-5 text-[var(--ink-soft)]">{a.notes}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-4">
        <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Bring up these questions</div>
        {questions.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">No unanswered questions.</p>
        ) : (
          <ul className="text-sm space-y-2 pl-5 list-decimal">
            {questions.map((q) => <li key={q.id}>{q.question}</li>)}
          </ul>
        )}
        <Link href="/questions" className="mt-2 inline-block text-xs text-[var(--primary)] font-medium no-print">+ Add or edit questions →</Link>
      </Card>

      <Card className="mb-4">
        <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Red flags in the last 14 days</div>
        {flags.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">None logged.</p>
        ) : (
          <ul className="text-sm space-y-1">
            {flags.map((f) => (
              <li key={f.id} className="flex gap-2">
                <span className="text-[var(--ink-soft)] w-28 shrink-0">{format(parseISO(f.createdAt), "d MMM, h:mm a")}</span>
                <span className="flex-1">{f.triggerLabel}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {latestDaily && (
        <Card className="mb-4">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Most recent daily log</div>
          <div className="text-sm">
            <div className="font-semibold">{format(parseISO(latestDaily.createdAt), "EEE d MMM, h:mm a")}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {latestDaily.temperatureC != null && <span>Temp {latestDaily.temperatureC}°C</span>}
              {latestDaily.fatigue != null && <span>Fatigue {latestDaily.fatigue}/10</span>}
              {latestDaily.pain != null && <span>Pain {latestDaily.pain}/10</span>}
              {latestDaily.nausea != null && <span>Nausea {latestDaily.nausea}/10</span>}
              {latestDaily.sleepHours != null && <span>Sleep {latestDaily.sleepHours}h</span>}
            </div>
            {latestDaily.tags && latestDaily.tags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {latestDaily.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-soft)]">{t}</span>
                ))}
              </div>
            )}
            {latestDaily.notes && <p className="text-[var(--ink-soft)] mt-1">{latestDaily.notes}</p>}
          </div>
        </Card>
      )}

      {latestBloods && (
        <Card className="mb-4">
          <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Most recent bloods</div>
          <div className="text-sm">
            <div className="font-semibold">{format(parseISO(latestBloods.takenAt), "d MMM yyyy")}</div>
            <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
              {latestBloods.hb != null && <Stat label="Hb" value={latestBloods.hb} />}
              {latestBloods.wcc != null && <Stat label="WCC" value={latestBloods.wcc} />}
              {latestBloods.neutrophils != null && <Stat label="Neut" value={latestBloods.neutrophils} />}
              {latestBloods.platelets != null && <Stat label="Plt" value={latestBloods.platelets} />}
              {latestBloods.crp != null && <Stat label="CRP" value={latestBloods.crp} />}
            </div>
          </div>
        </Card>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-[var(--ink-soft)]">{label}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

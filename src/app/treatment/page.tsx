"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, TextInput } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CheckCircle2, Circle, Droplet, AlertTriangle, Calendar } from "lucide-react";
import { addDays, format, parseISO, isToday, isPast, isFuture } from "date-fns";
import { useEffect, useState } from "react";

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
  const { activePatientId } = useSession();
  const [startDate, setStartDate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Load start date from profile
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as { startDate?: string } | undefined;
        if (p?.startDate) setStartDate(p.startDate);
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

  const getCycleDate = (cycleDay: number): Date | null => {
    if (!startDate) return null;
    return addDays(parseISO(startDate), cycleDay - 1);
  };

  return (
    <AppShell>
      <PageTitle sub="56-day cycle. Tap a day to log the infusion or a reaction.">
        Treatment calendar
      </PageTitle>

      {/* Start date input */}
      <Card className="mb-4">
        <Field label="Treatment start date" hint={saving ? "Saving..." : ""}>
          <TextInput
            type="date"
            value={startDate}
            onChange={(e) => saveStartDate(e.target.value)}
          />
        </Field>
        {startDate && (
          <div className="text-xs text-[var(--ink-soft)] mt-2">
            Cycle runs from {format(parseISO(startDate), "d MMM yyyy")} to {format(addDays(parseISO(startDate), 55), "d MMM yyyy")}
          </div>
        )}
      </Card>

      <div className="space-y-2">
        {CYCLE.map(({ day, drugs }) => {
          const entry = byDay.get(day);
          const done = !!entry?.completed;
          const reaction = !!entry?.reaction;
          const cycleDate = getCycleDate(day);
          const isDateToday = cycleDate && isToday(cycleDate);
          const isDatePast = cycleDate && isPast(cycleDate) && !isToday(cycleDate);

          return (
            <Link
              key={day}
              href={`/treatment/${day}`}
              className={`flex items-center gap-3 rounded-2xl border bg-[var(--surface)] px-4 py-3.5 ${isDateToday ? "border-[var(--primary)] border-2" : "border-[var(--border)]"}`}
            >
              <div className="shrink-0">
                {done ? (
                  <CheckCircle2 className="text-[var(--good)]" size={24} />
                ) : (
                  <Circle className={isDatePast && !done ? "text-[var(--alert)]" : "text-[var(--ink-soft)]"} size={24} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Day {day}</span>
                  <span className="text-sm text-[var(--ink-soft)]">· {drugs}</span>
                </div>
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
              </div>
              <Droplet size={18} className="text-[var(--ink-soft)]" />
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

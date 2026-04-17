"use client";
import AppShell from "@/components/AppShell";
import { BigButton, Card } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { AlertTriangle, HeartPulse, Droplet, Calendar } from "lucide-react";
import { format, isToday, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { usePatientName } from "@/lib/usePatientName";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

export default function Home() {
  const { firstName, isSupport } = usePatientName();
  const daily = useEntries("daily");
  const infusion = useEntries("infusion");
  const flags = useEntries("flag");
  const questions = useEntries("question");
  const bloods = useEntries("bloods");
  const appointments = useEntries("appointment");
  const todayAppointments = appointments.filter((a) => a.date && isToday(parseISO(a.date))).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const upcomingAppts = appointments
    .filter((a) => a.date && parseISO(a.date) > new Date() && !isToday(parseISO(a.date)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcomingAppt = upcomingAppts[0];

  const todayLog = daily.find((d) => isToday(parseISO(d.createdAt)));
  const today = todayLog;
  const todayManuallyLogged = todayLog && (todayLog as unknown as { manuallyLogged?: boolean }).manuallyLogged === true;
  const nextInfusion = infusion
    .filter((i) => !i.completed)
    .sort((a, b) => a.cycleDay - b.cycleDay)[0];
  const recent24hFlags = flags.filter((f) => parseISO(f.createdAt) > subDays(new Date(), 1));
  const unansweredQs = questions.filter((q) => !q.answer).length;
  const lastBloods = bloods.slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""))[0];

  return (
    <AppShell>
      <a href="/emergency" className="block mb-4">
        <div className="w-full rounded-2xl bg-[var(--alert)] text-white px-5 py-4 flex items-center gap-4 shadow-md active:scale-[0.99] transition">
          <AlertTriangle size={28} />
          <div className="text-left">
            <div className="text-lg font-extrabold uppercase tracking-wide">{isSupport ? `${firstName} is at Emergency` : "I am at Emergency"}</div>
            <div className="text-sm opacity-90">Tap to log an ED visit now</div>
          </div>
        </div>
      </a>

      <MedicalDisclaimerBanner />

      {/* Today card — log status + appointments side by side */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
        <div>
          {/* Log status — turns into alert when not logged */}
          <Link href="/log" className="block">
            {todayManuallyLogged ? (
              <Card className="border-[var(--good)]">
                <div className="flex items-center gap-3">
                  <HeartPulse size={22} className="text-[var(--good)]" />
                  <div>
                    <div className="font-semibold text-[var(--good)]">Today's log done</div>
                    <div className="text-xs text-[var(--ink-soft)]">Logged at {format(parseISO(today!.createdAt), "h:mm a")} — tap to update</div>
                  </div>
                </div>
                {today!.temperatureC != null && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <StatusPill label="Temp" value={`${today!.temperatureC} °C`} tone={today!.temperatureC >= 38 ? "alert" : "soft"} />
                    <StatusPill label="Fatigue" value={today!.fatigue != null ? `${today!.fatigue}/10` : "—"} tone="soft" />
                    <StatusPill label="Pain" value={today!.pain != null ? `${today!.pain}/10` : "—"} tone="soft" />
                  </div>
                )}
              </Card>
            ) : (
              <div className="rounded-2xl border-2 border-[var(--alert)] bg-[var(--alert-soft)] p-4">
                <div className="flex items-center gap-3">
                  <HeartPulse size={22} className="text-[var(--alert)]" />
                  <div>
                    <div className="font-semibold text-[var(--alert)]">{isSupport ? `${firstName} hasn't been logged today` : "You haven't logged today yet"}</div>
                    <div className="text-xs text-[var(--ink-soft)]">
                      {today && !todayManuallyLogged
                        ? "Activity has been auto-logged but the full daily check hasn't been done — tap to log"
                        : "Tap to log now — ~2 minutes"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Link>

          {/* Quick stats row */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <StatusPill label="Red flags (24h)" value={recent24hFlags.length === 0 ? "None" : `${recent24hFlags.length}`} tone={recent24hFlags.length > 0 ? "alert" : "good"} />
            <StatusPill label="Next infusion" value={nextInfusion ? `Day ${nextInfusion.cycleDay}` : "—"} tone="soft" />
            <StatusPill label="Last bloods" value={lastBloods ? format(parseISO(lastBloods.takenAt), "d MMM") : "—"} tone="soft" />
          </div>
        </div>

        {/* Upcoming appointments sidebar */}
        <div className="sm:w-56">
          <Card>
            <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold mb-2">Appointments</div>
            {todayAppointments.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-[var(--primary)] mb-1">Today</div>
                {todayAppointments.map((a) => (
                  <div key={a.id} className="text-sm mb-1">
                    <b>{a.time || "TBC"}</b>{a.type && <> · {a.type}</>}
                    {a.provider && <div className="text-xs text-[var(--ink-soft)]">{a.provider}</div>}
                  </div>
                ))}
              </div>
            )}
            {upcomingAppts.length > 0 ? (
              <div className="space-y-2">
                {upcomingAppts.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-sm border-t border-[var(--border)] pt-1.5 first:border-0 first:pt-0">
                    <div className="text-xs text-[var(--ink-soft)]">{format(parseISO(a.date), "EEE d MMM")}</div>
                    <div>{a.type || "Appointment"}{a.provider && <span className="text-[var(--ink-soft)]"> · {a.provider}</span>}</div>
                  </div>
                ))}
              </div>
            ) : todayAppointments.length === 0 ? (
              <div className="text-sm text-[var(--ink-soft)]">No upcoming appointments</div>
            ) : null}
            <Link href="/appointments" className="block mt-3 text-xs font-medium text-[var(--primary)]">View all →</Link>
          </Card>
        </div>
      </div>

      {recent24hFlags.length > 0 && <RedFlagAlert count={recent24hFlags.length} />}

      <div className="space-y-3">
        <BigButton
          href="/treatment"
          tone="accent"
          icon={<Droplet size={30} />}
          title={nextInfusion ? `Next: Day ${nextInfusion.cycleDay} — ${nextInfusion.drugs}` : "Treatment calendar"}
          sub="56-day cycle, infusions, reactions"
        />

        <BigButton
          href={todayAppointments.length > 0 ? "/agenda" : "/appointments"}
          tone="pink"
          icon={<Calendar size={30} />}
          title={
            todayAppointments.length > 0
              ? "Doctor's Appointments — today's agenda"
              : upcomingAppt
                ? `Doctor's Appointments — next: ${format(parseISO(upcomingAppt.date), "EEE d MMM")}`
                : "Doctor's Appointments"
          }
          sub={
            todayAppointments.length > 0
              ? `${todayAppointments.length} today · tap to open agenda`
              : upcomingAppt
                ? `${upcomingAppt.type ? upcomingAppt.type + " · " : ""}${upcomingAppt.provider ?? ""}`
                : "Add and track upcoming visits"
          }
        />
      </div>

    </AppShell>
  );
}

function RedFlagAlert({ count }: { count: number }) {
  const [contacted, setContacted] = useState<"yes" | "no" | null>(null);
  const [details, setDetails] = useState("");
  return (
    <div className="mb-4 rounded-2xl border-2 border-[var(--alert)] bg-[var(--alert-soft)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={24} className="text-[var(--alert)]" />
        <div className="text-lg font-bold text-[var(--alert)]">
          Logged symptoms indicate {count} red flag{count > 1 ? "s" : ""} requiring discussion with the care team
        </div>
      </div>
      <div className="mt-3">
        <div className="text-sm font-semibold mb-2">Care team contacted?</div>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setContacted("yes")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm border font-medium ${contacted === "yes" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
          >
            Yes
          </button>
          <button
            onClick={() => setContacted("no")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm border font-medium ${contacted === "no" ? "bg-[var(--alert)] text-white border-[var(--alert)]" : "border-[var(--border)] bg-[var(--surface)]"}`}
          >
            No
          </button>
        </div>
        {contacted === "yes" && (
          <div>
            <div className="text-sm text-[var(--ink-soft)] mb-1">Details / advice given</div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Who did you speak to? What was the advice?"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm min-h-[60px]"
            />
          </div>
        )}
        {contacted === "no" && (
          <div className="rounded-xl bg-[var(--alert)] text-white p-3 text-sm font-medium">
            Please contact your care team as soon as possible about these symptoms.
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ label, value, tone }: { label: string; value: string; tone: "good" | "alert" | "accent" | "soft" }) {
  const cls =
    tone === "good" ? "bg-[var(--surface-soft)] text-[var(--good)]" :
    tone === "alert" ? "bg-[var(--alert-soft)] text-[var(--alert)]" :
    tone === "accent" ? "bg-[var(--surface-soft)] text-[var(--accent)]" :
    "bg-[var(--surface-soft)] text-[var(--ink)]";
  return (
    <div className={`rounded-xl px-3 py-2 ${cls}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

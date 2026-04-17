"use client";
import AppShell from "@/components/AppShell";
import { BigButton, Card } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { AlertTriangle, HeartPulse, Droplet, FileText, Pill, MessagesSquare, User, CreditCard, Search, Calendar, Building2 } from "lucide-react";
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

      {/* Log today button */}
      <Link href="/log" className="block mb-4">
        {todayManuallyLogged ? (
          <div className="w-full rounded-2xl bg-[var(--primary)] text-[var(--primary-ink)] px-5 py-4 flex items-center gap-4 shadow-sm active:scale-[0.99] transition">
            <HeartPulse size={28} />
            <div className="text-left">
              <div className="text-lg font-bold">Today's log done</div>
              <div className="text-sm opacity-80">Logged at {format(parseISO(today!.createdAt), "h:mm a")} — tap to update</div>
            </div>
          </div>
        ) : (
          <div className="w-full rounded-2xl border-2 border-[var(--alert)] bg-[var(--alert-soft)] px-5 py-4 flex items-center gap-4 active:scale-[0.99] transition">
            <HeartPulse size={28} className="text-[var(--alert)]" />
            <div className="text-left">
              <div className="text-lg font-bold text-[var(--alert)]">{isSupport ? `Log ${firstName}'s day` : "Log today"}</div>
              <div className="text-sm text-[var(--ink-soft)]">
                {today && !todayManuallyLogged ? "Auto-logged activity only — full check not done yet" : "Tap to log — ~2 minutes"}
              </div>
            </div>
          </div>
        )}
      </Link>

      {/* Quick stats — right under the log button */}
      <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
        <StatusPill label="Red flags (24h)" value={recent24hFlags.length === 0 ? "None" : `${recent24hFlags.length}`} tone={recent24hFlags.length > 0 ? "alert" : "good"} />
        <StatusPill label="Next infusion" value={nextInfusion ? `Day ${nextInfusion.cycleDay}` : "—"} tone="soft" />
        <StatusPill label="Last bloods" value={lastBloods ? format(parseISO(lastBloods.takenAt), "d MMM") : "—"} tone="soft" />
      </div>

      {recent24hFlags.length > 0 && <RedFlagAlert count={recent24hFlags.length} />}

      <MedicalDisclaimerBanner />

      {/* Appointments — full-width banner */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold">Appointments</div>
          <Link href="/appointments" className="text-xs font-medium text-[var(--primary)]">View all →</Link>
        </div>
        {todayAppointments.length > 0 && (
          <div className="mb-3 rounded-xl p-3" style={{ backgroundColor: "var(--surface-soft)", borderLeft: "3px solid var(--primary)" }}>
            <div className="text-xs font-semibold text-[var(--primary)] mb-1">Today</div>
            {todayAppointments.map((a) => (
              <div key={a.id} className="text-sm mb-1">
                <b>{a.time || "TBC"}</b>{a.type && <> · {a.type}</>}{a.provider && <> · {a.provider}</>}
              </div>
            ))}
          </div>
        )}
        {upcomingAppts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {upcomingAppts.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-xl bg-[var(--surface-soft)] px-3 py-2">
                <div className="text-center shrink-0" style={{ minWidth: 40 }}>
                  <div className="text-lg font-bold leading-none">{format(parseISO(a.date), "d")}</div>
                  <div className="text-[10px] text-[var(--ink-soft)]">{format(parseISO(a.date), "MMM")}</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">{a.type || "Appointment"}</div>
                  {a.provider && <div className="text-xs text-[var(--ink-soft)]">{a.provider}</div>}
                  {a.time && <div className="text-xs text-[var(--ink-soft)]">{a.time}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : todayAppointments.length === 0 ? (
          <div className="text-sm text-[var(--ink-soft)]">No upcoming appointments</div>
        ) : null}
      </Card>

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

      <div className="mt-6 space-y-3">
        <BigButton href="/bloods" tone="blue" icon={<Droplet size={26} />} title="Bloods" sub="Blood test results and trends" />
        <BigButton href="/meds" tone="purple" icon={<Pill size={26} />} title="Meds" sub="Medications, doses, and side effects" />
        <BigButton href="/side-effects" tone="pink" icon={<Search size={26} />} title="Side-effect finder" sub="Search symptoms and what to do" />
        <BigButton href="/questions" tone="blue" icon={<MessagesSquare size={26} />} title="Questions" sub="Questions for the care team" />
        <BigButton href="/profile" tone="primary" icon={<User size={26} />} title="Profile" sub="Patient details and medical history" />
        <BigButton href="/cards" tone="purple" icon={<CreditCard size={26} />} title="Wallet cards" sub="Cards for getting out of things" />
        <BigButton href="/admissions" tone="accent" icon={<Building2 size={26} />} title="Hospital admissions" sub="Track admissions, treatments, and discharge" />
        <BigButton href="/export" tone="blue" icon={<FileText size={26} />} title="Summary / export" sub="14-day report for the care team" />
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

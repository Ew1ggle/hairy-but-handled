"use client";
import AppShell from "@/components/AppShell";
import { BigButton, Card } from "@/components/ui";
import MissedLogBanner from "@/components/MissedLogBanner";
import { useEntries } from "@/lib/store";
import { AlertTriangle, HeartPulse, Droplet, FileText, Pill, MessagesSquare, User, CreditCard, Search, Calendar, Building2 } from "lucide-react";
import { format, isToday, parseISO, subDays } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import { usePatientName } from "@/lib/usePatientName";

export default function Home() {
  const { firstName, isSupport } = usePatientName();
  const daily = useEntries("daily");
  const infusion = useEntries("infusion");
  const flags = useEntries("flag");
  const questions = useEntries("question");
  const bloods = useEntries("bloods");
  const appointments = useEntries("appointment");
  const todayAppointments = appointments.filter((a) => a.date && isToday(parseISO(a.date))).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  const upcomingAppt = appointments
    .filter((a) => a.date && parseISO(a.date) > new Date() && !isToday(parseISO(a.date)))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const today = daily.find((d) => isToday(parseISO(d.createdAt)));
  const nextInfusion = infusion
    .filter((i) => !i.completed)
    .sort((a, b) => a.cycleDay - b.cycleDay)[0];
  const recent24hFlags = flags.filter((f) => parseISO(f.createdAt) > subDays(new Date(), 1));
  const unansweredQs = questions.filter((q) => !q.answer).length;
  const lastBloods = bloods.slice().sort((a, b) => (b.takenAt ?? "").localeCompare(a.takenAt ?? ""))[0];

  return (
    <AppShell>
      <header className="mb-5 mt-2">
        <h1 className="display text-[34px] leading-tight text-[var(--ink)]">
          Hairy but Handled
        </h1>
        <p className="text-[var(--ink-soft)] mt-1 text-[15px]">
          Notice the Shifts. Act on the Flags.
        </p>
      </header>

      <MissedLogBanner />

      <a href="/emergency" className="block mb-4">
        <div className="w-full rounded-2xl bg-[var(--alert)] text-white px-5 py-4 flex items-center gap-4 shadow-md active:scale-[0.99] transition">
          <AlertTriangle size={28} />
          <div className="text-left">
            <div className="text-lg font-extrabold uppercase tracking-wide">{isSupport ? `${firstName} is at Emergency` : "I am at Emergency"}</div>
            <div className="text-sm opacity-90">Tap to log an ED visit now</div>
          </div>
        </div>
      </a>

      {todayAppointments.length > 0 && (
        <Card className="mb-4 border-[var(--primary)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-[var(--primary)] font-semibold">Appointment today</div>
              <div className="mt-1 text-sm space-y-1">
                {todayAppointments.map((a) => (
                  <div key={a.id}>
                    <b>{a.time || "Time not set"}</b>{a.type && <> · {a.type}</>}{a.provider && <> · {a.provider}</>}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/agenda" className="shrink-0 rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium">Open agenda →</Link>
          </div>
        </Card>
      )}

      {/* Today's status at a glance */}
      <Card className="mb-4">
        <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-2">Today</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <StatusPill
            label="Daily log"
            value={today ? "Done" : "Not yet"}
            tone={today ? "good" : "soft"}
          />
          <StatusPill
            label="Temp"
            value={today?.temperatureC != null ? `${today.temperatureC} °C` : "—"}
            tone={today?.temperatureC != null && today.temperatureC >= 38 ? "alert" : "soft"}
          />
          <StatusPill
            label="Red flags (24h)"
            value={recent24hFlags.length === 0 ? "None" : `${recent24hFlags.length}`}
            tone={recent24hFlags.length > 0 ? "alert" : "good"}
          />
          <StatusPill
            label="Next appointment"
            value={upcomingAppt ? format(parseISO(upcomingAppt.date), "d MMM") : "—"}
            tone="soft"
          />
          <StatusPill
            label="Next infusion"
            value={nextInfusion ? `Day ${nextInfusion.cycleDay}` : "—"}
            tone="soft"
          />
          <StatusPill
            label="Last bloods"
            value={lastBloods ? format(parseISO(lastBloods.takenAt), "d MMM") : "—"}
            tone="soft"
          />
          <StatusPill
            label="Unanswered Qs"
            value={unansweredQs === 0 ? "None" : `${unansweredQs}`}
            tone={unansweredQs > 0 ? "accent" : "soft"}
          />
        </div>
      </Card>

      {recent24hFlags.length > 0 && <RedFlagAlert count={recent24hFlags.length} />}

      <div className="space-y-3">
        <BigButton
          href="/ed-triggers"
          tone="alert"
          icon={<AlertTriangle size={30} />}
          title="When to call / go to ED"
          sub="Red flags — temperature, bleeding, breathing, reactions"
        />

        <BigButton
          href="/log"
          tone="primary"
          icon={<HeartPulse size={30} />}
          title={today ? "Update today's log" : isSupport ? `Log how ${firstName} feels today` : "Log how today feels"}
          sub={
            today
              ? `Logged at ${format(parseISO(today.createdAt), "h:mm a")} — tap to update`
              : "~2 minutes. Red-flag check, numbers, feeling."
          }
        />

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
        <BigButton href="/bloods" tone="accent" icon={<Droplet size={26} />} title="Bloods" sub="Blood test results and trends" />
        <BigButton href="/meds" tone="primary" icon={<Pill size={26} />} title="Meds" sub="Medications, doses, and side effects" />
        <BigButton href="/side-effects" tone="pink" icon={<Search size={26} />} title="Side-effect finder" sub="Search symptoms and what to do" />
        <BigButton href="/questions" tone="accent" icon={<MessagesSquare size={26} />} title="Questions" sub="Questions for the care team" />
        <BigButton href="/profile" tone="primary" icon={<User size={26} />} title="Profile" sub="Patient details and medical history" />
        <BigButton href="/cards" tone="pink" icon={<CreditCard size={26} />} title="Wallet cards" sub="Cards for getting out of things" />
        <BigButton href="/admissions" tone="alert" icon={<Building2 size={26} />} title="Hospital admissions" sub="Track admissions, treatments, and discharge" />
        <BigButton href="/export" tone="accent" icon={<FileText size={26} />} title="Summary / export" sub="14-day report for the care team" />
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

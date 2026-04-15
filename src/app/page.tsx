"use client";
import AppShell from "@/components/AppShell";
import { BigButton, Card } from "@/components/ui";
import MissedLogBanner from "@/components/MissedLogBanner";
import { useEntries } from "@/lib/store";
import { AlertTriangle, HeartPulse, Droplet, FileText, Pill, MessagesSquare, User } from "lucide-react";
import { format, isToday, parseISO, subDays } from "date-fns";

export default function Home() {
  const daily = useEntries("daily");
  const infusion = useEntries("infusion");
  const flags = useEntries("flag");
  const questions = useEntries("question");
  const bloods = useEntries("bloods");

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
          title={today ? "Update today's log" : "Log how today feels"}
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
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <BigButton href="/bloods" tone="soft" icon={<Droplet size={22} />} title="Bloods" />
        <BigButton href="/meds" tone="soft" icon={<Pill size={22} />} title="Meds" />
        <BigButton href="/questions" tone="soft" icon={<MessagesSquare size={22} />} title="Questions" />
        <BigButton href="/profile" tone="soft" icon={<User size={22} />} title="Profile" />
        <BigButton href="/export" tone="soft" icon={<FileText size={22} />} title="Summary / export" />
      </div>
    </AppShell>
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

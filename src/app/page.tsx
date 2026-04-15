"use client";
import AppShell from "@/components/AppShell";
import { BigButton } from "@/components/ui";
import { useEntries } from "@/lib/store";
import { AlertTriangle, HeartPulse, Droplet, FileText, Pill, MessagesSquare } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";

export default function Home() {
  const daily = useEntries("daily");
  const infusion = useEntries("infusion");
  const today = daily.find((d) => isToday(parseISO(d.createdAt)));
  const nextInfusion = infusion
    .filter((i) => !i.completed)
    .sort((a, b) => a.cycleDay - b.cycleDay)[0];

  return (
    <AppShell>
      <header className="mb-6 mt-2">
        <h1 className="display text-[34px] leading-tight text-[var(--ink)]">
          Hairy but Handled
        </h1>
        <p className="text-[var(--ink-soft)] mt-1 text-[15px]">
          Notice the Shifts. Act on the Flags.
        </p>
      </header>

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
              : "2 minutes. Temp, symptoms, notes."
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
        <BigButton href="/export" tone="soft" icon={<FileText size={22} />} title="Summary / export" />
      </div>
    </AppShell>
  );
}

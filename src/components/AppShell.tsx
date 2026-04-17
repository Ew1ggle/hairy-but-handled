"use client";
import Nav from "./Nav";
import PatientSwitcher from "./PatientSwitcher";
import QuickNav from "./QuickNav";
import DailyAffirmation from "./DailyAffirmation";
import { usePatientName } from "@/lib/usePatientName";
import Link from "next/link";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { name, isSupport } = usePatientName();

  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28">
        <div className="mb-2"><PatientSwitcher /></div>

        {/* Branded header */}
        <Link href="/" className="block mb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-14 w-auto dark:hidden" />
            <img src="/logo-dark.png" alt="" className="h-14 w-auto hidden dark:block" />
            <div className="brand-font">
              <div className="text-[20px] font-light uppercase tracking-[0.2em] leading-tight">
                <span style={{ color: "var(--primary)" }}>Hairy</span>{" "}
                <span style={{ color: "var(--accent)" }}>But</span>{" "}
                <span style={{ color: "var(--primary)" }}>Handled</span>
              </div>
              <div className="text-[10px] font-light uppercase tracking-[0.25em] text-[var(--ink-soft)] mt-0.5">
                Notice the Shifts. Act on the Flags.
              </div>
            </div>
          </div>
        </Link>

        {/* Patient name bar — links to profile */}
        {name && (
          <Link href="/profile" className="block mb-3 rounded-xl bg-[var(--surface-soft)] px-4 py-2.5 brand-font active:scale-[0.99] transition">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--ink-soft)] font-medium">
                  {isSupport ? "Recording for" : "Patient"}
                </div>
                <div className="text-[17px] font-semibold text-[var(--ink)] tracking-wide">{name}</div>
              </div>
              <div className="text-[var(--ink-soft)] text-xs">Profile →</div>
            </div>
          </Link>
        )}

        <DailyAffirmation />
        <QuickNav />
        {children}
      </main>
    </div>
  );
}

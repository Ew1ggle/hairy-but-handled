"use client";
import Nav from "./Nav";
import PatientSwitcher from "./PatientSwitcher";
import QuickNav from "./QuickNav";
import { usePatientName } from "@/lib/usePatientName";
import { User } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { name, isSupport } = usePatientName();

  return (
    <div className="min-h-dvh flex flex-col">
      <Nav />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 pt-4 pb-28">
        <div className="mb-2"><PatientSwitcher /></div>
        {name && (
          <div className="mb-3 flex items-center gap-2 rounded-xl bg-[var(--surface-soft)] px-3 py-2 text-sm">
            <User size={14} className="text-[var(--ink-soft)] shrink-0" />
            <span className="text-[var(--ink-soft)]">
              {isSupport ? <>Recording for <b className="text-[var(--ink)]">{name}</b></> : <b className="text-[var(--ink)]">{name}</b>}
            </span>
          </div>
        )}
        <QuickNav />
        {children}
      </main>
    </div>
  );
}

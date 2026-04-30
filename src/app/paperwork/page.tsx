"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Paperwork } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { AlertTriangle, FileText, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const COMMON_AGENCIES = [
  "Centrelink",
  "NDIS",
  "MyHealthRecord",
  "Hospital",
  "Insurance",
  "Employer",
  "Other",
];

const COMMON_TYPES = [
  "DSP Medical Certificate",
  "Carer Payment / Allowance",
  "JobSeeker medical certificate",
  "NDIS Access Request",
  "NDIS plan review",
  "MyHealthRecord nominated rep",
  "Health insurance pre-approval",
  "Specialist referral",
  "Workplace medical certificate",
  "Travel insurance medical clearance",
  "Other",
];

const STATUS_LABEL: Record<NonNullable<Paperwork["status"]>, string> = {
  draft: "Draft",
  submitted: "Submitted",
  "in-review": "In review",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export default function PaperworkPage() {
  const { addEntry, updateEntry, deleteEntry } = useSession();
  const all = useEntries("paperwork");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [agency, setAgency] = useState("");
  const [type, setType] = useState("");
  const [submittedDate, setSubmittedDate] = useState("");
  const [reference, setReference] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [status, setStatus] = useState<Paperwork["status"] | "">("");
  const [notes, setNotes] = useState("");

  const sorted = useMemo(() => {
    // Sort: anything with an upcoming nextActionDate first (soonest at top),
    // then no-next-action by submittedDate desc.
    return all.slice().sort((a, b) => {
      const aN = a.nextActionDate ? parseISO(a.nextActionDate).getTime() : Infinity;
      const bN = b.nextActionDate ? parseISO(b.nextActionDate).getTime() : Infinity;
      if (aN !== bN) return aN - bN;
      return (b.submittedDate ?? b.createdAt ?? "").localeCompare(a.submittedDate ?? a.createdAt ?? "");
    });
  }, [all]);

  const reset = () => {
    setAgency("");
    setType("");
    setSubmittedDate("");
    setReference("");
    setNextActionDate("");
    setStatus("");
    setNotes("");
    setShowForm(false);
    setEditingId(null);
  };

  const startEditing = (p: Paperwork) => {
    setEditingId(p.id);
    setAgency(p.agency ?? "");
    setType(p.type ?? "");
    setSubmittedDate(p.submittedDate ?? "");
    setReference(p.reference ?? "");
    setNextActionDate(p.nextActionDate ?? "");
    setStatus(p.status ?? "");
    setNotes(p.notes ?? "");
    setShowForm(true);
  };

  const save = async () => {
    if (!agency.trim() || !type.trim()) return;
    const payload: Partial<Paperwork> = {
      agency: agency.trim(),
      type: type.trim(),
      submittedDate: submittedDate || undefined,
      reference: reference.trim() || undefined,
      nextActionDate: nextActionDate || undefined,
      status: status || undefined,
      notes: notes.trim() || undefined,
    };
    if (editingId) {
      await updateEntry(editingId, payload);
    } else {
      await addEntry({ kind: "paperwork", ...payload } as Omit<Paperwork, "id" | "createdAt">);
    }
    reset();
  };

  return (
    <AppShell>
      <PageTitle sub="Centrelink / NDIS / MyHealthRecord / hospital paperwork — with reminders">
        Paperwork
      </PageTitle>

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-4 rounded-2xl bg-[var(--primary)] text-white py-4 font-semibold text-base flex items-center justify-center gap-2"
        >
          <Plus size={18} /> Log paperwork
        </button>
      )}

      {showForm && (
        <Card className="mb-6 space-y-4">
          <h2 className="font-semibold text-lg">{editingId ? "Edit paperwork" : "New paperwork"}</h2>

          <Field label="Agency / system">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_AGENCIES.map((a) => {
                const on = agency === a;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAgency(a)}
                    className={
                      on
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {a}
                  </button>
                );
              })}
            </div>
            <TextInput value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Agency name" />
          </Field>

          <Field label="Type of paperwork">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TYPES.map((t) => {
                const on = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={
                      on
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {t}
                  </button>
                );
              })}
            </div>
            <TextInput value={type} onChange={(e) => setType(e.target.value)} placeholder="What kind of paperwork" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Submitted">
              <DateInput value={submittedDate} onChange={(e) => setSubmittedDate(e.target.value)} />
            </Field>
            <Field label="Next action by">
              <DateInput value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Reference / case ID">
            <TextInput value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. CRN, case number, application ID" />
          </Field>

          <Field label="Status">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => {
                const on = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(on ? "" : s)}
                    className={
                      on
                        ? "rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-2.5 py-1 text-xs font-medium text-white"
                        : "rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
                    }
                  >
                    {on ? "✓" : "+"} {STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Notes">
            <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's outstanding, who to call, what they asked for..." />
          </Field>

          <div className="flex gap-3">
            <Submit onClick={save}>Save</Submit>
            <button type="button" onClick={reset} className="rounded-2xl border border-[var(--border)] px-6 py-4 text-sm font-medium">
              Cancel
            </button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {sorted.map((p) => {
          const dueIn = p.nextActionDate ? differenceInCalendarDays(parseISO(p.nextActionDate), new Date()) : null;
          const overdue = dueIn != null && dueIn < 0 && p.status !== "completed";
          const dueSoon = dueIn != null && dueIn >= 0 && dueIn <= 7 && p.status !== "completed";
          return (
            <Card
              key={p.id}
              className={overdue ? "border-2 border-[var(--alert)]" : dueSoon ? "border-2 border-[#d4a017]" : ""}
            >
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => startEditing(p)} className="flex-1 text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText size={14} className="text-[var(--ink-soft)]" />
                    <span className="font-semibold">{p.type}</span>
                    {p.status && (
                      <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-1.5 py-0.5 font-semibold">
                        {STATUS_LABEL[p.status]}
                      </span>
                    )}
                    {overdue && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded-full bg-[var(--alert)] text-white px-1.5 py-0.5 font-semibold">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                    {p.agency}
                    {p.reference && ` · ref ${p.reference}`}
                    {p.submittedDate && ` · submitted ${format(parseISO(p.submittedDate), "d MMM yyyy")}`}
                  </div>
                  {p.nextActionDate && (
                    <div className={`text-xs mt-0.5 ${overdue ? "text-[var(--alert)] font-semibold" : dueSoon ? "text-[#8a6d0f] font-semibold" : "text-[var(--ink-soft)]"}`}>
                      Next action: {format(parseISO(p.nextActionDate), "EEE d MMM yyyy")}
                      {dueIn != null && (
                        dueIn === 0 ? " · today"
                          : dueIn > 0 ? ` · in ${dueIn} day${dueIn === 1 ? "" : "s"}`
                            : ` · ${Math.abs(dueIn)} day${Math.abs(dueIn) === 1 ? "" : "s"} overdue`
                      )}
                    </div>
                  )}
                  {p.notes && <div className="text-xs text-[var(--ink-soft)] mt-1 whitespace-pre-wrap">{p.notes}</div>}
                </button>
                <button
                  onClick={() => { if (confirm("Delete this paperwork entry?")) deleteEntry(p.id); }}
                  className="text-[var(--ink-soft)] p-1"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </Card>
          );
        })}
        {sorted.length === 0 && !showForm && (
          <Card className="text-center text-[var(--ink-soft)]">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p>No paperwork logged yet.</p>
            <p className="text-xs mt-1">Track Centrelink / NDIS / MyHealthRecord paperwork here so reference numbers + next-action dates don&apos;t get lost.</p>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

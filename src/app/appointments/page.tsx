"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Appointment } from "@/lib/store";
import { useSession } from "@/lib/session";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { Plus, Trash2, Calendar, MapPin, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const APPOINTMENT_TYPES = [
  "Routine review",
  "Bloods",
  "Infusion",
  "Scan / imaging",
  "Specialist consult",
  "Surgery / procedure",
  "Bone marrow biopsy",
  "Telehealth",
  "Other",
];

export default function Appointments() {
  const all = useEntries("appointment");
  const today = all.filter((a) => a.date && isToday(parseISO(a.date)));
  const upcoming = all.filter((a) => a.date && isFuture(parseISO(a.date)) && !isToday(parseISO(a.date))).sort((a, b) => a.date.localeCompare(b.date));
  const pastApp = all.filter((a) => a.date && isPast(parseISO(a.date)) && !isToday(parseISO(a.date))).sort((a, b) => b.date.localeCompare(a.date));
  const [open, setOpen] = useState(false);
  const { deleteEntry } = useSession();

  return (
    <AppShell>
      <PageTitle sub="Keep scheduled visits and calls here. On the day, an agenda appears on the home screen and at the top of the export.">
        Appointments
      </PageTitle>

      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5">
          <Plus size={18} /> Add appointment
        </button>
      ) : (
        <NewAppointmentForm onDone={() => setOpen(false)} />
      )}

      {today.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Today</h2>
          <div className="space-y-2 mb-4">
            {today.map((a) => <AppointmentCard key={a.id} a={a} onDelete={() => deleteEntry(a.id)} showAgendaLink />)}
          </div>
        </>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Upcoming</h2>
          <div className="space-y-2 mb-4">
            {upcoming.map((a) => <AppointmentCard key={a.id} a={a} onDelete={() => deleteEntry(a.id)} />)}
          </div>
        </>
      )}

      {pastApp.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Past</h2>
          <div className="space-y-2">
            {pastApp.slice(0, 20).map((a) => <AppointmentCard key={a.id} a={a} onDelete={() => deleteEntry(a.id)} />)}
          </div>
        </>
      )}

      {all.length === 0 && <Card className="text-center text-[var(--ink-soft)]">No appointments yet.</Card>}
    </AppShell>
  );
}

function AppointmentCard({ a, onDelete, showAgendaLink }: { a: Appointment; onDelete: () => void; showAgendaLink?: boolean }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 font-semibold">
            <Calendar size={14} className="text-[var(--ink-soft)]" />
            {format(parseISO(a.date), "EEE d MMM yyyy")}
            {a.time && <span className="text-[var(--ink-soft)] font-normal">· {a.time}</span>}
          </div>
          {a.type && <div className="text-sm text-[var(--ink-soft)]">{a.type}</div>}
          {a.provider && (
            <div className="text-sm flex items-center gap-1 mt-0.5"><User size={12} className="text-[var(--ink-soft)]" /> {a.provider}</div>
          )}
          {a.location && (
            <div className="text-sm flex items-center gap-1"><MapPin size={12} className="text-[var(--ink-soft)]" /> {a.location}</div>
          )}
          {a.notes && <div className="text-xs text-[var(--ink-soft)] mt-1">{a.notes}</div>}
          {showAgendaLink && (
            <Link href="/agenda" className="inline-block mt-2 text-sm text-[var(--primary)] font-medium">View today's agenda →</Link>
          )}
        </div>
        <button onClick={onDelete} className="text-[var(--ink-soft)] p-1" aria-label="Delete"><Trash2 size={18} /></button>
      </div>
    </Card>
  );
}

function NewAppointmentForm({ onDone }: { onDone: () => void }) {
  const { addEntry } = useSession();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("");
  const [type, setType] = useState("");
  const [provider, setProvider] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const save = async () => {
    if (!date) return;
    await addEntry({ kind: "appointment", date, time, type, provider, location, notes } as Omit<Appointment, "id" | "createdAt">);
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]">
          <option value="">Select…</option>
          {APPOINTMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Provider" hint="Doctor, nurse, clinic name"><TextInput value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>
      <Field label="Location"><TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Level 3, Haematology Day Unit" /></Field>
      <Field label="Notes"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember for this appointment" /></Field>
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!date}>Save</Submit>
      </div>
    </Card>
  );
}

"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type Appointment } from "@/lib/store";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { supabase } from "@/lib/supabase";
import { PROTOCOLS } from "@/lib/treatmentProtocols";
import { addDays, format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { Plus, Trash2, Calendar, MapPin, User, CalendarPlus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const APPOINTMENT_TYPES = [
  // Routine + consults
  "Routine review",
  "Follow-up review",
  "Specialist consult",
  "Second opinion",
  "Telehealth",
  "Telephone consult",
  "Care team meeting",
  // Treatment
  "Infusion",
  "Port flush / line care",
  "Dressing change",
  "Injection (e.g. G-CSF)",
  "Surgery / procedure",
  "Radiotherapy",
  // Diagnostics
  "Bloods",
  "Urine test",
  "Bone marrow biopsy",
  "Biopsy / tissue",
  "Lumbar puncture",
  "ECG",
  "Echocardiogram",
  "Lung function test",
  // Imaging
  "X-ray",
  "Ultrasound",
  "CT scan",
  "MRI",
  "PET-CT",
  "Bone scan",
  "Scan / imaging (other)",
  // Allied health + supportive
  "Physiotherapy",
  "Dietitian / nutrition",
  "Psychology",
  "Psychiatry",
  "Social work",
  "Cancer care coordinator",
  "Pharmacy consult",
  "Occupational therapy",
  "Speech pathology",
  // Primary + other
  "GP",
  "Dental",
  "Vaccination / immunisation",
  "Fertility consult",
  "Financial / Centrelink",
  "Other",
];

const PRACT_KEYS = [
  { key: "hematologist", label: "Hematologist" },
  { key: "immunologist", label: "Immunologist" },
  { key: "psychologist", label: "Psychologist" },
  { key: "psychiatrist", label: "Psychiatrist" },
  { key: "gp", label: "GP" },
  { key: "coordinator", label: "Cancer care coordinator" },
] as const;

type ProviderOption = { value: string; label: string; clinic?: string };

export default function Appointments() {
  const all = useEntries("appointment");
  const today = all.filter((a) => a.date && isToday(parseISO(a.date)));
  const upcoming = all.filter((a) => a.date && isFuture(parseISO(a.date)) && !isToday(parseISO(a.date))).sort((a, b) => a.date.localeCompare(b.date));
  const pastApp = all.filter((a) => a.date && isPast(parseISO(a.date)) && !isToday(parseISO(a.date))).sort((a, b) => b.date.localeCompare(a.date));
  const [open, setOpen] = useState(false);
  const { addEntry, deleteEntry, activePatientId } = useSession();
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [hospital, setHospital] = useState<string>("");
  const [regimen, setRegimen] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [syncStatus, setSyncStatus] = useState<"" | "syncing" | "done" | "already" | "missing">("");

  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = (data?.data ?? {}) as Record<string, string | boolean | undefined>;
        const list: ProviderOption[] = [];
        for (const { key, label } of PRACT_KEYS) {
          if (p[`${key}NA`]) continue;
          const name = p[key] as string | undefined;
          if (!name) continue;
          list.push({ value: name, label: `${name} — ${label}`, clinic: p[`${key}Clinic`] as string | undefined });
        }
        setProviders(list);
        if (typeof p.hospital === "string" && p.hospital) {
          setHospital([p.hospital, p.unit && `Unit ${p.unit}`].filter(Boolean).join(", "));
        }
        if (typeof p.regimen === "string") setRegimen(p.regimen);
        if (typeof p.startDate === "string") setStartDate(p.startDate);
      });
  }, [activePatientId]);

  const protocol = regimen ? PROTOCOLS[regimen] : undefined;
  const canSync = Boolean(protocol && startDate);

  const syncFromProtocol = async () => {
    if (!protocol || !startDate) {
      setSyncStatus("missing");
      setTimeout(() => setSyncStatus(""), 3000);
      return;
    }
    setSyncStatus("syncing");
    const existingKeys = new Set(
      all
        .filter((a) => a.protocolId === protocol.id && a.protocolDay != null)
        .map((a) => `${a.protocolId}:${a.protocolDay}`),
    );
    let created = 0;
    for (const day of protocol.days) {
      const key = `${protocol.id}:${day.day}`;
      if (existingKeys.has(key)) continue;
      const date = format(addDays(parseISO(startDate), day.day - 1), "yyyy-MM-dd");
      const notes = [
        day.dose && `Dose: ${day.dose}`,
        day.route && `Route: ${day.route}`,
        day.duration && `Duration: ${day.duration}`,
        day.premeds?.length ? `Premeds: ${day.premeds.join(", ")}` : undefined,
        day.notes,
      ].filter(Boolean).join("\n");
      await addEntry({
        kind: "appointment",
        date,
        type: "Infusion",
        provider: day.drugs,
        location: hospital || undefined,
        notes: notes || undefined,
        protocolDay: day.day,
        protocolId: protocol.id,
      } as Omit<Appointment, "id" | "createdAt">);
      created += 1;
    }
    setSyncStatus(created > 0 ? "done" : "already");
    setTimeout(() => setSyncStatus(""), 3500);
  };

  return (
    <AppShell>
      <PageTitle sub="Keep scheduled visits and calls here. On the day, an agenda appears on the home screen and at the top of the export.">
        Doctor's Appointments
      </PageTitle>

      {!open ? (
        <button onClick={() => setOpen(true)} className="w-full mb-3 flex items-center justify-center gap-2 rounded-2xl bg-[var(--pink)] text-[var(--pink-ink)] font-semibold py-3.5">
          <Plus size={18} /> Add appointment
        </button>
      ) : (
        <NewAppointmentForm onDone={() => setOpen(false)} providers={providers} hospital={hospital} />
      )}

      {/* Sync from treatment protocol — auto-creates appointment entries for each cycle day */}
      {!open && (
        <Card className="mb-5 border-dashed">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <RefreshCw size={14} /> Sync from treatment schedule
              </div>
              <div className="text-xs text-[var(--ink-soft)] mt-0.5 leading-relaxed">
                {canSync ? (
                  <>Creates a date-only appointment for each drug day in <b>{protocol!.name}</b> starting {format(parseISO(startDate), "EEE d MMM yyyy")}. Safe to re-run — existing ones are kept.</>
                ) : (
                  <>Set your regimen and treatment start date in <Link href="/settings" className="text-[var(--primary)] font-medium">Settings → Treatment</Link> to enable this.</>
                )}
              </div>
              {syncStatus === "done" && (
                <div className="text-xs text-[var(--primary)] mt-1 font-medium">Synced — new appointments added.</div>
              )}
              {syncStatus === "already" && (
                <div className="text-xs text-[var(--ink-soft)] mt-1">All protocol days already in your list.</div>
              )}
              {syncStatus === "missing" && (
                <div className="text-xs text-[var(--alert)] mt-1">Regimen or start date missing.</div>
              )}
            </div>
            <button
              type="button"
              onClick={syncFromProtocol}
              disabled={!canSync || syncStatus === "syncing"}
              className="shrink-0 rounded-xl bg-[var(--primary)] text-[var(--primary-ink)] px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              {syncStatus === "syncing" ? "Syncing…" : "Sync now"}
            </button>
          </div>
        </Card>
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

function buildIcs(a: Appointment) {
  const dt = (date: string, time?: string) => {
    const t = time && /^\d{2}:\d{2}$/.test(time) ? time : "09:00";
    const d = new Date(`${date}T${t}:00`);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  };
  const start = dt(a.date, a.time);
  const endDate = new Date(`${a.date}T${(a.time && /^\d{2}:\d{2}$/.test(a.time)) ? a.time : "09:00"}:00`);
  endDate.setHours(endDate.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const end = `${endDate.getFullYear()}${pad(endDate.getMonth()+1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
  const title = [a.type, a.provider].filter(Boolean).join(" · ") || "Appointment";
  const description = [a.notes].filter(Boolean).join("\\n");
  const location = a.location ?? "";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hairy but Handled//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@hairy-but-handled`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description}` : "",
    location ? `LOCATION:${location}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return ics;
}

function downloadIcs(a: Appointment) {
  const ics = buildIcs(a);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const filename = `appointment-${a.date}.ics`;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          <div className="mt-2 flex flex-wrap gap-2">
            {showAgendaLink && (
              <Link href="/agenda" className="text-sm text-[var(--primary)] font-medium">View today's agenda →</Link>
            )}
            <button onClick={() => downloadIcs(a)} className="text-sm font-medium text-[var(--primary)] inline-flex items-center gap-1">
              <CalendarPlus size={13} /> Add to phone calendar
            </button>
          </div>
        </div>
        <button onClick={onDelete} className="text-[var(--ink-soft)] p-1" aria-label="Delete"><Trash2 size={18} /></button>
      </div>
    </Card>
  );
}

function NewAppointmentForm({ onDone, providers, hospital }: { onDone: () => void; providers: ProviderOption[]; hospital: string }) {
  const { addEntry, activePatientId } = useSession();
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("");
  const [type, setType] = useState("");
  const [providerSelect, setProviderSelect] = useState("");
  const [provider, setProvider] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [autoCalendar, setAutoCalendar] = useState(true);

  const { clear: clearDraft } = useDraft<Record<string, string>>({
    key: "/appointments/new",
    href: "/appointments",
    title: "Appointment",
    patientId: activePatientId,
    state: { date, time, type, providerSelect, provider, location, notes },
    onRestore: (d) => {
      if (d.date) setDate(d.date);
      if (d.time) setTime(d.time);
      if (d.type) setType(d.type);
      if (d.providerSelect) setProviderSelect(d.providerSelect);
      if (d.provider) setProvider(d.provider);
      if (d.location) setLocation(d.location);
      if (d.notes) setNotes(d.notes);
    },
  });

  const knownLocations = Array.from(new Set([
    hospital,
    ...providers.map((p) => p.clinic).filter(Boolean) as string[],
  ].filter(Boolean)));

  const onPickProvider = (val: string) => {
    setProviderSelect(val);
    if (!val) return;
    const found = providers.find((p) => p.value === val);
    if (found) {
      setProvider(found.value);
      if (found.clinic && !location) setLocation(found.clinic);
    }
  };

  const save = async () => {
    if (!date) return;
    const created = await addEntry({ kind: "appointment", date, time, type, provider, location, notes } as Omit<Appointment, "id" | "createdAt">);
    if (created && autoCalendar) downloadIcs(created as Appointment);
    clearDraft();
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><DateInput value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Time"><TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>

      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]">
          <option value="">Select…</option>
          {APPOINTMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>

      {providers.length > 0 && (
        <Field label="Pick a provider from your profile">
          <select value={providerSelect} onChange={(e) => onPickProvider(e.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]">
            <option value="">— Or type below —</option>
            {providers.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
      )}
      <Field label="Provider"><TextInput value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>

      <div>
        <Field label="Location">
          <TextInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Level 3, Haematology Day Unit"
            list="known-locations"
            autoComplete="street-address"
          />
        </Field>
        {knownLocations.length > 0 && (
          <datalist id="known-locations">
            {knownLocations.map((l) => <option key={l} value={l} />)}
          </datalist>
        )}
        {knownLocations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {knownLocations.map((l) => (
              <button key={l} type="button" onClick={() => setLocation(l)} className="text-xs px-2.5 py-1 rounded-full border border-[var(--border)]">
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <Field label="Notes"><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember for this appointment" /></Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="w-4 h-4" checked={autoCalendar} onChange={(e) => setAutoCalendar(e.target.checked)} />
        Add to phone calendar after saving
      </label>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!date}>Save</Submit>
      </div>
    </Card>
  );
}

"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useEntries, type MedEntry, type MedCategory, type MedDeliveryForm, type MedSchedule, type MedStatus, type InfusionLog } from "@/lib/store";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { loadDraft, useDraft } from "@/lib/drafts";
import { isMedEffectivelyStopped } from "@/lib/meds";
import { format, parseISO } from "date-fns";
import { AlertTriangle, ChevronRight, Droplet, Plus, Trash2, Pill } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const COMMON_MEDS: { name: string; dose: string; reason: string; category?: MedCategory }[] = [
  { name: "Paracetamol", dose: "1g", reason: "Pain / fever", category: "symptom-relief" },
  { name: "Ibuprofen", dose: "400 mg", reason: "Pain / inflammation", category: "symptom-relief" },
  { name: "Ondansetron", dose: "4–8 mg", reason: "Nausea", category: "symptom-relief" },
  { name: "Loratadine", dose: "10 mg", reason: "Allergy / itch", category: "symptom-relief" },
  { name: "Phenergan", dose: "10 mg", reason: "Antihistamine / nausea", category: "symptom-relief" },
  { name: "Dexamethasone", dose: "", reason: "Steroid / anti-inflammatory", category: "symptom-relief" },
  { name: "Valaciclovir", dose: "500 mg", reason: "Antiviral prophylaxis", category: "infection-prevention" },
  { name: "Bactrim / cotrimoxazole", dose: "", reason: "PCP prophylaxis", category: "infection-prevention" },
  { name: "Omeprazole", dose: "20 mg", reason: "Reflux / stomach", category: "other-prescribed" },
  { name: "Iron", dose: "", reason: "Iron deficiency", category: "otc-supplement" },
];

type MedExtra = { purpose?: "prophylaxis" | "regular" | "as-needed" | ""; helped?: "Yes" | "No" | "Not sure" | "" };

const CATEGORY_LABEL: Record<MedCategory, string> = {
  "cancer-treatment": "Cancer treatment",
  "infection-prevention": "Infection prevention",
  "symptom-relief": "Symptom relief",
  "other-prescribed": "Other prescribed",
  "otc-supplement": "OTC / supplement",
};

const DELIVERY_FORM_LABEL: Record<MedDeliveryForm, string> = {
  tablet: "Tablet",
  capsule: "Capsule",
  liquid: "Liquid",
  injection: "Injection",
  infusion: "Infusion",
  cream: "Cream",
  "mouth-rinse": "Mouth rinse",
  inhaler: "Inhaler",
  other: "Other",
};

const SCHEDULE_LABEL: Record<MedSchedule, string> = {
  regular: "Regular",
  prn: "PRN (as needed)",
  "treatment-day-only": "Treatment day only",
  "short-course": "Short course",
};

const STATUS_LABEL: Record<MedStatus, string> = {
  active: "Active",
  paused: "Paused",
  stopped: "Stopped",
};

const PRESCRIBER_PROFILE_KEYS = [
  { key: "hematologist", label: "Hematologist" },
  { key: "immunologist", label: "Immunologist" },
  { key: "psychologist", label: "Psychologist" },
  { key: "psychiatrist", label: "Psychiatrist" },
  { key: "gp", label: "GP" },
  { key: "coordinator", label: "Cancer care coordinator" },
] as const;

type PrescriberOption = { value: string; label: string };


export default function Meds() {
  const entries = useEntries("med").slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const infusions = useEntries("infusion");
  const active = entries.filter((m) => !isMedEffectivelyStopped(m));
  const stopped = entries.filter((m) => isMedEffectivelyStopped(m));
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedEntry | null>(null);
  const formAnchorRef = useRef<HTMLDivElement | null>(null);
  const { deleteEntry, updateEntry, activePatientId } = useSession();

  /** Open a med for editing AND scroll the form into view. Without the
   *  scroll, tapping a med deep in the Stopped list opens the form
   *  hidden above the viewport. */
  const startEditing = (m: MedEntry) => {
    setEditing(m);
    setOpen(false);
    requestAnimationFrame(() => {
      formAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // If the user landed here from the home page's 'Unfinished: Medication'
  // flag, an unsaved draft exists in localStorage. Auto-open the form so
  // the draft restores in MedForm — otherwise tapping the flag would just
  // open /meds with the form closed and leave the flag dangling.
  useEffect(() => {
    if (!activePatientId) return;
    if (loadDraft("/meds/new", activePatientId)) setOpen(true);
  }, [activePatientId]);

  // Pull the patient's care-team practitioners from the profile so the
  // prescriber field in MedForm can offer them as a dropdown. Same shape
  // the appointments page uses.
  const [knownPrescribers, setKnownPrescribers] = useState<PrescriberOption[]>([]);
  useEffect(() => {
    const sb = supabase();
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = (data?.data ?? {}) as Record<string, string | boolean | undefined>;
        const list: PrescriberOption[] = [];
        for (const { key, label } of PRESCRIBER_PROFILE_KEYS) {
          if (p[`${key}NA`]) continue;
          const name = p[key];
          if (typeof name === "string" && name.trim()) {
            list.push({ value: name.trim(), label: `${label} — ${name.trim()}` });
          }
        }
        // Also pull any prescribers already used on past meds, so a
        // 'random doctor' typed once becomes a future quick-pick.
        for (const m of entries) {
          const p = m.prescriber?.trim();
          if (!p) continue;
          if (list.some((opt) => opt.value.toLowerCase() === p.toLowerCase())) continue;
          list.push({ value: p, label: p });
        }
        setKnownPrescribers(list);
      });
  }, [activePatientId, entries]);

  /** Derived from infusion logs — every unique drug name across all logged
   *  infusions, with last-given timestamp + the cycle days it appeared on.
   *  Read-only here; edits go to /treatment/[cycleDay]. */
  const infusionDrugs = useMemo(() => {
    const map = new Map<string, { name: string; latest: InfusionLog; cycleDays: Set<number> }>();
    for (const inf of infusions) {
      const drugs = (inf.drugs ?? "").split(",").map((d) => d.trim()).filter(Boolean);
      for (const d of drugs) {
        const key = d.toLowerCase();
        const ex = map.get(key);
        if (ex) {
          if (inf.createdAt > ex.latest.createdAt) ex.latest = inf;
          ex.cycleDays.add(inf.cycleDay);
        } else {
          map.set(key, { name: d, latest: inf, cycleDays: new Set([inf.cycleDay]) });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
  }, [infusions]);

  return (
    <AppShell>
      <PageTitle sub="Tap a common med to add fast, or add a custom one.">Medications</PageTitle>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Link
          href="/doses"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 active:scale-[0.99] transition"
        >
          <div className="font-medium text-sm">Dose Trace →</div>
          <div className="text-[11px] text-[var(--ink-soft)] truncate">
            What landed, when, what followed
          </div>
        </Link>
        <Link
          href="/med-shift"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 active:scale-[0.99] transition"
        >
          <div className="font-medium text-sm">Med Shift →</div>
          <div className="text-[11px] text-[var(--ink-soft)] truncate">
            Misses, changes, reactions
          </div>
        </Link>
      </div>

      <div ref={formAnchorRef} />

      {editing ? (
        <MedForm existing={editing} knownPrescribers={knownPrescribers} onDone={() => setEditing(null)} />
      ) : !open ? (
        <button onClick={() => setOpen(true)} className="w-full mb-5 flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] text-white font-semibold py-3.5">
          <Plus size={18} /> Add medication
        </button>
      ) : (
        <MedForm knownPrescribers={knownPrescribers} onDone={() => setOpen(false)} />
      )}

      {infusionDrugs.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Treatment infusions</h2>
          <div className="space-y-2 mb-4">
            {infusionDrugs.map((d) => (
              <Link
                key={d.name}
                href={`/treatment/${d.latest.cycleDay}`}
                className="block"
              >
                <Card className="active:scale-[0.99] transition">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                      <Droplet size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold">{d.name}</div>
                        <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-2 py-0.5 font-semibold">
                          From infusion
                        </span>
                      </div>
                      <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                        Last given {format(parseISO(d.latest.createdAt), "d MMM")} · cycle days {Array.from(d.cycleDays).sort((a, b) => a - b).join(", ")}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--ink-soft)] shrink-0 mt-1.5" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {active.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Currently taking</h2>
          <div className="space-y-2 mb-4">
            {active.map((m) => (
              <MedCard
                key={m.id}
                m={m}
                onEdit={() => startEditing(m)}
                onStop={() => updateEntry(m.id, { stopped: true })}
                onDelete={() => deleteEntry(m.id)}
              />
            ))}
          </div>
        </>
      )}

      {stopped.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-2">Stopped</h2>
          <div className="space-y-2">
            {stopped.map((m) => (
              <MedCard
                key={m.id}
                m={m}
                onEdit={() => startEditing(m)}
                onRestart={() => updateEntry(m.id, { stopped: false })}
                onDelete={() => deleteEntry(m.id)}
              />
            ))}
          </div>
        </>
      )}

      {entries.length === 0 && <Card className="text-center text-[var(--ink-soft)]">No meds logged yet.</Card>}
    </AppShell>
  );
}

function MedCard({ m, onEdit, onStop, onRestart, onDelete }: { m: MedEntry; onEdit: () => void; onStop?: () => void; onRestart?: () => void; onDelete: () => void }) {
  const ex = m as unknown as MedExtra;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onEdit} className="flex-1 text-left active:opacity-70 transition">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill size={14} className="text-[var(--ink-soft)] shrink-0" />
            <div className="font-semibold">
              {m.name}
              {m.brand && <span className="text-[var(--ink-soft)] font-normal"> ({m.brand})</span>}
              {m.dose && <span className="text-[var(--ink-soft)] font-normal"> · {m.dose}</span>}
            </div>
            {m.allergyFlag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--alert-soft)] text-[var(--alert)] px-2 py-0.5 text-[10px] font-semibold">
                <AlertTriangle size={10} /> Allergy
              </span>
            )}
            {m.category && (
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--surface-soft)] text-[var(--ink-soft)] px-2 py-0.5 font-semibold">
                {CATEGORY_LABEL[m.category]}
              </span>
            )}
          </div>
          {m.reason && <div className="text-sm text-[var(--ink-soft)] mt-0.5">{m.reason}</div>}
          {m.instructions && <div className="text-sm mt-0.5">{m.instructions}</div>}
          <div className="text-xs text-[var(--ink-soft)] mt-1">
            {[
              `Added ${format(parseISO(m.createdAt), "d MMM, h:mm a")}`,
              m.schedule && SCHEDULE_LABEL[m.schedule],
              m.form && DELIVERY_FORM_LABEL[m.form],
              m.timeTaken,
              m.prescriber,
              ex.purpose && !m.schedule ? ex.purpose : undefined,
              ex.helped ? `helped: ${ex.helped}` : undefined,
            ].filter(Boolean).join(" · ")}
          </div>
          {m.importantNotes && (
            <div className="text-sm mt-1 rounded-lg bg-[var(--surface-soft)] px-2 py-1.5">
              <span className="font-semibold">Important: </span>{m.importantNotes}
            </div>
          )}
          {m.sideEffects && <div className="text-sm mt-1">Side effects: {m.sideEffects}</div>}
        </button>
        <div className="flex flex-col items-end gap-1">
          {onStop && <button onClick={onStop} className="text-xs text-[var(--alert)] font-medium">Stop</button>}
          {onRestart && <button onClick={onRestart} className="text-xs text-[var(--primary)] font-medium">Restart</button>}
          <button onClick={onDelete} className="text-[var(--ink-soft)] p-1" aria-label="Delete"><Trash2 size={16} /></button>
        </div>
      </div>
    </Card>
  );
}

function MedForm({ onDone, existing, knownPrescribers = [] }: { onDone: () => void; existing?: MedEntry; knownPrescribers?: PrescriberOption[] }) {
  const { addEntry, updateEntry, activePatientId } = useSession();
  const ex = existing as unknown as MedExtra | undefined;
  const [name, setName] = useState(existing?.name ?? "");
  const [brand, setBrand] = useState(existing?.brand ?? "");
  const [dose, setDose] = useState(existing?.dose ?? "");
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");
  const [reason, setReason] = useState(existing?.reason ?? "");
  const [timeTaken, setTime] = useState(existing?.timeTaken ?? "");
  const [sideEffects, setSide] = useState(existing?.sideEffects ?? "");
  const [helped, setHelped] = useState<MedExtra["helped"]>(ex?.helped ?? "");
  const [category, setCategory] = useState<MedCategory | "">(existing?.category ?? "");
  const [deliveryForm, setDeliveryForm] = useState<MedDeliveryForm | "">(existing?.form ?? "");
  const [schedule, setSchedule] = useState<MedSchedule | "">(existing?.schedule ?? "");
  // Prescriber stored as plain string. The select drives picker state:
  // a known name (matches profile or recent meds), "__other__" (free
  // text), or "" (unset). When "__other__" is picked we reveal the
  // text input so a one-off doctor can be typed.
  const [prescriber, setPrescriber] = useState(existing?.prescriber ?? "");
  const isKnownPrescriber = (n: string) => knownPrescribers.some((o) => o.value === n);
  const initialPickerValue = (() => {
    if (!existing?.prescriber) return "";
    return isKnownPrescriber(existing.prescriber) ? existing.prescriber : "__other__";
  })();
  const [prescriberPicker, setPrescriberPicker] = useState<string>(initialPickerValue);
  const [startDate, setStartDate] = useState(existing?.startDate ?? "");
  const [stopDate, setStopDate] = useState(existing?.stopDate ?? "");
  const [status, setStatus] = useState<MedStatus | "">(existing?.status ?? (existing?.stopped ? "stopped" : ""));
  const [allergyFlag, setAllergyFlag] = useState<boolean>(!!existing?.allergyFlag);
  const [importantNotes, setImportantNotes] = useState(existing?.importantNotes ?? "");
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const { clear: clearDraft } = useDraft<Record<string, string>>({
    key: "/meds/new",
    href: "/meds",
    title: "Medication",
    patientId: activePatientId,
    state: { name, dose, reason, timeTaken, sideEffects, helped: helped ?? "" },
    onRestore: (d) => {
      if (existing) return;
      setName(d.name ?? "");
      setDose(d.dose ?? "");
      setReason(d.reason ?? "");
      setTime(d.timeTaken ?? "");
      setSide(d.sideEffects ?? "");
      setHelped((d.helped as MedExtra["helped"]) ?? "");
      setHasRestoredDraft(true);
    },
  });

  const discardDraft = () => {
    clearDraft();
    onDone();
  };

  const pickCommon = (c: typeof COMMON_MEDS[number]) => {
    setName(c.name);
    setDose(c.dose);
    setReason(c.reason);
    if (c.category && !category) setCategory(c.category);
  };

  const save = async () => {
    if (!name) return;
    const payload: Partial<MedEntry> = {
      name,
      brand: brand || undefined,
      dose: dose || undefined,
      instructions: instructions || undefined,
      reason: reason || undefined,
      timeTaken: timeTaken || undefined,
      sideEffects: sideEffects || undefined,
      helped: helped === "Yes" ? true : helped === "No" ? false : helped === "Not sure" ? null : undefined,
      category: category || undefined,
      form: deliveryForm || undefined,
      schedule: schedule || undefined,
      prescriber: prescriber || undefined,
      startDate: startDate || undefined,
      stopDate: stopDate || undefined,
      status: status || undefined,
      stopped: status === "stopped" ? true : status ? false : undefined,
      allergyFlag: allergyFlag || undefined,
      importantNotes: importantNotes || undefined,
    };
    if (existing) {
      await updateEntry(existing.id, payload);
    } else {
      await addEntry({ kind: "med", ...payload } as unknown as Omit<MedEntry, "id" | "createdAt">);
      clearDraft();
    }
    onDone();
  };

  return (
    <Card className="space-y-3 mb-5">
      {hasRestoredDraft && (
        <div className="rounded-xl bg-[var(--surface-soft)] border border-[var(--border)] px-3 py-2 flex items-center gap-2">
          <div className="text-xs flex-1">
            <span className="font-semibold">Restored from where you left off.</span>
            <span className="text-[var(--ink-soft)]"> Save when ready, or discard if you don&apos;t want it.</span>
          </div>
          <button
            type="button"
            onClick={discardDraft}
            className="shrink-0 text-xs font-medium text-[var(--alert)]"
          >
            Discard
          </button>
        </div>
      )}
      <div>
        <div className="text-sm font-medium mb-2">Common meds — tap to pre-fill</div>
        <div className="flex flex-wrap gap-2">
          {COMMON_MEDS.map((c) => (
            <button key={c.name} type="button" onClick={() => pickCommon(c)}
              className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)]">
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Medicine"><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paracetamol" /></Field>
        <Field label="Brand (optional)"><TextInput value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Panadol" /></Field>
      </div>
      <Field label="Why taking it"><TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Nausea after infusion" /></Field>

      <div>
        <div className="text-sm font-medium mb-2">Category</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABEL) as MedCategory[]).map((val) => {
            const on = category === val;
            return (
              <button key={val} type="button" onClick={() => setCategory(on ? "" : val)}
                className={`rounded-full px-3 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {CATEGORY_LABEL[val]}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Form</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(DELIVERY_FORM_LABEL) as MedDeliveryForm[]).map((val) => {
            const on = deliveryForm === val;
            return (
              <button key={val} type="button" onClick={() => setDeliveryForm(on ? "" : val)}
                className={`rounded-full px-3 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {DELIVERY_FORM_LABEL[val]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Dose"><TextInput value={dose} onChange={(e) => setDose(e.target.value)} placeholder="e.g. 1g, 400 mg" /></Field>

      <Field label="Instructions" hint="Prescriber's directions, exactly as written">
        <TextInput value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. take 1 tablet 4 times daily" />
      </Field>

      <div>
        <div className="text-sm font-medium mb-2">Schedule</div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SCHEDULE_LABEL) as MedSchedule[]).map((val) => {
            const on = schedule === val;
            return (
              <button key={val} type="button" onClick={() => setSchedule(on ? "" : val)}
                className={`rounded-full px-3 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {SCHEDULE_LABEL[val]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Usual timing" hint="When in the day it's typically taken">
        <TextInput value={timeTaken} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 8 am, or 8 am + 8 pm" />
      </Field>

      <Field label="Prescriber" hint="Pick from your care team — or Other for a one-off doctor">
        <select
          value={prescriberPicker}
          onChange={(e) => {
            const v = e.target.value;
            setPrescriberPicker(v);
            if (v === "__other__") {
              // Keep current free-text or clear if it was a known name.
              if (isKnownPrescriber(prescriber)) setPrescriber("");
            } else {
              setPrescriber(v);
            }
          }}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
        >
          <option value="">— Select prescriber —</option>
          {knownPrescribers.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          <option value="__other__">Other (type the name)</option>
        </select>
        {prescriberPicker === "__other__" && (
          <div className="mt-2">
            <TextInput
              value={prescriber}
              onChange={(e) => setPrescriber(e.target.value)}
              placeholder="e.g. Dr Patel (locum), ED registrar"
              autoFocus
            />
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date"><TextInput type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <Field label="Stop date (if any)"><TextInput type="date" value={stopDate} onChange={(e) => setStopDate(e.target.value)} /></Field>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Status</div>
        <div className="flex gap-2">
          {(Object.keys(STATUS_LABEL) as MedStatus[]).map((val) => {
            const on = status === val;
            return (
              <button key={val} type="button" onClick={() => setStatus(on ? "" : val)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {STATUS_LABEL[val]}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAllergyFlag(!allergyFlag)}
        className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 border text-sm text-left ${
          allergyFlag
            ? "bg-[var(--alert-soft)] border-[var(--alert)] text-[var(--alert)]"
            : "border-[var(--border)]"
        }`}
      >
        <AlertTriangle size={16} className={allergyFlag ? "text-[var(--alert)]" : "text-[var(--ink-soft)]"} />
        <span className="flex-1">
          <span className="font-semibold">Allergy / bad reaction</span>
          <span className="block text-xs opacity-80">{allergyFlag ? "Flagged — will show on this med everywhere" : "Tap if a previous reaction was serious enough to flag"}</span>
        </span>
      </button>

      <Field label="Important notes" hint="e.g. take with food, do not crush, avoid grapefruit">
        <TextArea value={importantNotes} onChange={(e) => setImportantNotes(e.target.value)} />
      </Field>

      <Field label="Side effects (this med has caused, free text)"><TextArea value={sideEffects} onChange={(e) => setSide(e.target.value)} /></Field>
      <div>
        <div className="text-sm font-medium mb-2">Did it help?</div>
        <div className="flex gap-2">
          {(["Yes","No","Not sure"] as const).map((opt) => {
            const on = helped === opt;
            return (
              <button key={opt} type="button" onClick={() => setHelped(on ? "" : opt)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-2xl border border-[var(--border)] py-3 font-medium">Cancel</button>
        <Submit onClick={save} disabled={!name}>Save</Submit>
      </div>
    </Card>
  );
}

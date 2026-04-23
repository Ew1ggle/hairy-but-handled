"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { useDraft } from "@/lib/drafts";
import { useEntries, type Admission, type Appointment, type FlagEvent } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { AlertTriangle, Plus, Trash2, Building2, Droplet, Dog, UserX, ShieldAlert, Flag, MapPin, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePatientName } from "@/lib/usePatientName";
import { FileUpload, type Attachment } from "@/components/FileUpload";
import { MedicalDisclaimerBanner } from "@/components/MedicalDisclaimer";

const TREATMENT_OPTIONS = [
  "Blood Cultures",
  "Complete Blood Count",
  "Kidney and Liver Tests",
  "Lactate",
  "Urine Testing",
  "Chest Xray",
  "Antibiotics (Oral)",
  "Antibiotics (IV)",
  "Red Blood Cell Transfusion",
  "Platelet Transfusion",
  "Neutrophil-stimulating injection",
  "Splenectomy",
  "Admission",
  "Other [please specify]",
];

const ED_PRESENTATIONS = [
  "Active Fever",
  "Suspected Infection",
  "Anaemia",
  "Bleeding",
  "Low Neutrophils",
  "Active Controlled Infection",
  "Active Uncontrolled Infection",
  "Spleen Issues",
  "Other [Please specify]",
];

type TreatmentRow = { id: string; treatment: string; details: string };
type NearbyHospital = { name: string; distanceM: number };

/** ED practitioner stored on patient_profiles.data.edPractitioners */
type EdPractitioner = {
  name: string;
  hospital: string;
  role: "doctor" | "nurse";
  dateEncountered: string;
};

export default function EmergencyPage() {
  const { addEntry, activePatientId } = useSession();
  const sb = supabase();

  const admissions = useEntries("admission");
  const appointments = useEntries("appointment");

  // Patient info for quick reference
  const [patientName, setPatientName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [regimen, setRegimen] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [profileHospital, setProfileHospital] = useState<string>("");
  const [profileData, setProfileData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        const p = data?.data as Record<string, unknown> | undefined;
        if (!p) return;
        setProfileData(p);
        setPatientName((p.name as string) ?? "");
        const dx = p.diagnosis === "Other" ? (p.diagnosisOther as string) ?? "" : (p.diagnosis as string) ?? "";
        setDiagnosis(dx);
        const rx = p.regimen === "Other" ? (p.regimenOther as string) ?? "" : (p.regimen as string) ?? "";
        setRegimen(rx);
        const al = (p.allergies as { name?: string }[]) ?? [];
        setAllergies(al.map((a) => a.name ?? "").filter(Boolean));
        setProfileHospital((p.hospital as string) ?? "");
      });
  }, [sb, activePatientId]);

  // ED log state
  const { firstName, isSupport } = usePatientName();

  const [arrivalTime, setArrivalTime] = useState(format(new Date(), "HH:mm"));
  const [hospital, setHospital] = useState("");
  const [presentations, setPresentations] = useState<string[]>([]);
  const [presentationOther, setPresentationOther] = useState("");
  const [doctors, setDoctors] = useState<string[]>([""]);
  const [nurses, setNurses] = useState<string[]>([""]);
  const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saved, setSaved] = useState(false);

  // Build the hospital dropdown list from profile + past admissions + past appointments
  const knownHospitals = useMemo(() => {
    const seen = new Map<string, string>();
    const add = (name: string | undefined) => {
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    };
    add(profileHospital);
    for (const a of admissions) add(a.hospital);
    for (const a of appointments as Appointment[]) add(a.location);
    return Array.from(seen.values()).sort();
  }, [profileHospital, admissions, appointments]);

  const { clear: clearDraft } = useDraft<{
    arrivalTime: string; hospital: string; presentations: string[]; presentationOther: string;
    doctors: string[]; nurses: string[]; treatments: TreatmentRow[]; notes: string;
  }>({
    key: "/emergency/new",
    href: "/emergency",
    title: "ED visit",
    patientId: activePatientId,
    enabled: !saved,
    state: { arrivalTime, hospital, presentations, presentationOther, doctors, nurses, treatments, notes },
    onRestore: (d) => {
      if (d.arrivalTime) setArrivalTime(d.arrivalTime);
      if (d.hospital) setHospital(d.hospital);
      if (d.presentations?.length) setPresentations(d.presentations);
      if (d.presentationOther) setPresentationOther(d.presentationOther);
      if (d.doctors?.length) setDoctors(d.doctors);
      if (d.nurses?.length) setNurses(d.nurses);
      if (d.treatments?.length) setTreatments(d.treatments);
      if (d.notes) setNotes(d.notes);
    },
  });

  const filteredTreatments = treatmentSearch
    ? TREATMENT_OPTIONS.filter((t) => t.toLowerCase().includes(treatmentSearch.toLowerCase()))
    : TREATMENT_OPTIONS;

  const addTreatment = (name: string) => {
    if (treatments.some((t) => t.treatment === name)) return;
    setTreatments([...treatments, { id: crypto.randomUUID(), treatment: name, details: "" }]);
    setTreatmentSearch("");
  };

  const togglePresentation = (p: string) => {
    setPresentations((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const presentationText = (() => {
    const list = presentations.map((p) =>
      p === "Other [Please specify]" && presentationOther ? presentationOther : p,
    );
    return list.join(", ");
  })();

  const saveAsAdmission = async () => {
    const today = format(new Date(), "yyyy-MM-dd");

    // Create admission entry
    await addEntry({
      kind: "admission",
      admissionDate: today,
      hospital,
      reason: presentationText ? `ED presentation: ${presentationText}` : "ED visit",
      treatments,
      attachments,
      notes: [
        `Arrival: ${arrivalTime}`,
        doctors.filter(Boolean).length > 0 ? `Doctors: ${doctors.filter(Boolean).join(", ")}` : "",
        nurses.filter(Boolean).length > 0 ? `Nurses: ${nurses.filter(Boolean).join(", ")}` : "",
        notes,
      ].filter(Boolean).join("\n"),
    } as Omit<Admission, "id" | "createdAt">);

    // Flag event for Tripwires / agenda
    await addEntry({
      kind: "flag",
      triggerLabel: presentationText ? `ED visit: ${presentationText}` : "ED visit",
      wentToED: true,
    } as Omit<FlagEvent, "id" | "createdAt">);

    // Append ED practitioners to the patient profile (deduped by name+hospital+role)
    if (sb && activePatientId) {
      const existing = ((profileData.edPractitioners as EdPractitioner[] | undefined) ?? []).slice();
      const key = (p: EdPractitioner) => `${p.role}|${p.name.trim().toLowerCase()}|${p.hospital.trim().toLowerCase()}`;
      const seen = new Set(existing.map(key));
      const additions: EdPractitioner[] = [];
      for (const d of doctors.map((x) => x.trim()).filter(Boolean)) {
        const ep: EdPractitioner = { name: d, hospital, role: "doctor", dateEncountered: today };
        if (!seen.has(key(ep))) { additions.push(ep); seen.add(key(ep)); }
      }
      for (const n of nurses.map((x) => x.trim()).filter(Boolean)) {
        const ep: EdPractitioner = { name: n, hospital, role: "nurse", dateEncountered: today };
        if (!seen.has(key(ep))) { additions.push(ep); seen.add(key(ep)); }
      }
      if (additions.length > 0) {
        const merged = [...existing, ...additions];
        const newData = { ...profileData, edPractitioners: merged };
        await sb.from("patient_profiles").update({ data: newData }).eq("patient_id", activePatientId);
        setProfileData(newData);
      }
    }

    clearDraft();
    setSaved(true);
  };

  return (
    <AppShell>
      <MedicalDisclaimerBanner />

      {/* Big red header */}
      <div className="rounded-2xl bg-[var(--alert)] text-white p-5 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle size={32} />
          <h1 className="text-2xl font-extrabold uppercase tracking-wide">{isSupport ? `${firstName} is at Emergency` : "I am at Emergency"}</h1>
        </div>
        <p className="text-sm opacity-90">{isSupport ? `Log ${firstName}'s ED visit here.` : "Log your ED visit here."} This information will be saved to the admissions record and daily log.</p>
      </div>

      {/* Quick patient reference card for ED staff */}
      <Card className="mb-4 border-[var(--primary)]">
        <div className="text-xs uppercase tracking-widest text-[var(--primary)] font-semibold mb-2">Patient reference</div>
        <div className="text-sm space-y-1">
          {patientName && <div><b>Name:</b> {patientName}</div>}
          {diagnosis && <div><b>Diagnosis:</b> {diagnosis}</div>}
          {regimen && <div><b>Current regimen:</b> {regimen}</div>}
          {allergies.length > 0 && (
            <div className="text-[var(--alert)] font-semibold">Allergies: {allergies.join(", ")}</div>
          )}
        </div>
      </Card>

      {saved ? (
        <Card className="text-center py-8">
          <div className="text-[var(--primary)] font-semibold text-lg mb-2">ED visit recorded</div>
          <p className="text-sm text-[var(--ink-soft)] mb-4">Saved to your admissions and flagged in your daily log. Treating staff added to your profile.</p>
          <a href="/admissions" className="inline-block rounded-xl bg-[var(--primary)] text-white px-6 py-3 font-medium">
            View admissions
          </a>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Time & Hospital */}
          <Card className="space-y-4">
            <Field label="Arrival time">
              <TextInput type="time" value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
            </Field>
            <HospitalPicker value={hospital} onChange={setHospital} known={knownHospitals} />
          </Card>

          {/* Presentation — multi-select */}
          <Card className="space-y-3">
            <div>
              <div className="text-sm font-medium">Presentation</div>
              <div className="text-xs text-[var(--ink-soft)]">Tick all that apply</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ED_PRESENTATIONS.map((p) => {
                const on = presentations.includes(p);
                return (
                  <button key={p} type="button" onClick={() => togglePresentation(p)}
                    className={`rounded-xl px-3 py-2 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                    {p}
                  </button>
                );
              })}
            </div>
            {presentations.includes("Other [Please specify]") && (
              <TextInput value={presentationOther} onChange={(e) => setPresentationOther(e.target.value)} placeholder="Please specify" />
            )}
          </Card>

          {/* Staff */}
          <Card className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Treating doctor(s)</span>
                <button type="button" onClick={() => setDoctors([...doctors, ""])} className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                  <Plus size={14} /> Add
                </button>
              </div>
              {doctors.map((d, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <TextInput value={d} onChange={(e) => { const arr = [...doctors]; arr[i] = e.target.value; setDoctors(arr); }} placeholder="Doctor name" />
                  {doctors.length > 1 && (
                    <button type="button" onClick={() => setDoctors(doctors.filter((_, idx) => idx !== i))} className="text-[var(--ink-soft)] p-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <p className="text-[11px] text-[var(--ink-soft)]">
                Names saved here will be added to your profile's Emergency Department list with today's date.
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">Treating nurse(s)</span>
                <button type="button" onClick={() => setNurses([...nurses, ""])} className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium">
                  <Plus size={14} /> Add
                </button>
              </div>
              {nurses.map((n, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <TextInput value={n} onChange={(e) => { const arr = [...nurses]; arr[i] = e.target.value; setNurses(arr); }} placeholder="Nurse name" />
                  {nurses.length > 1 && (
                    <button type="button" onClick={() => setNurses(nurses.filter((_, idx) => idx !== i))} className="text-[var(--ink-soft)] p-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Treatments */}
          <Card className="space-y-3">
            <div className="text-sm font-medium">Treatments / investigations</div>
            <div className="relative">
              <TextInput
                value={treatmentSearch}
                onChange={(e) => setTreatmentSearch(e.target.value)}
                placeholder="Search treatments to add..."
              />
              {treatmentSearch && (
                <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-48 overflow-auto">
                  {filteredTreatments.map((t) => (
                    <button key={t} type="button" onClick={() => addTreatment(t)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-soft)] border-b border-[var(--border)] last:border-0">
                      {t}
                    </button>
                  ))}
                  {filteredTreatments.length === 0 && (
                    <div className="px-3 py-2 text-sm text-[var(--ink-soft)]">No matches</div>
                  )}
                </div>
              )}
            </div>
            {treatments.length > 0 && (
              <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-soft)] border-b border-[var(--border)]">
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[var(--ink-soft)]">Treatment</th>
                      <th className="text-left px-3 py-2 text-xs uppercase tracking-wide text-[var(--ink-soft)]">Details</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {treatments.map((t) => (
                      <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-2 font-medium">{t.treatment}</td>
                        <td className="px-3 py-1">
                          <input type="text" value={t.details}
                            onChange={(e) => setTreatments(treatments.map((x) => x.id === t.id ? { ...x, details: e.target.value } : x))}
                            placeholder="Additional details" className="w-full bg-transparent py-1 text-sm focus:outline-none" />
                        </td>
                        <td className="px-2">
                          <button type="button" onClick={() => setTreatments(treatments.filter((x) => x.id !== t.id))} className="text-[var(--ink-soft)] p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {treatments.length === 0 && !treatmentSearch && (
              <div className="flex flex-wrap gap-1.5">
                {TREATMENT_OPTIONS.slice(0, 8).map((t) => (
                  <button key={t} type="button" onClick={() => addTreatment(t)}
                    className="rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--ink-soft)]">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <Field label="Notes">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else to record about this ED visit..." />
            </Field>
          </Card>

          {/* Attachments */}
          <Card>
            <FileUpload attachments={attachments} onChange={setAttachments} label="Attach ED reports (photos or PDFs)" />
          </Card>

          {/* Save */}
          <button
            type="button"
            onClick={saveAsAdmission}
            className="w-full rounded-2xl bg-[var(--alert)] text-white font-bold py-5 text-lg active:scale-[0.99] transition"
          >
            Save ED visit
          </button>

          {/* Quick protocols — moved to the bottom per request, reference only */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={16} className="text-[var(--primary)]" />
              <div className="text-xs uppercase tracking-widest text-[var(--ink-soft)] font-semibold">Quick protocols</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { slug: "fever", label: "Fever / deterioration", icon: Flag },
                { slug: "hospital-trip", label: "Hospital trip PPE", icon: Building2 },
                { slug: "body-fluid-spill", label: "Body-fluid spill", icon: Droplet },
                { slug: "outsider-visit", label: "Outsider in house", icon: UserX },
                { slug: "pet-accident", label: "Pet accident", icon: Dog },
              ] as const).map(({ slug, label, icon: Icon }) => (
                <a
                  key={slug}
                  href={`/home#${slug}`}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm active:bg-[var(--surface-soft)]"
                >
                  <Icon size={16} className="text-[var(--primary)] shrink-0" />
                  <span className="flex-1">{label}</span>
                </a>
              ))}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

/** Hospital picker — dropdown from known hospitals (profile + past admissions
 *  + past appointments), manual text entry, and "Find near me" that uses the
 *  browser geolocation API + OpenStreetMap's free Overpass service to list
 *  nearby amenity=hospital results. */
function HospitalPicker({
  value, onChange, known,
}: {
  value: string;
  onChange: (v: string) => void;
  known: string[];
}) {
  const [nearby, setNearby] = useState<NearbyHospital[]>([]);
  const [locating, setLocating] = useState<"" | "locating" | "searching" | "done" | "denied" | "error" | "none">("");

  const findNearMe = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocating("error");
      return;
    }
    setLocating("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating("searching");
        try {
          const { latitude: lat, longitude: lng } = pos.coords;
          // 15 km radius. Overpass returns OSM nodes with name + distance.
          const q = `[out:json][timeout:15];
(
  node["amenity"="hospital"](around:15000,${lat},${lng});
  way["amenity"="hospital"](around:15000,${lat},${lng});
);
out center tags;`;
          const res = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(q),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
          const data = await res.json();
          type OverpassEl = { tags?: { name?: string }; lat?: number; lon?: number; center?: { lat: number; lon: number } };
          const hospitals: NearbyHospital[] = [];
          const seen = new Set<string>();
          for (const el of (data.elements ?? []) as OverpassEl[]) {
            const name = el.tags?.name;
            if (!name) continue;
            const k = name.toLowerCase();
            if (seen.has(k)) continue;
            seen.add(k);
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            const distanceM = elLat != null && elLon != null ? haversineM(lat, lng, elLat, elLon) : 0;
            hospitals.push({ name, distanceM });
          }
          hospitals.sort((a, b) => a.distanceM - b.distanceM);
          setNearby(hospitals);
          setLocating(hospitals.length === 0 ? "none" : "done");
        } catch {
          setLocating("error");
        }
      },
      (err) => {
        setLocating(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div className="space-y-2">
      <Field label="Hospital">
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Which emergency department?"
        />
      </Field>

      {/* Known hospitals — one-tap fill from profile + past visits */}
      {known.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1">
            From your records
          </div>
          <div className="flex flex-wrap gap-1.5">
            {known.map((h) => {
              const on = value === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => onChange(on ? "" : h)}
                  className={`rounded-full px-2.5 py-1 text-xs border transition ${
                    on
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {on && <Check size={11} className="inline mr-1 -mt-0.5" />}
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Geolocation helper */}
      <div>
        <button
          type="button"
          onClick={findNearMe}
          disabled={locating === "locating" || locating === "searching"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          <MapPin size={14} />
          {locating === "locating" ? "Getting location…"
            : locating === "searching" ? "Looking up hospitals…"
            : "Find hospitals near me"}
        </button>
        {locating === "denied" && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">
            Location permission denied — type the hospital manually.
          </p>
        )}
        {locating === "none" && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">
            No hospitals found within 15 km of your current location.
          </p>
        )}
        {locating === "error" && (
          <p className="text-[11px] text-[var(--ink-soft)] mt-1">
            Couldn't fetch nearby hospitals. Try again or type manually.
          </p>
        )}
      </div>

      {nearby.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--ink-soft)] font-semibold mb-1">
            Nearby (tap to fill)
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nearby.slice(0, 10).map((h) => {
              const on = value === h.name;
              const km = (h.distanceM / 1000).toFixed(1);
              return (
                <button
                  key={h.name}
                  type="button"
                  onClick={() => onChange(on ? "" : h.name)}
                  className={`rounded-full px-2.5 py-1 text-xs border transition ${
                    on
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  {h.name} · {km} km
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** Great-circle distance in metres (haversine). */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

"use client";
import AppShell from "@/components/AppShell";
import { Card, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Copy, Plus, Trash2, Check, Send } from "lucide-react";

type PractitionerProps = {
  label: string;
  name?: string; phone?: string; mobile?: string; clinic?: string; na?: boolean;
  onName: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPhone: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onMobile: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onClinic: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onToggleNA: () => void;
};

function Practitioner({ label, name, phone, mobile, clinic, na, onName, onPhone, onMobile, onClinic, onToggleNA }: PractitionerProps) {
  return (
    <div className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">{label}</div>
        <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
          <input type="checkbox" className="w-4 h-4" checked={!!na} onChange={onToggleNA} />
          Not applicable
        </label>
      </div>
      {!na && (
        <>
          <Field label="Name"><TextInput value={name ?? ""} onChange={onName} /></Field>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Phone"><TextInput type="tel" value={phone ?? ""} onChange={onPhone} /></Field>
            <Field label="Mobile"><TextInput type="tel" value={mobile ?? ""} onChange={onMobile} /></Field>
          </div>
          <div className="mt-3">
            <Field label="Clinic / practice"><TextInput value={clinic ?? ""} onChange={onClinic} /></Field>
          </div>
        </>
      )}
    </div>
  );
}

type Allergy = {
  id: string;
  classification?: string;
  name?: string;
  hayFever?: boolean;
  asthma?: boolean;
  hives?: boolean;
  anaphylaxis?: boolean;
  otherChecked?: boolean;
  other?: string;
};

const ALLERGY_CLASSES: { label: string; examples: string }[] = [
  { label: "Environmental (seasonal/indoor)", examples: "e.g. pollen (hay fever), dust mites, mould, pet dander" },
  { label: "Food", examples: "e.g. cow's milk, eggs, peanuts, tree nuts, fish, shellfish, soy, wheat" },
  { label: "Insect / venom", examples: "e.g. bee, wasp, fire ant stings; tick bites" },
  { label: "Drug / medication", examples: "e.g. penicillin, aspirin" },
  { label: "Latex", examples: "e.g. natural rubber latex products" },
  { label: "Other", examples: "" },
];

type HistoryRow = {
  id: string;
  category: string;
  details?: string;
  date?: string;
  notRelevant?: boolean;
};

type SupportPerson = {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  isEPOA?: boolean; // enduring power of attorney
  invited?: boolean;
};

type SymptomAnswer = { id: string; key: string; answer?: "Yes" | "No" | "Not sure" | "" };
type AdditionalSymptom = { id: string; text?: string; answer?: "Yes" | "No" | "Not sure" | "" };

type Profile = {
  // identity
  name?: string;
  dob?: string;
  medicareNumber?: string;
  medicarePosition?: string;
  // private health
  privateFundName?: string;
  privateFundNumber?: string;
  privateFundPosition?: string;
  privateFundCoverage?: "Hospital only" | "Hospital + Extras" | "Extras Only" | "";
  // care team (per practitioner)
  hematologist?: string; hematologistPhone?: string; hematologistMobile?: string; hematologistClinic?: string; hematologistNA?: boolean;
  immunologist?: string; immunologistPhone?: string; immunologistMobile?: string; immunologistClinic?: string; immunologistNA?: boolean;
  psychologist?: string; psychologistPhone?: string; psychologistMobile?: string; psychologistClinic?: string; psychologistNA?: boolean;
  psychiatrist?: string; psychiatristPhone?: string; psychiatristMobile?: string; psychiatristClinic?: string; psychiatristNA?: boolean;
  gp?: string; gpPhone?: string; gpMobile?: string; gpClinic?: string; gpNA?: boolean;
  coordinator?: string; coordinatorPhone?: string; coordinatorMobile?: string; coordinatorClinic?: string; coordinatorNA?: boolean;
  hospital?: string;
  unit?: string;
  // support people (array)
  supportPeople?: SupportPerson[];
  // diagnosis
  diagnosis?: string;
  diagnosisOther?: string;
  diagnosisDate?: string;
  brafResult?: string;
  spleen?: string;
  spleenEnlarged?: "Yes" | "No" | "Not sure" | "";
  spleenUpperLeftPain?: "Yes" | "No" | "Not sure" | "";
  spleenEarlySatiety?: "Yes" | "No" | "Not sure" | "";
  flowMarkers?: Record<string, string>; // marker -> result
  flowMarkersNotTested?: Record<string, boolean>; // marker -> not tested at baseline
  flowMarkersNotes?: string;
  // treatment
  regimen?: string;
  regimenOther?: string;
  startDate?: string;
  // medical history
  allergies?: Allergy[];
  medicalHistory?: HistoryRow[];
  // baseline
  baselineWeight?: string;
  baselineHeight?: string;
  baselineTemp?: string;
  baselineBP?: string;
  baselineHR?: string; // resting heart rate
  genderIdentity?: string;
  genderIdentityOther?: string;
  sexAtBirth?: string;
  sexAtBirthOther?: string;
  // main issues — structured by key (heading:item)
  symptoms?: Record<string, "Yes" | "No" | "Not sure" | "">;
  additionalSymptoms?: AdditionalSymptom[];
  // medical history "not applicable" per category
  historyNA?: Record<string, boolean>;
  vaccinations?: Record<string, { status?: "Yes" | "No" | "Not sure" | ""; date?: string }>;
  otherVaccinations?: { id: string; name?: string; status?: "Yes" | "No" | "Not sure" | ""; date?: string }[];
  // notes section
  treatmentInstructions?: string;
  valuesDirective?: string;
  notes?: string;
};

const REGIMENS = [
  "Cladribine",
  "Cladribine + Rituximab",
  "Pentostatin (Nipent)",
  "Vemurafenib + Obinutuzumab",
  "Other",
];

const DIAGNOSES = [
  "HCL — Classic Hairy Cell Leukemia",
  "HCL-V — Hairy Cell Leukemia Variant",
  "SDRPL — Splenic Diffuse Red Pulp Small B-cell Lymphoma",
  "Other",
];

const GENDER_IDENTITIES = [
  "Man",
  "Woman",
  "Non-binary",
  "I use a different term",
  "Prefer not to answer",
];

const SEX_AT_BIRTH = [
  "Male",
  "Female",
  "Intersex",
  "Another term",
  "Prefer not to answer",
];

const SYMPTOM_GROUPS: { heading: string; items: string[] }[] = [
  { heading: "Extreme fatigue / weakness", items: ["Constant tiredness", "Anaemia (low red blood cell count)", "Lack of energy"] },
  { heading: "Abdominal fullness / pain", items: ["Upper left discomfort or 'dragging' sensation (enlarged spleen)"] },
  { heading: "Frequent infections", items: ["Recurring infections", "Slow healing"] },
  { heading: "Easy bruising or bleeding", items: ["Unexplained bruises", "Petechiae (tiny red/purple spots)", "Nosebleeds", "Heavy bleeding"] },
  { heading: "Weight loss and night sweats", items: ["Unexplained weight loss", "Drenching night sweats"] },
  { heading: "Pale skin / breathlessness", items: ["Pallor", "Shortness of breath on normal activity"] },
];

const symptomKey = (heading: string, item: string) => `${heading}::${item}`;

const FLOW_MARKER_GROUPS: { group: string; markers: string[] }[] = [
  { group: "Core markers", markers: ["CD103", "CD25 (Bright)", "CD11c (Bright)", "CD123 (Bright)", "CD200 (Bright)"] },
  { group: "Pan-B-cell markers", markers: ["CD19", "CD20", "CD22", "Surface Immunoglobulin (sIg)"] },
  { group: "Optional markers", markers: ["CD5", "CD10", "CD23", "CD26", "Annexin A1"] },
];

const VACCINES = [
  "Influenza",
  "COVID-19",
  "Tdap (Tetanus, Diphtheria, Pertussis)",
  "Hepatitis B",
  "HPV",
  "Shingles",
  "Pneumococcal",
  "RSV",
  "MMR",
  "Varicella (Chicken Pox)",
  "Whooping Cough",
];

const HISTORY_CATEGORIES: { name: string; descriptor: string }[] = [
  { name: "Active or Recent Infections", descriptor: "Bacterial, Atypical mycobacterial, fungal" },
  { name: "Previous Infections", descriptor: "History of frequent infections or pneumonia" },
  { name: "Autoimmune Disorders", descriptor: "" },
  { name: "Previous Cancers", descriptor: "Any history of previous malignancy" },
  { name: "Metabolic and Cardiovascular History", descriptor: "Hypertension, Diabetes, Hyperlipidemia" },
  { name: "Spleen History", descriptor: "Previous abdominal surgery or trauma, chronic abdominal discomfort" },
  { name: "NSAID use", descriptor: "Non-steroidal anti-inflammatory drug use" },
  { name: "Warfarin use", descriptor: "History of taking anticoagulant agents" },
  { name: "Organ Function", descriptor: "Pre-existing kidney / liver function (Renal / Hepatic)" },
  { name: "Vaccination History", descriptor: "Vaccination status and currency" },
  { name: "Gynecological History", descriptor: "Any reported gynecological concerns" },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function ProfilePage() {
  const { activePatientId, canWrite } = useSession();
  const sb = supabase();
  const router = useRouter();
  const [p, setP] = useState<Profile>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        if (data?.data) setP(data.data as Profile);
        setLoaded(true);
      });
  }, [sb, activePatientId]);

  const save = async () => {
    if (!sb || !activePatientId) return;
    setBusy(true); setSaved(false);
    const { error } = await sb.from("patient_profiles")
      .upsert({ patient_id: activePatientId, data: p, updated_at: new Date().toISOString() });
    setBusy(false);
    if (!error) { setSaved(true); setTimeout(() => router.push("/"), 700); }
  };

  const upd = <K extends keyof Profile>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setP({ ...p, [k]: e.target.value as Profile[K] });

  const copy = async (text: string | undefined, tag: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(tag);
      setTimeout(() => setCopied((c) => (c === tag ? null : c)), 1200);
    } catch {}
  };

  // Support people array helpers
  const addSupport = () => setP({ ...p, supportPeople: [...(p.supportPeople ?? []), { id: uid() }] });
  const updSupport = (id: string, patch: Partial<SupportPerson>) =>
    setP({ ...p, supportPeople: (p.supportPeople ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const delSupport = (id: string) =>
    setP({ ...p, supportPeople: (p.supportPeople ?? []).filter((s) => s.id !== id) });

  const sendSupportInvite = async (s: SupportPerson) => {
    if (!sb || !activePatientId || !s.email) return;
    const email = s.email.trim().toLowerCase();
    const { error } = await sb.from("invites")
      .upsert({ patient_id: activePatientId, email, role: "support" }, { onConflict: "patient_id,email" });
    if (!error) {
      const next = { ...p, supportPeople: (p.supportPeople ?? []).map((x) => x.id === s.id ? { ...x, invited: true } : x) };
      setP(next);
      // persist immediately so the "Invited ✓" state sticks even without hitting Save
      await sb.from("patient_profiles").upsert({ patient_id: activePatientId, data: next, updated_at: new Date().toISOString() });
      alert(`Invite saved. Ask ${email} to open https://hairy-but-handled.vercel.app and sign in with that email — they'll be added automatically.`);
    } else {
      alert(`Couldn't send invite: ${error.message}`);
    }
  };

  // Allergies
  const addAllergy = () => setP({ ...p, allergies: [...(p.allergies ?? []), { id: uid() }] });
  const updAllergy = (id: string, patch: Partial<Allergy>) =>
    setP({ ...p, allergies: (p.allergies ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const delAllergy = (id: string) =>
    setP({ ...p, allergies: (p.allergies ?? []).filter((a) => a.id !== id) });

  // Medical history
  const addHistory = (category: string) =>
    setP({ ...p, medicalHistory: [...(p.medicalHistory ?? []), { id: uid(), category }] });
  const updHistory = (id: string, patch: Partial<HistoryRow>) =>
    setP({ ...p, medicalHistory: (p.medicalHistory ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  const delHistory = (id: string) =>
    setP({ ...p, medicalHistory: (p.medicalHistory ?? []).filter((r) => r.id !== id) });

  const historyFor = (cat: string) => (p.medicalHistory ?? []).filter((r) => r.category === cat);
  const historyNA = (cat: string) => !!(p.historyNA ?? {})[cat];
  const toggleHistoryNA = (cat: string) =>
    setP({ ...p, historyNA: { ...(p.historyNA ?? {}), [cat]: !historyNA(cat) } });

  // Vaccinations helpers
  const getVax = (name: string) => (p.vaccinations ?? {})[name] ?? {};
  const updVax = (name: string, patch: Partial<{ status: "Yes" | "No" | "Not sure" | ""; date: string }>) =>
    setP({ ...p, vaccinations: { ...(p.vaccinations ?? {}), [name]: { ...getVax(name), ...patch } } });
  const addOtherVax = () =>
    setP({ ...p, otherVaccinations: [...(p.otherVaccinations ?? []), { id: uid() }] });
  const updOtherVax = (id: string, patch: Partial<{ name: string; status: "Yes" | "No" | "Not sure" | ""; date: string }>) =>
    setP({ ...p, otherVaccinations: (p.otherVaccinations ?? []).map((v) => v.id === id ? { ...v, ...patch } : v) });
  const delOtherVax = (id: string) =>
    setP({ ...p, otherVaccinations: (p.otherVaccinations ?? []).filter((v) => v.id !== id) });

  // Symptoms helpers
  const getSymptom = (k: string) => (p.symptoms ?? {})[k] ?? "";
  const setSymptom = (k: string, v: "Yes" | "No" | "Not sure" | "") =>
    setP({ ...p, symptoms: { ...(p.symptoms ?? {}), [k]: v } });
  const addAdditionalSymptom = () =>
    setP({ ...p, additionalSymptoms: [...(p.additionalSymptoms ?? []), { id: uid() }] });
  const updAdditionalSymptom = (id: string, patch: Partial<AdditionalSymptom>) =>
    setP({ ...p, additionalSymptoms: (p.additionalSymptoms ?? []).map((s) => s.id === id ? { ...s, ...patch } : s) });
  const delAdditionalSymptom = (id: string) =>
    setP({ ...p, additionalSymptoms: (p.additionalSymptoms ?? []).filter((s) => s.id !== id) });

  // Flow markers
  const updMarker = (name: string, value: string) =>
    setP({ ...p, flowMarkers: { ...(p.flowMarkers ?? {}), [name]: value } });
  const toggleMarkerNotTested = (name: string) => {
    const current = !!(p.flowMarkersNotTested ?? {})[name];
    setP({
      ...p,
      flowMarkersNotTested: { ...(p.flowMarkersNotTested ?? {}), [name]: !current },
      flowMarkers: current ? (p.flowMarkers ?? {}) : { ...(p.flowMarkers ?? {}), [name]: "" },
    });
  };

  if (!loaded) return <AppShell><p className="text-[var(--ink-soft)]">Loading…</p></AppShell>;


  return (
    <AppShell>
      <PageTitle sub="Fill in what you know. You can come back and add more later.">
        Patient profile
      </PageTitle>

      {/* Identity */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Identity</h2>
        <Field label="Name"><TextInput value={p.name ?? ""} onChange={upd("name")} /></Field>
        <Field label="Date of birth"><TextInput type="date" value={p.dob ?? ""} onChange={upd("dob")} /></Field>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label="Medicare number"><TextInput inputMode="numeric" value={p.medicareNumber ?? ""} onChange={upd("medicareNumber")} /></Field>
            <Field label="Position"><TextInput inputMode="numeric" value={p.medicarePosition ?? ""} onChange={upd("medicarePosition")} /></Field>
          </div>
          <button
            type="button"
            onClick={() => copy([p.medicareNumber, p.medicarePosition && `#${p.medicarePosition}`].filter(Boolean).join(" "), "medicare")}
            className="mb-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm inline-flex items-center gap-1"
            aria-label="Copy Medicare number"
          >
            {copied === "medicare" ? <Check size={14} /> : <Copy size={14} />}
            {copied === "medicare" ? "Copied" : "Copy"}
          </button>
        </div>
      </Card>

      {/* Private health */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Private health fund</h2>
        <Field label="Fund name"><TextInput value={p.privateFundName ?? ""} onChange={upd("privateFundName")} /></Field>
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label="Card number"><TextInput value={p.privateFundNumber ?? ""} onChange={upd("privateFundNumber")} /></Field>
            <Field label="Position"><TextInput inputMode="numeric" value={p.privateFundPosition ?? ""} onChange={upd("privateFundPosition")} /></Field>
          </div>
          <button
            type="button"
            onClick={() => copy([p.privateFundNumber, p.privateFundPosition && `#${p.privateFundPosition}`].filter(Boolean).join(" "), "fund")}
            className="mb-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm inline-flex items-center gap-1"
            aria-label="Copy fund card number"
          >
            {copied === "fund" ? <Check size={14} /> : <Copy size={14} />}
            {copied === "fund" ? "Copied" : "Copy"}
          </button>
        </div>
        <Field label="Coverage type">
          <select
            value={p.privateFundCoverage ?? ""}
            onChange={upd("privateFundCoverage")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
          >
            <option value="">Select…</option>
            <option>Hospital only</option>
            <option>Hospital + Extras</option>
            <option>Extras Only</option>
          </select>
        </Field>
      </Card>

      {/* Care team */}
      <Card className="space-y-5 mb-4">
        <h2 className="font-semibold">Care team</h2>
        <Practitioner label="Hematologist" name={p.hematologist} phone={p.hematologistPhone} mobile={p.hematologistMobile} clinic={p.hematologistClinic} na={p.hematologistNA}
          onName={upd("hematologist")} onPhone={upd("hematologistPhone")} onMobile={upd("hematologistMobile")} onClinic={upd("hematologistClinic")}
          onToggleNA={() => setP({ ...p, hematologistNA: !p.hematologistNA })} />
        <Practitioner label="Immunologist" name={p.immunologist} phone={p.immunologistPhone} mobile={p.immunologistMobile} clinic={p.immunologistClinic} na={p.immunologistNA}
          onName={upd("immunologist")} onPhone={upd("immunologistPhone")} onMobile={upd("immunologistMobile")} onClinic={upd("immunologistClinic")}
          onToggleNA={() => setP({ ...p, immunologistNA: !p.immunologistNA })} />
        <Practitioner label="Psychologist" name={p.psychologist} phone={p.psychologistPhone} mobile={p.psychologistMobile} clinic={p.psychologistClinic} na={p.psychologistNA}
          onName={upd("psychologist")} onPhone={upd("psychologistPhone")} onMobile={upd("psychologistMobile")} onClinic={upd("psychologistClinic")}
          onToggleNA={() => setP({ ...p, psychologistNA: !p.psychologistNA })} />
        <Practitioner label="Psychiatrist" name={p.psychiatrist} phone={p.psychiatristPhone} mobile={p.psychiatristMobile} clinic={p.psychiatristClinic} na={p.psychiatristNA}
          onName={upd("psychiatrist")} onPhone={upd("psychiatristPhone")} onMobile={upd("psychiatristMobile")} onClinic={upd("psychiatristClinic")}
          onToggleNA={() => setP({ ...p, psychiatristNA: !p.psychiatristNA })} />
        <Practitioner label="GP" name={p.gp} phone={p.gpPhone} mobile={p.gpMobile} clinic={p.gpClinic} na={p.gpNA}
          onName={upd("gp")} onPhone={upd("gpPhone")} onMobile={upd("gpMobile")} onClinic={upd("gpClinic")}
          onToggleNA={() => setP({ ...p, gpNA: !p.gpNA })} />
        <Practitioner label="Cancer care coordinator" name={p.coordinator} phone={p.coordinatorPhone} mobile={p.coordinatorMobile} clinic={p.coordinatorClinic} na={p.coordinatorNA}
          onName={upd("coordinator")} onPhone={upd("coordinatorPhone")} onMobile={upd("coordinatorMobile")} onClinic={upd("coordinatorClinic")}
          onToggleNA={() => setP({ ...p, coordinatorNA: !p.coordinatorNA })} />
        <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-3">
          <Field label="HCL treating hospital"><TextInput value={p.hospital ?? ""} onChange={upd("hospital")} /></Field>
          <Field label="Unit"><TextInput value={p.unit ?? ""} onChange={upd("unit")} /></Field>
        </div>
      </Card>

      {/* Support people */}
      <Card className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Support people</h2>
        </div>
        {(p.supportPeople ?? []).map((s, idx) => (
          <div key={s.id} className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">#{idx + 1}</div>
              <button onClick={() => delSupport(s.id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Name"><TextInput value={s.name ?? ""} onChange={(e) => updSupport(s.id, { name: e.target.value })} /></Field>
              <Field label="Phone"><TextInput type="tel" value={s.phone ?? ""} onChange={(e) => updSupport(s.id, { phone: e.target.value })} /></Field>
            </div>
            <div className="mt-3">
              <Field label="Relationship"><TextInput value={s.relationship ?? ""} onChange={(e) => updSupport(s.id, { relationship: e.target.value })} /></Field>
            </div>
            <div className="mt-3">
              <Field label="Email (to give app access)">
                <TextInput type="email" value={s.email ?? ""} onChange={(e) => updSupport(s.id, { email: e.target.value })} placeholder="friend@example.com" />
              </Field>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="w-4 h-4" checked={!!s.isEPOA} onChange={(e) => updSupport(s.id, { isEPOA: e.target.checked })} />
                Enduring Power of Attorney
              </label>
              <button
                type="button"
                onClick={() => sendSupportInvite(s)}
                disabled={!s.email || s.invited}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] text-white px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                <Send size={14} /> {s.invited ? "Invited ✓" : "Send invite"}
              </button>
            </div>
          </div>
        ))}
        <button onClick={addSupport} className="w-full rounded-xl border border-dashed border-[var(--border)] py-3 text-sm inline-flex items-center justify-center gap-2">
          <Plus size={14} /> Add support person
        </button>
      </Card>

      {/* Diagnosis */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Diagnosis</h2>
        <Field label="Confirmed diagnosis">
          <select
            value={p.diagnosis ?? ""}
            onChange={upd("diagnosis")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
          >
            <option value="">Select…</option>
            {DIAGNOSES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        {p.diagnosis === "Other" && (
          <Field label="Please specify"><TextInput value={p.diagnosisOther ?? ""} onChange={upd("diagnosisOther")} /></Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date confirmed"><TextInput type="date" value={p.diagnosisDate ?? ""} onChange={upd("diagnosisDate")} /></Field>
          <Field label="BRAF V600E result"><TextInput value={p.brafResult ?? ""} onChange={upd("brafResult")} /></Field>
        </div>
        <div>
          <div className="text-sm font-medium mb-1.5">Spleen enlarged?</div>
          <div className="flex gap-2">
            {(["Yes","No","Not sure"] as const).map((opt) => {
              const on = p.spleenEnlarged === opt;
              return (
                <button key={opt} type="button" onClick={() => setP({ ...p, spleenEnlarged: on ? "" : opt })}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-sm font-semibold mb-2">Spleen symptoms</div>
          {([
            { key: "spleenUpperLeftPain" as const, label: "Upper-left abdominal pain or fullness", hint: "Pain or discomfort behind the left ribs, sometimes radiating to the left shoulder." },
            { key: "spleenEarlySatiety" as const, label: "Early satiety", hint: "Feeling full or bloated after eating only a small amount — enlarged spleen pressing on the stomach." },
          ]).map((s) => {
            const v = (p[s.key] as string) ?? "";
            return (
              <div key={s.key} className="mb-3 last:mb-0">
                <div className="text-sm">{s.label}</div>
                <div className="text-xs text-[var(--ink-soft)] mb-2">{s.hint}</div>
                <div className="flex gap-2">
                  {(["Yes","No","Not sure"] as const).map((opt) => {
                    const on = v === opt;
                    return (
                      <button key={opt} type="button"
                        onClick={() => setP({ ...p, [s.key]: on ? "" : opt })}
                        className={`flex-1 rounded-lg px-2 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <Field label="Spleen notes (optional)"><TextInput value={p.spleen ?? ""} onChange={upd("spleen")} placeholder="e.g. size, tenderness" /></Field>

        <div className="pt-2">
          <div className="text-sm font-medium mb-2">Flow markers</div>
          <div className="space-y-3">
            {FLOW_MARKER_GROUPS.map((grp) => (
              <div key={grp.group}>
                <div className="text-xs uppercase tracking-wide text-[var(--ink-soft)] mb-1">{grp.group}</div>
                <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
                  {grp.markers.map((m) => {
                    const notTested = !!(p.flowMarkersNotTested ?? {})[m];
                    return (
                      <div key={m} className="flex items-center gap-2 px-3 py-2">
                        <div className="flex-1 text-sm">{m}</div>
                        <label className="flex items-center gap-1 text-[11px] text-[var(--ink-soft)]">
                          <input type="checkbox" className="w-3.5 h-3.5" checked={notTested} onChange={() => toggleMarkerNotTested(m)} />
                          Not tested
                        </label>
                        <input
                          type="text"
                          value={(p.flowMarkers ?? {})[m] ?? ""}
                          onChange={(e) => updMarker(m, e.target.value)}
                          placeholder={notTested ? "—" : "result"}
                          disabled={notTested}
                          className="w-24 rounded-lg border border-[var(--border)] px-2 py-1.5 text-sm disabled:bg-[var(--surface-soft)] disabled:text-[var(--ink-soft)]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Field label="Flow markers notes"><TextArea value={p.flowMarkersNotes ?? ""} onChange={upd("flowMarkersNotes")} /></Field>
          </div>
        </div>
      </Card>

      {/* Treatment */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Treatment</h2>
        <Field label="Regimen">
          <select
            value={p.regimen ?? ""}
            onChange={upd("regimen")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
          >
            <option value="">Select…</option>
            {REGIMENS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        {p.regimen === "Other" && (
          <Field label="Drug names — please specify"><TextInput value={p.regimenOther ?? ""} onChange={upd("regimenOther")} /></Field>
        )}
        <Field label="Start date"><TextInput type="date" value={p.startDate ?? ""} onChange={upd("startDate")} /></Field>
      </Card>

      {/* Allergies */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Allergies</h2>
        {(p.allergies ?? []).map((a) => {
          const cls = ALLERGY_CLASSES.find((c) => c.label === a.classification);
          return (
          <div key={a.id} className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Field label="Allergy classification">
                  <select
                    value={a.classification ?? ""}
                    onChange={(e) => updAllergy(a.id, { classification: e.target.value })}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
                  >
                    <option value="">Select…</option>
                    {ALLERGY_CLASSES.map((c) => <option key={c.label}>{c.label}</option>)}
                  </select>
                </Field>
              </div>
              <button onClick={() => delAllergy(a.id)} aria-label="Remove" className="mt-5 text-[var(--ink-soft)] p-1"><Trash2 size={16} /></button>
            </div>
            <div className="mt-3">
              <Field label="Allergen">
                <TextInput
                  value={a.name ?? ""}
                  onChange={(e) => updAllergy(a.id, { name: e.target.value })}
                  placeholder={cls?.examples || ""}
                />
              </Field>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {([
                ["hayFever", "Hay fever"],
                ["asthma", "Asthma"],
                ["hives", "Hives"],
                ["anaphylaxis", "Anaphylaxis"],
                ["otherChecked", "Other"],
              ] as const).map(([key, label]) => {
                const on = !!a[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => updAllergy(a.id, { [key]: !on })}
                    className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {a.otherChecked && (
              <div className="mt-3">
                <Field label="Please specify"><TextInput value={a.other ?? ""} onChange={(e) => updAllergy(a.id, { other: e.target.value })} /></Field>
              </div>
            )}
          </div>
          );
        })}
        <button onClick={addAllergy} className="w-full rounded-xl border border-dashed border-[var(--border)] py-3 text-sm inline-flex items-center justify-center gap-2">
          <Plus size={14} /> Add allergy
        </button>
      </Card>

      {/* Medical history */}
      <Card className="space-y-4 mb-4">
        <h2 className="font-semibold">Medical history</h2>
        <p className="text-xs text-[var(--ink-soft)]">Tick "Not applicable" to mark a category as considered and not an issue.</p>
        {HISTORY_CATEGORIES.map((cat) => {
          const rows = historyFor(cat.name);
          const na = historyNA(cat.name);
          return (
            <div key={cat.name} className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="flex-1">
                  <div className="text-sm font-medium">{cat.name}</div>
                  {cat.descriptor && <div className="text-xs text-[var(--ink-soft)]">{cat.descriptor}</div>}
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)] shrink-0">
                  <input type="checkbox" className="w-4 h-4" checked={na} onChange={() => toggleHistoryNA(cat.name)} />
                  Not applicable
                </label>
              </div>
              {!na && cat.name === "Vaccination History" && (
                <div className="space-y-2">
                  {VACCINES.map((vx) => {
                    const v = getVax(vx);
                    return (
                      <div key={vx} className="rounded-xl border border-[var(--border)] p-2.5">
                        <div className="text-sm font-medium mb-2">{vx}</div>
                        <div className="flex gap-2 mb-2">
                          {(["Yes","No","Not sure"] as const).map((opt) => {
                            const on = v.status === opt;
                            return (
                              <button key={opt} type="button"
                                onClick={() => updVax(vx, { status: on ? "" : opt })}
                                className={`flex-1 rounded-lg px-2 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                        <Field label="Date (if known)">
                          <TextInput type="date" value={v.date ?? ""} onChange={(e) => updVax(vx, { date: e.target.value })} />
                        </Field>
                      </div>
                    );
                  })}
                  {(p.otherVaccinations ?? []).map((v) => (
                    <div key={v.id} className="rounded-xl border border-[var(--border)] p-2.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Other</div>
                        <button onClick={() => delOtherVax(v.id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
                      </div>
                      <Field label="Please specify">
                        <TextInput value={v.name ?? ""} onChange={(e) => updOtherVax(v.id, { name: e.target.value })} />
                      </Field>
                      <div className="flex gap-2 my-2">
                        {(["Yes","No","Not sure"] as const).map((opt) => {
                          const on = v.status === opt;
                          return (
                            <button key={opt} type="button"
                              onClick={() => updOtherVax(v.id, { status: on ? "" : opt })}
                              className={`flex-1 rounded-lg px-2 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      <Field label="Date (if known)">
                        <TextInput type="date" value={v.date ?? ""} onChange={(e) => updOtherVax(v.id, { date: e.target.value })} />
                      </Field>
                    </div>
                  ))}
                  <button onClick={addOtherVax} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs inline-flex items-center justify-center gap-2">
                    <Plus size={12} /> Add other vaccine
                  </button>
                </div>
              )}
              {!na && cat.name !== "Vaccination History" && (
                <>
                  {rows.length === 0 && <p className="text-xs text-[var(--ink-soft)] mb-2">Not added yet.</p>}
                  {rows.map((r, idx) => (
                    <div key={r.id} className="rounded-xl border border-[var(--border)] p-3 mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs text-[var(--ink-soft)]">Entry {idx + 1}</div>
                        <button onClick={() => delHistory(r.id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
                      </div>
                      <Field label="Details"><TextArea value={r.details ?? ""} onChange={(e) => updHistory(r.id, { details: e.target.value })} /></Field>
                      <div className="mt-2">
                        <Field label="Date"><TextInput type="date" value={r.date ?? ""} onChange={(e) => updHistory(r.id, { date: e.target.value })} /></Field>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => addHistory(cat.name)} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs inline-flex items-center justify-center gap-2">
                    <Plus size={12} /> Add entry
                  </button>
                </>
              )}
            </div>
          );
        })}
      </Card>

      {/* Baseline */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Baseline</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (kg)"><TextInput type="number" step="0.1" value={p.baselineWeight ?? ""} onChange={upd("baselineWeight")} /></Field>
          <Field label="Height (cm)"><TextInput type="number" value={p.baselineHeight ?? ""} onChange={upd("baselineHeight")} /></Field>
          <Field label="Temp (°C)"><TextInput type="number" step="0.1" value={p.baselineTemp ?? ""} onChange={upd("baselineTemp")} /></Field>
          <Field label="BP"><TextInput value={p.baselineBP ?? ""} onChange={upd("baselineBP")} placeholder="120/80" /></Field>
          <Field label="Resting heart rate (bpm)"><TextInput type="number" value={p.baselineHR ?? ""} onChange={upd("baselineHR")} /></Field>
        </div>
        <Field label="Gender identity">
          <select value={p.genderIdentity ?? ""} onChange={upd("genderIdentity")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]">
            <option value="">Select…</option>
            {GENDER_IDENTITIES.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        {p.genderIdentity === "I use a different term" && (
          <Field label="Please specify"><TextInput value={p.genderIdentityOther ?? ""} onChange={upd("genderIdentityOther")} /></Field>
        )}
        <Field label="Sex assigned at birth">
          <select value={p.sexAtBirth ?? ""} onChange={upd("sexAtBirth")}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]">
            <option value="">Select…</option>
            {SEX_AT_BIRTH.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        {p.sexAtBirth === "Another term" && (
          <Field label="Please specify"><TextInput value={p.sexAtBirthOther ?? ""} onChange={upd("sexAtBirthOther")} /></Field>
        )}

        <div className="pt-2">
          <div className="text-sm font-medium mb-1">Main issues right now</div>
          <p className="text-xs text-[var(--ink-soft)] mb-3">Tick Yes / No / Not sure for each symptom.</p>
          <div className="space-y-4">
            {SYMPTOM_GROUPS.map((grp) => (
              <div key={grp.heading} className="rounded-xl border border-[var(--border)] p-3">
                <div className="text-sm font-semibold mb-2">{grp.heading}</div>
                <div className="space-y-2">
                  {grp.items.map((item) => {
                    const k = symptomKey(grp.heading, item);
                    const v = getSymptom(k);
                    return (
                      <div key={item}>
                        <div className="text-sm mb-1">{item}</div>
                        <div className="flex gap-2">
                          {(["Yes","No","Not sure"] as const).map((opt) => {
                            const on = v === opt;
                            return (
                              <button key={opt} type="button"
                                onClick={() => setSymptom(k, on ? "" : opt)}
                                className={`flex-1 rounded-lg px-2 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="text-sm font-semibold mb-2">Additional symptoms</div>
              {(p.additionalSymptoms ?? []).map((s) => (
                <div key={s.id} className="mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Field label="Describe"><TextInput value={s.text ?? ""} onChange={(e) => updAdditionalSymptom(s.id, { text: e.target.value })} /></Field>
                    </div>
                    <button onClick={() => delAdditionalSymptom(s.id)} aria-label="Remove" className="mt-5 text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {(["Yes","No","Not sure"] as const).map((opt) => {
                      const on = s.answer === opt;
                      return (
                        <button key={opt} type="button"
                          onClick={() => updAdditionalSymptom(s.id, { answer: on ? "" : opt })}
                          className={`flex-1 rounded-lg px-2 py-1.5 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button onClick={addAdditionalSymptom} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs inline-flex items-center justify-center gap-2">
                <Plus size={12} /> Add additional symptom
              </button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 mb-6">
        <h2 className="font-semibold">Anything else the team should know</h2>
        <div>
          <Field label="Specific treatment instructions">
            <TextArea rows={5} value={p.treatmentInstructions ?? ""} onChange={upd("treatmentInstructions")} placeholder="Clear instructions about which treatments you consent to or refuse — particularly life-sustaining measures like CPR, assisted ventilation, artificial hydration/nutrition." />
          </Field>
          <p className="text-xs text-[var(--ink-soft)] mt-1">Often recorded as an Advance Care Directive. Share this with your GP and care team.</p>
        </div>
        <div>
          <Field label="Values and preferences (Values Directive)">
            <TextArea rows={5} value={p.valuesDirective ?? ""} onChange={upd("valuesDirective")} placeholder="What is important to you — goals of care, religious / cultural beliefs, and what you consider an acceptable quality of life." />
          </Field>
        </div>
        <Field label="Other things"><TextArea value={p.notes ?? ""} onChange={upd("notes")} /></Field>
      </Card>

      {canWrite && (
        <>
          <Submit onClick={save} disabled={busy}>{busy ? "Saving…" : saved ? "Saved ✓" : "Save profile"}</Submit>
          <button onClick={() => router.push("/")} className="w-full mt-2 text-sm text-[var(--ink-soft)] py-2">Skip for now</button>
        </>
      )}
    </AppShell>
  );
}

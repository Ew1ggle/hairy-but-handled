"use client";
import AppShell from "@/components/AppShell";
import { Card, DateInput, Field, PageTitle, Submit, TextArea, TextInput } from "@/components/ui";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useUnsavedWarning } from "@/lib/useUnsavedWarning";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Plus, Trash2, Check, Send, Mail, ExternalLink } from "lucide-react";

type PractitionerStatus = "current" | "previous" | "";

type PractitionerProps = {
  label: string;
  name?: string; phone?: string; mobile?: string; clinic?: string; email?: string; website?: string; na?: boolean;
  status?: PractitionerStatus; since?: string; from?: string; to?: string;
  onName: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onPhone: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onMobile: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onClinic: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onEmail: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onWebsite: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onStatusChange: (next: PractitionerStatus) => void;
  onSince: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFrom: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onTo: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onToggleNA: () => void;
  // Optional: for user-added custom practitioners
  onLabelChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onDelete?: () => void;
};

function normalizeUrl(u?: string): string | undefined {
  if (!u) return undefined;
  const t = u.trim();
  if (!t) return undefined;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function Practitioner({ label, name, phone, mobile, clinic, email, website, na, status, since, from, to, onName, onPhone, onMobile, onClinic, onEmail, onWebsite, onStatusChange, onSince, onFrom, onTo, onToggleNA, onLabelChange, onDelete }: PractitionerProps) {
  const mailtoHref = email?.trim() ? `mailto:${email.trim()}` : undefined;
  const siteHref = normalizeUrl(website);
  return (
    <div className="border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        {onLabelChange ? (
          <div className="flex-1">
            <TextInput value={label} onChange={onLabelChange} placeholder="Role / specialty" />
          </div>
        ) : (
          <div className="text-sm font-medium">{label}</div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <label className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
            <input type="checkbox" className="w-4 h-4" checked={!!na} onChange={onToggleNA} />
            Not applicable
          </label>
          {onDelete && (
            <button onClick={onDelete} aria-label="Remove practitioner" className="text-[var(--ink-soft)] p-1"><Trash2 size={16} /></button>
          )}
        </div>
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
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 items-end">
            <Field label="Email">
              <TextInput type="email" value={email ?? ""} onChange={onEmail} placeholder="name@clinic.com" />
            </Field>
            <a
              href={mailtoHref}
              onClick={(e) => { if (!mailtoHref) e.preventDefault(); }}
              aria-disabled={!mailtoHref}
              className={`mb-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm inline-flex items-center gap-1 ${!mailtoHref ? "opacity-40 cursor-not-allowed" : ""}`}
              aria-label="Send email"
            >
              <Mail size={14} /> Email
            </a>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 items-end">
            <Field label="Website">
              <TextInput type="url" value={website ?? ""} onChange={onWebsite} placeholder="clinic.com" />
            </Field>
            <a
              href={siteHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (!siteHref) e.preventDefault(); }}
              aria-disabled={!siteHref}
              className={`mb-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm inline-flex items-center gap-1 ${!siteHref ? "opacity-40 cursor-not-allowed" : ""}`}
              aria-label="Open website"
            >
              <ExternalLink size={14} /> Open
            </a>
          </div>
          <div className="mt-3">
            <div className="text-sm font-medium mb-1.5">Treatment status</div>
            <div className="flex gap-2">
              {([
                ["current", "Currently treating"],
                ["previous", "Previous practitioner"],
              ] as const).map(([val, lab]) => {
                const on = status === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onStatusChange(on ? "" : val)}
                    className={`flex-1 rounded-lg px-2 py-2 text-xs border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}
                  >
                    {lab}
                  </button>
                );
              })}
            </div>
            {status === "current" && (
              <div className="mt-2">
                <Field label="Treating since">
                  <DateInput value={since ?? ""} onChange={onSince} />
                </Field>
              </div>
            )}
            {status === "previous" && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Field label="From"><DateInput value={from ?? ""} onChange={onFrom} /></Field>
                <Field label="To"><DateInput value={to ?? ""} onChange={onTo} /></Field>
              </div>
            )}
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

type CustomPractitioner = {
  id: string;
  label?: string;
  name?: string;
  phone?: string;
  mobile?: string;
  clinic?: string;
  email?: string;
  website?: string;
  na?: boolean;
  status?: PractitionerStatus;
  since?: string;
  from?: string;
  to?: string;
};

type Pathology = {
  // Specimen header
  requestedDate?: string;
  collectedDate?: string;
  reportedDate?: string;
  reportFor?: string;
  reportForOther?: string;
  copyTo?: string;
  // Procedure
  biopsyType?: string;
  biopsyPerformedAt?: string;
  biopsyPerformedBy?: string;
  biopsyDate?: string;
  // Clinical
  clinicalNotes?: string;
  // Lab parameters
  hb?: string;
  mcv?: string;
  platelets?: string;
  wcc?: string;
  retic?: string;
  otherInvestigations?: string;
  bloodFilm?: string;
  // Biopsy site / specimen quality
  biopsySite?: string;
  boneConsistency?: string;
  aspirateNotes?: string;
  // Differential
  diffNeutrophils?: string;
  diffLymphocytes?: string;
  diffMonocytes?: string;
  diffEosinophils?: string;
  diffMetamyelocytes?: string;
  diffProerythroblasts?: string;
  diffBasophilicErythroblasts?: string;
  diffPolychromaticErythroblasts?: string;
  diffOrthochromaticErythroblasts?: string;
  diffPlasmaCells?: string;
  diffBasophils?: string;
  meRatio?: string;
  smearComment?: string;
  // Histology
  specimenType?: string;
  specimenQuality?: string;
  cellularity?: string;
  megakaryocytes?: string;
  erythron?: string;
  leukon?: string;
  lymphoidPlasma?: string;
  otherInfiltrate?: string;
  bloodVessels?: string;
  reticulin?: string;
  boneTrabeculae?: string;
  specialStains?: string;
  salientFeatures?: string;
  conclusions?: string;
};

type SymptomAnswer = { id: string; key: string; answer?: "Yes" | "No" | "Not sure" | "" };
type AdditionalSymptom = { id: string; text?: string; answer?: "Yes" | "No" | "Not sure" | "" };
type AdditionalDiagnosis = { id: string; details?: string; date?: string };

type Profile = {
  // identity
  name?: string;
  preferredName?: string;
  dob?: string;
  bloodType?: string;
  medicareNumber?: string;
  medicarePosition?: string;
  medicareExpiry?: string; // DD/YY per user spec
  // private health
  privateFundName?: string;
  privateFundNumber?: string;
  privateFundPosition?: string;
  privateFundCoverage?: "Hospital only" | "Hospital + Extras" | "Extras Only" | "";
  // care team (per practitioner)
  hematologist?: string; hematologistPhone?: string; hematologistMobile?: string; hematologistClinic?: string; hematologistEmail?: string; hematologistWebsite?: string; hematologistNA?: boolean;
  hematologistStatus?: PractitionerStatus; hematologistSince?: string; hematologistFrom?: string; hematologistTo?: string;
  immunologist?: string; immunologistPhone?: string; immunologistMobile?: string; immunologistClinic?: string; immunologistEmail?: string; immunologistWebsite?: string; immunologistNA?: boolean;
  immunologistStatus?: PractitionerStatus; immunologistSince?: string; immunologistFrom?: string; immunologistTo?: string;
  psychologist?: string; psychologistPhone?: string; psychologistMobile?: string; psychologistClinic?: string; psychologistEmail?: string; psychologistWebsite?: string; psychologistNA?: boolean;
  psychologistStatus?: PractitionerStatus; psychologistSince?: string; psychologistFrom?: string; psychologistTo?: string;
  psychiatrist?: string; psychiatristPhone?: string; psychiatristMobile?: string; psychiatristClinic?: string; psychiatristEmail?: string; psychiatristWebsite?: string; psychiatristNA?: boolean;
  psychiatristStatus?: PractitionerStatus; psychiatristSince?: string; psychiatristFrom?: string; psychiatristTo?: string;
  gp?: string; gpPhone?: string; gpMobile?: string; gpClinic?: string; gpEmail?: string; gpWebsite?: string; gpNA?: boolean;
  gpStatus?: PractitionerStatus; gpSince?: string; gpFrom?: string; gpTo?: string;
  coordinator?: string; coordinatorPhone?: string; coordinatorMobile?: string; coordinatorClinic?: string; coordinatorEmail?: string; coordinatorWebsite?: string; coordinatorNA?: boolean;
  coordinatorStatus?: PractitionerStatus; coordinatorSince?: string; coordinatorFrom?: string; coordinatorTo?: string;
  customPractitioners?: CustomPractitioner[];
  hospital?: string;
  unit?: string;
  // support people (array)
  supportPeople?: SupportPerson[];
  // diagnosis
  diagnosis?: string;
  diagnosisOther?: string;
  diagnosisDate?: string;
  additionalDiagnoses?: AdditionalDiagnosis[];
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
  pronouns?: string;
  pronounsNeo?: string;
  pronounsNeoOther?: string;
  pronounsOther?: string;
  sexAtBirth?: string;
  sexAtBirthOther?: string;
  profileCompletedDate?: string;
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
  // Bone marrow pathology report (latest / reference)
  pathology?: Pathology;
};

const BLOOD_TYPES = [
  "A+", "A−",
  "B+", "B−",
  "AB+", "AB−",
  "O+", "O−",
  "Unknown",
];

const REGIMENS = [
  "Cladribine",
  "Cladribine + Rituximab",
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

const PRONOUN_OPTIONS = [
  "He / Him",
  "She / Her",
  "They / Them",
  "Neopronouns",
  "Prefer not to say",
  "Other",
];

const NEOPRONOUNS: { label: string; hint: string }[] = [
  { label: "Ze / Hir / Hirs", hint: "Pronounced zee / here / heres" },
  { label: "Ze / Zir / Zirs", hint: "Pronounced zee / zeer / zeers" },
  { label: "Xe / Xem / Xyr", hint: "Pronounced zee / zem / zeer" },
  { label: "Ey / Em / Eir", hint: "Pronounced ay / em / air" },
  { label: "Ve / Ver / Vis", hint: "Pronounced vee / veer / vees" },
  { label: "Per / Per / Pers", hint: "Short for \"person\"" },
  { label: "Other", hint: "" },
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
  const [dirty, setDirty] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved">("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useUnsavedWarning(dirty);

  useEffect(() => {
    if (!sb || !activePatientId) return;
    sb.from("patient_profiles").select("data").eq("patient_id", activePatientId).maybeSingle()
      .then(({ data }) => {
        if (data?.data) setP(data.data as Profile);
        setLoaded(true);
      });
  }, [sb, activePatientId]);

  const persist = useCallback(async (): Promise<boolean> => {
    if (!sb || !activePatientId) return false;
    const dataToSave = { ...p, profileCompletedDate: p.profileCompletedDate || new Date().toISOString().split("T")[0] };
    const { error } = await sb.from("patient_profiles")
      .upsert({ patient_id: activePatientId, data: dataToSave, updated_at: new Date().toISOString() });
    return !error;
  }, [sb, activePatientId, p]);

  // Debounced autosave
  useEffect(() => {
    if (!dirty || !loaded) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      const ok = await persist();
      if (ok) {
        setDirty(false);
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus(""), 2000);
      } else {
        setAutoSaveStatus("");
      }
    }, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [dirty, loaded, persist]);

  const save = async () => {
    if (!sb || !activePatientId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setBusy(true); setSaved(false);
    const ok = await persist();
    setBusy(false);
    if (ok) { setDirty(false); setSaved(true); setTimeout(() => router.push("/"), 700); }
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

  // Custom practitioners
  const addCustomPractitioner = () =>
    setP({ ...p, customPractitioners: [...(p.customPractitioners ?? []), { id: uid() }] });
  const updCustomPractitioner = (id: string, patch: Partial<CustomPractitioner>) =>
    setP({ ...p, customPractitioners: (p.customPractitioners ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const delCustomPractitioner = (id: string) =>
    setP({ ...p, customPractitioners: (p.customPractitioners ?? []).filter((c) => c.id !== id) });

  // Pathology field helper
  const updPath = <K extends keyof Pathology>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setP({ ...p, pathology: { ...(p.pathology ?? {}), [k]: e.target.value } });

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

  // Additional diagnoses
  const addAdditionalDiagnosis = () =>
    setP({ ...p, additionalDiagnoses: [...(p.additionalDiagnoses ?? []), { id: uid() }] });
  const updAdditionalDiagnosis = (id: string, patch: Partial<AdditionalDiagnosis>) =>
    setP({ ...p, additionalDiagnoses: (p.additionalDiagnoses ?? []).map((d) => d.id === id ? { ...d, ...patch } : d) });
  const delAdditionalDiagnosis = (id: string) =>
    setP({ ...p, additionalDiagnoses: (p.additionalDiagnoses ?? []).filter((d) => d.id !== id) });

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
      {autoSaveStatus && (
        <div className="fixed top-14 right-4 z-50 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--ink-soft)] shadow-lg brand-font">
          {autoSaveStatus === "saving" ? "Saving..." : "Saved"}
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        data-dirty={dirty ? "true" : "false"}
        onChange={() => { if (!dirty) setDirty(true); }}
        onClick={() => { if (!dirty) setDirty(true); }}
      >
      <PageTitle sub="Fill in what you know. You can come back and add more later.">
        Patient profile
      </PageTitle>

      {/* Identity */}
      <Card className="space-y-3 mb-4">
        <h2 className="font-semibold">Identity</h2>
        <Field label="Legal name"><TextInput value={p.name ?? ""} onChange={upd("name")} /></Field>
        <Field label="Preferred name" hint="what the app calls them (shown in 'Recording for…'). Falls back to legal name if empty.">
          <TextInput value={p.preferredName ?? ""} onChange={upd("preferredName")} placeholder="e.g. first name or nickname" />
        </Field>
        <Field label="Date of birth"><DateInput value={p.dob ?? ""} onChange={upd("dob")} /></Field>
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
        <Field label="Medicare expiry">
          <TextInput
            value={p.medicareExpiry ?? ""}
            onChange={upd("medicareExpiry")}
            placeholder="DD/YY"
            inputMode="numeric"
            maxLength={5}
          />
        </Field>
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
        <Practitioner label="Hematologist" name={p.hematologist} phone={p.hematologistPhone} mobile={p.hematologistMobile} clinic={p.hematologistClinic} email={p.hematologistEmail} website={p.hematologistWebsite} na={p.hematologistNA}
          status={p.hematologistStatus} since={p.hematologistSince} from={p.hematologistFrom} to={p.hematologistTo}
          onName={upd("hematologist")} onPhone={upd("hematologistPhone")} onMobile={upd("hematologistMobile")} onClinic={upd("hematologistClinic")}
          onEmail={upd("hematologistEmail")} onWebsite={upd("hematologistWebsite")}
          onStatusChange={(s) => setP({ ...p, hematologistStatus: s })}
          onSince={upd("hematologistSince")} onFrom={upd("hematologistFrom")} onTo={upd("hematologistTo")}
          onToggleNA={() => setP({ ...p, hematologistNA: !p.hematologistNA })} />
        <Practitioner label="Immunologist" name={p.immunologist} phone={p.immunologistPhone} mobile={p.immunologistMobile} clinic={p.immunologistClinic} email={p.immunologistEmail} website={p.immunologistWebsite} na={p.immunologistNA}
          status={p.immunologistStatus} since={p.immunologistSince} from={p.immunologistFrom} to={p.immunologistTo}
          onName={upd("immunologist")} onPhone={upd("immunologistPhone")} onMobile={upd("immunologistMobile")} onClinic={upd("immunologistClinic")}
          onEmail={upd("immunologistEmail")} onWebsite={upd("immunologistWebsite")}
          onStatusChange={(s) => setP({ ...p, immunologistStatus: s })}
          onSince={upd("immunologistSince")} onFrom={upd("immunologistFrom")} onTo={upd("immunologistTo")}
          onToggleNA={() => setP({ ...p, immunologistNA: !p.immunologistNA })} />
        <Practitioner label="Psychologist" name={p.psychologist} phone={p.psychologistPhone} mobile={p.psychologistMobile} clinic={p.psychologistClinic} email={p.psychologistEmail} website={p.psychologistWebsite} na={p.psychologistNA}
          status={p.psychologistStatus} since={p.psychologistSince} from={p.psychologistFrom} to={p.psychologistTo}
          onName={upd("psychologist")} onPhone={upd("psychologistPhone")} onMobile={upd("psychologistMobile")} onClinic={upd("psychologistClinic")}
          onEmail={upd("psychologistEmail")} onWebsite={upd("psychologistWebsite")}
          onStatusChange={(s) => setP({ ...p, psychologistStatus: s })}
          onSince={upd("psychologistSince")} onFrom={upd("psychologistFrom")} onTo={upd("psychologistTo")}
          onToggleNA={() => setP({ ...p, psychologistNA: !p.psychologistNA })} />
        <Practitioner label="Psychiatrist" name={p.psychiatrist} phone={p.psychiatristPhone} mobile={p.psychiatristMobile} clinic={p.psychiatristClinic} email={p.psychiatristEmail} website={p.psychiatristWebsite} na={p.psychiatristNA}
          status={p.psychiatristStatus} since={p.psychiatristSince} from={p.psychiatristFrom} to={p.psychiatristTo}
          onName={upd("psychiatrist")} onPhone={upd("psychiatristPhone")} onMobile={upd("psychiatristMobile")} onClinic={upd("psychiatristClinic")}
          onEmail={upd("psychiatristEmail")} onWebsite={upd("psychiatristWebsite")}
          onStatusChange={(s) => setP({ ...p, psychiatristStatus: s })}
          onSince={upd("psychiatristSince")} onFrom={upd("psychiatristFrom")} onTo={upd("psychiatristTo")}
          onToggleNA={() => setP({ ...p, psychiatristNA: !p.psychiatristNA })} />
        <Practitioner label="GP" name={p.gp} phone={p.gpPhone} mobile={p.gpMobile} clinic={p.gpClinic} email={p.gpEmail} website={p.gpWebsite} na={p.gpNA}
          status={p.gpStatus} since={p.gpSince} from={p.gpFrom} to={p.gpTo}
          onName={upd("gp")} onPhone={upd("gpPhone")} onMobile={upd("gpMobile")} onClinic={upd("gpClinic")}
          onEmail={upd("gpEmail")} onWebsite={upd("gpWebsite")}
          onStatusChange={(s) => setP({ ...p, gpStatus: s })}
          onSince={upd("gpSince")} onFrom={upd("gpFrom")} onTo={upd("gpTo")}
          onToggleNA={() => setP({ ...p, gpNA: !p.gpNA })} />
        <Practitioner label="Cancer care coordinator" name={p.coordinator} phone={p.coordinatorPhone} mobile={p.coordinatorMobile} clinic={p.coordinatorClinic} email={p.coordinatorEmail} website={p.coordinatorWebsite} na={p.coordinatorNA}
          status={p.coordinatorStatus} since={p.coordinatorSince} from={p.coordinatorFrom} to={p.coordinatorTo}
          onName={upd("coordinator")} onPhone={upd("coordinatorPhone")} onMobile={upd("coordinatorMobile")} onClinic={upd("coordinatorClinic")}
          onEmail={upd("coordinatorEmail")} onWebsite={upd("coordinatorWebsite")}
          onStatusChange={(s) => setP({ ...p, coordinatorStatus: s })}
          onSince={upd("coordinatorSince")} onFrom={upd("coordinatorFrom")} onTo={upd("coordinatorTo")}
          onToggleNA={() => setP({ ...p, coordinatorNA: !p.coordinatorNA })} />
        {(p.customPractitioners ?? []).map((c) => (
          <Practitioner
            key={c.id}
            label={c.label ?? ""}
            name={c.name} phone={c.phone} mobile={c.mobile} clinic={c.clinic} email={c.email} website={c.website} na={c.na}
            status={c.status} since={c.since} from={c.from} to={c.to}
            onName={(e) => updCustomPractitioner(c.id, { name: e.target.value })}
            onPhone={(e) => updCustomPractitioner(c.id, { phone: e.target.value })}
            onMobile={(e) => updCustomPractitioner(c.id, { mobile: e.target.value })}
            onClinic={(e) => updCustomPractitioner(c.id, { clinic: e.target.value })}
            onEmail={(e) => updCustomPractitioner(c.id, { email: e.target.value })}
            onWebsite={(e) => updCustomPractitioner(c.id, { website: e.target.value })}
            onStatusChange={(s) => updCustomPractitioner(c.id, { status: s })}
            onSince={(e) => updCustomPractitioner(c.id, { since: e.target.value })}
            onFrom={(e) => updCustomPractitioner(c.id, { from: e.target.value })}
            onTo={(e) => updCustomPractitioner(c.id, { to: e.target.value })}
            onLabelChange={(e) => updCustomPractitioner(c.id, { label: e.target.value })}
            onToggleNA={() => updCustomPractitioner(c.id, { na: !c.na })}
            onDelete={() => delCustomPractitioner(c.id)}
          />
        ))}
        <button onClick={addCustomPractitioner} className="w-full rounded-xl border border-dashed border-[var(--border)] py-3 text-sm inline-flex items-center justify-center gap-2">
          <Plus size={14} /> Add practitioner
        </button>
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
          <Field label="Date confirmed"><DateInput value={p.diagnosisDate ?? ""} onChange={upd("diagnosisDate")} /></Field>
          <Field label="BRAF V600E result"><TextInput value={p.brafResult ?? ""} onChange={upd("brafResult")} /></Field>
        </div>

        <div className="rounded-xl border border-[var(--border)] p-3">
          <div className="text-sm font-semibold mb-1">Other diagnoses</div>
          <p className="text-xs text-[var(--ink-soft)] mb-2">
            Add any other conditions — e.g. secondary cancer, lymphoma, diabetes, thyroid, heart, mental health, etc.
          </p>
          {(p.additionalDiagnoses ?? []).map((d, idx) => (
            <div key={d.id} className="rounded-xl border border-[var(--border)] p-3 mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-[var(--ink-soft)]">Diagnosis {idx + 1}</div>
                <button onClick={() => delAdditionalDiagnosis(d.id)} aria-label="Remove" className="text-[var(--ink-soft)] p-1"><Trash2 size={14} /></button>
              </div>
              <Field label="Details">
                <TextArea
                  value={d.details ?? ""}
                  onChange={(e) => updAdditionalDiagnosis(d.id, { details: e.target.value })}
                  placeholder="Name of condition and any relevant notes"
                />
              </Field>
              <div className="mt-2">
                <Field label="Date (if known)">
                  <DateInput value={d.date ?? ""} onChange={(e) => updAdditionalDiagnosis(d.id, { date: e.target.value })} />
                </Field>
              </div>
            </div>
          ))}
          <button onClick={addAdditionalDiagnosis} className="w-full rounded-xl border border-dashed border-[var(--border)] py-2 text-xs inline-flex items-center justify-center gap-2">
            <Plus size={12} /> Add diagnosis
          </button>
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

      {/* Bone marrow pathology */}
      <Card className="space-y-4 mb-4">
        <h2 className="font-semibold">Bone marrow pathology</h2>
        <p className="text-xs text-[var(--ink-soft)]">Capture the most recent bone marrow biopsy report. Leave blank if not yet done.</p>

        {/* Specimen header */}
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
          <div className="text-sm font-semibold">Specimen</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Requested"><DateInput value={p.pathology?.requestedDate ?? ""} onChange={updPath("requestedDate")} /></Field>
            <Field label="Collected"><DateInput value={p.pathology?.collectedDate ?? ""} onChange={updPath("collectedDate")} /></Field>
            <Field label="Reported"><DateInput value={p.pathology?.reportedDate ?? ""} onChange={updPath("reportedDate")} /></Field>
          </div>
          {(() => {
            const options: { name: string; role: string }[] = [];
            const push = (name: string | undefined, na: boolean | undefined, role: string) => {
              if (!na && name?.trim()) options.push({ name: name.trim(), role });
            };
            push(p.hematologist, p.hematologistNA, "Hematologist");
            push(p.immunologist, p.immunologistNA, "Immunologist");
            push(p.psychologist, p.psychologistNA, "Psychologist");
            push(p.psychiatrist, p.psychiatristNA, "Psychiatrist");
            push(p.gp, p.gpNA, "GP");
            push(p.coordinator, p.coordinatorNA, "Cancer care coordinator");
            for (const c of p.customPractitioners ?? []) {
              if (!c.na && c.name?.trim()) options.push({ name: c.name.trim(), role: c.label?.trim() || "Practitioner" });
            }
            const current = p.pathology?.reportFor ?? "";
            const isOther = current === "__other__" || (!!current && !options.some((o) => o.name === current));
            const selectValue = isOther ? "__other__" : current;
            return (
              <Field label="Report for / referring doctor">
                <select
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setP({
                      ...p,
                      pathology: {
                        ...(p.pathology ?? {}),
                        reportFor: v,
                        // If switching away from Other, clear the free-text
                        ...(v === "__other__" ? {} : { reportForOther: "" }),
                      },
                    });
                  }}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
                >
                  <option value="">Select…</option>
                  {options.map((o) => (
                    <option key={o.name} value={o.name}>{o.name} — {o.role}</option>
                  ))}
                  <option value="__other__">Other / someone not in the care team</option>
                </select>
                {isOther && (
                  <div className="mt-2">
                    <TextInput
                      value={p.pathology?.reportForOther ?? (current && current !== "__other__" ? current : "")}
                      onChange={updPath("reportForOther")}
                      placeholder="Referring doctor name"
                    />
                  </div>
                )}
              </Field>
            );
          })()}
          <Field label="Copy to"><TextInput value={p.pathology?.copyTo ?? ""} onChange={updPath("copyTo")} placeholder="Other doctors / services CC'd" /></Field>
        </div>

        {/* Procedure */}
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
          <div className="text-sm font-semibold">Bone marrow biopsy</div>
          <Field label="Biopsy type"><TextInput value={p.pathology?.biopsyType ?? ""} onChange={updPath("biopsyType")} placeholder="e.g. Jamshidi" /></Field>
          <Field label="Performed at"><TextInput value={p.pathology?.biopsyPerformedAt ?? ""} onChange={updPath("biopsyPerformedAt")} placeholder="Hospital / clinic" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Performed by"><TextInput value={p.pathology?.biopsyPerformedBy ?? ""} onChange={updPath("biopsyPerformedBy")} placeholder="Dr ..." /></Field>
            <Field label="Date"><DateInput value={p.pathology?.biopsyDate ?? ""} onChange={updPath("biopsyDate")} /></Field>
          </div>
        </div>

        {/* Clinical notes */}
        <Field label="Clinical notes / history">
          <TextArea rows={3} value={p.pathology?.clinicalNotes ?? ""} onChange={updPath("clinicalNotes")} placeholder="Background given to the pathologist" />
        </Field>

        {/* Lab parameters */}
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
          <div className="text-sm font-semibold">Laboratory parameters</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hb (g/L)"><TextInput inputMode="decimal" value={p.pathology?.hb ?? ""} onChange={updPath("hb")} /></Field>
            <Field label="MCV (fL)"><TextInput inputMode="decimal" value={p.pathology?.mcv ?? ""} onChange={updPath("mcv")} /></Field>
            <Field label="Platelets (×10⁹/L)"><TextInput inputMode="decimal" value={p.pathology?.platelets ?? ""} onChange={updPath("platelets")} /></Field>
            <Field label="WCC (×10⁹/L)"><TextInput inputMode="decimal" value={p.pathology?.wcc ?? ""} onChange={updPath("wcc")} /></Field>
            <Field label="Retic (%)"><TextInput inputMode="decimal" value={p.pathology?.retic ?? ""} onChange={updPath("retic")} /></Field>
          </div>
        </div>

        {/* Other investigations + blood film */}
        <Field label="Other investigations">
          <TextArea rows={3} value={p.pathology?.otherInvestigations ?? ""} onChange={updPath("otherInvestigations")} placeholder="e.g. SNP, SPEP, flow cytometry findings" />
        </Field>
        <Field label="Blood film">
          <TextArea rows={3} value={p.pathology?.bloodFilm ?? ""} onChange={updPath("bloodFilm")} placeholder="Microscope appearance" />
        </Field>

        {/* Biopsy site / specimen quality */}
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
          <div className="text-sm font-semibold">Biopsy site / specimen quality</div>
          <Field label="Site"><TextInput value={p.pathology?.biopsySite ?? ""} onChange={updPath("biopsySite")} placeholder="e.g. Right Posterior Superior Iliac Spine" /></Field>
          <Field label="Consistency of bone"><TextInput value={p.pathology?.boneConsistency ?? ""} onChange={updPath("boneConsistency")} placeholder="e.g. Firm" /></Field>
          <Field label="Aspirate / specimen notes">
            <TextArea rows={2} value={p.pathology?.aspirateNotes ?? ""} onChange={updPath("aspirateNotes")} />
          </Field>
        </div>

        {/* Bone marrow differential */}
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
          <div className="text-sm font-semibold">Bone marrow differential (%)</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Neutrophils"><TextInput inputMode="decimal" value={p.pathology?.diffNeutrophils ?? ""} onChange={updPath("diffNeutrophils")} /></Field>
            <Field label="Lymphocytes"><TextInput inputMode="decimal" value={p.pathology?.diffLymphocytes ?? ""} onChange={updPath("diffLymphocytes")} /></Field>
            <Field label="Monocytes"><TextInput inputMode="decimal" value={p.pathology?.diffMonocytes ?? ""} onChange={updPath("diffMonocytes")} /></Field>
            <Field label="Eosinophils"><TextInput inputMode="decimal" value={p.pathology?.diffEosinophils ?? ""} onChange={updPath("diffEosinophils")} /></Field>
            <Field label="Metamyelocytes"><TextInput inputMode="decimal" value={p.pathology?.diffMetamyelocytes ?? ""} onChange={updPath("diffMetamyelocytes")} /></Field>
            <Field label="Proerythroblasts"><TextInput inputMode="decimal" value={p.pathology?.diffProerythroblasts ?? ""} onChange={updPath("diffProerythroblasts")} /></Field>
            <Field label="Basophilic erythroblasts"><TextInput inputMode="decimal" value={p.pathology?.diffBasophilicErythroblasts ?? ""} onChange={updPath("diffBasophilicErythroblasts")} /></Field>
            <Field label="Polychromatic erythroblasts"><TextInput inputMode="decimal" value={p.pathology?.diffPolychromaticErythroblasts ?? ""} onChange={updPath("diffPolychromaticErythroblasts")} /></Field>
            <Field label="Orthochromatic erythroblasts"><TextInput inputMode="decimal" value={p.pathology?.diffOrthochromaticErythroblasts ?? ""} onChange={updPath("diffOrthochromaticErythroblasts")} /></Field>
            <Field label="Plasma cells"><TextInput inputMode="decimal" value={p.pathology?.diffPlasmaCells ?? ""} onChange={updPath("diffPlasmaCells")} /></Field>
            <Field label="Basophils"><TextInput inputMode="decimal" value={p.pathology?.diffBasophils ?? ""} onChange={updPath("diffBasophils")} /></Field>
            <Field label="Myeloid:Erythroid ratio"><TextInput value={p.pathology?.meRatio ?? ""} onChange={updPath("meRatio")} placeholder="e.g. 1.4:1" /></Field>
          </div>
        </div>

        <Field label="Bone marrow smear comment">
          <TextArea rows={3} value={p.pathology?.smearComment ?? ""} onChange={updPath("smearComment")} />
        </Field>

        {/* Histology */}
        <div className="rounded-xl border border-[var(--border)] p-3 space-y-3">
          <div className="text-sm font-semibold">Bone marrow histology</div>
          <Field label="Type of specimen"><TextInput value={p.pathology?.specimenType ?? ""} onChange={updPath("specimenType")} placeholder="e.g. Aspirate clot and Trephine" /></Field>
          <Field label="Specimen quality"><TextInput value={p.pathology?.specimenQuality ?? ""} onChange={updPath("specimenQuality")} placeholder="e.g. 11 mm trephine length" /></Field>
          <Field label="Cellularity / architecture"><TextArea rows={2} value={p.pathology?.cellularity ?? ""} onChange={updPath("cellularity")} /></Field>
          <Field label="Megakaryocytes"><TextArea rows={2} value={p.pathology?.megakaryocytes ?? ""} onChange={updPath("megakaryocytes")} /></Field>
          <Field label="Erythron"><TextArea rows={2} value={p.pathology?.erythron ?? ""} onChange={updPath("erythron")} /></Field>
          <Field label="Leukon"><TextArea rows={2} value={p.pathology?.leukon ?? ""} onChange={updPath("leukon")} /></Field>
          <Field label="Lymphoid / plasma cells"><TextArea rows={3} value={p.pathology?.lymphoidPlasma ?? ""} onChange={updPath("lymphoidPlasma")} /></Field>
          <Field label="Other infiltrate / granuloma"><TextArea rows={2} value={p.pathology?.otherInfiltrate ?? ""} onChange={updPath("otherInfiltrate")} /></Field>
          <Field label="Blood vessels"><TextInput value={p.pathology?.bloodVessels ?? ""} onChange={updPath("bloodVessels")} /></Field>
          <Field label="Reticulin"><TextInput value={p.pathology?.reticulin ?? ""} onChange={updPath("reticulin")} placeholder="e.g. MF grade 1" /></Field>
          <Field label="Bone trabeculae"><TextInput value={p.pathology?.boneTrabeculae ?? ""} onChange={updPath("boneTrabeculae")} /></Field>
          <Field label="Special stains"><TextArea rows={2} value={p.pathology?.specialStains ?? ""} onChange={updPath("specialStains")} placeholder="e.g. CD3, CD5, CD10, CD20, PAX-5, Annexin, DBA44, Cyclin D1" /></Field>
        </div>

        <Field label="Salient features"><TextArea rows={3} value={p.pathology?.salientFeatures ?? ""} onChange={updPath("salientFeatures")} /></Field>
        <Field label="Conclusions"><TextArea rows={4} value={p.pathology?.conclusions ?? ""} onChange={updPath("conclusions")} /></Field>
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
        <Field label="Start date"><DateInput value={p.startDate ?? ""} onChange={upd("startDate")} /></Field>
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
                          <DateInput value={v.date ?? ""} onChange={(e) => updVax(vx, { date: e.target.value })} />
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
                        <DateInput value={v.date ?? ""} onChange={(e) => updOtherVax(v.id, { date: e.target.value })} />
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
                        <Field label="Date"><DateInput value={r.date ?? ""} onChange={(e) => updHistory(r.id, { date: e.target.value })} /></Field>
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
          <Field label="Blood type">
            <select
              value={p.bloodType ?? ""}
              onChange={upd("bloodType")}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-[16px]"
            >
              <option value="">Select…</option>
              {BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </Field>
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
        <div>
          <div className="text-sm font-medium mb-1.5">Pronouns</div>
          <div className="flex flex-wrap gap-2">
            {PRONOUN_OPTIONS.map((opt) => {
              const on = p.pronouns === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setP({
                    ...p,
                    pronouns: on ? "" : opt,
                    ...(on || opt !== "Neopronouns" ? { pronounsNeo: "", pronounsNeoOther: "" } : {}),
                    ...(on || opt !== "Other" ? { pronounsOther: "" } : {}),
                  })}
                  className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {p.pronouns === "Other" && (
            <div className="mt-3">
              <Field label="Please specify pronouns"><TextInput value={p.pronounsOther ?? ""} onChange={upd("pronounsOther")} placeholder="e.g. Fae / Faer / Faers" /></Field>
            </div>
          )}
          {p.pronouns === "Neopronouns" && (
            <div className="mt-3 rounded-xl border border-[var(--border)] p-3">
              <div className="text-sm font-semibold mb-2">Which neopronouns?</div>
              <div className="space-y-1.5">
                {NEOPRONOUNS.map((np) => {
                  const on = p.pronounsNeo === np.label;
                  return (
                    <button
                      key={np.label}
                      type="button"
                      onClick={() => setP({
                        ...p,
                        pronounsNeo: on ? "" : np.label,
                        ...(on || np.label !== "Other" ? { pronounsNeoOther: "" } : {}),
                      })}
                      className={`w-full text-left rounded-lg px-3 py-2 border ${on ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}
                    >
                      <div className="text-sm font-medium">{np.label}</div>
                      {np.hint && <div className={`text-xs ${on ? "opacity-90" : "text-[var(--ink-soft)]"}`}>{np.hint}</div>}
                    </button>
                  );
                })}
              </div>
              {p.pronounsNeo === "Other" && (
                <div className="mt-3">
                  <Field label="Please specify"><TextInput value={p.pronounsNeoOther ?? ""} onChange={upd("pronounsNeoOther")} /></Field>
                </div>
              )}
            </div>
          )}
        </div>
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
          <div className="text-sm font-medium mb-1">Main issues at the time of completing the profile</div>
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

      </div>
      {canWrite && (
        <>
          <Submit onClick={save} disabled={busy}>{busy ? "Saving…" : saved ? "Saved ✓" : "Save profile"}</Submit>
          <button onClick={() => router.push("/")} className="w-full mt-2 text-sm text-[var(--ink-soft)] py-2">Skip for now</button>
        </>
      )}
    </AppShell>
  );
}

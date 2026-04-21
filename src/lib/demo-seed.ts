/**
 * Seed data for demo mode. No real patient data — all fake.
 * Used when localStorage flag `hbh_demo` is set.
 */
import type { AnyEntry } from "./store";
import { INVENTORY_SEED } from "./home-ops-data";

export const DEMO_USER_ID = "demo-user";
export const DEMO_PATIENT_ID = "demo-patient";

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: "demo@hairybuthandled.app",
};

export const DEMO_MEMBERSHIP = {
  patient_id: DEMO_PATIENT_ID,
  user_id: DEMO_USER_ID,
  role: "patient" as const,
};

const now = () => new Date();
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

let idCounter = 0;
const id = () => `demo-${++idCounter}`;

export function buildDemoEntries(): AnyEntry[] {
  idCounter = 0;
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 6);

  const entries: AnyEntry[] = [
    // Today's daily log — partially filled
    {
      id: id(),
      createdAt: hoursAgo(2),
      kind: "daily",
      temperatureC: 36.8,
      fatigue: 6,
      pain: 2,
      nausea: 3,
      appetite: 5,
      breathlessness: 1,
      mood: 5,
      sleepHours: 6.5,
      brainFog: 4,
      tags: ["Medication: Ondansetron"],
      notes: "Woken by nausea around 3am. Took ondansetron, settled by 4.",
      manuallyLogged: true,
    },
    // Yesterday's daily log
    {
      id: id(),
      createdAt: daysAgo(1),
      kind: "daily",
      temperatureC: 37.2,
      fatigue: 7,
      pain: 3,
      nausea: 4,
      appetite: 3,
      breathlessness: 2,
      mood: 4,
      sleepHours: 5,
      brainFog: 6,
      notes: "Low energy day. Rested most of the afternoon.",
      manuallyLogged: true,
    },
    // 3 days ago — post-infusion
    {
      id: id(),
      createdAt: daysAgo(3),
      kind: "daily",
      temperatureC: 37.5,
      fatigue: 8,
      pain: 4,
      nausea: 6,
      appetite: 2,
      mood: 3,
      sleepHours: 4,
      notes: "Day after infusion. Tough night.",
      manuallyLogged: true,
    },

    // Infusion — completed
    {
      id: id(),
      createdAt: daysAgo(4),
      kind: "infusion",
      cycleDay: 3,
      drugs: "Cladribine + Rituximab",
      plannedTime: "09:00",
      actualStart: "09:18",
      actualEnd: "14:42",
      completed: true,
      reaction: false,
      meds: "Paracetamol 1g, Phenergan 25mg, Dexamethasone 8mg IV",
      outcome: "Completed without reaction. BP stable, obs fine.",
      notes: "Cycle 1 Day 3.",
    },
    // Upcoming infusion
    {
      id: id(),
      createdAt: daysAgo(4),
      kind: "infusion",
      cycleDay: 10,
      drugs: "Rituximab",
      plannedTime: "09:00",
      completed: false,
    },

    // Blood results — most recent
    {
      id: id(),
      createdAt: daysAgo(1),
      kind: "bloods",
      takenAt: fmt(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      hb: 108,
      wcc: 2.1,
      neutrophils: 0.9,
      lymphocytes: 0.4,
      monocytes: 0.2,
      platelets: 118,
      creatinine: 68,
      crp: 8,
      notes: "Post-infusion counts — neutrophils dropping as expected.",
    },
    // Older bloods
    {
      id: id(),
      createdAt: daysAgo(8),
      kind: "bloods",
      takenAt: fmt(new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)),
      hb: 118,
      wcc: 3.8,
      neutrophils: 1.9,
      lymphocytes: 0.7,
      platelets: 142,
      creatinine: 72,
      crp: 4,
    },

    // Meds — active
    {
      id: id(),
      createdAt: daysAgo(10),
      kind: "med",
      name: "Valaciclovir",
      dose: "500 mg",
      reason: "Antiviral prophylaxis",
    },
    {
      id: id(),
      createdAt: daysAgo(10),
      kind: "med",
      name: "Bactrim",
      dose: "",
      reason: "PCP prophylaxis",
    },
    {
      id: id(),
      createdAt: hoursAgo(3),
      kind: "med",
      name: "Ondansetron",
      dose: "8 mg",
      reason: "Nausea",
      timeTaken: "3:15 am",
      helped: true,
    },

    // Questions
    {
      id: id(),
      createdAt: daysAgo(2),
      kind: "question",
      question: "When should we expect neutrophils to bottom out? What number triggers a call?",
      askedAt: fmt(today),
    },
    {
      id: id(),
      createdAt: daysAgo(5),
      kind: "question",
      question: "Is the mild rash on my chest the rituximab reaction or something else?",
      askedAt: fmt(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
      answer: "Likely mild drug-related skin effect. If it spreads or becomes painful, call.",
    },

    // Amber flag
    {
      id: id(),
      createdAt: hoursAgo(18),
      kind: "flag",
      triggerLabel: "Amber: Nausea not controlled by usual meds",
      whatHappened: "Woke at 3am nauseous, ondansetron took an hour to settle it.",
      whoCalled: "",
      adviceGiven: "",
    },

    // Appointments
    {
      id: id(),
      createdAt: daysAgo(14),
      kind: "appointment",
      date: fmt(tomorrow),
      time: "10:30",
      provider: "Dr Chen",
      type: "Haematology review",
      location: "Day Oncology, Level 3",
      notes: "Bring blood result printout.",
    },
    {
      id: id(),
      createdAt: daysAgo(14),
      kind: "appointment",
      date: fmt(nextWeek),
      time: "09:00",
      provider: "Infusion suite",
      type: "Rituximab infusion",
      location: "Day Oncology",
    },

    // One admission
    {
      id: id(),
      createdAt: daysAgo(30),
      kind: "admission",
      admissionDate: fmt(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      hospital: "RPA Emergency",
      reason: "ED presentation: Active Fever",
      dischargeDate: fmt(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)),
      dischargeDetails: "Neutropenic fever. 48h IV antibiotics, no source identified. Discharged home on oral antibiotics.",
      treatments: [
        { id: id(), treatment: "Blood Cultures", details: "Negative at 48h" },
        { id: id(), treatment: "Antibiotics (IV)", details: "Piperacillin-tazobactam" },
        { id: id(), treatment: "Complete Blood Count", details: "Neut 0.3, admitted" },
      ],
      notes: "Fever 38.4°C at home, presented immediately.",
    },
  ];

  // Inventory — use the same seed as home-ops with a few marked low-stock
  const inventoryEntries: AnyEntry[] = INVENTORY_SEED.slice(0, 24).map((item, idx) => ({
    id: id(),
    createdAt: daysAgo(7),
    kind: "inventory",
    name: item.name,
    zone: item.zone,
    category: item.category,
    // Force a handful below threshold so the low-stock banner shows
    quantity: idx % 7 === 0 ? Math.max(0, item.threshold - 1) : item.quantity,
    threshold: item.threshold,
    unit: item.unit,
    store: item.store,
  }));

  return [...entries, ...inventoryEntries];
}

export const DEMO_PATIENT_PROFILE = {
  name: "Sam Demo",
  dob: "1978-06-14",
  address: "1 Sample St, Sydney NSW",
  medicare: "0000 00000 0",
  diagnosis: "Hairy Cell Leukaemia",
  diagnosisDate: "2026-01-12",
  regimen: "Cladribine + Rituximab",
  brafResult: "BRAF V600E positive",
  allergies: [{ id: "a1", name: "Penicillin", reaction: "Rash" }],
  tonePreference: "both" as const,
  hematologist: "Dr Chen",
  hematologistPhone: "02 9000 0000",
};

export type TreatmentDay = {
  day: number;
  drugs: string;
  dose?: string;
  route?: string;
  duration?: string;
  premeds?: string[];
  notes?: string;
};

export type TreatmentProtocol = {
  id: string;
  name: string;
  cycleLengthDays: number;
  cycles: number;
  source?: string;
  prophylaxis?: string[];
  monitoring?: string[];
  days: TreatmentDay[];
};

export const PROTOCOLS: Record<string, TreatmentProtocol> = {
  "Cladribine": {
    id: "cladribine",
    name: "Cladribine",
    cycleLengthDays: 5,
    cycles: 1,
    source: "eviQ Protocol 364 — Hairy Cell Leukaemia Cladribine",
    prophylaxis: [
      "Allopurinol 100 mg daily for 2 weeks (tumour lysis prevention)",
      "PJP prophylaxis recommended",
      "Antiviral prophylaxis (HSV/VZV)",
      "Antimicrobial prophylaxis for opportunistic infection prevention",
    ],
    monitoring: [
      "FBC weekly during and after treatment",
      "EUC, eGFR, LFTs at baseline and as clinically indicated",
      "Hepatitis B screening (HBsAg, anti-HBc, anti-HBs) at baseline",
      "Defer further therapy until haematological recovery",
    ],
    days: [
      { day: 1, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours", notes: "In 500 mL sodium chloride 0.9%" },
      { day: 2, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 3, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 4, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 5, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
    ],
  },
  "Cladribine + Rituximab": {
    id: "cladribine-rituximab",
    name: "Cladribine + Rituximab",
    cycleLengthDays: 50,
    cycles: 1,
    source: "eviQ Protocol 4383 — Hairy Cell Leukaemia Rituximab and Cladribine",
    prophylaxis: [
      "Allopurinol 100 mg daily for 2 weeks (tumour lysis prevention)",
      "PJP prophylaxis recommended during concurrent lymphopenia",
      "Antiviral prophylaxis (HSV/VZV)",
      "Antimicrobial prophylaxis for opportunistic infection prevention",
    ],
    monitoring: [
      "FBC weekly during and after treatment",
      "EUC, eGFR, LFTs at baseline and as clinically indicated",
      "Hepatitis B screening at baseline",
      "Monitor for infusion-related reactions (rituximab)",
      "Defer further therapy until haematological recovery",
    ],
    days: [
      { day: 1, drugs: "Rituximab + Cladribine", dose: "Rituximab 375 mg/m² + Cladribine 0.14 mg/kg", route: "IV infusion", duration: "Rituximab: graded rate; Cladribine: 2 hours", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"], notes: "Premeds 60 min before rituximab" },
      { day: 2, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 3, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 4, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 5, drugs: "Cladribine", dose: "0.14 mg/kg", route: "IV infusion", duration: "2 hours" },
      { day: 8, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
      { day: 15, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
      { day: 22, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
      { day: 29, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
      { day: 36, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
      { day: 43, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
      { day: 50, drugs: "Rituximab", dose: "375 mg/m²", route: "IV infusion", duration: "Graded rate protocol", premeds: ["Paracetamol 1,000 mg (PO)", "Loratadine 10 mg (PO)", "Hydrocortisone 100 mg (IV)"] },
    ],
  },
};

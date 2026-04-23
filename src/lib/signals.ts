/** Signal Sweep catalog — one definition per signal type.
 *
 *  Each signal is recorded as its own timestamped entry (kind: "signal").
 *  The `input` describes how the user enters a value, so the page can render
 *  the right control (number pad, pick list, multi-select, or 0–10 slider).
 *
 *  `redFlag` optionally flags a reading as urgent. Strict thresholds only —
 *  false positives here mean false ED pushes to the support circle.
 */

export type Category = "body" | "fluids" | "mind" | "other";

export type NumberInput = {
  kind: "number";
  unit: string;
  step: number;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Returned red flag message, or null when not flagged. */
  redFlag?: (n: number) => string | null;
};

export type PickInput = {
  kind: "pick";
  options: string[];
  /** Options that auto-flag as red. Exact string match. */
  redFlagOptions?: string[];
  redFlagMessage?: string;
};

export type MultiPickInput = {
  kind: "multipick";
  options: string[];
  /** Any of these selected → red flag. */
  redFlagOptions?: string[];
  redFlagMessage?: string;
  /** Options that need a body-location picker below them when ticked.
   *  Use for clues like "Hot red skin, wound or line site" or "New bruise". */
  locationOptions?: string[];
  /** Label above each per-option location picker. */
  locationLabel?: string;
};

export type SliderInput = {
  kind: "slider";
  label0: string;
  label10: string;
  /** Red-flag when the 0–10 reading is ≥ this. */
  redFlagAtOrAbove?: number;
  redFlagMessage?: string;
};

/** Free-form "Other" — user types their own label + notes. */
export type OtherInput = {
  kind: "other";
};

/** Per-location 0-10 ratings (e.g. pain in specific body areas). */
export type LocatedRatingInput = {
  kind: "locatedRating";
  options: string[];
  label0: string;
  label10: string;
};

export type SignalInput = NumberInput | PickInput | MultiPickInput | SliderInput | OtherInput | LocatedRatingInput;

/** Optional follow-up multipick shown after the primary input. */
export type FollowUp = {
  label: string;
  hint?: string;
  options: string[];
};

/** Optional free-text context field (e.g. "What did they eat?"). */
export type ContextText = {
  label: string;
  hint?: string;
  placeholder?: string;
};

export type SignalDef = {
  id: string;
  label: string;
  category: Category;
  /** One-line hint shown under the label in the sheet. */
  hint?: string;
  input: SignalInput;
  /** Optional second multipick shown below the primary input. */
  followUp?: FollowUp;
  /** Optional free-text context field shown below followUp. Distinct from the generic "notes" textarea. */
  contextText?: ContextText;
};

/** Body-area options reused by Pain and Bleeding follow-ups. */
export const BODY_AREAS = [
  "Head / face",
  "Neck / throat",
  "Mouth",
  "Chest",
  "Upper back",
  "Lower back",
  "Abdomen",
  "Left upper abdomen",
  "Pelvis / groin",
  "Shoulders",
  "Upper arms",
  "Forearms",
  "Hands / wrists",
  "Hips",
  "Thighs",
  "Knees",
  "Calves / shins",
  "Feet / ankles",
  "Joints (widespread)",
  "Bones (widespread)",
];

export const SIGNALS: SignalDef[] = [
  // ─── BODY ───
  {
    id: "temp",
    label: "Temp",
    category: "body",
    hint: "37.8 °C or higher is urgent on cladribine",
    input: {
      kind: "number",
      unit: "°C",
      step: 0.1,
      min: 33,
      max: 43,
      placeholder: "36.8",
      redFlag: (n) => (n >= 37.8 ? "Temp 37.8 °C or above — call the treating team now." : null),
    },
  },
  {
    id: "spo2",
    label: "SpO₂",
    category: "body",
    hint: "Oxygen saturation — below 92% is urgent",
    input: {
      kind: "number",
      unit: "%",
      step: 1,
      min: 50,
      max: 100,
      placeholder: "98",
      redFlag: (n) => (n < 92 ? "SpO₂ below 92% — go to ED or call 000." : null),
    },
  },
  {
    id: "pulse",
    label: "Pulse / heart",
    category: "body",
    hint: "Resting heart rate — also note how it feels",
    input: {
      kind: "number",
      unit: "bpm",
      step: 1,
      min: 30,
      max: 220,
      placeholder: "72",
      redFlag: (n) =>
        n >= 130 ? "Heart rate above 130 at rest — call the team if also feeling unwell." :
        n < 45 ? "Heart rate below 45 — call the team if also feeling unwell." : null,
    },
    followUp: {
      label: "Does the heart feel different?",
      hint: "Tick any that apply",
      options: [
        "Racing",
        "Pounding / thumping",
        "Skipping beats / fluttering",
        "Too slow",
        "Irregular rhythm",
        "Feels normal",
      ],
    },
  },
  {
    id: "breathing",
    label: "Breathing",
    category: "body",
    hint: "How hard is it to breathe right now?",
    input: {
      kind: "pick",
      options: [
        "Normal",
        "A bit short with activity",
        "Short at rest",
        "Struggling to finish a sentence",
      ],
      redFlagOptions: ["Short at rest", "Struggling to finish a sentence"],
      redFlagMessage: "New or worsening breathlessness — call the treating team now.",
    },
  },
  {
    id: "infection",
    label: "Infection clues",
    category: "body",
    hint: "Tick anything new or worse",
    input: {
      kind: "multipick",
      options: [
        "Chills, sweats, shivers",
        "Sore throat",
        "New cough",
        "Mouth ulcers or white patches",
        "Cold sores",
        "Burning urine",
        "Cloudy urine",
        "Hot red skin, wound or line site",
      ],
      locationOptions: ["Hot red skin, wound or line site"],
      locationLabel: "Where?",
    },
  },
  {
    id: "bleeding",
    label: "Bleeding / bruising",
    category: "body",
    hint: "New bleeding or bruises since last check",
    input: {
      kind: "multipick",
      options: [
        "New bruise",
        "Nosebleed",
        "Bleeding gums",
        "Petechiae (pinpoint red spots)",
        "Blood in urine",
        "Blood in stool",
      ],
      redFlagOptions: ["Blood in urine", "Blood in stool"],
      redFlagMessage: "Blood in urine or stool — call the treating team now.",
      locationOptions: ["New bruise", "Petechiae (pinpoint red spots)"],
      locationLabel: "Where?",
    },
  },
  {
    id: "energy",
    label: "Energy",
    category: "body",
    hint: "Compared to a normal day",
    input: {
      kind: "pick",
      options: [
        "Normal",
        "A bit tired",
        "Wiped out",
        "Very weak or dizzy",
        "Had to lie down",
      ],
      redFlagOptions: ["Very weak or dizzy"],
      redFlagMessage: "Sudden severe weakness or dizziness — call the team now.",
    },
  },
  {
    id: "tummy",
    label: "Tummy / left-rib fullness",
    category: "body",
    hint: "Fullness or discomfort under the left ribs",
    input: {
      kind: "slider",
      label0: "None",
      label10: "Severe",
    },
  },
  {
    id: "sweats",
    label: "Sweats",
    category: "body",
    hint: "Day or nap sweats — log each time it happens",
    input: {
      kind: "pick",
      options: [
        "Just damp",
        "Drenched — changed clothes",
        "Drenched — changed clothes + sheets",
      ],
    },
    followUp: {
      label: "When did it happen?",
      hint: "Tick any that apply",
      options: [
        "During a nap",
        "While resting awake",
        "During / just after activity",
        "Just before / after a fever",
        "For no clear reason",
      ],
    },
  },
  {
    id: "lumps",
    label: "Lumps / nodes",
    category: "body",
    hint: "Anything larger, new, or newly noticeable",
    input: {
      kind: "multipick",
      options: [
        "Neck node larger",
        "Armpit node larger",
        "Groin node larger",
        "New lump anywhere",
        "Abdominal swelling",
      ],
      locationOptions: ["New lump anywhere"],
      locationLabel: "Where is the new lump?",
    },
  },

  // ─── FLUIDS IN / OUT ───
  {
    id: "food",
    label: "Food",
    category: "fluids",
    hint: "How much did they actually eat?",
    input: {
      kind: "pick",
      options: ["None", "A few bites", "Small meal", "Half portion", "Full meal"],
    },
  },
  {
    id: "fluids",
    label: "Fluids in",
    category: "fluids",
    hint: "Amount drunk since last check-in",
    input: {
      kind: "number",
      unit: "mL",
      step: 50,
      min: 0,
      max: 5000,
      placeholder: "250",
    },
  },
  {
    id: "urine",
    label: "Urine",
    category: "fluids",
    hint: "Colour or problem",
    input: {
      kind: "pick",
      options: [
        "Pale",
        "Yellow",
        "Dark",
        "Very dark",
        "Cloudy",
        "Blood-tinged",
        "Painful to pass",
      ],
      redFlagOptions: ["Blood-tinged"],
      redFlagMessage: "Blood in urine — call the treating team now.",
    },
  },
  {
    id: "bowel",
    label: "Bowel",
    category: "fluids",
    hint: "Since last check-in",
    input: {
      kind: "pick",
      options: [
        "None",
        "Normal",
        "Soft",
        "Diarrhoea",
        "Severe / uncontrolled diarrhoea",
        "Constipated",
      ],
      redFlagOptions: ["Severe / uncontrolled diarrhoea"],
      redFlagMessage: "Uncontrolled diarrhoea is an escalation symptom on cladribine — call the team.",
    },
  },
  {
    id: "vomit",
    label: "Vomiting",
    category: "fluids",
    hint: "Log every episode — pick how bad this one was",
    input: {
      kind: "pick",
      options: [
        "Dry retch (nothing came up)",
        "Small amount",
        "Full vomit",
        "Violent or repeated",
        "Blood or coffee-ground material",
      ],
      redFlagOptions: ["Blood or coffee-ground material"],
      redFlagMessage: "Blood in vomit (fresh or coffee-ground colour) — call the treating team now.",
    },
    followUp: {
      label: "Anything that might have triggered it?",
      hint: "Tick any that apply",
      options: [
        "Just took medication",
        "Just ate or drank",
        "Just exercised or moved around",
        "Strong smell or motion",
        "Came on with nausea",
        "Came on with pain",
        "No obvious trigger",
      ],
    },
    contextText: {
      label: "What medication, food, or drink?",
      hint: "Optional — helps the team spot patterns",
      placeholder: "e.g. ondansetron; dry toast; apple juice",
    },
  },

  // ─── MIND ───
  {
    id: "mood",
    label: "Mood",
    category: "mind",
    hint: "Right now (10 = feeling good)",
    input: { kind: "slider", label0: "Flat / low", label10: "Good" },
  },
  {
    id: "anxiety",
    label: "Anxiety",
    category: "mind",
    hint: "Right now (10 = worst)",
    input: {
      kind: "slider",
      label0: "Calm",
      label10: "Worst",
    },
  },
  {
    id: "brainFog",
    label: "Brain fog",
    category: "mind",
    hint: "Fuzzy thinking, losing words (10 = worst)",
    input: { kind: "slider", label0: "Clear", label10: "Foggy" },
  },
  {
    id: "pain",
    label: "Pain",
    category: "mind",
    hint: "Tick where it hurts — rate each spot 0 to 10",
    input: {
      kind: "locatedRating",
      options: BODY_AREAS,
      label0: "None",
      label10: "Worst",
    },
  },
  {
    id: "fatigue",
    label: "Fatigue",
    category: "mind",
    hint: "Right now (10 = worst)",
    input: { kind: "slider", label0: "None", label10: "Worst" },
  },
  {
    id: "nausea",
    label: "Nausea",
    category: "mind",
    hint: "Right now (10 = worst)",
    input: { kind: "slider", label0: "None", label10: "Worst" },
  },
  {
    id: "appetite",
    label: "Appetite",
    category: "mind",
    hint: "How hungry they feel right now",
    input: {
      kind: "pick",
      options: [
        "No appetite / off food",
        "Poor — forcing it",
        "Below normal",
        "Normal",
        "Good",
      ],
    },
  },

  // ─── OTHER ───
  {
    id: "other",
    label: "Other",
    category: "other",
    hint: "Capture anything that doesn't fit the buttons above",
    input: { kind: "other" },
  },
];

export const SIGNAL_BY_ID: Record<string, SignalDef> = Object.fromEntries(
  SIGNALS.map((s) => [s.id, s]),
);

export const CATEGORY_LABEL: Record<Category, string> = {
  body: "Body",
  fluids: "In / out",
  mind: "Mind",
  other: "Other",
};

/** Per-category styling for chips + section headings.
 *  - `bg`    — solid fill used on the pill and for the heading text
 *              (the solid CSS var is the recognisable tone; it reads clearly on
 *              both light and dark surfaces)
 *  - `ink`   — text colour on the filled pill
 *  - `border`— pill border; for "Other" the pill is outlined only
 */
export const CATEGORY_STYLE: Record<
  Category,
  { bg: string; ink: string; border: string }
> = {
  body: { bg: "var(--blue)", ink: "var(--blue-ink)", border: "var(--blue)" },
  fluids: { bg: "var(--primary)", ink: "var(--primary-ink)", border: "var(--primary)" },
  mind: { bg: "var(--purple)", ink: "var(--purple-ink)", border: "var(--purple)" },
  other: { bg: "var(--pink)", ink: "var(--pink-ink)", border: "var(--pink)" },
};

/** Evaluate whether a signal reading should auto-flag as red. */
export function evaluateRedFlag(
  def: SignalDef,
  reading: {
    value?: number | null;
    choice?: string;
    choices?: string[];
    score?: number | null;
    locationScores?: { area: string; score: number }[];
  },
): string | null {
  const i = def.input;
  if (i.kind === "number" && i.redFlag && typeof reading.value === "number") {
    return i.redFlag(reading.value);
  }
  if (i.kind === "pick" && i.redFlagOptions && reading.choice) {
    return i.redFlagOptions.includes(reading.choice) ? (i.redFlagMessage ?? "Red flag") : null;
  }
  if (i.kind === "multipick" && i.redFlagOptions && reading.choices?.length) {
    const hit = reading.choices.some((c) => i.redFlagOptions!.includes(c));
    return hit ? (i.redFlagMessage ?? "Red flag") : null;
  }
  if (i.kind === "slider" && i.redFlagAtOrAbove != null && typeof reading.score === "number") {
    return reading.score >= i.redFlagAtOrAbove ? (i.redFlagMessage ?? "Red flag") : null;
  }
  return null;
}

/** Summarise a saved reading for display in the timeline. */
export function formatReading(def: SignalDef, s: {
  value?: number | null; unit?: string; choice?: string; choices?: string[]; score?: number | null;
  customLabel?: string; notes?: string; followUps?: string[];
  locationScores?: { area: string; score: number }[];
  optionLocations?: Record<string, string[]>;
}): string {
  const primary = (() => {
    if (def.input.kind === "number") return s.value != null ? `${s.value} ${s.unit ?? def.input.unit}` : "—";
    if (def.input.kind === "pick") return s.choice ?? "—";
    if (def.input.kind === "multipick") {
      const chips = (s.choices ?? []).map((c) => {
        const locs = s.optionLocations?.[c];
        return locs && locs.length ? `${c} (${locs.join(", ")})` : c;
      });
      return chips.join(", ") || "—";
    }
    if (def.input.kind === "slider") return s.score != null ? `${s.score}/10` : "—";
    if (def.input.kind === "other") return s.customLabel || s.notes || "—";
    if (def.input.kind === "locatedRating") {
      return (s.locationScores ?? []).map((l) => `${l.area} ${l.score}/10`).join(" · ") || "—";
    }
    return "—";
  })();
  const extras = (s.followUps ?? []).join(", ");
  return extras ? `${primary} · ${extras}` : primary;
}

/** Keywords in a side effect that suggest a body location is worth capturing. */
const LOCATION_KEYWORDS = [
  "rash", "bruise", "swell", "itch", "numb", "tingle", "tingling", "pins and needles",
  "lump", "hair", "nail", "thrush", "patch", "dry skin", "eczema", "sore",
];

/** Body parts that, if named in the side effect's title, make the location
 *  redundant (the location is implicit in the name — e.g. "Mouth ulcers"). */
const TITLE_BODY_PARTS = [
  "mouth", "nose", "eye", "ear", "foot", "hand", "scalp", "tongue",
  "lip", "throat", "chest", "abdom", "groin",
];

export function sideEffectSuggestsLocation(s: { title: string; keywords: string[]; description: string }): boolean {
  const hay = [s.title, ...s.keywords, s.description].join(" ").toLowerCase();
  if (!LOCATION_KEYWORDS.some((k) => hay.includes(k))) return false;
  const title = s.title.toLowerCase();
  // If the title itself names a specific body part, the location is implicit.
  if (TITLE_BODY_PARTS.some((p) => title.includes(p))) return false;
  return true;
}

/**
 * Static reference content for the Home Ops section.
 * Sourced from the household treatment operations manual and care kits doc.
 * All content is generic — no patient identifiers.
 */

export type ZoneKey = "white" | "yellow" | "orange" | "red";

export type Zone = {
  key: ZoneKey;
  label: string;
  color: string; // swatch
  textOn: string; // text color on swatch
  rooms: string;
  purpose: string;
  people: string;
  keepHere: string[];
  keepOut: string[];
  restockWhen: string[];
};

export const ZONES: Zone[] = [
  {
    key: "white",
    label: "Zone 1 — White",
    color: "#ffffff",
    textOn: "#1a1a1a",
    rooms: "Upstairs bedroom + main upstairs bathroom",
    purpose: "Protected clean zone — rest, monitoring, low-germ daily care.",
    people: "Patient + one designated support person only. No dogs on bed. No visitor traffic.",
    keepHere: [
      "Digital thermometer",
      "Tissues, hand sanitiser, gentle moisturiser, lip balm",
      "Dry-mouth mouthwash and gel, ultra-soft toothbrushes, mild toothpaste",
      "Sensitive sunscreen, gentle cleanser / body wash",
      "Dedicated water bottle, mug, and cutlery",
      "Notebook, pens, phone charger, power bank, headphones",
      "Throw blanket, bed socks, dedicated towels and washcloths",
      "Respirators for outsider / hospital trips",
      "Printed emergency contact sheet, small rubbish bin",
    ],
    keepOut: [
      "Dirty laundry",
      "Cleanup gloves / used PPE",
      "Parcel deliveries",
      "Dog gear",
      "Household cleaning sprays",
      "Visitor items / opened groceries",
    ],
    restockWhen: [
      "Lip balm / tissues / sanitiser down to 1 remaining",
      "Toothbrushes down to 1 remaining",
      "Clean towels or washcloths down to 1–2 days",
      "Masks / respirators low",
    ],
  },
  {
    key: "yellow",
    label: "Zone 2 — Yellow",
    color: "#fff7cc",
    textOn: "#5b4a00",
    rooms: "Upstairs kitchen, living, dining, sunroom, covered deck",
    purpose: "Controlled shared zone — food prep, quiet daytime shared living.",
    people: "Household only unless essential outsider. Low traffic, hand hygiene at entry.",
    keepHere: [
      "Pump hand soap at kitchen sink and shared bathroom entry",
      "Hand sanitiser, tissues, medical masks for outsider situations",
      "Kitchen sanitising spray, multipurpose surface spray, paper towel",
      "Two chopping boards (raw-only, ready-to-eat-only)",
      "Food thermometer, dishwashing liquid, produce brush",
      "Dedicated drying mat or clean prep area for patient food",
      "Crackers, plain biscuits, soups / easy meals",
      "Dedicated safe-food shelf or tub",
      "Optional tray for mug / cutlery / meds when sitting here",
    ],
    keepOut: [
      "Used PPE",
      "Spill kit",
      "Contaminated cloths",
      "Dirty parcel packaging",
      "Pet waste gear",
      "Gardening items",
    ],
    restockWhen: [
      "Crackers / soups down to ~2 days",
      "Paper towel down to 1 roll",
      "Sanitiser or soap below one-third",
      "Masks below 10",
    ],
  },
  {
    key: "orange",
    label: "Zone 3 — Orange",
    color: "#ffd8a8",
    textOn: "#5b2d00",
    rooms: "Downstairs retreat, kitchenette, bathroom, laundry, storage",
    purpose: "Operations hub — dirty tasks, decontamination, master stock.",
    people: "Support people mainly. Patient does not do routine tasks here.",
    keepHere: [
      "Backup masks / respirators",
      "Nitrile gloves (keep 1 open, 2 sealed backup)",
      "Heavy-duty reusable cleaning gloves",
      "Disposable cloths, paper towel, garbage bags, tie bags",
      "Fragrance-free laundry detergent",
      "Bathroom cleaner, toilet cleaner, kitchen / multipurpose cleaner",
      "Dedicated laundry basket for patient",
      "Waterproof mattress protector, cleanup bucket, vomit bowl",
      "Soap, sanitiser, tissue refills; spare toothbrushes, washcloths, sheets",
      "Tub: spill / cleanup kit (gloves, cloths, paper towel, tie bags, apron, eye protection, instructions inside lid)",
      "Tub: PPE and masks",
      "Tub: patient restock",
      "Marker and labels",
    ],
    keepOut: ["Patient daily comfort items (keep backup stock only)"],
    restockWhen: [
      "Open glove box half gone",
      "Paper towel down to 2 rolls total",
      "Detergent below one-third",
      "Garbage bags running low",
      "Spill kit missing any item",
    ],
  },
  {
    key: "red",
    label: "Zone 4 — Red",
    color: "#ffb3b3",
    textOn: "#5b0000",
    rooms: "Entry, garage / carport, yard, shed, dog toileting area",
    purpose: "Outer contamination barrier — shoes, deliveries, pets, waste, tradies.",
    people: "Household support. Patient does not do routine tasks here.",
    keepHere: [
      "Shoe tray or mat",
      "Hand sanitiser at entry, masks near entry",
      "Glove pack for deliveries / pet / waste tasks",
      "Outdoor-only heavy-duty gloves",
      "Parcel-opening box cutter / scissors",
      "Surface wipe pack for touched parcels (optional)",
      "Rubbish bin / lidded waste container",
      "Dog waste bags / pet cleanup supplies",
      "Storage tub for dog lead, bowls, outdoor pet gear",
      "Visitor note: 'Do not enter if unwell'",
      "Hook / basket for keys, masks, entry items",
    ],
    keepOut: [
      "Patient towels / bedding",
      "Patient mouth-care items",
      "Patient food",
      "Clean laundry",
    ],
    restockWhen: [
      "Dog waste bags low",
      "Masks below 10",
      "Sanitiser below one-third",
      "Entry gloves nearly out",
    ],
  },
];

export const MOVEMENT_RULES = [
  "Clean flow: Zone 4 → hand hygiene → Zone 2 → Zone 1",
  "Dirty flow: Zone 1 event → Zone 3 for cleanup / laundry / waste → hand hygiene before re-entry",
  "Do not carry dirty laundry, used PPE, pet gear or parcels through Zone 1",
  "One designated support person handles most dirty-zone tasks",
  "Restock Zone 1 and Zone 2 from Zone 3, not from random cupboards",
];

// ——————————————————————————————————————————————————————————————
// Shopping list (by store) — from the Care Kits doc
// ——————————————————————————————————————————————————————————————

export type ShoppingStore = {
  key: "chemist" | "supermarket" | "department";
  label: string;
  note: string;
  items: { name: string; qty?: string; zoneHint?: ZoneKey[] }[];
};

export const SHOPPING: ShoppingStore[] = [
  {
    key: "chemist",
    label: "Chemist",
    note: "Skin, mouth, PPE basics. Distribute across zones 1–4.",
    items: [
      { name: "Gentle body wash (e.g. QV)", qty: "1", zoneHint: ["white"] },
      { name: "Gentle skin cleanser (e.g. Cetaphil)", qty: "1", zoneHint: ["white"] },
      { name: "Fragrance-free moisturiser (large)", qty: "1", zoneHint: ["white"] },
      { name: "Dry-mouth mouthwash", qty: "1", zoneHint: ["white"] },
      { name: "Dry-mouth gel", qty: "1", zoneHint: ["white"] },
      { name: "Ultra-soft toothbrushes", qty: "2", zoneHint: ["white"] },
      { name: "Mild toothpaste", qty: "2", zoneHint: ["white"] },
      { name: "Sensitive / medicinal lip balms", qty: "2", zoneHint: ["white"] },
      { name: "Sensitive SPF50+ sunscreen", qty: "1", zoneHint: ["white"] },
      { name: "Digital thermometer", qty: "1", zoneHint: ["white"] },
      { name: "Large hand sanitiser", qty: "2", zoneHint: ["yellow", "orange"] },
      { name: "Small hand sanitiser", qty: "1", zoneHint: ["white"] },
      { name: "Medical masks (box)", qty: "3 boxes", zoneHint: ["white", "yellow", "red"] },
      { name: "P2 / N95 respirators", qty: "enough for trips + car kit", zoneHint: ["orange"] },
    ],
  },
  {
    key: "supermarket",
    label: "Supermarket",
    note: "Food safety, cleaning, contamination. Mostly Zones 2–3.",
    items: [
      { name: "Nitrile gloves (boxes)", qty: "3", zoneHint: ["orange"] },
      { name: "Fragrance-free laundry detergent", qty: "1", zoneHint: ["orange"] },
      { name: "Kitchen cleaner", qty: "1", zoneHint: ["orange"] },
      { name: "Bathroom cleaner", qty: "1", zoneHint: ["orange"] },
      { name: "Toilet cleaner", qty: "1", zoneHint: ["orange"] },
      { name: "Paper towel rolls", qty: "6", zoneHint: ["orange", "yellow"] },
      { name: "Disposable cloths (packs)", qty: "3", zoneHint: ["orange"] },
      { name: "Garbage bags (pack)", qty: "2", zoneHint: ["orange"] },
      { name: "Small tie / nappy bags (pack)", qty: "1", zoneHint: ["orange"] },
      { name: "Tissues (boxes)", qty: "4", zoneHint: ["white", "yellow", "orange"] },
      { name: "Dishwashing liquid", qty: "1", zoneHint: ["yellow"] },
      { name: "Chopping boards (raw + ready-to-eat)", qty: "2", zoneHint: ["yellow"] },
      { name: "Produce brush", qty: "1", zoneHint: ["yellow"] },
      { name: "Soups / freezer meals", qty: "4–6", zoneHint: ["yellow"] },
      { name: "Plain crackers (packs)", qty: "4", zoneHint: ["yellow"] },
      { name: "Plain biscuits (packs)", qty: "2", zoneHint: ["yellow"] },
      { name: "Cheap plastic bucket / basin", qty: "1", zoneHint: ["orange"] },
    ],
  },
  {
    key: "department",
    label: "Department / Homewares (Big W / Kmart / Target / Spotlight)",
    note: "Comfort and setup items. Mostly Zones 1 + 3 + 4.",
    items: [
      { name: "Throw blanket", qty: "1", zoneHint: ["white"] },
      { name: "Bed socks (pairs)", qty: "2", zoneHint: ["white"] },
      { name: "Zip hoodie / cardigan", qty: "1", zoneHint: ["white"] },
      { name: "Reusable water bottle", qty: "1", zoneHint: ["white"] },
      { name: "Power bank", qty: "1", zoneHint: ["white"] },
      { name: "Headphones", qty: "1", zoneHint: ["white"] },
      { name: "Notebook", qty: "1", zoneHint: ["white"] },
      { name: "Pens", qty: "2", zoneHint: ["white"] },
      { name: "Caddy / basket", qty: "1", zoneHint: ["white"] },
      { name: "Food thermometer", qty: "1", zoneHint: ["yellow"] },
      { name: "Waterproof mattress protector", qty: "1", zoneHint: ["orange"] },
      { name: "Storage tubs (spill / PPE / restock)", qty: "3", zoneHint: ["orange"] },
      { name: "Laundry basket (dedicated)", qty: "1", zoneHint: ["orange"] },
      { name: "Labels + marker", qty: "1", zoneHint: ["orange"] },
      { name: "Shoe tray / mat", qty: "1", zoneHint: ["red"] },
      { name: "Entry basket / hooks", qty: "1", zoneHint: ["red"] },
    ],
  },
];

export const DO_NOT_BUY = [
  "Wellness / 'detox' / 'immunity' teas, powders, gummies, mushroom blends unless cleared by oncology",
  "Alcohol-based mouthwash",
  "Perfumed skincare",
  "Essential-oil cleaning or body products",
  "Raw sushi platters, deli grazing boxes, rare meat, runny eggs, unpasteurised dairy",
  "Communal snack tubs",
  "Shared bathroom hand towels during the high-risk period",
];

// ——————————————————————————————————————————————————————————————
// Cleaning schedule
// ——————————————————————————————————————————————————————————————

export type CleaningBlock = {
  heading: string;
  zones?: ZoneKey[];
  tasks: string[];
};

export const CLEANING_DAILY: CleaningBlock[] = [
  {
    heading: "Morning reset — Zone 1",
    zones: ["white"],
    tasks: [
      "Bedroom door handle, light switch, bedside table",
      "Phone and remote",
      "Bathroom tap handles, toilet flush, toilet seat if used",
      "Sink edge / bench",
    ],
  },
  {
    heading: "Morning reset — Zones 2 + 4",
    zones: ["yellow", "red"],
    tasks: [
      "Kitchen bench, fridge handle, sink taps",
      "Dining table, remotes, main door handles, light switches",
      "Entry touchpoints if heavily used, parcel drop-off area",
    ],
  },
  {
    heading: "Evening reset — Zones 1 + 2",
    zones: ["white", "yellow"],
    tasks: [
      "Repeat high-touch clean for Zone 1 and Zone 2",
      "Any shared bathroom surfaces used that day",
    ],
  },
];

export const CLEANING_IMMEDIATE = [
  "Body-fluid contamination",
  "Visible dirt on patient-touch surfaces",
  "Dog accident",
  "Outsider visit into the house",
  "Sick-person exposure in a shared area",
];

export const CLEANING_EVERY_2_3_DAYS = [
  "Vacuum and mop main living areas",
  "Vacuum patient's room while they are not in it",
  "Clean patient's bathroom more thoroughly",
  "Wipe mirrors, shelves, less-touched surfaces",
  "Wipe frequently used chair arms and couch touchpoints",
];

export const CLEANING_WEEKLY: CleaningBlock[] = [
  {
    heading: "Zone 1",
    zones: ["white"],
    tasks: [
      "Strip bed, wash sheets and pillowcases",
      "Wipe bedhead and surrounding surfaces",
      "Clean floor thoroughly",
    ],
  },
  {
    heading: "Zone 2",
    zones: ["yellow"],
    tasks: [
      "Full kitchen wipe-down",
      "Mop floors",
      "Clean table and chairs properly",
      "Wipe appliance handles and fronts",
    ],
  },
  {
    heading: "Zone 3",
    zones: ["orange"],
    tasks: [
      "Restock spill kit",
      "Clean laundry surfaces and cleanup caddies",
      "Check PPE stock",
      "Empty and reset dirty-task storage bins",
    ],
  },
  {
    heading: "Zone 4",
    zones: ["red"],
    tasks: [
      "Clean entry mat area, tidy parcel area",
      "Wash dog bowls if stored there",
      "Clean pet-gear container as needed",
    ],
  },
];

// ——————————————————————————————————————————————————————————————
// PPE — task-based matrix
// ——————————————————————————————————————————————————————————————

export type PPEEntry = {
  task: string;
  who: "patient" | "support";
  gear: string;
  notes?: string;
};

export const PPE_MATRIX: PPEEntry[] = [
  {
    task: "Hospital, pathology, pharmacy, GP, indoor public spaces, car trips outside household",
    who: "patient",
    gear: "Non-valved P2 / N95 respirator",
    notes: "Fit-check every time. Replace if wet, damaged, or heavily soiled.",
  },
  {
    task: "Visitor, tradie, cleaner, or clinician inside the house",
    who: "patient",
    gear: "Non-valved P2 / N95 respirator",
    notes: "No sick visitors at all. Keep contact brief.",
  },
  {
    task: "Routine cleaning — no body-fluid contamination",
    who: "support",
    gear: "Gloves + closed shoes",
    notes: "Use dedicated cloths by zone.",
  },
  {
    task: "Bathroom cleaning during precaution window",
    who: "support",
    gear: "P2/N95 + nitrile gloves + waterproof apron/gown + eye protection if splash risk",
    notes: "Use disposable cleaning materials where possible.",
  },
  {
    task: "Urine, vomit, faeces, blood, or body-fluid spill",
    who: "support",
    gear: "P2/N95 + nitrile gloves + waterproof apron/gown + eye protection if splash risk",
    notes: "Absorb, clean, disinfect, bag waste, handwash.",
  },
  {
    task: "Contaminated laundry",
    who: "support",
    gear: "Nitrile gloves; apron/gown if contact risk; P2/N95 if heavily contaminated close to face",
    notes: "Do not shake laundry. Wash separately.",
  },
  {
    task: "Dog accident cleanup",
    who: "support",
    gear: "P2/N95 + nitrile gloves + waterproof apron/gown; eye protection if splash risk",
    notes: "Patient must not do this task.",
  },
  {
    task: "Handling rubbish from dirty-risk tasks",
    who: "support",
    gear: "Nitrile gloves; apron/gown if bagging wet waste",
    notes: "Bag securely, then wash hands.",
  },
  {
    task: "Patient resting in Zone 1",
    who: "patient",
    gear: "None",
    notes: "No gloves or respirator needed unless an outsider enters.",
  },
];

export const RESPIRATOR_FIT_CHECK = [
  "Perform hand hygiene",
  "Select a P2/N95 that fits well — touch only outer edges and straps",
  "Position on the face as directed by the manufacturer",
  "Top strap above the ears at the top of the head; bottom strap below the ears",
  "Mould the nosepiece firmly with both hands",
  "Perform a positive and negative seal check — if leaking, readjust and repeat",
];

// ——————————————————————————————————————————————————————————————
// Sun safety
// ——————————————————————————————————————————————————————————————

export const SUN_RULES = {
  threeLine: [
    "Outside, even in shade — full sun protection",
    "Inside away from direct sun — sunscreen usually not needed",
    "Inside by sunny windows or on long car trips — add protection",
  ],
  beforeOutside: [
    "Loose, covering clothing (tightly woven, UPF-rated if available)",
    "Broad-brim, bucket, or legionnaire hat (no caps or visors)",
    "Close-fitting or wraparound sunglasses",
    "Broad-spectrum, water-resistant SPF50+ sunscreen on exposed skin — 20 min before leaving",
  ],
  whileOutside: [
    "Stay in shade where possible — but shade alone is not enough",
    "Reapply sunscreen every 2 hours",
    "Reapply sooner if sweating",
  ],
  escalate: [
    "New or worsening rash",
    "Painful or widespread redness",
    "Blistering",
    "Rash plus fever, sore eyes, sore mouth, or feeling very unwell",
  ],
};

// ——————————————————————————————————————————————————————————————
// Situational protocols — quick-access cards (also surfaced from /emergency)
// ——————————————————————————————————————————————————————————————

export type Protocol = {
  slug: string;
  title: string;
  blurb: string;
  icon: "droplet" | "dog" | "user-x" | "building" | "broom" | "flag";
  steps: string[];
  alsoSee?: string[];
};

export const PROTOCOLS: Protocol[] = [
  {
    slug: "body-fluid-spill",
    title: "Body-fluid spill (vomit / urine / faeces / blood)",
    blurb: "Contain the event. Clean it properly. Stop contamination moving through the house.",
    icon: "droplet",
    steps: [
      "Patient must not do this cleanup — support person only.",
      "Isolate the area. Keep patient and dogs away. Stop foot traffic.",
      "Put on dirty-risk PPE: P2/N95 + nitrile gloves + waterproof apron or gown + eye protection if splash risk.",
      "Absorb first with paper towel or disposable cloths. Do not smear.",
      "Clean second with detergent or soapy water.",
      "Disinfect third using household disinfectant — follow the label contact time.",
      "Bag waste. Double-bag if heavily wet or grossly contaminated.",
      "Remove PPE carefully: gloves first, apron / gown second, eye protection, respirator last. Wash hands.",
      "Do not carry contaminated items through Zone 1. Cleanup starts and ends in Zone 3.",
    ],
    alsoSee: ["laundry", "dog-accident"],
  },
  {
    slug: "dog-accident",
    title: "Dog accident indoors",
    blurb: "Pet waste is high-risk during the neutropenic window.",
    icon: "dog",
    steps: [
      "Patient stays away. Support person only.",
      "Put on dirty-risk PPE (as for body-fluid spill).",
      "Absorb, clean, disinfect. Bag waste.",
      "Dogs do not re-enter until the area is fully dry.",
      "Wash hands thoroughly afterwards.",
    ],
    alsoSee: ["body-fluid-spill"],
  },
  {
    slug: "outsider-visit",
    title: "Outsider in the house (visitor / tradie / clinician)",
    blurb: "Contact should be brief, controlled, and never with anyone unwell.",
    icon: "user-x",
    steps: [
      "No sick visitors at all. No casual drop-ins during the high-risk window.",
      "Keep patient in Zone 1 if possible.",
      "If contact is unavoidable: patient wears a non-valved P2/N95 respirator.",
      "Visitor uses hand sanitiser at entry (Zone 4).",
      "Keep contact brief. Ventilate afterwards.",
      "Wipe high-touch surfaces the visitor contacted (door handles, chair arms, taps).",
    ],
  },
  {
    slug: "hospital-trip",
    title: "Hospital / pathology / GP trip",
    blurb: "PPE and go-bag basics for leaving the house.",
    icon: "building",
    steps: [
      "Patient wears a non-valved P2/N95 respirator for the entire trip. Fit-check every time.",
      "Carer also masks if close contact or recent exposure.",
      "Bring: medication list, allergy list, oncology contact sheet, respirator spares, phone and charger, water, vomit bag, clean top, ID / Medicare card.",
      "Replace respirator if wet, damaged, or heavily soiled.",
    ],
  },
  {
    slug: "laundry",
    title: "Contaminated laundry",
    blurb: "Do not shake. Keep separate. Keep it in Zone 3.",
    icon: "broom",
    steps: [
      "Wear gloves. Add apron or gown if contact risk is high.",
      "Do not shake contaminated linen.",
      "Place directly into the dedicated hamper or carry container in Zone 3.",
      "Wash separately, using a fragrance-free detergent.",
      "Dry thoroughly before reuse.",
      "Wash hands afterwards.",
    ],
  },
  {
    slug: "fever",
    title: "Fever or sudden deterioration",
    blurb: "Fever is not a wait-and-see event — it is an oncology event.",
    icon: "flag",
    steps: [
      "Temperature ≥ 38.0°C, or sudden deterioration → act immediately.",
      "Take the temperature once. Do not keep rechecking to delay action.",
      "Call oncology / after-hours number immediately.",
      "If instructed to attend ED, leave immediately.",
      "Zone lockdown: patient stays in Zone 1 unless leaving, no visitors, dogs out of Zone 1, dirty tasks to Zone 3.",
      "Bring the hospital-trip go-bag (see Hospital trip protocol).",
    ],
    alsoSee: ["hospital-trip"],
  },
];

// ——————————————————————————————————————————————————————————————
// Inventory seed — matches the zone kits above
// ——————————————————————————————————————————————————————————————

export type SeedItem = {
  name: string;
  zone: ZoneKey;
  category: string;
  quantity: number;
  threshold: number;
  unit?: string;
  store?: "chemist" | "supermarket" | "department" | "other";
};

export const INVENTORY_SEED: SeedItem[] = [
  // Zone 1 — White
  { name: "Digital thermometer", zone: "white", category: "Monitoring", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Tissues", zone: "white", category: "Daily use", quantity: 1, threshold: 1, unit: "box", store: "supermarket" },
  { name: "Hand sanitiser (pump)", zone: "white", category: "Hygiene", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Fragrance-free moisturiser", zone: "white", category: "Skin", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Lip balm", zone: "white", category: "Skin", quantity: 2, threshold: 1, store: "chemist" },
  { name: "Dry-mouth mouthwash", zone: "white", category: "Mouth care", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Dry-mouth gel", zone: "white", category: "Mouth care", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Ultra-soft toothbrush", zone: "white", category: "Mouth care", quantity: 2, threshold: 1, store: "chemist" },
  { name: "Mild toothpaste", zone: "white", category: "Mouth care", quantity: 2, threshold: 1, store: "chemist" },
  { name: "Sensitive SPF50+ sunscreen", zone: "white", category: "Skin", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Gentle cleanser / body wash", zone: "white", category: "Skin", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Bath towels (dedicated)", zone: "white", category: "Linen", quantity: 2, threshold: 1, store: "department" },
  { name: "Face washers (dedicated)", zone: "white", category: "Linen", quantity: 6, threshold: 2, store: "department" },
  { name: "Medical masks", zone: "white", category: "PPE", quantity: 1, threshold: 1, unit: "box", store: "chemist" },

  // Zone 2 — Yellow
  { name: "Pump hand soap", zone: "yellow", category: "Hygiene", quantity: 2, threshold: 1, store: "supermarket" },
  { name: "Hand sanitiser (large)", zone: "yellow", category: "Hygiene", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Medical masks", zone: "yellow", category: "PPE", quantity: 1, threshold: 1, unit: "box", store: "chemist" },
  { name: "Tissues", zone: "yellow", category: "Daily use", quantity: 2, threshold: 1, unit: "box", store: "supermarket" },
  { name: "Kitchen sanitising spray", zone: "yellow", category: "Cleaning", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Multipurpose surface spray", zone: "yellow", category: "Cleaning", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Paper towel", zone: "yellow", category: "Cleaning", quantity: 2, threshold: 1, unit: "rolls", store: "supermarket" },
  { name: "Chopping board — raw only", zone: "yellow", category: "Food prep", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Chopping board — ready-to-eat only", zone: "yellow", category: "Food prep", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Food thermometer", zone: "yellow", category: "Food prep", quantity: 1, threshold: 1, store: "department" },
  { name: "Dishwashing liquid", zone: "yellow", category: "Cleaning", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Produce brush", zone: "yellow", category: "Food prep", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Plain crackers", zone: "yellow", category: "Food", quantity: 4, threshold: 2, unit: "packs", store: "supermarket" },
  { name: "Plain biscuits", zone: "yellow", category: "Food", quantity: 2, threshold: 1, unit: "packs", store: "supermarket" },
  { name: "Soups / easy meals", zone: "yellow", category: "Food", quantity: 6, threshold: 3, store: "supermarket" },

  // Zone 3 — Orange (master stock)
  { name: "P2 / N95 respirators", zone: "orange", category: "PPE", quantity: 10, threshold: 5, store: "chemist" },
  { name: "Medical masks (backup)", zone: "orange", category: "PPE", quantity: 2, threshold: 1, unit: "boxes", store: "chemist" },
  { name: "Nitrile disposable gloves", zone: "orange", category: "PPE", quantity: 3, threshold: 1, unit: "boxes", store: "supermarket" },
  { name: "Heavy-duty reusable cleaning gloves", zone: "orange", category: "PPE", quantity: 2, threshold: 1, unit: "pairs", store: "supermarket" },
  { name: "Waterproof apron / gown", zone: "orange", category: "PPE", quantity: 2, threshold: 1, store: "chemist" },
  { name: "Eye protection", zone: "orange", category: "PPE", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Disposable cloths", zone: "orange", category: "Cleaning", quantity: 3, threshold: 1, unit: "packs", store: "supermarket" },
  { name: "Paper towel (backup)", zone: "orange", category: "Cleaning", quantity: 4, threshold: 2, unit: "rolls", store: "supermarket" },
  { name: "Garbage bags", zone: "orange", category: "Cleaning", quantity: 2, threshold: 1, unit: "packs", store: "supermarket" },
  { name: "Small tie / nappy bags", zone: "orange", category: "Cleaning", quantity: 1, threshold: 1, unit: "pack", store: "supermarket" },
  { name: "Fragrance-free laundry detergent", zone: "orange", category: "Laundry", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Bathroom cleaner", zone: "orange", category: "Cleaning", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Toilet cleaner", zone: "orange", category: "Cleaning", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Kitchen / multipurpose cleaner", zone: "orange", category: "Cleaning", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Waterproof mattress protector", zone: "orange", category: "Linen", quantity: 1, threshold: 1, store: "department" },
  { name: "Vomit bucket / bowl (dedicated)", zone: "orange", category: "Cleanup", quantity: 1, threshold: 1, store: "supermarket" },
  { name: "Spare pillowcases / sheets", zone: "orange", category: "Linen", quantity: 2, threshold: 1, unit: "sets", store: "department" },

  // Zone 4 — Red
  { name: "Hand sanitiser (entry)", zone: "red", category: "Hygiene", quantity: 1, threshold: 1, store: "chemist" },
  { name: "Medical masks (entry)", zone: "red", category: "PPE", quantity: 1, threshold: 1, unit: "box", store: "chemist" },
  { name: "Nitrile gloves (entry / deliveries)", zone: "red", category: "PPE", quantity: 1, threshold: 1, unit: "pack", store: "supermarket" },
  { name: "Outdoor heavy-duty gloves", zone: "red", category: "PPE", quantity: 1, threshold: 1, unit: "pairs", store: "supermarket" },
  { name: "Dog waste bags", zone: "red", category: "Pet", quantity: 1, threshold: 1, unit: "roll", store: "supermarket" },
  { name: "Parcel-opening scissors / cutter", zone: "red", category: "Entry", quantity: 1, threshold: 1, store: "department" },
];

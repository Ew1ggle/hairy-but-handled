export type Phase = "green" | "amber" | "red";

export type SideEffect = {
  id: string;
  title: string;
  subtitle?: string;
  phase: Phase;
  keywords: string[];
  description: string;
  symptoms?: string[];
  whatToDo?: string[];
  urgent?: string[];
  urgentAction?: "call" | "ed";
  escalation?: string;
};

export const PHASE_LABEL: Record<Phase, string> = {
  green: "Green — Watch and manage at home",
  amber: "Amber — Call the treating team same day",
  red: "Red — Go to ED / urgent medical help now",
};

export const PHASE_COLOUR: Record<Phase, { bg: string; text: string; border: string }> = {
  green: { bg: "#e8f5e9", text: "#2d7a4f", border: "#2d7a4f" },
  amber: { bg: "#fef9e7", text: "#b8860b", border: "#d4a017" },
  red: { bg: "#fde8e8", text: "#8b0000", border: "#8b0000" },
};

/** Substring search across the side-effect library — used by the directory
 *  page, the Daily Trace picker, and the Signal Sweep "Other" sheet so all
 *  three surfaces match the same way. Pass `limit` to cap dropdown lists.
 *
 *  Matching is bidirectional on a per-field basis so word variations work
 *  in both directions: a query of "fainted" matches a keyword of "faint"
 *  (query contains keyword), and "faint" matches a keyword of "fainting"
 *  (keyword contains query). The 4-char minimum on the
 *  query-contains-keyword direction prevents short queries (e.g. "ed",
 *  "or") matching short keywords spuriously. */
export function searchSideEffects(
  query: string,
  options: { limit?: number; minLength?: number } = {},
): SideEffect[] {
  const { limit, minLength = 0 } = options;
  const q = query.trim().toLowerCase();
  if (q.length < minLength || q === "") return [];
  const fieldMatches = (field: string): boolean => {
    const f = field.toLowerCase();
    if (f.includes(q)) return true;
    if (q.length >= 4 && f.length >= 4 && q.includes(f)) return true;
    return false;
  };
  const matches = SIDE_EFFECTS.filter((s) => {
    if (fieldMatches(s.title)) return true;
    if (s.keywords.some(fieldMatches)) return true;
    if (fieldMatches(s.description)) return true;
    if ((s.symptoms ?? []).some(fieldMatches)) return true;
    if ((s.whatToDo ?? []).some(fieldMatches)) return true;
    if ((s.urgent ?? []).some(fieldMatches)) return true;
    if (s.subtitle && fieldMatches(s.subtitle)) return true;
    return false;
  });
  return limit ? matches.slice(0, limit) : matches;
}

/** Canonical tag string for a side-effect added to a Daily Trace entry. */
export function tagForSideEffect(s: Pick<SideEffect, "title">): string {
  return `Side effect: ${s.title}`;
}

export const SIDE_EFFECTS: SideEffect[] = [
  // ═══════════════════════════════════════════════
  // GREEN — Watch, manage at home, mention at review
  // ═══════════════════════════════════════════════
  {
    id: "flu-mild",
    title: "Flu symptoms — mild",
    phase: "green",
    keywords: ["flu", "mild", "headache", "muscle", "ache", "joint", "fluey", "washed out", "tired", "body ache", "sore", "achy"],
    description: "Mild flu-like symptoms that can happen with treatment and may be manageable at home if they are mild, improving, and the person is otherwise okay.",
    symptoms: [
      "Mild headache",
      "Mild muscle aches",
      "Mild joint pain",
      "Feeling a bit fluey or washed out",
      "Mild tiredness",
    ],
    whatToDo: [
      "Rest",
      "Fluids if tolerated",
      "Light food or snacks",
      "Paracetamol only if the treating team has said this is okay",
      "Keep a close eye on whether symptoms are improving or worsening",
    ],
    escalation: "Move to Amber if symptoms persist, worsen, or start interfering with eating, drinking, or daily functioning",
  },
  {
    id: "taste-smell",
    title: "Taste and smell changes",
    phase: "green",
    keywords: ["taste", "smell", "metallic", "bland", "food", "funny taste", "can't taste", "everything tastes", "mouth", "bitter", "wrong taste"],
    description: "Food may taste metallic, bland, or different. Smells may seem stronger, weaker, or unpleasant.",
    symptoms: [
      "Food tastes metallic, bland, or \"wrong\"",
      "Smells seem stronger, weaker, or unpleasant",
      "Reduced interest in food because it tastes off",
    ],
    whatToDo: [
      "Small frequent meals",
      "Cold foods if smells are bothering them",
      "Stronger flavours if bland food is unappealing",
      "Good mouth care",
    ],
    escalation: "Move to Amber if intake drops or weight loss starts",
  },
  {
    id: "appetite-mild",
    title: "Mild appetite loss",
    phase: "green",
    keywords: ["appetite", "hungry", "eating", "not eating", "can't eat", "full", "don't want to eat", "weight loss", "food", "skinny"],
    description: "You may not feel as hungry as usual. This is common during treatment.",
    symptoms: [
      "Not very hungry",
      "Eating less than usual",
      "Getting full quickly",
    ],
    whatToDo: [
      "Small frequent snacks",
      "Easy high-protein foods",
      "Fluids between meals rather than during meals if fullness is a problem",
      "Keep food simple and low effort",
    ],
    escalation: "Move to Amber if food intake stays low or weakness increases",
  },
  {
    id: "hair-thinning",
    title: "Mild hair thinning",
    phase: "green",
    keywords: ["hair", "thinning", "loss", "scalp", "dry hair", "falling out", "bald", "shedding", "hair coming out", "patchy"],
    description: "Hair may shed more than usual, feel dry or fragile, or thin in patches.",
    symptoms: [
      "Hair shedding more than usual",
      "Hair feels dry or fragile",
      "Patchy thinning",
    ],
    whatToDo: [
      "Gentle hair care",
      "Soft brush",
      "Avoid harsh heat, bleach, or strong products",
      "Protect scalp from sun",
    ],
  },

  // ═══════════════════════════════════════════════
  // AMBER — Call the treating team the same day
  // ═══════════════════════════════════════════════
  {
    id: "flu-moderate",
    title: "Flu symptoms — more than mild",
    phase: "amber",
    keywords: ["flu", "fever", "chills", "sweats", "muscle", "joint", "cough", "headache", "rituximab", "shivering", "aching", "body ache", "hot", "cold", "temperature", "sore", "feverish", "unwell"],
    description: "Flu-like symptoms that are more than mild and need same-day contact with the treating team.",
    symptoms: [
      "Feverish feeling",
      "Chills or sweats",
      "Headache that keeps going",
      "Muscle and joint pain",
      "Dry cough",
      "Feeling significantly unwell",
    ],
    whatToDo: [
      "Rest",
      "Fluids if tolerated",
      "Temperature check",
      "Write down when symptoms started and whether they are getting worse",
    ],
    urgentAction: "call",
    escalation: "Move to Red if there is shaking chills, breathing trouble, chest symptoms, or the person deteriorates quickly",
  },
  {
    id: "nausea-vomiting",
    title: "Nausea and vomiting",
    phase: "amber",
    keywords: ["nausea", "vomit", "sick", "throw up", "queasy", "stomach", "tummy", "gagging", "dry retching", "can't eat", "food", "retching"],
    description: "Feeling sick, retching, or vomiting. Not managing food or drinking less because nausea is too strong.",
    symptoms: [
      "Feeling sick",
      "Retching",
      "Vomiting",
      "Not managing food",
      "Drinking less because nausea is too strong",
    ],
    whatToDo: [
      "Take anti-nausea meds on time — don't wait until vomiting starts",
      "Use small amounts often, not full meals",
      "Try dry toast, crackers, plain rice, yoghurt, icy poles — whatever bland food they tolerate",
      "Sip fluids slowly through the day rather than a big glass at once",
      "If smells trigger nausea, switch to cold foods or food that doesn't need cooking",
      "If movement makes it worse, keep upright but still",
    ],
    urgent: [
      "Call the team if eating almost nothing or vomiting repeatedly",
      "Call the team if looking weak or dry",
    ],
    urgentAction: "call",
    escalation: "Move to Red and go to ED if fluids will not stay down, they are confused, very dizzy, or barely peeing",
  },
  {
    id: "diarrhoea",
    title: "Diarrhoea",
    phase: "amber",
    keywords: ["diarrhoea", "diarrhea", "loose", "bowels", "stool", "poo", "runny", "watery", "cramping", "bloating", "stomach pain", "tummy", "toilet", "urgent bowel"],
    description: "Loose, frequent stools with possible cramping, bloating, urgency, or weakness from fluid loss.",
    symptoms: [
      "Loose stools",
      "Frequent stools",
      "Cramping",
      "Bloating",
      "Urgency",
      "Weakness or dizziness from fluid loss",
    ],
    whatToDo: [
      "Track each loose motion since the last check — count matters",
      "Switch fluids to small frequent sips, not big glasses",
      "Keep food simple: toast, rice, banana, plain crackers, soup if tolerated",
      "Avoid rich, greasy, spicy, or very fibrous foods while it is active",
      "Note any cramping, dry mouth, weakness, or reduced urine — these flag dehydration",
      "Don't push through normal activity if getting weak or light-headed",
      "Anti-diarrhoea medication only if the treating team has advised it",
    ],
    urgent: [
      "Call the team if diarrhoea is ongoing or clearly worsening",
      "Call the team if dry mouth, dark urine, or weakness suggest dehydration is starting",
    ],
    urgentAction: "call",
    escalation: "Move to Red and go to ED if diarrhoea is uncontrolled, the person is dizzy on standing, confused, or not keeping up with fluids",
  },
  {
    id: "fatigue-significant",
    title: "Fatigue — significant",
    phase: "amber",
    keywords: ["fatigue", "tired", "exhausted", "sleepy", "low energy", "no energy", "wiped out", "can't get up", "weak", "weakness", "lethargic", "flat", "drained", "stamina"],
    description: "Unusually exhausted, can't get through normal daily tasks, sleeping much more than usual.",
    symptoms: [
      "Unusually exhausted",
      "Can't get through normal daily tasks",
      "Sleeping much more",
      "Weakness",
      "Low stamina",
    ],
    whatToDo: [
      "Rest",
      "Prioritise only essential tasks",
      "Gentle movement if tolerated",
      "Food and fluids where possible",
      "Ask for help rather than pushing through",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if fatigue comes with chest pain, breathlessness, severe dizziness, or a racing heart",
  },
  {
    id: "fainting-dizziness",
    title: "Fainting or dizziness on standing",
    phase: "amber",
    keywords: ["faint", "fainting", "dizzy", "dizziness", "light-headed", "lightheaded", "wobble", "wobbly", "blacking out", "black out", "passed out", "near faint", "near-faint", "postural", "postural hypotension", "low blood pressure", "head rush", "greying out", "vision goes"],
    description: "Light-headed, wobbly, or feeling like you might black out — particularly when going from lying or sitting to standing. Common at the end of an infusion or in the hours after, when fluids are low, or when blood pressure drops. A single mild episode at end-of-treatment that settles with the sit→stand→wait protocol below is not automatically a tripwire — escalation is for repeat episodes, severe symptoms, or anything from the red list.",
    symptoms: [
      "Light-headed when standing up",
      "Vision greying out briefly",
      "Wobbly on legs",
      "Near-fainting feeling",
      "A frank faint",
    ],
    whatToDo: [
      "If dizzy now — sit or lie down immediately",
      "When the dizziness settles, sit upright with feet on the floor for a few minutes",
      "Stand and stay still — do not walk yet",
      "Only walk slowly once standing feels steady, with no greying out, nausea, or wobble",
      "If symptoms come back, sit or lie back down straight away",
      "Drink some water before getting up if fluids have been low",
      "Pump ankles or march legs a bit before standing",
      "Do not be left alone if this has happened before today",
    ],
    urgent: [
      "Call the team if it has happened more than once today",
      "Call the team if it happens around an infusion — rituximab can drop blood pressure and meds may need review",
    ],
    urgentAction: "call",
    escalation: "Move to Red and go to ED now if fainting comes with chest pain, shortness of breath, palpitations, confusion, head injury, or the person doesn't recover quickly",
  },
  {
    id: "low-white-cells",
    title: "Low white cells / infection risk",
    phase: "amber",
    keywords: ["infection", "neutropenia", "neutrophils", "white cells", "fever", "temperature", "sore throat", "cough", "shivering", "sweats", "chills", "hot", "unwell", "mouth ulcer", "shortness of breath", "fast heart", "racing heart"],
    description: "Signs that suggest possible infection when white cells are low. This needs same-day contact with the treating team.",
    symptoms: [
      "Feeling generally unwell",
      "Fever, chills, or sweats",
      "Sore throat",
      "Cough",
      "Mouth ulcers",
      "New shortness of breath",
      "Repeated or unusual infections",
    ],
    whatToDo: [
      "Temperature check",
      "Good hand hygiene",
      "Mouth care",
      "Avoid contact with sick people",
      "Do not wait to \"see how it goes\" if infection is possible",
    ],
    urgent: ["Call the treating team immediately"],
    urgentAction: "call",
    escalation: "Move to Red if the person becomes acutely unwell, develops breathing symptoms, or has severe chills or rigors",
  },
  {
    id: "bleeding-bruising",
    title: "Bleeding or bruising concerns",
    phase: "amber",
    keywords: ["platelets", "bleeding", "bruising", "thrombocytopenia", "clot", "blood", "nose bleed", "gums", "petechiae", "spots", "purple spots", "red spots", "heavy period", "black stool", "cut won't stop"],
    description: "Easy bruising, nosebleeds, bleeding gums, or tiny red/purple spots on the skin.",
    symptoms: [
      "Easy bruising",
      "Nosebleeds",
      "Bleeding gums",
      "Tiny red or purple spots on the skin (petechiae)",
      "Bleeding that seems unusual",
    ],
    whatToDo: [
      "Avoid knocks and falls",
      "Use a soft toothbrush",
      "Avoid aspirin or anti-inflammatories unless the doctor has specifically approved them",
      "Avoid constipation and straining",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if bleeding is heavy, persistent, or accompanied by faintness or severe weakness",
  },
  {
    id: "rash-mild",
    title: "Rash — mild to moderate",
    phase: "amber",
    keywords: ["rash", "skin", "itch", "dry", "bumpy", "spots", "red skin", "flaky", "peeling", "irritated", "dermatitis", "blotchy"],
    description: "Red, itchy, raised, blotchy, or dry irritated skin.",
    symptoms: [
      "Red rash",
      "Itchy rash",
      "Raised or blotchy rash",
      "Dry irritated skin",
    ],
    whatToDo: [
      "Gentle moisturiser",
      "Avoid scratching",
      "Protect skin from sun",
      "Loose soft clothing",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if the rash is painful, blistering, widespread, or involves the mouth or eyes",
  },
  {
    id: "eye-irritation",
    title: "Eye irritation / conjunctivitis",
    phase: "amber",
    keywords: ["eye", "eyes", "red eye", "itchy eye", "conjunctivitis", "watery eyes", "swollen eye", "sore eye", "blurry", "vision", "sticky", "discharge"],
    description: "Red, itchy, swollen, or sticky eyes with irritation.",
    symptoms: [
      "Red eyes",
      "Itchy eyes",
      "Swollen eyes",
      "Sticky discharge",
      "Irritation",
    ],
    whatToDo: [
      "Good hand hygiene",
      "Avoid rubbing eyes",
      "Follow team advice about drops if prescribed",
    ],
    urgent: ["Call the treating team"],
    urgentAction: "call",
  },
  {
    id: "liver-warning",
    title: "Liver warning signs",
    phase: "amber",
    keywords: ["liver", "jaundice", "yellow", "dark urine", "pale stool", "itching", "abdomen", "abdominal pain", "right side pain", "yellowing"],
    description: "Signs that may indicate a liver problem. This needs review rather than home treatment.",
    symptoms: [
      "Yellow skin or eyes (jaundice)",
      "Dark urine",
      "Pale stools",
      "Itching",
      "Right-sided abdominal pain",
      "Nausea with appetite loss",
    ],
    urgent: ["Call the treating team promptly"],
    urgentAction: "call",
  },

  // ═══════════════════════════════════════════════
  // RED — Go to ED / get urgent medical help now
  // ═══════════════════════════════════════════════
  {
    id: "cold-sores",
    title: "Cold sores / oral herpes",
    phase: "amber",
    keywords: ["cold sore", "cold sores", "herpes", "hsv", "lip blister", "fever blister", "tingling lip", "burning lip"],
    description: "Tingling, burning, or blisters around the lips or mouth. Not trivial when immunity is low — HSV/VZV prophylaxis is commonly prescribed on cladribine for exactly this reason.",
    symptoms: [
      "Tingling or burning on the lip",
      "Small blisters or fever blisters",
      "Painful sores around the lips or mouth",
    ],
    whatToDo: [
      "Keep the area clean",
      "Do not pick at sores",
      "Do not share drinks, utensils, or lip products",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if there is fever, rapidly worsening pain, sores spreading beyond the lip, or the person cannot eat or drink",
  },
  {
    id: "mouth-ulcers-thrush",
    title: "Mouth ulcers / white patches / thrush-type symptoms",
    phase: "amber",
    keywords: ["mouth ulcer", "mouth ulcers", "thrush", "white patch", "white patches", "tongue coating", "sore mouth", "stomatitis", "mucositis", "angular cheilitis"],
    description: "Sores or white coating in the mouth or on the tongue are infection warning signs during cancer treatment.",
    symptoms: [
      "Mouth ulcers",
      "White patches or coating on the tongue or mouth",
      "Red sore mouth",
      "Pain when eating or swallowing",
      "Cracks at the corners of the mouth",
    ],
    whatToDo: [
      "Gentle mouth care with a soft toothbrush",
      "Soft, cool foods",
      "Avoid acidic or spicy food",
      "Flag early if swallowing becomes harder",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if the person cannot eat or drink, or pain is severe",
  },
  {
    id: "sore-throat-cough",
    title: "Sore throat / cough / possible chest infection",
    phase: "amber",
    keywords: ["sore throat", "throat", "cough", "chesty", "hoarse", "voice", "chest infection", "respiratory"],
    description: "A new sore throat, cough, or chesty feeling is a classic infection warning sign in cancer treatment.",
    symptoms: [
      "New sore throat",
      "New cough",
      "Hoarse voice",
      "Chesty feeling",
      "Feeling unwell with cold-like symptoms",
    ],
    whatToDo: [
      "Check temperature",
      "Rest",
      "Track when it started and whether it is getting worse",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if there is shortness of breath, fever 37.8°C or higher, or rapid worsening",
  },
  {
    id: "uti-signs",
    title: "UTI signs / burning urination / cloudy urine",
    phase: "amber",
    keywords: ["uti", "urinary", "burning pee", "pee", "urine", "cloudy urine", "bloody urine", "lower tummy", "frequency", "urgency", "back pain", "cystitis"],
    description: "Pain or burning when passing urine, urgency, frequency, or cloudy/bloody urine are infection warning signs. Can become serious quickly when immunity is low.",
    symptoms: [
      "Pain or burning when peeing",
      "Urgency",
      "Needing to pee more often than usual",
      "Cloudy or bloody urine",
      "Lower tummy pain",
      "Back pain",
      "Shivering or worsening confusion in frailer patients",
    ],
    whatToDo: [
      "Drink fluids if not fluid restricted",
      "Do not sit on it for days waiting for it to settle",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if there is fever, shivering, confusion, or worsening back pain",
  },
  {
    id: "skin-line-infection",
    title: "Skin, wound, or line-site infection",
    phase: "amber",
    keywords: ["skin infection", "wound", "wound infection", "line", "picc", "central line", "cannula", "port", "cellulitis", "red skin", "hot skin", "pus", "swelling"],
    description: "Redness, heat, swelling, pus, or a wound getting worse instead of healing — especially around a catheter or line site.",
    symptoms: [
      "Red, hot, painful skin",
      "Swelling",
      "Pus or ooze",
      "A wound that is inflamed or not healing",
      "Redness or swelling where a line enters the body",
    ],
    whatToDo: [
      "Keep the area clean and dry",
      "Do not squeeze or pick at it",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if redness is spreading fast, there is fever, or the person looks systemically unwell",
  },
  {
    id: "shingles",
    title: "Shingles warning signs",
    phase: "amber",
    keywords: ["shingles", "vzv", "varicella", "zoster", "tingling skin", "itching patch", "pain before rash", "band of pain", "stripe rash"],
    description: "Tingling, itching or pain on one side of the body or face, then a blistering rash in a strip. On cladribine, VZV prophylaxis is often considered — do not wait this one out.",
    symptoms: [
      "Tingling, itching, or pain on one side of the body or face",
      "A blistering rash in a strip or patch",
      "Sometimes fever before the rash appears",
    ],
    whatToDo: [
      "Get reviewed early — antivirals work best started early",
      "Avoid scratching or breaking blisters",
    ],
    urgent: ["Call the treating team the same day"],
    urgentAction: "call",
    escalation: "Move to Red if the rash is widespread, the person is very unwell, or the eye area is involved",
  },
  {
    id: "breathing-symptoms",
    title: "Breathing symptoms — significant",
    phase: "red",
    keywords: ["breathless", "shortness of breath", "sob", "rapid breathing", "tight chest", "wheeze", "struggling to breathe", "can't breathe"],
    description: "New or worsening shortness of breath, rapid breathing, or chest tightness. Can signal infection, reaction, or anaemia.",
    symptoms: [
      "Shortness of breath",
      "Rapid breathing",
      "Tight chest",
      "Struggling to speak comfortably",
    ],
    whatToDo: [
      "Go to ED now",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
  {
    id: "severe-mouth-throat",
    title: "Severe mouth or throat symptoms",
    phase: "red",
    keywords: ["severe mouth pain", "can't swallow", "can't eat", "can't drink", "severe throat", "severe mucositis", "severe stomatitis"],
    description: "Mouth or throat symptoms bad enough the person cannot eat or drink. Needs urgent review.",
    symptoms: [
      "Mouth sores or white patches so severe the person cannot eat or drink",
      "Severe throat pain",
      "Trouble swallowing",
      "Marked weakness from poor intake",
    ],
    whatToDo: [
      "Go to ED / urgent review now",
    ],
    urgent: ["Go to ED / urgent review now"],
    urgentAction: "ed",
  },
  {
    id: "serious-infection",
    title: "Serious infection / neutropenic-type symptoms",
    phase: "red",
    keywords: ["infection", "fever", "high fever", "chills", "rigors", "shaking", "unwell", "shortness of breath", "fast heart", "racing heart", "chest", "sore throat", "temperature", "38", "sepsis"],
    description: "These symptoms suggest a potentially serious infection. Do not try to manage this at home.",
    symptoms: [
      "High fever or rapidly rising fever",
      "Chills with shaking (rigors)",
      "Feeling suddenly very unwell",
      "Shortness of breath",
      "Fast heart rate",
      "New chest symptoms",
      "Severe sore throat with feeling systemically unwell",
    ],
    whatToDo: [
      "Do not try to manage this at home",
      "Take medication lists and treatment details with you",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
  {
    id: "allergic-reaction",
    title: "Allergic or infusion reaction",
    phase: "red",
    keywords: ["allergy", "allergic", "anaphylaxis", "rash", "itch", "wheeze", "dizzy", "faint", "hives", "swelling", "breathing", "throat", "tongue", "lips", "chest tightness", "palpitations", "infusion reaction"],
    description: "Signs of a serious allergic or infusion-related reaction. This needs urgent medical help.",
    symptoms: [
      "Wheeze",
      "Shortness of breath",
      "Chest tightness",
      "Throat tightness",
      "Hives",
      "Widespread rash",
      "Feeling faint",
      "Palpitations",
      "Severe chills during or after infusion",
    ],
    whatToDo: [
      "If still at hospital, tell staff immediately",
      "If already home, seek urgent help",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
  {
    id: "severe-dehydration",
    title: "Severe dehydration from vomiting or diarrhoea",
    phase: "red",
    keywords: ["dehydration", "can't keep fluids", "vomiting", "diarrhoea", "dizzy", "light-headed", "dry mouth", "weakness", "fainting", "not drinking"],
    description: "Cannot keep fluids down, ongoing vomiting or severe diarrhoea with signs of dehydration.",
    symptoms: [
      "Cannot keep fluids down",
      "Ongoing vomiting",
      "Severe diarrhoea",
      "Dizziness",
      "Light-headedness",
      "Dry mouth",
      "Marked weakness",
    ],
    whatToDo: [
      "This usually needs urgent medical assessment",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
  {
    id: "severe-bleeding",
    title: "Severe bleeding",
    phase: "red",
    keywords: ["bleeding", "heavy bleeding", "nosebleed", "vomiting blood", "blood in stool", "bruises", "faint", "won't stop bleeding", "haemorrhage"],
    description: "Bleeding that won't stop, heavy nosebleed, vomiting blood, blood in stool, or large unexplained bruises with feeling unwell.",
    symptoms: [
      "Bleeding that will not stop",
      "Heavy nosebleed",
      "Vomiting blood",
      "Blood in stool",
      "Large unexplained bruises with feeling faint or unwell",
    ],
    whatToDo: [
      "Apply pressure if appropriate, but do not delay urgent help",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
  {
    id: "severe-skin",
    title: "Severe skin reaction",
    phase: "red",
    keywords: ["severe rash", "blister", "skin", "mouth ulcer", "SJS", "mouth sore", "can't swallow", "sore mouth", "painful rash", "peeling skin", "stevens johnson", "burning skin", "fever plus rash"],
    description: "A severe skin reaction that may involve painful blistering, widespread rash, or mouth involvement. Do not try to treat this at home.",
    symptoms: [
      "Painful rash",
      "Blistering rash",
      "Widespread rash",
      "Mouth ulcers",
      "Pain with swallowing",
      "Sore eyes with rash",
      "Skin peeling",
      "Fever plus rash",
    ],
    whatToDo: [
      "Do not try to treat this at home",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
  {
    id: "neurological",
    title: "Neurological red flags",
    phase: "red",
    keywords: ["pml", "brain", "speech", "vision", "confusion", "memory", "seizure", "weakness", "slurred", "can't talk", "can't see", "balance", "coordination", "walking", "personality change", "clumsy", "numbness", "tingling", "fit"],
    description: "Neurological symptoms that need urgent assessment. Keep the person safe and do not leave them alone.",
    symptoms: [
      "Confusion",
      "Personality change",
      "Speech difficulty",
      "Vision change",
      "Memory change",
      "Weakness",
      "Poor balance",
      "Seizure",
    ],
    whatToDo: [
      "Keep the person safe and do not leave them alone",
    ],
    urgent: ["Go to ED now"],
    urgentAction: "ed",
  },
];

export type TonePreference = "positive" | "spicy" | "both";

const POSITIVE: string[] = [
  "I back myself.",
  "I am still me.",
  "My life is still mine.",
  "I have a future beyond this.",
  "I am not only living between appointments.",
  "I still have good years ahead of me.",
  "I am allowed to expect more than mere survival.",
  "I can take this seriously without letting it swallow everything.",
  "I am still capable of a good day.",
  "I am not reduced to medical language.",
  "I can trust myself through this.",
  "I am not the bleakest version of this story.",
  "I still belong to life, not just treatment.",
  "I have more ahead of me than this.",
  "I am still allowed to want things.",
  "I am still allowed to plan things.",
  "I am not a pause button.",
  "I am not disappearing into this.",
  "I can have a real life while dealing with this.",
  "I am still a person, not a project.",
  "I am not here only to endure.",
  "I still have range beyond being unwell.",
  "I can be realistic and still expect things to improve.",
  "I do not owe this my entire identity.",
  "I still get to be interesting, funny, difficult, and alive.",
  "I can build a life around this without giving in to it.",
  "I am not handing over the whole map.",
  "I still have agency here.",
  "I am not finished with myself.",
  "I am still allowed ambition.",
  "I still have parts of my life worth protecting.",
  "I can be altered without being erased.",
  "I am still in charge of my tone.",
  "I am still capable of joy that is not fake.",
  "I can meet this without becoming it.",
  "I am not obligated to become small.",
  "I still have a self outside of illness.",
  "I am allowed to believe in a version of life after this.",
  "I am not done making memories.",
  "I still get to look forward to things.",
  "I am not only a body in treatment.",
  "I can keep my standards.",
  "I can keep my humour.",
  "I can keep my mind.",
  "I am still building something.",
  "I am still worth betting on.",
  "I do not need to feel inspired to keep going.",
  "I can move forward without making it pretty.",
  "I am still here in full.",
  "I am not done yet.",
];

const SPICY: string[] = [
  "Cancer Can Get Fucked",
  "Powered by Spite and Oncology",
  "On Treatment. Off Patience.",
  "Remission Is the Vibe",
  "Soft Clothes. Hard Attitude.",
  "Nauseous, Not Defeated",
  "Very Sick. Still Iconic.",
  "Good Vibes Not Required",
  "Bald by Science",
  "Resting Chemo Face",
  "Fluids, Meds, Menace",
  "Cancer Hates My Attitude",
  "Scans Can Mind Their Business",
  "This Is Bullshit Actually",
  "Fragile? Incorrect.",
  "Delicate? Try Dangerous.",
  "Full of Meds and Opinions",
  "Unwell but Hilarious",
  "Surviving Out Loud",
  "Healing and Swearing",
  "Cute, But in Treatment",
  "Medically Busy",
  "This Better Be Worth It",
  "Under Construction",
  "Running on Antiemetics and Spite",
  "My Bloodwork Is Being Dramatic",
  "Still Here. Still Rude.",
  "Hospital Parking Broke Me First",
  "I Did Not Order This",
  "One Scan from Snapping",
  "Treatment Chic",
  "Bravery with Side Effects",
  "IV Drip. Sharp Tongue.",
  "Too Tired for This",
  "Barely Polite. Still Alive.",
  "My Oncologist Does My Hair",
  "Main Character, Minor Blood Crisis",
  "Powered by Rage and Electrolytes",
  "Hopeful, Hostile, Hydrated",
  "Just Here for Remission",
  "Chemo, But Make It Rude",
  "Tired as Hell. Still Here.",
  "Survive First. Inspire Never.",
  "Clinically Over It",
  "Medically Excused From Nonsense",
  "Oncology Override Pass",
  "Official Exemption From Absolutely All Bullshit",
  "Authority to Decline Literally Anything",
  "Universal Opt-Out Token",
  "No Thanks, I Have Cancer",
];

const DARK: string[] = [
  "I can hate this and still keep going.",
  "I do not need to be cheerful to be coping.",
  "I can be scared and still functional.",
  "I am allowed to be hopeful without being fake.",
  "I can trust treatment and still hate it.",
  "I do not owe anyone a brave face.",
  "I can take this one appointment at a time.",
  "I am allowed to protect my peace aggressively.",
  "This is awful, and I am still handling it.",
  "I can be furious and still forward-moving.",
  "I do not need to turn this into a lesson.",
  "I am allowed to say this is unfair.",
  "I can have a bad day without making it my whole life.",
  "I do not need to package my pain neatly.",
  "I can be honest without being hopeless.",
  "I am still more than appointments and results.",
  "I am allowed to be both hopeful and pissed off.",
  "I can rest without acting like I earned it.",
  "I do not need to perform resilience.",
  "I can survive ugly days too.",
  "I am not weak because treatment knocks me flat.",
  "I can laugh without pretending this is funny.",
  "I am allowed to want my old life back.",
  "I can keep going without making it inspiring.",
  "This may be ruining my schedule, but it does not own me.",
  "I am allowed to have very low standards for today.",
  "I can cry, swear, nap, and continue.",
  "I do not need a silver lining to keep living.",
  "I can be exhausted and still unbroken.",
  "I am still myself, even when I feel nothing like myself.",
  "I can be grateful for help and still pissed off I need it.",
  "I am allowed to disappear into rest.",
  "I can be the patient and still be funny.",
  "I do not need to rise above. Enduring is enough.",
  "I am allowed to cancel nonsense without guilt.",
  "I can hate this and still believe things may improve.",
  "I am not less lovable because my body is struggling.",
  "I can trust medicine and still resent the process.",
  "I am allowed to want comfort more than growth.",
  "I can let this be awful without letting it be everything.",
  "I do not owe this my personality.",
  "I can be realistic without surrendering.",
  "I am still a person, not a diagnosis in a chair.",
  "I can feel wrecked and still be fully here.",
  "I am allowed to have no inspiring takeaway whatsoever.",
  "I can be soft with myself and brutal with the bullshit.",
  "I do not need to smile through this to count as strong.",
  "I am allowed to make today very small.",
  "I can carry fear and still show up.",
  "Today I endure like an absolute menace.",
];

const HCL: string[] = [
  "Hairy Cell Leukemia. Bad Branding.",
  "Not That Kind of Hairy",
  "Hairy Cells. Bald Me.",
  "The Hair Is Misplaced",
  "Bone Marrow Gone Feral",
  "The Leukemia Gets Hair. I Don't.",
  "My Marrow Is Unsupervised",
  "Weird Name. Same Bitch.",
  "Rare Disease. Loud Attitude.",
  "HCL. Ridiculous Name. Serious Rage.",
  "Smooth Scalp. Shaggy Cells.",
  "My Cells Need Supervision",
  "Hair in All the Wrong Places",
  "My diagnosis sounds made up, unfortunately.",
  "Hairy Cell Leukemia sounds like a Muppet.",
  "Hairy Cell Leukemia: the Muppet of all cancers.",
  "Hairy Cell Leukemia sounds like a joke. The chemo does not.",
  "My diagnosis sounds fake. My treatment plan disagrees.",
  "My bone marrow has committed to a deeply stupid bit.",
  "Interesting that the leukemia gets to be hairy and I do not.",
];

/**
 * Get today's affirmation based on the user's tone preference.
 * Uses the date as a seed so it changes daily but stays consistent throughout the day.
 */
export function getTodayAffirmation(tone: TonePreference): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  let pool: string[];
  if (tone === "positive") {
    pool = POSITIVE;
  } else if (tone === "spicy") {
    pool = [...SPICY, ...DARK, ...HCL];
  } else {
    pool = [...POSITIVE, ...SPICY, ...DARK, ...HCL];
  }

  return pool[dayOfYear % pool.length];
}

/**
 * Determine if the affirmation is from a spicy/dark/hcl group (for styling).
 */
export function isSpicyAffirmation(text: string): boolean {
  return SPICY.includes(text) || DARK.includes(text) || HCL.includes(text);
}

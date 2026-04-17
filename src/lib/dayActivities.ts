export type DayColour = "red" | "yellow" | "green" | "";
export type ActiveDayColour = "red" | "yellow" | "green";

export const DAY_DEFINITIONS: Record<Exclude<DayColour, "">, { label: string; description: string }> = {
  red: {
    label: "Red day",
    description: "Your body is saying absolutely not. This is the day for nausea, shakiness, feeling flat, dizzy, achey, emotional, foggy, wiped out, or unable to focus. You may be mostly bed-bound or couch-bound. The goal is comfort, soothing, and tiny moments of pleasure — not achievement.",
  },
  yellow: {
    label: "Yellow day",
    description: "Your body is saying maybe, but don't get cocky. You can sit up, maybe shower, maybe do one or two things, but there is a real risk of overdoing it and paying for it later. The goal is gentle engagement without a crash.",
  },
  green: {
    label: "Green day",
    description: "Your body is saying yes-ish. Symptoms are still there, but manageable. You have a clearer head or a decent energy window. The goal is something life-giving — not \"catch up on everything.\"",
  },
};

const GREEN_ACTIVITIES = [
  "A slightly longer walk outside.",
  "Very gentle yoga or tai chi at home.",
  "Sit in a café takeaway area outdoors if infection risk is low and the team says it is okay.",
  "Drive to a lookout or beach and sit there.",
  "Visit a quiet garden on an off-peak day.",
  "Bake one easy thing with help.",
  "Do a \"project in bites\" — like a scrapbook, memory book, or photo wall.",
  "Repot one plant or do a tiny bit of gardening, if your team says soil exposure is okay.",
  "Have a friend over for tea with a strict short time limit.",
  "Do nails at home, not at a salon.",
  "Browse a bookshop online or in person if safe.",
  "Build an \"after treatment\" list of trips, meals, outfits, and petty revenge goals.",
  "Cook or assemble one comfort meal in stages.",
  "Try a beginner art kit or journal collage.",
  "Do a short seated exercise video.",
  "Record voice notes about funny memories.",
  "Have a themed movie night: trashy, nostalgic, or aggressively uplifting.",
  "Write cards or messages to people.",
  "Do one small \"I still exist\" task — water herbs, order something nice, or reorganise a drawer.",
  "Make a \"things that still feel good\" list for future bad days.",
];

const YELLOW_ACTIVITIES = [
  "Sit outside with tea for 10 minutes.",
  "Do a very short walk to the letterbox, garden, or end of the driveway.",
  "Gentle stretching in a chair.",
  "One lap of the house every few hours.",
  "A simple paint-by-number or colouring page.",
  "Easy knitting, crochet, or hand sewing if you already know how.",
  "Lego, mini building kits, or simple craft kits.",
  "A \"three lines only\" journal entry.",
  "Make a playlist for a specific mood: angry, hopeful, sleepy, feral.",
  "Make a photo album on the phone.",
  "Sit with a pet.",
  "Water indoor plants.",
  "Watch one episode of a comfort show with a ritual snack.",
  "Do a crossword, word search, or low-stakes puzzle.",
  "Make a tiny \"wish list\" board of future places, meals, clothes, or books.",
  "Try a guided imagery audio.",
  "Do a short hand massage or foot massage.",
  "Write one text to one safe person.",
  "Open a window, change clothes, and sit in a different room for a reset.",
  "Fold laundry while seated — only if doing something useful feels good rather than draining.",
];

const RED_ACTIVITIES = [
  "Lie down with a \"one good song\" playlist.",
  "Listen to a comforting audiobook or podcast.",
  "Do a 5-minute guided breathing track.",
  "Try progressive muscle relaxation in bed.",
  "Put on a nature sounds track.",
  "Watch one short comedy clip — not a whole series.",
  "Smell something pleasant like a clean pillow spray or safe aromatherapy product already approved for you.",
  "Hold a heat pack or weighted blanket if comfortable.",
  "Sit in sunlight by a window for 5 to 10 minutes.",
  "Look through photos of favourite places, people, pets, or holidays.",
  "Voice-note one thought instead of journaling properly.",
  "Write one sentence: \"Today feels like ___.\"",
  "Do a tiny gratitude list with just one item.",
  "Use a colouring app or simple puzzle app on low brightness.",
  "Sip a favourite drink slowly from a nice cup.",
  "Put on clean sheets or a fresh pillowcase for a sensory reset.",
  "Ask someone to brush or braid your hair if that still feels good.",
  "Use a face mist, lip balm, or hand cream for a tiny \"human again\" ritual.",
  "Watch fish tank, fireplace, rain, or slow-travel videos.",
  "Pick a \"comfort object of the day\" — a soft blanket, hoodie, or stuffed toy.",
];

const ACTIVITIES: Record<Exclude<DayColour, "">, string[]> = {
  green: GREEN_ACTIVITIES,
  yellow: YELLOW_ACTIVITIES,
  red: RED_ACTIVITIES,
};

/**
 * Get a suggested activity for the day colour.
 * Uses the current date + hour as seed so it changes throughout the day
 * but stays consistent within the same hour.
 */
export function getSuggestedActivity(colour: Exclude<DayColour, "">): string {
  const pool = ACTIVITIES[colour];
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return pool[seed % pool.length];
}

/**
 * Get 3 suggested activities for the day colour for variety.
 */
export function getSuggestedActivities(colour: Exclude<DayColour, "">, count = 3): string[] {
  const pool = ACTIVITIES[colour];
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const result: string[] = [];
  for (let i = 0; i < count && i < pool.length; i++) {
    result.push(pool[(seed + i) % pool.length]);
  }
  return result;
}

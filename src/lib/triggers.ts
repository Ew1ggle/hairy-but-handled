/** Single source of truth for the user-facing tripwire labels.
 *  Both the Tripwires page and the in-flow MoreTripwiresPrompt render this
 *  list — keeping it here means edits don't need to be mirrored. */
export const TRIGGERS = [
  "Temperature 37.8°C or higher",
  "Chills, sweats, shivers, or shakes",
  "Shortness of breath, wheeze, chest pain, arm tingling/discomfort",
  "Uncontrolled vomiting or diarrhoea",
  "Sudden deterioration, confusion, faintness, severe weakness",
  "Severe rash, swelling, allergic reaction, or anaphylaxis symptoms",
  "New bleeding, black stools, blood in urine",
  "Severe left upper abdominal pain",
];

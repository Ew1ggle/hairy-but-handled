/** Financial + practical support protocol — curated steps for an
 *  AU patient + carer dealing with a serious diagnosis. Written as a
 *  pragmatic checklist, not as reassurance: each step has a clear
 *  outcome (assist / defer / reduce / pay / refuse in writing) so
 *  nothing stalls in "we'll think about it" land.
 *
 *  Self-update mechanism: when government policy / dollar amounts /
 *  agency phone numbers change, edit this file and redeploy — the
 *  app will pick up the new content on next load. The LAST_VERIFIED
 *  date drives a "review needed" prompt on the page if it's older
 *  than 365 days. */

export const LAST_VERIFIED = "2026-05-01";
export const REVIEW_INTERVAL_DAYS = 365;

export type SupportLink = { label: string; url: string };
export type SupportContact = { kind: "phone" | "email" | "url"; label: string; value: string };

export type SupportStep = {
  id: string;
  /** Display order — also priority. Lower numbers act first. */
  order: number;
  title: string;
  /** Short why-this-matters sentence. Plain language, no false hope. */
  why: string;
  /** Optional limitations / caveats specific to this step. */
  caveats?: string[];
  /** Specific questions / asks to direct at the org. */
  asks?: string[];
  /** Documents / evidence to gather before the call. */
  evidenceNeeded?: string[];
  /** Links to authoritative sources. */
  links?: SupportLink[];
  /** Direct contacts (phone, email, online form). */
  contacts?: SupportContact[];
  /** Expected outcome of the engagement — every contact should end
   *  with one of these so it doesn't sit in limbo. */
  expectedOutcomes: string[];
  /** Optional verbatim script — keep neutral, factual. */
  script?: string;
};

/** Limitations that apply across multiple steps. Surface at the top
 *  of the page so the user reads them before clicking through. */
export const GLOBAL_LIMITATIONS: { title: string; detail: string }[] = [
  {
    title: "Severe financial hardship release through super is usually time-gated",
    detail:
      "Generally requires receiving an eligible Centrelink income support payment for the required qualifying period (commonly 26 weeks). If a Centrelink claim has not yet been started, this is likely a later option, not an immediate fix.",
  },
  {
    title: "ATO compassionate release is for specific eligible costs only",
    detail:
      "It can support certain private medical treatment costs but requires strong medical evidence, current quotes/invoices, and a clear explanation of why the treatment is necessary AND not readily available through the public system in the clinically required form or timeframe.",
  },
  {
    title: "Terminal illness release has a strict legal test",
    detail:
      "Two registered medical practitioners must certify life expectancy of less than 24 months. Diagnosis alone does not automatically meet that test.",
  },
  {
    title: "Early super withdrawals can have tax consequences",
    detail:
      "Check tax treatment with a financial counsellor or the ATO before withdrawing anything — sometimes the take-home amount is materially less than the headline figure.",
  },
];

export const SUPPORT_STEPS: SupportStep[] = [
  {
    id: "super-insurance-check",
    order: 1,
    title: "Contact the patient's super fund — full claims and insurance check",
    why: "Insurance held inside super (Income Protection, Total & Permanent Disability, terminal illness, death) may pay an income or lump sum without draining super. This is usually the highest-value first call because outcomes don't compete with the patient's retirement balance.",
    asks: [
      "Do I have Income Protection cover?",
      "Do I have TPD (Total & Permanent Disability) cover?",
      "Do I have death or terminal illness cover?",
      "Was I ever in a Defined Benefit Division?",
      "Are there any inbuilt temporary incapacity, disablement, terminal illness or death benefits I might not know about?",
      "If I stopped working while cover was active, can a claim still be assessed against the cover that was in place at that time?",
      "Can you break my balance into preserved, restricted non-preserved, and unrestricted non-preserved components?",
      "What are the waiting periods and benefit periods on the IP cover?",
      "What is the insured monthly benefit and the TPD lump-sum amount?",
      "Has any cover lapsed? When and why?",
      "Can I lodge Income Protection and TPD claims at the same time?",
      "Can you email all current/historical insurance documents and claim forms to me?",
    ],
    evidenceNeeded: [
      "Diagnosis letter from the treating specialist",
      "Letter outlining inability to work or reduced work capacity",
      "Most recent annual super statement",
      "Employment history relevant to when cover was active",
    ],
    expectedOutcomes: [
      "Confirmation of cover types and amounts in writing",
      "Claim forms emailed",
      "Decision on whether IP + TPD can run in parallel",
    ],
  },
  {
    id: "ato-compassionate-evidence",
    order: 2,
    title: "Start the ATO compassionate release evidence pack (private medical treatment)",
    why: "The ATO can release a portion of super early to pay specific eligible private medical treatment costs. This is NOT for general living expenses. The application stands or falls on evidence — start gathering before the application.",
    caveats: [
      "Eligible categories are defined narrowly. Read the ATO guidance before applying.",
      "Wording matters: the application should explain what specific treatment is needed and why it isn't available through the public system in the clinically required form or timeframe — not just that money is needed.",
    ],
    asks: [
      "Diagnosis letter from the haematologist/oncologist",
      "Treatment plan letter",
      "Letter from a second registered medical practitioner",
      "Itemised quotes / invoices for the specific treatment",
      "Bank statements showing inability to fund the cost from existing means",
      "Medical explanation of why the treatment is necessary",
      "Medical explanation of whether the treatment is available through the public system",
      "If technically available publicly, an explanation of why it isn't available in the clinically required timeframe / form",
    ],
    links: [
      {
        label: "ATO — Access on compassionate grounds",
        url: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/early-access-to-super/access-on-compassionate-grounds/access-on-compassionate-grounds-what-you-need-to-know",
      },
      {
        label: "ATO — Eligible expenses",
        url: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/early-access-to-super/access-on-compassionate-grounds/expenses-eligible-for-release-on-compassionate-grounds",
      },
      {
        label: "ATO — How to apply",
        url: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/withdrawing-and-using-your-super/early-access-to-super/access-on-compassionate-grounds/how-to-apply-for-release-on-compassionate-grounds",
      },
    ],
    expectedOutcomes: [
      "Evidence pack assembled and uploaded with the application",
      "Written ATO decision (approval or refusal with reasons)",
    ],
  },
  {
    id: "centrelink-and-grants",
    order: 3,
    title: "Apply to Centrelink and check related grants",
    why: "Even if Centrelink doesn't fully solve income loss, an active claim is the gateway to several other supports (severe financial hardship super release, concession cards, energy concessions, mortgage relief loan eligibility). A medical certificate plus reduced-work-capacity claim is usually the right starting frame, not assuming DSP.",
    asks: [
      "Start the JobSeeker / income-support claim",
      "Get a medical certificate completed",
      "Request a medical exemption from mutual obligations if appropriate",
      "Upload all evidence",
      "Track every request and keep written copies",
    ],
    links: [
      {
        label: "Services Australia — Reduced capacity to work",
        url: "https://www.servicesaustralia.gov.au/if-you-have-reduced-capacity-to-work?context=51411",
      },
      {
        label: "Centrelink medical certificate (SU415)",
        url: "https://www.servicesaustralia.gov.au/su415",
      },
      {
        label: "Home Energy Emergency Assistance Scheme (QLD)",
        url: "https://www.qld.gov.au/community/cost-of-living-support/home-energy-emergency-assistance-scheme",
      },
      {
        label: "Medical Cooling and Heating Electricity Concession (QLD)",
        url: "https://www.qld.gov.au/community/cost-of-living-support/concessions/energy-concessions/electricity-concessions/medical-cooling-heating",
      },
      {
        label: "ATO — Defer a compulsory HELP / VSL / SFSS repayment",
        url: "https://www.ato.gov.au/individuals-and-families/study-and-training-support-loans/managing-your-loan/defer-or-amend-your-compulsory-repayment-or-overseas-levy",
      },
    ],
    expectedOutcomes: [
      "Claim lodged and reference number recorded",
      "Concession applications submitted (energy, cooling/heating)",
      "Student-loan deferral lodged where applicable",
    ],
  },
  {
    id: "mortgage-hardship",
    order: 4,
    title: "Lodge a formal mortgage hardship request with the lender",
    why: "Lenders are obliged to consider hardship variations. A documented request also stops enforcement action while it's being assessed and is required before some state mortgage relief programs.",
    asks: [
      "Repayment pause",
      "Reduced repayments",
      "Interest-only period",
      "Capitalisation of arrears if needed",
      "Loan-term extension",
      "Waiver of late fees",
      "Written decision",
      "Written reasons if refused",
    ],
    script:
      "I am in financial hardship due to medical treatment, loss of income and medical costs. I am making a formal hardship request. I need temporary repayment relief while I pursue insurance, Centrelink and medical-release options. Please confirm no enforcement action will occur while this request is assessed.",
    links: [
      {
        label: "MoneySmart — Problems paying your mortgage",
        url: "https://moneysmart.gov.au/home-loans/problems-paying-your-mortgage",
      },
      {
        label: "AFCA — Financial hardship complaints",
        url: "https://www.afca.org.au/make-a-complaint/financial-hardship-complaints",
      },
    ],
    expectedOutcomes: [
      "Written acknowledgement of the hardship request",
      "Variation offer in writing OR refusal in writing with reasons",
      "Confirmation no enforcement action while assessed",
    ],
  },
  {
    id: "qld-mortgage-relief-loan",
    order: 5,
    title: "Check Queensland Mortgage Relief Loan eligibility",
    why: "Interest-free loan up to $20,000 for short-term mortgage stress caused by illness or unemployment. Eligibility limits apply (income, property value caps). Requires that hardship assistance has already been sought from the lender — so step 4 happens first.",
    caveats: [
      "Not guaranteed — eligibility depends on income, property value and circumstances.",
      "Lender hardship request must be on file before applying.",
    ],
    links: [
      {
        label: "QLD Mortgage Relief Loan",
        url: "https://www.qld.gov.au/housing/buying-owning-home/homeowners-financial-help/mortgage-relief-loan",
      },
    ],
    expectedOutcomes: [
      "Eligibility check returned in writing",
      "Application lodged if eligible",
    ],
  },
  {
    id: "cancer-council-qld",
    order: 6,
    title: "Contact Cancer Council Queensland for financial counselling and coordination",
    why: "They offer financial counselling, can sometimes help coordinate hardship requests, and refer to legal / workplace / insurance specialists. A single point of triage often shortens the rest of the list.",
    asks: [
      "Financial counselling appointment",
      "Help with mortgage hardship paperwork",
      "Debt prioritisation guidance",
      "Help navigating super insurance claims",
      "Help with ATO compassionate release wording",
      "Centrelink advocacy",
      "Private treatment cost negotiation",
      "Legal or workplace referral if needed",
    ],
    contacts: [
      { kind: "phone", label: "13 11 20", value: "131120" },
    ],
    links: [
      {
        label: "Cancer Council QLD — Financial and legal matters",
        url: "https://cancerqld.org.au/support-services/how-we-can-help/financial-and-legal-matters/",
      },
    ],
    expectedOutcomes: [
      "Financial counselling appointment booked OR referral made",
      "Documented next-step plan in writing",
    ],
  },
  {
    id: "leukaemia-foundation",
    order: 7,
    title: "Contact the Leukaemia Foundation",
    why: "Blood-cancer-specific supports that general services often miss: transport vouchers, accommodation support if treatment requires travel, financial counselling referrals, navigation help.",
    asks: [
      "Financial counselling or referral",
      "Transport vouchers (fuel / taxi / Uber)",
      "Accommodation support if treatment is far from home",
      "Help understanding treatment cost options",
      "Blood-cancer-specific service navigation",
    ],
    contacts: [
      { kind: "phone", label: "1800 620 420", value: "1800620420" },
    ],
    links: [
      { label: "Leukaemia Foundation — Get support", url: "https://www.leukaemia.org.au/get-support/" },
      {
        label: "Financial support — accommodation and travel",
        url: "https://www.leukaemia.org.au/get-support/financial-support/",
      },
      { label: "Transport service", url: "https://www.leukaemia.org.au/get-support/transport-service/" },
    ],
    expectedOutcomes: [
      "Eligibility confirmed for any transport / accommodation / financial supports",
      "Application lodged for each applicable support",
    ],
  },
  {
    id: "specialist-cost-reduction",
    order: 8,
    title: "Ask the treating specialist about reducing private treatment costs",
    why: "Some private pathways have a clinically equivalent public option, no-gap arrangements, manufacturer compassionate access, or trial pathways that can reduce out-of-pocket costs without compromising care. Worth asking even if the answer is no.",
    asks: [
      "Is there a clinically equivalent public pathway?",
      "Can any part of treatment be shifted to a public hospital?",
      "Can pathology, imaging, infusions, pharmacy, or follow-up move into Medicare / PBS / public systems?",
      "Are there no-gap or known-gap options?",
      "Are there clinical trials I might be eligible for?",
      "Are there drug access programs or compassionate access schemes?",
      "Is any medication available through PBS, hospital formulary, Special Access Scheme, Authorised Prescriber pathway, or manufacturer compassionate access?",
    ],
    expectedOutcomes: [
      "Written summary of any cost-reduction options identified",
      "Referral letters where pathways exist",
      "Documented refusal where they don't",
    ],
  },
  {
    id: "lost-money-sweep",
    order: 9,
    title: "Sweep for hidden insurance, lost super, and unclaimed money",
    why: "Old workplaces, defunct super funds, and small balances with state trustees can add up. Forgotten policies (life, trauma, mortgage protection, credit-card protection) sometimes survive years past the original purchase.",
    asks: [
      "Old super accounts via myGov / ATO",
      "Old life insurance policies (search through old paperwork / email)",
      "Trauma or critical illness insurance",
      "Mortgage protection insurance",
      "Loan repayment / credit-card protection insurance",
      "Employer or union insurance",
      "Old workplace salary continuance cover",
      "Unclaimed money via the state trustee / ASIC's MoneySmart",
    ],
    links: [
      {
        label: "ATO — Searching for lost superannuation",
        url: "https://www.ato.gov.au/forms-and-instructions/superannuation-searching-for-lost-superannuation",
      },
      {
        label: "ASIC MoneySmart — Find unclaimed money",
        url: "https://moneysmart.gov.au/find-unclaimed-money",
      },
    ],
    expectedOutcomes: [
      "Each potential source contacted and confirmed in writing as either active, lapsed, or non-existent",
    ],
  },
  {
    id: "evidence-pack",
    order: 10,
    title: "Build one consolidated evidence pack",
    why: "Every step above will ask for the same documents. Assembling them once means each later application is faster and the wording stays consistent.",
    evidenceNeeded: [
      "Diagnosis letter",
      "Treatment plan",
      "Specialist letters",
      "Work-capacity / inability-to-work letter",
      "Itemised invoices and quotes",
      "Bank statements",
      "Mortgage statement",
      "List of debts",
      "Income before and after illness",
      "Household budget",
      "Centrelink claim evidence",
      "Super fund insurance correspondence",
      "Lender hardship request and reply",
      "ATO compassionate release documents",
      "Notes from Cancer Council and Leukaemia Foundation",
    ],
    expectedOutcomes: [
      "All documents in one folder, dated and labelled",
      "Master list of who has what so duplicate uploads are fast",
    ],
  },
];

/** Closing note — what to do when an org delays or refuses
 *  unreasonably. Surfaces below the steps so it's the last thing
 *  the user sees on the page. */
export const ESCALATION_NOTE = {
  title: "If a bank, insurer, or super fund delays or refuses unreasonably",
  detail:
    "Lodge a complaint with AFCA. Free, independent, and binding on the institution. Banks and super funds are aware of AFCA timelines and often resolve once a complaint is on file.",
  link: { label: "AFCA — Make a complaint", url: "https://www.afca.org.au/make-a-complaint" },
};

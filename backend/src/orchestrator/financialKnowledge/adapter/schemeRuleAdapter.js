"use strict";

/**
 * schemeRuleAdapter.js
 *
 * Reads the verified R&D dataset and produces explicit, machine-readable
 * eligibility rules for each scheme.
 *
 * IMPORTANT:
 *   - Only explicit, verified eligibility conditions become rules.
 *   - Benefit amounts, documents, application steps, and purpose
 *     descriptions do NOT become rules.
 *   - Every rule preserves its source reference back to the dataset.
 *   - The original schemeDataset.json is NEVER mutated.
 *
 * ─── Rule shape ────────────────────────────────────────────────────────────
 * {
 *   id            : string,   // unique rule ID
 *   schemeId      : string,   // which scheme this rule belongs to
 *   field         : string,   // field path in DecisionContext.user.*
 *   operator      : "exists" | "equals" | "oneOf" | "greaterThanOrEqual"
 *                           | "lessThanOrEqual" | "notOneOf",
 *   expectedValue : any,      // for operators that need a comparison value
 *   required      : boolean,  // true = failing = INELIGIBLE
 *                             // false = failing = INSUFFICIENT_VERIFIED_DATA
 *   isExclusion   : boolean,  // true = if this field matches → INELIGIBLE
 *   sourceReference: string,  // traceable back to the verified dataset
 *   description   : string,   // human-readable rule summary
 * }
 */

const path = require("path");
const DATASET_PATH = path.join(__dirname, "../dataset/schemeDataset.json");

// Lazy-loaded dataset — loaded once on first use
let _dataset = null;

function getDataset() {
  if (!_dataset) {
    _dataset = require(DATASET_PATH);
  }
  return _dataset;
}

// ─── Scheme → intent category mapping ────────────────────────────────────────
// Explicit mapping — never LLM-generated.
// Based on the dataset's category and purpose fields.

const SCHEME_INTENT_MAP = {
  crop_financing: [
    "pm_kisan",            // income support for landholding farmer families
    "pmfby",               // crop insurance → relevant when financing crops
    "kisan_credit_card",   // agricultural credit
    "agriculture_infrastructure_fund", // post-harvest/agri-infrastructure
  ],
  equipment_financing: [
    "kisan_credit_card",   // KCC covers allied activities including equipment
    "agriculture_infrastructure_fund",
  ],
  livestock_financing: [
    "kisan_credit_card",   // KCC covers allied activities including livestock
  ],
  insurance: [
    "pmfby",               // primary crop insurance scheme
  ],
  savings: [
    "pmjdy",               // financial inclusion / savings accounts
  ],
  investment: [
    "pmjdy",
  ],
  general_financial_guidance: [
    "pmjdy",
    "pm_kisan",
    "pmfby",
    "kisan_credit_card",
  ],
};

/**
 * Return the scheme IDs relevant for a given intent.
 * @param {string} intent
 * @returns {string[]}
 */
function getSchemesForIntent(intent) {
  return SCHEME_INTENT_MAP[intent] || [];
}

// ─── PM-KISAN rules ────────────────────────────────────────────────────────
// Source: Official PM-KISAN portal and revised operational guidelines
// Only the explicitly stated eligibility conditions from the verified dataset.
//
// NOT implemented as rules (with rationale):
//   - benefit amount (₹6,000/year) — benefit, not an eligibility condition
//   - eKYC required — a verification/registration step, not an eligibility field
//     in DecisionContext; produces INSUFFICIENT_VERIFIED_DATA if unverifiable
//   - installment schedule — operational, not eligibility
//   - application portal — operational
//   - family definition (husband/wife/minor_children) — currently unrepresented
//     in DecisionContext; if evaluated → INSUFFICIENT_VERIFIED_DATA
//   - specific exclusion sub-categories (serving vs. retired status,
//     which elected offices, which professionals) — the current FinancialProfile
//     does NOT collect these distinctions; producing INSUFFICIENT_VERIFIED_DATA
//     is safer than a coarse yes/no rule
//
// State/UT land-record identification is an official verification requirement.
// The dataset does not state that self-declared land area or ownership is an
// equivalent official record, so there are no machine-evaluable PM-KISAN
// eligibility conditions with the current DecisionContext.
const PM_KISAN_ELIGIBILITY_RULES = [];

// These are official exclusion conditions, deliberately separate from
// evaluable rules. Current profile/context data cannot assess them safely.
const PM_KISAN_EXCLUSION_CONDITIONS = [
  {
    id: "pm_kisan_statutory_exclusion_categories",
    schemeId: "pm_kisan",
    sourceReference: "PM-KISAN official portal — exclusions: institutional_land_holder, constitutional_post_holder, specified_elected_public_office_holders, serving_or_retired_specified_government_employees, specified_pensioners, income_tax_payer, specified_professionals",
    description: "Official exclusion categories must be verified: institutional landholders, specified public office holders, specified government employees or pensioners, income-tax payers, and specified professionals.",
  },
];

// These requirements preserve the dataset's facts without pretending that a
// normal profile field establishes official State/UT or scheme verification.
const PM_KISAN_VERIFICATION_REQUIREMENTS = [
  {
    id: "pm_kisan_state_ut_land_record_verification",
    schemeId: "pm_kisan",
    sourceReference: "PM-KISAN official portal — target beneficiary: cultivable land recorded in relevant State/UT land records; identification by State/UT Government",
    description: "State/UT identification and official cultivable-land record verification are required. Self-declared land area, ownership, or state is not sufficient evidence.",
  },
  {
    id: "pm_kisan_exclusion_category_verification",
    schemeId: "pm_kisan",
    sourceReference: "PM-KISAN official portal — exclusions: institutional_land_holder, constitutional_post_holder, specified_elected_public_office_holders, serving_or_retired_specified_government_employees, specified_pensioners, income_tax_payer, specified_professionals",
    description: "Verification is required that no official PM-KISAN exclusion category applies.",
  },
  {
    id: "pm_kisan_ekyc_verification",
    schemeId: "pm_kisan",
    sourceReference: "PM-KISAN official portal — verification: eKYCRequired: true",
    description: "PM-KISAN eKYC must be completed before eligibility is confirmed.",
  },
];

// ─── PMFBY rules ──────────────────────────────────────────────────────────────
// Source: PMFBY official portal and 2023 operational guidelines.
// Key condition: crop must be a notified crop in a notified area for the season.
// This is State/UT + season + crop combination — cannot be fully verified
// from current profile. All three produce INSUFFICIENT_VERIFIED_DATA.

const PMFBY_RULES = [
  {
    id:            "pmfby_crop_required",
    schemeId:      "pmfby",
    field:         "farming.crops",
    operator:      "exists",
    required:      false,
    isExclusion:   false,
    sourceReference: "PMFBY official portal — eligibility: notifiedCropRequired: true",
    description:   "A crop must be known to check if it is a notified crop.",
  },
  {
    id:            "pmfby_location_required",
    schemeId:      "pmfby",
    field:         "location.state",
    operator:      "exists",
    required:      false,
    isExclusion:   false,
    sourceReference: "PMFBY official portal — stateVariation: State/UT notifications determine notified crops, areas and seasons",
    description:   "State is required to determine notified crop/area/season.",
  },
  {
    id:            "pmfby_season_required",
    schemeId:      "pmfby",
    field:         "farming.season",
    operator:      "exists",
    required:      false,
    isExclusion:   false,
    sourceReference: "PMFBY official portal — eligibility: notifiedAreaRequired: true, deadlines are State/crop/season-specific",
    description:   "Season is required to determine if crop is notified for that season.",
  },
];

// ─── KCC rules ────────────────────────────────────────────────────────────────
// Source: PIB KCC backgrounder — lender assessment required; no single national rule.

const KCC_RULES = [
  {
    id:            "kcc_farmer_or_allied_required",
    schemeId:      "kisan_credit_card",
    field:         "farming.landArea",
    operator:      "exists",
    required:      false,
    isExclusion:   false,
    sourceReference: "PIB KCC backgrounder — eligibility: farmerOrEligibleAlliedActivityRequired: true",
    description:   "Farmer identity (via landArea presence) is required. Lender assessment applies.",
  },
];

// ─── Rule registry ────────────────────────────────────────────────────────────

const ALL_RULES = [
  ...PM_KISAN_ELIGIBILITY_RULES,
  ...PMFBY_RULES,
  ...KCC_RULES,
];

const EXCLUSION_CONDITIONS = [
  ...PM_KISAN_EXCLUSION_CONDITIONS,
];

const VERIFICATION_REQUIREMENTS = [
  ...PM_KISAN_VERIFICATION_REQUIREMENTS,
];

/**
 * Return all rules for a given scheme ID.
 * @param {string} schemeId
 * @returns {object[]}
 */
function getRulesForScheme(schemeId) {
  return ALL_RULES.filter((r) => r.schemeId === schemeId);
}

function getExclusionConditionsForScheme(schemeId) {
  return EXCLUSION_CONDITIONS
    .filter((condition) => condition.schemeId === schemeId)
    .map((condition) => ({ ...condition }));
}

function getVerificationRequirementsForScheme(schemeId) {
  return VERIFICATION_REQUIREMENTS
    .filter((requirement) => requirement.schemeId === schemeId)
    .map((requirement) => ({ ...requirement }));
}

/**
 * Return the scheme metadata from the dataset (read-only reference).
 * @param {string} schemeId
 * @returns {object|null}
 */
function getSchemeMetadata(schemeId) {
  const dataset = getDataset();
  return dataset.schemes.find((s) => s.id === schemeId) || null;
}

/**
 * Return all scheme IDs in the dataset.
 * @returns {string[]}
 */
function getAllSchemeIds() {
  const dataset = getDataset();
  return dataset.schemes.map((s) => s.id);
}

module.exports = {
  getSchemesForIntent,
  getRulesForScheme,
  getExclusionConditionsForScheme,
  getVerificationRequirementsForScheme,
  getSchemeMetadata,
  getAllSchemeIds,
  SCHEME_INTENT_MAP,
};

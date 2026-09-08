"use strict";

/**
 * informationGapService.js
 *
 * Determines which fields required for the current financial intent are
 * already known and which are still missing, given the normalised context
 * produced by contextService.buildContext().
 *
 * This service does NOT:
 *   - call Gemini or any AI provider
 *   - ask the user questions
 *   - make financial recommendations
 *   - determine scheme eligibility
 *   - access the database
 *
 * ─── Return shape ──────────────────────────────────────────────────────────
 *
 * {
 *   intent         : string,     // the intent being evaluated
 *   requiredFields : string[],   // all fields this intent needs
 *   collectedFields: string[],   // subset that are already known
 *   missingFields  : string[],   // subset that are still unknown
 *   isComplete     : boolean,    // true when missingFields is empty
 * }
 *
 * Order of requiredFields is preserved in collectedFields and missingFields.
 */

const intentDefinitions = require("../intent/intentDefinitions");

// ─── Value helper ─────────────────────────────────────────────────────────────

/**
 * Returns true only when a value represents a genuinely known piece of data.
 * null, undefined, empty strings, and empty arrays are all treated as unknown.
 *
 * @param {*} value
 * @returns {boolean}
 */
function hasMeaningfulValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

// ─── Field resolution map ─────────────────────────────────────────────────────

/**
 * Each resolver receives `knownFields` and returns true if the logical
 * field named by its key can be considered known.
 *
 * Intent definitions use a compact vocabulary ("income", "location", …).
 * knownFields may contain FinancialProfile-vocabulary keys ("farmIncome",
 * "state", …) as well as entity-vocabulary keys ("crop", "amount", …).
 * Resolvers bridge that gap in one place so the rest of the service is clean.
 */
const FIELD_RESOLVERS = {

  // ── location ──────────────────────────────────────────────────────────────
  // Satisfied as soon as state is known. District/mandal are not required here.
  location: (kf) =>
    hasMeaningfulValue(kf.state),

  // ── crop ──────────────────────────────────────────────────────────────────
  // Satisfied by a singular entity extraction OR the profile crops array.
  crop: (kf) =>
    hasMeaningfulValue(kf.crop) ||
    (Array.isArray(kf.crops) && kf.crops.length > 0),

  // ── landArea ──────────────────────────────────────────────────────────────
  landArea: (kf) =>
    hasMeaningfulValue(kf.landArea),

  // ── ownership ─────────────────────────────────────────────────────────────
  ownership: (kf) =>
    hasMeaningfulValue(kf.ownership),

  // ── season ────────────────────────────────────────────────────────────────
  // Only the current message can carry this — there is no profile field for it.
  season: (kf) =>
    hasMeaningfulValue(kf.season),

  // ── amount ────────────────────────────────────────────────────────────────
  amount: (kf) =>
    hasMeaningfulValue(kf.amount),

  // ── income ────────────────────────────────────────────────────────────────
  // Satisfied by an entity-extracted income OR either of the profile income fields.
  income: (kf) =>
    hasMeaningfulValue(kf.income)     ||
    hasMeaningfulValue(kf.farmIncome) ||
    hasMeaningfulValue(kf.otherIncome),

  // ── existingDebt ──────────────────────────────────────────────────────────
  // Satisfied by an entity-extracted debt value OR a profile loans array that
  // contains at least one loan with a meaningful amount.
  // An EMPTY existingLoans array does NOT satisfy this — we still don't know
  // whether the user has debt.
  existingDebt: (kf) => {
    if (hasMeaningfulValue(kf.existingDebt)) return true;
    if (Array.isArray(kf.existingLoans) && kf.existingLoans.length > 0) {
      return kf.existingLoans.some((loan) =>
        hasMeaningfulValue(loan && loan.amount)
      );
    }
    return false;
  },

  // ── equipment ─────────────────────────────────────────────────────────────
  equipment: (kf) =>
    hasMeaningfulValue(kf.equipment) ||
    hasMeaningfulValue(kf.equipmentType),

  // ── livestock ─────────────────────────────────────────────────────────────
  livestock: (kf) =>
    hasMeaningfulValue(kf.livestock) ||
    hasMeaningfulValue(kf.livestockType),

  // ── insuranceType ─────────────────────────────────────────────────────────
  insuranceType: (kf) =>
    hasMeaningfulValue(kf.insuranceType),

  // ── asset ─────────────────────────────────────────────────────────────────
  asset: (kf) =>
    hasMeaningfulValue(kf.asset),

  // ── monthlyExpenses ───────────────────────────────────────────────────────
  monthlyExpenses: (kf) =>
    hasMeaningfulValue(kf.monthlyExpenses),

  // ── savingsGoal ───────────────────────────────────────────────────────────
  savingsGoal: (kf) =>
    hasMeaningfulValue(kf.savingsGoal),

  // ── investmentAmount ──────────────────────────────────────────────────────
  investmentAmount: (kf) =>
    hasMeaningfulValue(kf.investmentAmount),

  // ── investmentPeriod ──────────────────────────────────────────────────────
  investmentPeriod: (kf) =>
    hasMeaningfulValue(kf.investmentPeriod),

  // ── riskPreference ────────────────────────────────────────────────────────
  riskPreference: (kf) =>
    hasMeaningfulValue(kf.riskPreference),
};

/**
 * Resolve whether a single required field is known.
 * Falls back to direct knownFields lookup for any field not in the catalogue.
 *
 * @param {string} field     — field name from intentDefinitions.requiredFields
 * @param {object} knownFields — from context.knownFields
 * @returns {boolean}
 */
function isFieldKnown(field, knownFields) {
  const resolver = FIELD_RESOLVERS[field];
  if (resolver) return resolver(knownFields);
  // Fallback: direct lookup — treats unrecognised fields conservatively
  return hasMeaningfulValue(knownFields[field]);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse the information gap for the intent carried by the current message.
 *
 * @param {object} context — normalised context from contextService.buildContext()
 * @returns {{ intent, requiredFields, collectedFields, missingFields, isComplete }}
 * @throws {Error} if context or context.currentMessage.intent is absent
 */
function analyzeInformationGap(context) {
  if (!context || typeof context !== "object") {
    throw new Error(
      "analyzeInformationGap: `context` is required and must be an object."
    );
  }

  const intent = context?.currentMessage?.intent;
  if (!intent) {
    throw new Error(
      "analyzeInformationGap: `context.currentMessage.intent` is required."
    );
  }

  const knownFields = context.knownFields || {};

  // Look up the intent definition
  const definition = intentDefinitions[intent];

  // Unknown intent → no required fields, immediately complete
  if (!definition) {
    return {
      intent,
      requiredFields:  [],
      collectedFields: [],
      missingFields:   [],
      isComplete:      true,
    };
  }

  const requiredFields  = definition.requiredFields || [];
  const collectedFields = [];
  const missingFields   = [];

  // Preserve requiredFields order in both output lists
  for (const field of requiredFields) {
    if (isFieldKnown(field, knownFields)) {
      collectedFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  return {
    intent,
    requiredFields,
    collectedFields,
    missingFields,
    isComplete: missingFields.length === 0,
  };
}

module.exports = { analyzeInformationGap };

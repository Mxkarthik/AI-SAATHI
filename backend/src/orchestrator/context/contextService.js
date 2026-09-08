"use strict";

/**
 * contextService.js
 *
 * Combines the user's persistent FinancialProfile, the current Conversation
 * state, and the latest Understanding result into a single normalised context
 * object that downstream orchestration services can inspect without knowing
 * where each piece of information originally came from.
 *
 * This service does NOT:
 *   - make financial recommendations
 *   - call Gemini or any AI provider
 *   - decide eligibility
 *   - perform database queries
 *   - mutate the inputs
 *
 * ─── Return shape ─────────────────────────────────────────────────────────
 *
 * {
 *   user: {
 *     profile: <FinancialProfile document or plain object — never mutated>
 *   },
 *   conversation: {
 *     id     : string,
 *     language: "en" | "te",
 *     intent : string | null,
 *     status : "active" | "completed" | "archived",
 *   },
 *   currentMessage: {
 *     language : "en" | "te",
 *     intent   : string,
 *     entities : object,  // only keys with non-null values from understanding
 *   },
 *   knownFields: object,  // merged view — profile values first, current entities
 *                         // override with non-null values (same-field wins for current)
 * }
 *
 * ─── knownFields structure ────────────────────────────────────────────────
 *
 * A flat-ish object that surfaces every piece of information already
 * collected, regardless of source.  Keys mirror the entity names used by
 * the understanding layer plus profile-level fields:
 *
 *   {
 *     // from profile
 *     state      : string | undefined,
 *     district   : string | undefined,
 *     mandal     : string | undefined,
 *     landArea   : number | undefined,
 *     landUnit   : string | undefined,
 *     ownership  : string | undefined,
 *     crops      : string[] | undefined,     // profile.crops array
 *     irrigation : string | undefined,
 *     farmIncome : number | undefined,
 *     otherIncome: number | undefined,
 *     monthlyExpenses: number | undefined,
 *     existingLoans  : array  | undefined,
 *     equipment  : string[] | undefined,
 *     livestock  : string[] | undefined,
 *
 *     // from current understanding entities (override profile where non-null)
 *     crop        : string | undefined,
 *     amount      : number | undefined,
 *     income      : number | undefined,
 *     existingDebt: number | undefined,
 *     equipmentType: string | undefined,
 *     livestockType: string | undefined,
 *     insuranceType: string | undefined,
 *     asset       : string | undefined,
 *     season      : string | undefined,
 *   }
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true for any value that represents real information:
 * non-null, non-undefined, non-empty-string, non-empty-array.
 */
function hasValue(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string" && v.trim() === "") return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

/**
 * Safely read a nested property from an object without throwing.
 * Returns undefined if any segment in the path is absent.
 */
function dig(obj, ...keys) {
  return keys.reduce(
    (cur, k) => (cur != null ? cur[k] : undefined),
    obj
  );
}

/**
 * Extract a flat map of known values from a FinancialProfile document.
 * Keys match the entity vocabulary used by the understanding layer where
 * possible so that later gap-analysis is straightforward.
 * Only keys whose values pass hasValue() are included — this prevents
 * "we know it's null" pollution.
 *
 * @param {object|null} profile
 * @returns {object}
 */
function extractProfileFields(profile) {
  if (!profile) return {};

  const out = {};

  // location
  if (hasValue(dig(profile, "location", "state")))
    out.state    = profile.location.state;
  if (hasValue(dig(profile, "location", "district")))
    out.district = profile.location.district;
  if (hasValue(dig(profile, "location", "mandal")))
    out.mandal   = profile.location.mandal;

  // farming
  if (hasValue(dig(profile, "farming", "landArea")))
    out.landArea  = profile.farming.landArea;
  if (hasValue(dig(profile, "farming", "landUnit")))
    out.landUnit  = profile.farming.landUnit;
  if (hasValue(dig(profile, "farming", "ownership")))
    out.ownership = profile.farming.ownership;

  // crops array — kept as-is; entity-level "crop" (singular) is separate
  if (hasValue(dig(profile, "crops")))
    out.crops = profile.crops;

  // irrigation
  if (hasValue(dig(profile, "irrigation", "typeOrSource")))
    out.irrigation = profile.irrigation.typeOrSource;

  // financial
  if (hasValue(dig(profile, "financial", "farmIncome")))
    out.farmIncome = profile.financial.farmIncome;
  if (hasValue(dig(profile, "financial", "otherIncome")))
    out.otherIncome = profile.financial.otherIncome;
  if (hasValue(dig(profile, "financial", "monthlyExpenses")))
    out.monthlyExpenses = profile.financial.monthlyExpenses;
  if (hasValue(dig(profile, "financial", "existingLoans")))
    out.existingLoans = profile.financial.existingLoans;

  // assets
  if (hasValue(dig(profile, "assets", "equipment")))
    out.equipment = profile.assets.equipment;
  if (hasValue(dig(profile, "assets", "livestock")))
    out.livestock = profile.assets.livestock;

  return out;
}

/**
 * Strip null/undefined values from the understanding entities object.
 * This ensures we only carry forward information that was actually extracted.
 *
 * @param {object|null} entities
 * @returns {object}
 */
function extractEntityFields(entities) {
  if (!entities || typeof entities !== "object") return {};

  const out = {};
  for (const [key, value] of Object.entries(entities)) {
    if (hasValue(value)) out[key] = value;
  }
  return out;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a normalised context object from profile + conversation + understanding.
 *
 * Merge rules (applied when building knownFields):
 *   1. Profile fields are the baseline.
 *   2. Current entity values override profile values for the same logical field,
 *      but ONLY when the entity value is non-null/non-undefined.
 *   3. Null/undefined entity values are silently discarded — they never
 *      overwrite existing profile information.
 *   4. Neither the profile nor the conversation object is ever mutated.
 *
 * @param {object} params
 * @param {object|null} params.profile       — FinancialProfile doc or plain obj
 * @param {object}      params.conversation  — Conversation doc or plain obj
 * @param {object}      params.understanding — result from understandWithGemini()
 * @returns {object} normalised context
 * @throws {Error} if conversation or understanding is missing
 */
function buildContext({ profile, conversation, understanding }) {
  // ── Input validation ────────────────────────────────────────────────────
  if (!conversation || typeof conversation !== "object") {
    throw new Error(
      "buildContext: `conversation` is required and must be an object."
    );
  }

  if (!understanding || typeof understanding !== "object") {
    throw new Error(
      "buildContext: `understanding` is required and must be an object."
    );
  }

  if (!understanding.intent) {
    throw new Error(
      "buildContext: `understanding.intent` is required."
    );
  }

  // ── Conversation summary ────────────────────────────────────────────────
  const conversationCtx = {
    id:       String(conversation._id || conversation.id || ""),
    language: conversation.language || "en",
    intent:   conversation.intent   || null,
    status:   conversation.status   || "active",
  };

  // ── Current message summary ─────────────────────────────────────────────
  const currentEntities = extractEntityFields(understanding.entities || {});

  const currentMessageCtx = {
    language: understanding.language || conversationCtx.language,
    intent:   understanding.intent,
    entities: currentEntities,
  };

  // ── Merge into knownFields ──────────────────────────────────────────────
  // Start from profile (baseline), then let current entities win for
  // any key they share, as long as the entity value is non-null.
  const profileFields  = extractProfileFields(profile);
  const knownFields    = { ...profileFields, ...currentEntities };
  // Note: the spread above already satisfies rule 2 because extractEntityFields
  // stripped nulls — only genuine values from entities reach knownFields.

  // ── Assemble final context ──────────────────────────────────────────────
  return {
    user: {
      // Expose the original profile object unchanged so callers that need
      // the full Mongoose document (e.g. for its _id or timestamps) can
      // access it.  We never modify it.
      profile: profile || null,
    },
    conversation: conversationCtx,
    currentMessage: currentMessageCtx,
    knownFields,
  };
}

module.exports = { buildContext };

/**
 * informationGapService.js
 *
 * Determines which fields are required for a given intent, which of those
 * are already known (from the profile, conversation history, or the current
 * message's extracted entities), and which are still missing.
 *
 * A field is "collected" if:
 *   1. It exists with a non-null/non-empty value in the FinancialProfile, OR
 *   2. It was extracted as an entity from the current message, OR
 *   3. It was extracted as an entity in a recent message's intentData.
 *
 * Return shape:
 * {
 *   requiredFields  : string[]   — all fields this intent needs
 *   collectedFields : string[]   — fields we already have values for
 *   missingFields   : string[]   — required fields we still need
 *   readyForDecision: boolean    — true when missingFields is empty
 * }
 */

const { getIntentDefinition } = require("../intent/intentDefinitions");

// ─── Profile field accessors ─────────────────────────────────────────────────

/**
 * Safely read a dot-notation path from an object.
 * Returns undefined if any segment is missing.
 */
function getPath(obj, path) {
  return path.split(".").reduce((cur, key) => {
    if (cur === null || cur === undefined) return undefined;
    return cur[key];
  }, obj);
}

/**
 * Check whether a value is "present" (non-null, non-undefined, non-empty-string,
 * non-empty-array).
 */
function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

// ─── Field resolution ────────────────────────────────────────────────────────

/**
 * Map a requiredField path to the profile's actual data path.
 * e.g. "profile.farming.landArea" → ["farming", "landArea"] on the profile object
 *      "entity.crop"              → look in entities, not the profile
 */
function resolveFromProfile(fieldPath, profile) {
  if (!fieldPath.startsWith("profile.")) return false;
  const subPath = fieldPath.slice("profile.".length); // e.g. "farming.landArea"
  const value = getPath(profile, subPath);
  return isPresent(value);
}

/**
 * Map an "entity.*" field to the entities bag extracted from the current
 * message and from recent message intentData.
 */
function resolveFromEntities(fieldPath, entities) {
  if (!fieldPath.startsWith("entity.")) return false;
  const key = fieldPath.slice("entity.".length); // e.g. "crop"
  return isPresent(entities[key]);
}

// ─── Merge entities from message history ────────────────────────────────────

/**
 * Merge intentData from all recent messages into a single flat entities map.
 * Later messages overwrite earlier ones for the same key.
 */
function mergeHistoricalEntities(recentMessages) {
  const merged = {};
  for (const msg of recentMessages) {
    if (msg.intentData && typeof msg.intentData === "object") {
      Object.assign(merged, msg.intentData);
    }
  }
  return merged;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Calculate which information is still missing for a given intent.
 *
 * @param {object} params
 * @param {string}  params.intent          — e.g. "crop_financing"
 * @param {object}  params.profile         — FinancialProfile document (may be null)
 * @param {object}  params.currentEntities — entities extracted from current message
 * @param {Array}   params.recentMessages  — recent Message documents
 * @returns {{ requiredFields, collectedFields, missingFields, readyForDecision }}
 */
function calculateGap({ intent, profile, currentEntities, recentMessages }) {
  const def = getIntentDefinition(intent);

  // Unknown intent — no required fields, immediately ready
  if (!def) {
    return {
      requiredFields: [],
      collectedFields: [],
      missingFields: [],
      readyForDecision: true,
    };
  }

  // Build a merged entities map: historical first, then current (current wins)
  const historicalEntities = mergeHistoricalEntities(recentMessages || []);
  const entities = { ...historicalEntities, ...currentEntities };

  const requiredFields  = def.requiredFields;
  const collectedFields = [];
  const missingFields   = [];

  for (const field of requiredFields) {
    const knownFromProfile  = profile  ? resolveFromProfile(field, profile)  : false;
    const knownFromEntities = resolveFromEntities(field, entities);

    if (knownFromProfile || knownFromEntities) {
      collectedFields.push(field);
    } else {
      missingFields.push(field);
    }
  }

  return {
    requiredFields,
    collectedFields,
    missingFields,
    readyForDecision: missingFields.length === 0,
  };
}

module.exports = { calculateGap };

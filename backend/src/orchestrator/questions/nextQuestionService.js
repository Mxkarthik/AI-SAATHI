/**
 * nextQuestionService.js
 *
 * Given an intent and a list of missing fields, selects the single most
 * important question to ask next.
 *
 * Responsibilities:
 *   - Pick the highest-priority missing field
 *   - Avoid asking about a field already collected
 *   - Return a structured question descriptor (NOT translated text)
 *
 * The actual wording of questions in Telugu/English is intentionally NOT
 * here — that belongs to a language layer that will be built later.
 *
 * Return shape:
 * {
 *   field       : string   — dot-notation field path  e.g. "entity.crop"
 *   questionKey : string   — short key for the language layer  e.g. "ask_crop"
 *   priority    : number   — 1 = highest
 * }
 *
 * Returns null if there are no missing fields (i.e. nothing to ask).
 */

// ─── Question catalogue ──────────────────────────────────────────────────────

/**
 * Maps every field that can appear in requiredFields to a question descriptor.
 * Order within the array = priority (lower index = higher priority).
 * The orchestrator uses the ORDER from intentDefinitions.requiredFields,
 * but this catalogue provides the metadata for each field.
 */
const QUESTION_CATALOGUE = {
  "profile.location.state":    { questionKey: "ask_state",          priority: 1 },
  "profile.farming.landArea":  { questionKey: "ask_land_area",      priority: 2 },
  "profile.farming.ownership": { questionKey: "ask_ownership",      priority: 3 },
  "entity.crop":               { questionKey: "ask_crop",           priority: 1 },
  "entity.livestockType":      { questionKey: "ask_livestock_type", priority: 1 },
  "entity.equipmentType":      { questionKey: "ask_equipment_type", priority: 1 },
  "entity.season":             { questionKey: "ask_season",         priority: 4 },
  "entity.amount":             { questionKey: "ask_amount",         priority: 5 },
  "entity.income":             { questionKey: "ask_income",         priority: 6 },
  "entity.existingDebt":       { questionKey: "ask_existing_debt",  priority: 7 },
  "entity.monthlyExpenses":    { questionKey: "ask_monthly_expenses", priority: 8 },
  "entity.quantity":           { questionKey: "ask_quantity",       priority: 3 },
  "entity.landArea":           { questionKey: "ask_land_area",      priority: 2 },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Select the next question to ask.
 *
 * We use the ORDER of missingFields (which comes from intentDefinitions.requiredFields,
 * already in priority order) to pick the first field we have a question for.
 * This keeps question ordering deterministic and intent-driven.
 *
 * @param {object} params
 * @param {string}   params.intent        — current intent name
 * @param {string[]} params.missingFields — fields still needed (ordered by priority)
 * @param {object}   [params.context]     — normalised context (reserved for future use)
 * @returns {{ field, questionKey, priority } | null}
 */
function getNextQuestion({ intent, missingFields, context = {} }) {
  if (!missingFields || missingFields.length === 0) {
    return null;
  }

  // Walk the missing fields in their declared priority order.
  // Return the first one that has a known question.
  for (let i = 0; i < missingFields.length; i++) {
    const field = missingFields[i];
    const meta = QUESTION_CATALOGUE[field];
    if (meta) {
      return {
        field,
        questionKey: meta.questionKey,
        priority: i + 1, // 1-based rank in missing fields list
      };
    }
  }

  // If no catalogue entry found for any missing field, fall back to the first one
  return {
    field: missingFields[0],
    questionKey: `ask_${missingFields[0].split(".").pop()}`,
    priority: 1,
  };
}

module.exports = { getNextQuestion, QUESTION_CATALOGUE };

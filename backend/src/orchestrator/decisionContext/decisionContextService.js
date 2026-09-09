"use strict";

// Pure projection for future decision engines. Context owns facts,
// Information Gap owns completeness, and Conversation State owns stage.

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function copyValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => item && typeof item === "object" ? { ...item } : item);
  }
  return value;
}

function addValue(target, key, value) {
  if (hasValue(value)) target[key] = copyValue(value);
}

function projectFields(knownFields, names) {
  const result = {};
  for (const name of names) addValue(result, name, knownFields[name]);
  return result;
}

/**
 * Build a decision-oriented, read-only projection of the orchestration turn.
 * No field requirements, eligibility, calculations, persistence, or provider
 * calls are performed here.
 */
function buildDecisionContext({ context, informationGap, conversationState } = {}) {
  const knownFields = context?.knownFields || {};
  const state = conversationState || {};
  const gap = informationGap || {};
  const conversation = {};
  addValue(conversation, "stage", state.stage);
  const farming = projectFields(knownFields, [
    "landArea", "landUnit", "ownership", "irrigation", "season",
  ]);
  if (hasValue(knownFields.crops)) {
    farming.crops = copyValue(knownFields.crops);
  } else if (hasValue(knownFields.crop)) {
    farming.crops = [copyValue(knownFields.crop)];
  }

  return {
    status: gap.isComplete === true ? "ready" : "incomplete",
    intent: state.intent ?? gap.intent ?? context?.currentMessage?.intent ?? null,
    language: state.language ?? context?.currentMessage?.language ?? "en",
    conversation,
    user: {
      location: projectFields(knownFields, ["state", "district", "mandal"]),
      farming,
      financial: projectFields(knownFields, [
        "farmIncome", "otherIncome", "monthlyExpenses", "existingLoans",
        "income", "existingDebt", "amount",
      ]),
      assets: projectFields(knownFields, ["equipment", "livestock"]),
    },
    decision: {
      collectedFields: Array.isArray(gap.collectedFields) ? gap.collectedFields.slice() : [],
      missingFields: Array.isArray(gap.missingFields) ? gap.missingFields.slice() : [],
      isComplete: gap.isComplete === true,
    },
  };
}

module.exports = { buildDecisionContext };

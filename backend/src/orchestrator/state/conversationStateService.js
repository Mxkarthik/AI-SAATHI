"use strict";

// Pure projection of the current turn. Information-gap analysis remains the
// sole authority for required, collected, and missing fields.
const AMBIGUOUS_INTENT = "general_financial_guidance";

function hasIntent(intent) {
  return typeof intent === "string" &&
    intent.trim() !== "" &&
    intent !== AMBIGUOUS_INTENT;
}

function deriveConversationState({
  conversation = null,
  intent,
  language,
  informationGap = null,
  nextQuestion = null,
} = {}) {
  const effectiveIntent = intent || conversation?.intent || null;
  const effectiveLanguage = language || conversation?.language || "en";
  const collectedFields = Array.isArray(informationGap?.collectedFields)
    ? informationGap.collectedFields.slice()
    : [];
  const missingFields = Array.isArray(informationGap?.missingFields)
    ? informationGap.missingFields.slice()
    : [];
  const isComplete = informationGap?.isComplete === true;
  const lastAskedField = typeof nextQuestion?.field === "string" && nextQuestion.field.trim() !== ""
    ? nextQuestion.field
    : null;

  let stage;
  if (!hasIntent(effectiveIntent)) {
    stage = "intent_detection";
  } else if (conversation?.status === "completed" && isComplete) {
    stage = "completed";
  } else if (!isComplete || missingFields.length > 0) {
    stage = "information_collection";
  } else {
    stage = "ready_for_decision";
  }

  return {
    stage,
    intent: effectiveIntent,
    language: effectiveLanguage,
    collectedFields,
    missingFields,
    lastAskedField,
    isComplete,
  };
}

module.exports = { deriveConversationState };

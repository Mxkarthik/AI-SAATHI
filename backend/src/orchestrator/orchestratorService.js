/**
 * orchestratorService.js
 *
 * Core coordinator for AI Saathi's conversational intelligence.
 *
 * Responsibilities:
 *   1. Load normalised context (user + profile + conversation + messages)
 *   2. Detect the user's intent from the current message
 *   3. Determine what information is already known
 *   4. Determine what information is still missing
 *   5. Return a structured result telling the caller what to do next
 *
 * What this file does NOT do:
 *   - MongoDB queries  (delegated to contextService + existing services)
 *   - Intent NLP       (delegated to intentDetectorService)
 *   - Gap analysis     (delegated to informationGapService)
 *   - Question picking (delegated to nextQuestionService)
 *   - HTTP I/O         (stays in the controller)
 *   - Scheme data / recommendations (Phase 2B+)
 *   - LLM calls        (Phase 2B+)
 *
 * Response contract  (stable — do not change shape without versioning):
 *
 *   needs_information:
 *   {
 *     status        : "needs_information",
 *     intent        : string,
 *     confidence    : number,
 *     collectedFields: string[],
 *     missingFields : string[],
 *     nextQuestion  : { field, questionKey, priority } | null,
 *     entities      : object,
 *   }
 *
 *   decision_ready:
 *   {
 *     status        : "decision_ready",
 *     intent        : string,
 *     confidence    : number,
 *     collectedFields: string[],
 *     missingFields : [],
 *     entities      : object,
 *   }
 *
 *   unrecognised:
 *   {
 *     status        : "unrecognised",
 *     intent        : null,
 *     confidence    : 0,
 *     missingFields : [],
 *     nextQuestion  : null,
 *     entities      : {},
 *   }
 */

const contextService       = require("./context/contextService");
const intentDetector       = require("./intent/intentDetectorService");
const informationGapService = require("./informationGap/informationGapService");
const nextQuestionService  = require("./questions/nextQuestionService");

// Minimum confidence before we trust the detected intent
const CONFIDENCE_THRESHOLD = 0.5;

/**
 * Process one conversational turn.
 *
 * @param {object} params
 * @param {string} params.userId         — authenticated user's _id string
 * @param {string} params.conversationId — the active conversation's _id string
 * @param {string} params.message        — raw user message text
 * @returns {Promise<object>}            — orchestration result (see contract above)
 */
async function processMessage({ userId, conversationId, message }) {
  // ── Step 1: Load context ────────────────────────────────────────────────
  const context = await contextService.loadContext({
    userId,
    conversationId,
    message,
  });

  // ── Step 2: Detect intent ───────────────────────────────────────────────
  const detection = intentDetector.detectIntent(message, context);
  const { intent, confidence, entities } = detection;

  // Below threshold → treat as unrecognised
  if (!intent || confidence < CONFIDENCE_THRESHOLD) {
    return {
      status:        "unrecognised",
      intent:        null,
      confidence:    confidence || 0,
      collectedFields: [],
      missingFields: [],
      nextQuestion:  null,
      entities:      entities || {},
    };
  }

  // ── Step 3: Calculate information gap ──────────────────────────────────
  const gap = informationGapService.calculateGap({
    intent,
    profile:        context.profile,
    currentEntities: entities,
    recentMessages: context.recentMessages,
  });

  // ── Step 4: Decide status ───────────────────────────────────────────────
  if (gap.readyForDecision) {
    return {
      status:         "decision_ready",
      intent,
      confidence,
      collectedFields: gap.collectedFields,
      missingFields:  [],
      entities,
    };
  }

  // ── Step 5: Pick next question ──────────────────────────────────────────
  const nextQuestion = nextQuestionService.getNextQuestion({
    intent,
    missingFields: gap.missingFields,
    context,
  });

  return {
    status:         "needs_information",
    intent,
    confidence,
    collectedFields: gap.collectedFields,
    missingFields:  gap.missingFields,
    nextQuestion,
    entities,
  };
}

module.exports = { processMessage };

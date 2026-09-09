"use strict";

/**
 * orchestratorService.js
 *
 * Coordinates the AI Saathi conversational turn pipeline.
 *
 * The orchestrator is a thin coordinator — it calls existing specialised
 * services in order and assembles their results. It contains NO:
 *   - business logic
 *   - scheme matching or eligibility checking
 *   - financial calculations or recommendations
 *   - direct MongoDB access
 *   - direct Gemini calls (delegated to understandingService / nextQuestionService)
 *   - duplication of context-building, gap-analysis, or question logic
 *
 * ─── Pipeline ─────────────────────────────────────────────────────────────
 *
 *   orchestrate({ userId, conversation, profile, message })
 *       │
 *       ▼
 *   understandingService.understandMessage(message)
 *       │  → { language, intent, entities, provider }
 *       ▼
 *   [INTENT CONTINUITY]
 *   If provider = "fallback" AND conversation.intent is already set:
 *       preserve conversation.intent (temporary failure ≠ intent change)
 *   If provider = "fallback" AND conversation.language is already set:
 *       preserve conversation.language
 *       ▼
 *   contextService.buildContext({ profile, conversation, understanding })
 *       │  → normalised context (knownFields, currentMessage, …)
 *       ▼
 *   informationGapService.analyzeInformationGap(context)
 *       │  → { requiredFields, collectedFields, missingFields, isComplete }
 *       ▼
 *   if missingFields.length > 0:
 *       nextQuestionService.getNextQuestion({ missingFields, context, language })
 *           │  → { field, question, language, source }
 *       return { status: "needs_information", … }
 *   else:
 *       return { status: "ready_for_decision", nextQuestion: null, … }
 *
 * ─── Return shape ─────────────────────────────────────────────────────────
 *
 * needs_information:
 * {
 *   status        : "needs_information",
 *   language      : "en" | "te",
 *   intent        : string,
 *   understanding : { language, intent, entities, provider },
 *   context       : <normalised context from contextService>,
 *   informationGap: { requiredFields, collectedFields, missingFields, isComplete },
 *   nextQuestion  : { field, question, language, source } | null,
 * }
 *
 * ready_for_decision:
 * {
 *   status        : "ready_for_decision",
 *   language      : "en" | "te",
 *   intent        : string,
 *   understanding : { language, intent, entities, provider },
 *   context       : <normalised context from contextService>,
 *   informationGap: { requiredFields, collectedFields, missingFields, isComplete },
 *   nextQuestion  : null,
 * }
 */

const understandingService   = require("./understanding/understandingService");
const { buildContext }        = require("./context/contextService");
const { analyzeInformationGap } = require("./informationGap/informationGapService");
const { getNextQuestion }     = require("./questions/nextQuestionService");
const { deriveConversationState } = require("./state/conversationStateService");
const { deriveProfileSync } = require("./profileSync/profileSyncService");
const { buildDecisionContext } = require("./decisionContext/decisionContextService");
const {
  evaluateAllApplicableSchemes,
  buildRecommendations,
} = require("./financialKnowledge");
const profileService = require("../services/profileService");

// ─── Intent continuity ────────────────────────────────────────────────────────

/**
 * A "meaningful" intent is any intent stored on the conversation that is
 * not the generic fallback value.  This ensures we never accidentally lock
 * a conversation into the generic intent by treating it as authoritative.
 */
const FALLBACK_INTENT = "general_financial_guidance";

/**
 * Apply intent continuity after a provider failure.
 *
 * Rules:
 *  1. If the understanding provider succeeded (provider !== "fallback"),
 *     trust the result as-is — no continuity logic needed.
 *  2. If the provider failed (provider === "fallback"):
 *     a. INTENT: if the conversation already has a meaningful intent
 *        (non-null, non-fallback), preserve it by overwriting the
 *        understanding's fallback intent.  The regex-based entity
 *        extraction (entities: {}) is still usable for whatever it got.
 *     b. LANGUAGE: the fallback language comes from the existing reliable
 *        regex (detectLanguageFallback) so it is still trustworthy.
 *        We do NOT override the regex language result with the conversation
 *        language, because that would break language-switching mid-session.
 *        The language field in the fallback result is reliable regardless.
 *
 * @param {object} understanding — result from understandingService
 * @param {object} conversation  — Conversation document / plain object
 * @returns {object}             — potentially-patched understanding object
 */
function applyConversationContinuity(understanding, conversation) {
  // Provider succeeded — nothing to patch
  if (understanding.provider !== "fallback") return understanding;

  const existingIntent = conversation && conversation.intent;
  const isMeaningfulExistingIntent =
    existingIntent &&
    typeof existingIntent === "string" &&
    existingIntent !== FALLBACK_INTENT;

  if (!isMeaningfulExistingIntent) {
    // No useful existing intent — keep the fallback result unchanged
    return understanding;
  }

  // Provider failed but conversation has a real intent: preserve it.
  // We return a new object so we never mutate the understanding result.
  return {
    ...understanding,
    intent: existingIntent,
  };
}

// ─── Intent clarification ─────────────────────────────────────────────────────

/**
 * Build a deterministic intent-clarification question.
 *
 * Called when the understanding layer returned the generic fallback intent
 * (general_financial_guidance) and conversationState.stage is therefore
 * "intent_detection".  We must ask the user to clarify what they need
 * before any information-collection can begin.
 *
 * This is intentionally static — no Gemini call, no field resolution.
 * The question service handles specific field prompts; this is a
 * higher-level clarification concern.
 *
 * @param {string} language — "en" | "te"
 * @returns {{ field: string, question: string, language: string, source: string }}
 */
function buildIntentClarificationQuestion(language) {
  const lang = language === "te" ? "te" : "en";
  const question = lang === "te"
    ? "మీకు ఏ రకమైన ఆర్థిక సహాయం కావాలి? ఉదాహరణకు: పంట రుణం, పరికరాల కొనుగోలు, పశుపోషణ, బీమా, పొదుపు లేదా పెట్టుబడి?"
    : "What kind of financial help are you looking for? For example: crop loan, equipment purchase, livestock, insurance, savings, or investment?";
  return {
    field:    "intent",
    question,
    language: lang,
    source:   "fallback",
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run one orchestration turn.
 *
 * @param {object}      params
 * @param {string}      [params.userId]       — authenticated user ID (informational)
 * @param {object}      params.conversation   — Conversation document or plain object
 * @param {object|null} [params.profile]      — FinancialProfile document or null
 * @param {string}      params.message        — the user's raw message text
 * @returns {Promise<object>}                 — orchestration result (see above)
 * @throws  {Error} on invalid input or unrecoverable pipeline failure
 */
async function orchestrate(params) {
  // ── Input validation ──────────────────────────────────────────────────────
  if (!params || typeof params !== "object") {
    throw new Error("orchestrate: argument must be a non-null object.");
  }

  const { userId, conversation, profile, message } = params;

  if (typeof message !== "string" || message.trim() === "") {
    throw new Error("orchestrate: `message` must be a non-empty string.");
  }

  if (!conversation || typeof conversation !== "object") {
    throw new Error("orchestrate: `conversation` must be supplied as an object.");
  }

  // profile is allowed to be null/undefined — new users have no profile yet

  // ── Step 1: Understand the current message ────────────────────────────────
  let understanding;
  try {
    understanding = await understandingService.understandMessage(message.trim());
  } catch (err) {
    const wrapped = new Error(
      `orchestrate: understanding step failed — ${err.message}`
    );
    wrapped.cause = err;
    throw wrapped;
  }

  // ── Step 1b: Intent continuity ────────────────────────────────────────────
  // If the AI provider failed and the conversation already has a meaningful
  // intent, preserve that intent rather than downgrading to the generic
  // fallback.  This prevents a temporary quota/network failure from
  // resetting an in-progress consultation to "ready_for_decision" incorrectly.
  understanding = applyConversationContinuity(understanding, conversation);

  const language = understanding.language || "en";

  // ── Step 2: Persist schema-approved extracted profile facts ───────────────
  const profileSync = deriveProfileSync({ userId, understanding, profile: profile || null });
  let syncedProfile = profile || null;
  if (profileSync.updated && userId) {
    try {
      syncedProfile = await profileService.upsertProfile(userId, profileSync.changes);
    } catch (err) {
      const wrapped = new Error(`orchestrate: profile sync failed — ${err.message}`);
      wrapped.cause = err;
      throw wrapped;
    }
  }

  // ── Step 3: Build normalised context from the updated profile ────────────
  let context;
  try {
    context = buildContext({ profile: syncedProfile, conversation, understanding });
  } catch (err) {
    const wrapped = new Error(
      `orchestrate: context step failed — ${err.message}`
    );
    wrapped.cause = err;
    throw wrapped;
  }

  // ── Step 4: Analyse information gap ──────────────────────────────────────
  let informationGap;
  try {
    informationGap = analyzeInformationGap(context);
  } catch (err) {
    const wrapped = new Error(
      `orchestrate: information gap step failed — ${err.message}`
    );
    wrapped.cause = err;
    throw wrapped;
  }

  const intent = informationGap.intent;

  // ── Step 4: Determine next action ─────────────────────────────────────────

  // Derive conversation stage FIRST — conversationState.stage is the single
  // source of truth for the top-level orchestration status.
  //
  // KEY FIX: informationGap.isComplete can be true for general_financial_guidance
  // (because it has requiredFields: []) while the intent is still ambiguous.
  // conversationStateService already accounts for this: when intent is the
  // generic fallback, it sets stage = "intent_detection" regardless of
  // isComplete.  We must honour that stage here rather than short-circuiting
  // on informationGap.isComplete.

  // Branch A: information gap is still open (missing fields remain OR intent
  // is not yet specific enough to consider collection complete).
  // We ask the next question.
  if (!informationGap.isComplete || informationGap.missingFields.length > 0) {
    const nextQuestion = await getNextQuestion({
      missingFields: informationGap.missingFields,
      context,
      language,
    });
    const conversationState = deriveConversationState({
      conversation,
      intent,
      language,
      informationGap,
      nextQuestion,
    });
    const decisionContext = buildDecisionContext({
      context,
      informationGap,
      conversationState,
    });

    return {
      status:         "needs_information",
      language,
      intent,
      understanding,
      context,
      informationGap,
      nextQuestion,
      conversationState,
      decisionContext,
      profileSync,
      eligibility:    null,
      recommendation: null,
    };
  }

  // Branch B: informationGap.isComplete === true.
  // Build conversationState now so we can inspect the stage before deciding
  // whether we are genuinely ready for a decision.
  const nextQuestion = null;
  const conversationState = deriveConversationState({
    conversation,
    intent,
    language,
    informationGap,
    nextQuestion,
  });
  const decisionContext = buildDecisionContext({
    context,
    informationGap,
    conversationState,
  });

  // If the stage is not "ready_for_decision" (e.g. stage = "intent_detection"
  // because the intent is still the generic fallback), we must NOT return
  // status: "ready_for_decision".  Instead, emit a needs_information response
  // with an intent-clarification question.
  if (conversationState.stage !== "ready_for_decision" &&
      conversationState.stage !== "completed") {

    // Build a static intent-clarification question.
    // We do NOT call getNextQuestion with missingFields:[] (it returns null).
    // Intent clarification is not a field-collection step — it is a separate
    // concern: we need to understand what the user actually wants to do.
    const clarifyingQuestion = buildIntentClarificationQuestion(language);

    return {
      status:         "needs_information",
      language,
      intent,
      understanding,
      context,
      informationGap,
      nextQuestion:   clarifyingQuestion,
      conversationState,
      decisionContext,
      profileSync,
      eligibility:    null,
      recommendation: null,
    };
  }

  // Branch C: stage is genuinely "ready_for_decision" or "completed".
  // Run eligibility + recommendation engines.

  // ── Eligibility evaluation (only when both conditions are met) ──────────
  // Condition 1: conversationState.stage === "ready_for_decision"
  // Condition 2: decisionContext.status === "ready"
  let eligibility = null;
  let recommendation = null;
  if (
    conversationState.stage === "ready_for_decision" &&
    decisionContext.status === "ready"
  ) {
    try {
      eligibility = evaluateAllApplicableSchemes(decisionContext);
    } catch (err) {
      // Eligibility failure should not break the orchestration response.
      // Log and continue — the eligibility field will be null.
      console.error(`orchestrate: eligibility evaluation failed — ${err.message}`);
    }

    if (eligibility) {
      try {
        recommendation = buildRecommendations({ decisionContext, eligibility });
      } catch (err) {
        // Recommendation failure should not break the orchestration response.
        console.error(`orchestrate: recommendation generation failed — ${err.message}`);
      }
    }
  }

  return {
    status:         conversationState.stage === "completed" ? "completed" : "ready_for_decision",
    language,
    intent,
    understanding,
    context,
    informationGap,
    nextQuestion,
    conversationState,
    decisionContext,
    profileSync,
    eligibility,
    recommendation,
  };
}

module.exports = { orchestrate };

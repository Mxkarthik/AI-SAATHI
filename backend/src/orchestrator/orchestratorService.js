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

  // All required fields are collected → ready for a decision
  if (informationGap.isComplete) {
    const nextQuestion = null;
    const conversationState = deriveConversationState({
      conversation,
      intent,
      language,
      informationGap,
      nextQuestion,
    });

    return {
      status:         "ready_for_decision",
      language,
      intent,
      understanding,
      context,
      informationGap,
      nextQuestion,
      conversationState,
      profileSync,
    };
  }

  // ── Step 5: Generate the next question ────────────────────────────────────
  // nextQuestionService already has its own Gemini fallback — we do not
  // duplicate that here. A null return is valid (unknown field, both paths fail).
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

  return {
    status:         "needs_information",
    language,
    intent,
    understanding,
    context,
    informationGap,
    nextQuestion,
    conversationState,
    profileSync,
  };
}

module.exports = { orchestrate };

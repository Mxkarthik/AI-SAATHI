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
 *       │  → { language, intent, entities }
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
 *   understanding : { language, intent, entities },
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
 *   understanding : { language, intent, entities },
 *   context       : <normalised context from contextService>,
 *   informationGap: { requiredFields, collectedFields, missingFields, isComplete },
 *   nextQuestion  : null,
 * }
 */

const understandingService   = require("./understanding/understandingService");
const { buildContext }        = require("./context/contextService");
const { analyzeInformationGap } = require("./informationGap/informationGapService");
const { getNextQuestion }     = require("./questions/nextQuestionService");

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

  const language = understanding.language || "en";

  // ── Step 2: Build normalised context ─────────────────────────────────────
  let context;
  try {
    context = buildContext({ profile: profile || null, conversation, understanding });
  } catch (err) {
    const wrapped = new Error(
      `orchestrate: context step failed — ${err.message}`
    );
    wrapped.cause = err;
    throw wrapped;
  }

  // ── Step 3: Analyse information gap ──────────────────────────────────────
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
    return {
      status:         "ready_for_decision",
      language,
      intent,
      understanding,
      context,
      informationGap,
      nextQuestion:   null,
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

  return {
    status:         "needs_information",
    language,
    intent,
    understanding,
    context,
    informationGap,
    nextQuestion,
  };
}

module.exports = { orchestrate };

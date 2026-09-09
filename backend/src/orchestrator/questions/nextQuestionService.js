"use strict";

/**
 * nextQuestionService.js
 *
 * Generates the next conversational question to ask the user.
 *
 * The Information Gap Service is authoritative about WHAT is missing.
 * This service is responsible only for generating a natural, context-aware
 * question that asks for that specific piece of missing information.
 *
 * Gemini generates the question wording. If Gemini fails, a deterministic
 * fallback question is used. The orchestration layer (missingFields order)
 * is never overridden.
 *
 * ─── Architectural boundary ───────────────────────────────────────────────
 *
 * This service MUST NOT:
 *   - determine which financial fields are required
 *   - reorder missingFields
 *   - decide eligibility
 *   - recommend financial products or schemes
 *   - perform financial calculations
 *   - access MongoDB, FinancialProfile, Conversation, or Message models
 *   - call Vapi or any voice provider
 *   - interpret the user's answer
 *   - extract entities from the user's answer
 *
 * ─── Return shape ─────────────────────────────────────────────────────────
 *
 * {
 *   field    : string,              // the field being asked about
 *   question : string,              // the generated question text
 *   language : "en" | "te",        // language the question is in
 *   source   : "gemini" | "fallback"
 * }
 *
 * Returns null when:
 *   - missingFields is missing / empty
 *   - the first missing field has no fallback AND Gemini cannot generate one
 */

const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

// ─── Gemini client (shared lazy instance) ────────────────────────────────────

let _client = null;

function getClient() {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env file."
    );
  }
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// ─── Deterministic fallback questions ────────────────────────────────────────

const FALLBACK_QUESTIONS = {
  location: {
    en: "Which state are you farming in?",
    te: "మీరు ఏ రాష్ట్రంలో వ్యవసాయం చేస్తున్నారు?",
  },
  crop: {
    en: "Which crop are you growing?",
    te: "మీరు ఏ పంట సాగు చేస్తున్నారు?",
  },
  landArea: {
    en: "How much land do you farm?",
    te: "మీరు ఎంత భూమిలో వ్యవసాయం చేస్తున్నారు?",
  },
  ownership: {
    en: "Do you own the land, lease it, or farm it jointly?",
    te: "ఈ భూమి మీ సొంతమా, కౌలుకు తీసుకున్నదా, లేదా భాగస్వామ్యంగా సాగు చేస్తున్నారా?",
  },
  season: {
    en: "Which farming season is this for?",
    te: "ఇది ఏ పంట సీజన్ కోసం?",
  },
  amount: {
    en: "How much money do you need?",
    te: "మీకు ఎంత డబ్బు అవసరం?",
  },
  income: {
    en: "Approximately how much income do you earn from farming?",
    te: "వ్యవసాయం ద్వారా సుమారుగా ఎంత ఆదాయం వస్తుంది?",
  },
  existingDebt: {
    en: "Do you currently have any loans or outstanding debt?",
    te: "ప్రస్తుతం మీకు ఏవైనా రుణాలు లేదా బకాయిలు ఉన్నాయా?",
  },
  equipment: {
    en: "What equipment do you need financing for?",
    te: "మీకు ఏ వ్యవసాయ పరికరానికి లేదా యంత్రానికి ఆర్థిక సహాయం కావాలి?",
  },
  livestock: {
    en: "What livestock are you planning to purchase or finance?",
    te: "మీరు ఏ పశువులను కొనుగోలు చేయడానికి లేదా వాటికి ఆర్థిక సహాయం పొందడానికి చూస్తున్నారు?",
  },
  insuranceType: {
    en: "What type of insurance do you need?",
    te: "మీకు ఏ రకమైన బీమా అవసరం?",
  },
  asset: {
    en: "Which asset do you want to insure?",
    te: "మీరు ఏ ఆస్తికి బీమా చేయాలనుకుంటున్నారు?",
  },
  savingsGoal: {
    en: "What are you saving money for?",
    te: "మీరు దేనికోసం పొదుపు చేయాలనుకుంటున్నారు?",
  },
  investmentAmount: {
    en: "How much would you like to invest?",
    te: "మీరు ఎంత మొత్తాన్ని పెట్టుబడి పెట్టాలనుకుంటున్నారు?",
  },
  investmentPeriod: {
    en: "How long do you plan to keep your investment?",
    te: "మీ పెట్టుబడిని ఎంతకాలం కొనసాగించాలని అనుకుంటున్నారు?",
  },
  riskPreference: {
    en: "How comfortable are you with investment risk?",
    te: "పెట్టుబడిలో రిస్క్ తీసుకోవడంపై మీ అభిప్రాయం ఏమిటి?",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the effective language — "te" or "en".
 * Falls back to "en" for any unsupported value.
 */
function resolveLanguage(language) {
  return language === "te" ? "te" : "en";
}

/**
 * Return the deterministic fallback question for a field+language, or null.
 */
function getFallback(field, lang) {
  const entry = FALLBACK_QUESTIONS[field];
  if (!entry) return null;
  return entry[lang] || entry.en || null;
}

/**
 * Build a minimal, privacy-respecting context summary to help Gemini
 * generate a natural question. Only includes fields relevant to wording —
 * no personal identifiers.
 */
function buildKnownContext(context) {
  const kf = (context && context.knownFields) || {};
  const conv = (context && context.conversation) || {};

  const summary = {};

  // Intent helps Gemini understand the domain
  if (conv.intent)              summary.intent   = conv.intent;
  if (kf.state)                 summary.state    = kf.state;
  if (kf.crop || kf.crops)      summary.crop     = kf.crop || (Array.isArray(kf.crops) ? kf.crops[0] : undefined);
  if (kf.landArea)              summary.landArea = kf.landArea;
  if (kf.landUnit)              summary.landUnit = kf.landUnit;
  if (kf.ownership)             summary.ownership = kf.ownership;

  return summary;
}

// ─── Gemini question generation ───────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a conversational assistant for AI Saathi, a financial guidance service for rural farmers in India.

Your ONLY job right now is to generate a single, natural, concise question that asks the user for one specific piece of missing information.

Rules you MUST follow:
1. Ask ONLY for the field specified in the user's request. Do not ask about any other missing field.
2. Do NOT provide financial advice.
3. Do NOT recommend schemes, banks, loans, insurance products, or investments.
4. Do NOT calculate anything.
5. Do NOT assume values that are not present in the context.
6. Do NOT repeat information that is already known.
7. Keep the question concise and suitable for a voice conversation.
8. Use simple language appropriate for a rural Indian user.
9. If the requested language is Telugu, write in natural conversational Telugu — do not translate word-for-word from English.
10. Return ONLY the question text. No explanation, no greeting, no prefix.`;

/**
 * Call Gemini to generate a natural question for the given field.
 * Returns the question string or throws on failure.
 *
 * @param {string} field           — the missing field name
 * @param {object} knownContext    — minimal context summary
 * @param {string} intent          — current intent name
 * @param {string} lang            — "en" | "te"
 * @returns {Promise<string>}
 */
async function generateWithGemini(field, knownContext, intent, lang) {
  const client = getClient();

  const langLabel = lang === "te" ? "Telugu" : "English";

  // Build a concise, focused prompt
  const userPrompt = [
    `Intent: ${intent || "general"}`,
    `Missing field: ${field}`,
    `Already known: ${JSON.stringify(knownContext)}`,
    `Language: ${langLabel}`,
    "",
    `Generate a single, natural ${langLabel} question that asks only for "${field}".`,
    "Return only the question text.",
  ].join("\n");

  const chat = client.chats.create({
    model: MODEL,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.4, // slight warmth for natural phrasing, still deterministic enough
    },
  });

  const response = await chat.sendMessage({ message: userPrompt });

  // Extract plain text from the response
  const text =
    response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    response?.text ??
    null;

  if (!text || text.trim() === "") {
    throw new Error("Gemini returned an empty question.");
  }

  // Strip any surrounding quotes, newlines, or explanatory prose
  return text.trim().replace(/^["']+|["']+$/g, "").trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Determine and generate the next question for the user.
 *
 * @param {object} params
 * @param {string[]}      params.missingFields — from informationGapService
 * @param {object}        params.context       — from contextService.buildContext()
 * @param {string}        [params.language]    — "en" | "te", defaults to "en"
 * @returns {Promise<{ field, question, language, source } | null>}
 */
async function getNextQuestion({ missingFields, context, language = "en" } = {}) {
  // Rule 1: validate argument
  if (arguments.length === 0 || (arguments[0] !== null && typeof arguments[0] !== "object")) {
    throw new Error("getNextQuestion: argument must be an object.");
  }

  // Rule 2: no missing fields → nothing to ask
  if (!Array.isArray(missingFields) || missingFields.length === 0) {
    return null;
  }

  // Rule 3: always use the first missing field — order is authoritative
  const field = missingFields[0];
  const lang  = resolveLanguage(language);

  const intent      = context?.currentMessage?.intent || context?.conversation?.intent || "general";
  const knownContext = buildKnownContext(context);

  // ── Attempt Gemini generation ───────────────────────────────────────────
  try {
    const question = await generateWithGemini(field, knownContext, intent, lang);

    // Rule 12: validate Gemini returned a real question
    if (question && question.length > 0) {
      return { field, question, language: lang, source: "gemini" };
    }
    // Empty question — fall through to fallback
  } catch {
    // Gemini failed — fall through to fallback (never throw for this)
  }

  // ── Deterministic fallback ──────────────────────────────────────────────
  const fallbackQuestion = getFallback(field, lang);

  if (fallbackQuestion) {
    return { field, question: fallbackQuestion, language: lang, source: "fallback" };
  }

  // Rule: no fallback AND Gemini failed → return null (do not throw)
  return null;
}

module.exports = { getNextQuestion };

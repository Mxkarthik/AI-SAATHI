"use strict";

/**
 * understandingService.js
 *
 * The understanding service is the single entry point for message comprehension.
 * It delegates to the configured AI provider (Gemini / Ollama) via providerManager,
 * normalises values to match the FinancialProfile schema, and falls back gracefully
 * if the provider fails.
 *
 * ─── What this service does ────────────────────────────────────────────────
 *   1. Validates the input message.
 *   2. Calls the AI provider via providerManager.
 *   3. Validates the provider response has the required shape.
 *   4. Normalises entity values so they match FinancialProfile schema enums
 *      (e.g. Gemini returns "acre" but the schema stores "acres").
 *   5. Falls back to a minimal response with Telugu-regex language detection
 *      if the provider fails entirely — callers can still proceed with
 *      graceful degradation.
 *
 * ─── What this service does NOT do ────────────────────────────────────────
 *   - No Gemini-specific code (delegated to geminiProvider)
 *   - No intent detection logic (delegated to AI provider)
 *   - No entity extraction logic (delegated to AI provider)
 *   - No database access
 *   - No financial recommendations
 *
 * ─── Return shape ──────────────────────────────────────────────────────────
 * {
 *   language   : "en" | "te",
 *   intent     : string,
 *   entities   : object,     // normalised, null values stripped
 *   confidence : { intent: number, entities: number },
 *   provider   : "gemini" | "ollama" | "fallback",
 * }
 */

const { getProvider }  = require("./providers/providerManager");
const { parseMoney } = require("../../services/moneyNormalizer");

// ─── Telugu language detection (fallback only) ───────────────────────────────

/**
 * Detect language using Telugu Unicode range.
 * Used ONLY when the AI provider fails to return a language.
 *
 * @param {string} message
 * @returns {"te"|"en"}
 */
function detectLanguageFallback(message) {
  const teluguChars = message.match(/[\u0C00-\u0C7F]/g);
  return (teluguChars && teluguChars.length > 0) ? "te" : "en";
}

function inferIntentFallback(message, conversationIntent) {
  if (conversationIntent && conversationIntent !== "general_financial_guidance") {
    return conversationIntent;
  }

  if (/[\u0C00-\u0C7F]/.test(message) && /(వ్యవసాయ|పంట|డబ్బు|రుణ|లోన్)/.test(message)) {
    return "crop_financing";
  }
  return "general_financial_guidance";
}

function extractAmountFallback(message) {
  const parsed = parseMoney(message);
  return parsed.value;
}

function extractAskedFieldFallback(message, lastAskedField) {
  if (lastAskedField === "amount") {
    const amount = extractAmountFallback(message);
    return amount !== null ? { amount } : {};
  }

  if (lastAskedField === "existingDebt") {
    const normalized = message.toLowerCase().replace(/[.,!?]/gu, " ").replace(/\s+/gu, " ").trim();
    const negative = /(?:^|\s)(?:no|none|nil|no loans?|no debt|without (?:any )?(?:loans?|debt)|i (?:do not|don't|dont) have (?:any )?(?:existing )?(?:loans?|debt)|i have no (?:existing )?(?:loans?|debt))(?:\s|$)/u.test(normalized)
      || /(?:లేదు|లేవు|ఏమీ లేదు|లోన్ లేదు|లోన్లు లేవు|అప్పు లేదు|అప్పులు లేవు|రుణం లేదు|రుణాలు లేవు)/u.test(message);
    if (negative) return { existingDebt: false };

    const positive = /(?:^|\s)(?:yes|yeah|yep|i have|there is|there are)(?:\s|$)/u.test(normalized)
      || /(?:అవును|లోన్ ఉంది|లోన్లు ఉన్నాయి|అప్పు ఉంది|అప్పులు ఉన్నాయి|రుణం ఉంది|రుణాలు ఉన్నాయి)/u.test(message);
    if (positive) {
      const amount = extractAmountFallback(message);
      return amount !== null ? { existingDebt: true, existingLoanAmount: amount } : { existingDebt: true };
    }
    return {};
  }

  if (lastAskedField !== "season") return {};

  const normalized = message.toLowerCase();
  if (/(ఖరీఫ్|kharif|kharif)/i.test(message)) return { season: "kharif" };
  if (/(రబీ|rabi)/i.test(message)) return { season: "rabi" };
  if (/(జైద్|zaid)/i.test(message)) return { season: "zaid" };

  // The assistant has already identified the field being answered. Preserve
  // a non-empty short answer so the information gap can advance.
  return normalized.trim() ? { season: message.trim() } : {};
}

// ─── Value normalisation ──────────────────────────────────────────────────────

/**
 * Maps AI provider values to FinancialProfile schema enum values.
 * The AI prompt instructs "acre" / "hectare" / "bigha" (singular) but
 * the FinancialProfile schema requires "acres" / "hectares" / "bigha".
 */
const LAND_UNIT_MAP = {
  "acre":     "acres",
  "acres":    "acres",      // already correct — idempotent
  "hectare":  "hectares",
  "hectares": "hectares",   // already correct
  "bigha":    "bigha",      // same in both
};

const OWNERSHIP_MAP = {
  "own":    "owned",
  "owned":  "owned",
  "lease":  "leased",
  "leased": "leased",
  "shared": "shared",
  "share":  "shared",
};

/**
 * Normalise entity values extracted by the AI provider to match
 * FinancialProfile schema constraints.
 *
 * @param {object} entities — raw entities from the provider
 * @returns {object}        — normalised entities (nulls stripped)
 */
function normaliseEntities(entities) {
  if (!entities || typeof entities !== "object") return {};

  const out = {};

  for (const [key, value] of Object.entries(entities)) {
    // Skip null/undefined — they carry no information
    if (value === null || value === undefined) continue;

    switch (key) {
      case "amount": {
        const normalised = typeof value === "number" && Number.isFinite(value)
          ? value
          : parseMoney(String(value)).value;
        if (normalised !== null && normalised > 0) out.amount = normalised;
        break;
      }
      case "landUnit": {
        const normalised = LAND_UNIT_MAP[String(value).toLowerCase().trim()];
        if (normalised) out.landUnit = normalised;
        // If not in map, drop it — don't persist an invalid enum value
        break;
      }
      case "ownership": {
        const normalised = OWNERSHIP_MAP[String(value).toLowerCase().trim()];
        if (normalised) out.ownership = normalised;
        break;
      }
      default:
        // For strings: trim whitespace; for everything else: pass through
        out[key] = typeof value === "string" ? value.trim() : value;
    }
  }

  return out;
}

/**
 * Validate that the provider response has the minimum required shape.
 *
 * @param {*} result
 * @returns {boolean}
 */
function isValidProviderResponse(result) {
  if (!result || typeof result !== "object") return false;
  if (typeof result.language !== "string" || !result.language) return false;
  if (typeof result.intent   !== "string" || !result.intent)   return false;
  if (typeof result.entities !== "object" || !result.entities) return false;
  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Understand a user message using the configured AI provider.
 *
 * @param {string} message   — raw user message (Telugu, English, or mixed)
 * @param {object} [context] — optional conversation context
 * @param {string} [context.lastAskedField]     — field the assistant just asked for
 * @param {string} [context.conversationIntent] — established intent (if any)
 * @returns {Promise<object>} — normalised understanding result
 * @throws {Error} only for invalid input (missing / non-string message)
 */
async function understandMessage(message, context = {}) {
  if (!message || typeof message !== "string" || message.trim() === "") {
    throw new Error("understandMessage: message must be a non-empty string.");
  }

  const cleanMessage = message.trim();
  const providerName = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();

  // ── Attempt AI provider understanding ──────────────────────────────────
  try {
    const provider = getProvider();
    const raw = await provider.understand(cleanMessage, context);

    if (!isValidProviderResponse(raw)) {
      throw new Error(
        `Provider "${providerName}" returned an invalid response shape.`
      );
    }

    const contextualEntities = extractAskedFieldFallback(cleanMessage, context.lastAskedField);
    const normalisedEntities = {
      ...normaliseEntities(raw.entities),
      ...contextualEntities,
    };
    const inferredIntent = inferIntentFallback(cleanMessage, context.conversationIntent);
    const resolvedIntent = raw.intent === "general_financial_guidance"
      ? inferredIntent
      : raw.intent;
    const resolvedLanguage = raw.intent === "general_financial_guidance"
      && context.conversationLanguage === "te"
      ? "te"
      : raw.language;

    return {
      language:   resolvedLanguage,
      intent:     resolvedIntent,
      entities:   normalisedEntities,
      confidence: raw.confidence || { intent: 0, entities: 0 },
      provider:   providerName,
    };
  } catch (providerError) {
    // ── Graceful fallback ─────────────────────────────────────────────────
    // The provider failed. Return a minimal response so the orchestration
    // pipeline can continue with whatever context it already has.
    // Log the failure clearly so it is visible in server logs.
    console.error(
      `[understandingService] Provider "${providerName}" failed: ${providerError.message}`
    );

    const fallbackLanguage = detectLanguageFallback(cleanMessage) === "te"
      ? "te"
      : context.conversationLanguage === "te"
        ? "te"
        : "en";

    return {
      language:   fallbackLanguage,
      intent:     inferIntentFallback(cleanMessage, context.conversationIntent),
      entities:   extractAskedFieldFallback(cleanMessage, context.lastAskedField),
      confidence: { intent: 0, entities: 0 },
      provider:   "fallback",
    };
  }
}

// Export detectLanguage so existing callers that import it directly still work
module.exports = {
  understandMessage,
  detectLanguage: detectLanguageFallback,  // preserved for backward compat
};

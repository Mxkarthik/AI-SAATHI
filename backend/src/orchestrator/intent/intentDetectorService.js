/**
 * intentDetectorService.js
 *
 * Phase 2A: deterministic keyword-based intent detector.
 *
 * CONTRACT (stable — Phase 2B will replace the implementation, not the interface):
 *
 *   detectIntent(message, context) → { intent, confidence, entities }
 *
 *   intent     {string|null}  — one of the keys from intentDefinitions.js, or null
 *   confidence {number}       — 0.0–1.0 (deterministic rules → 0.6–0.9)
 *   entities   {object}       — extracted key-value pairs found in the message
 *                               e.g. { crop: "paddy", amount: 50000, season: "kharif" }
 *
 * To replace with an LLM-based detector in Phase 2B:
 *   1. Create intentDetectorService.llm.js implementing the same signature.
 *   2. Swap the require in orchestratorService.js.
 *   3. No other file changes needed.
 */

const { getAllIntents } = require("./intentDefinitions");

// ─── Entity extraction helpers ──────────────────────────────────────────────

const CROP_NAMES = [
  "paddy", "rice", "wheat", "cotton", "maize", "sugarcane",
  "groundnut", "sorghum", "jowar", "bajra", "sunflower", "soybean",
  "turmeric", "chilli", "tomato", "onion", "potato", "mango",
];

const LIVESTOCK_TYPES = [
  "cow", "cows", "buffalo", "buffaloes", "goat", "goats",
  "sheep", "poultry", "hen", "hens", "chicken", "cattle",
];

const EQUIPMENT_TYPES = [
  "tractor", "tractors", "pump", "pumps", "sprayer", "sprayers",
  "thresher", "threshers", "harvester", "harvesters", "motor",
];

const SEASONS = ["kharif", "rabi", "zaid", "summer", "winter", "monsoon"];

const OWNERSHIP_TERMS = {
  owned: ["own", "owned", "my land", "my farm"],
  leased: ["lease", "leased", "rent", "rented", "tenant"],
  shared: ["shared", "share", "partnership"],
};

/**
 * Extract entities from the raw message text.
 * Returns an object with any detected values.
 */
function extractEntities(message) {
  const lower = message.toLowerCase();
  const entities = {};

  // Crop
  for (const crop of CROP_NAMES) {
    if (lower.includes(crop)) {
      entities.crop = crop;
      break;
    }
  }

  // Livestock type
  for (const lt of LIVESTOCK_TYPES) {
    if (lower.includes(lt)) {
      entities.livestockType = lt.replace(/s$/, ""); // normalise plural
      break;
    }
  }

  // Equipment type
  for (const eq of EQUIPMENT_TYPES) {
    if (lower.includes(eq)) {
      entities.equipmentType = eq.replace(/s$/, "");
      break;
    }
  }

  // Season
  for (const season of SEASONS) {
    if (lower.includes(season)) {
      entities.season = season;
      break;
    }
  }

  // Ownership
  for (const [type, terms] of Object.entries(OWNERSHIP_TERMS)) {
    if (terms.some((t) => lower.includes(t))) {
      entities.ownership = type;
      break;
    }
  }

  // Numeric amount — match patterns like "50000", "50,000", "₹50000", "rs 50000"
  const amountMatch = lower.match(
    /(?:rs\.?|₹|inr)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:rupees?|thousand|lakh|lakhs?)?/
  );
  if (amountMatch) {
    let raw = amountMatch[1].replace(/,/g, "");
    let value = parseFloat(raw);
    if (lower.match(/\blakh(s)?\b/)) value *= 100000;
    if (lower.match(/\bthousand\b/)) value *= 1000;
    if (!isNaN(value) && value > 0) {
      entities.amount = value;
    }
  }

  // Land area — "3 acres", "2.5 hectares", "5 bigha"
  const landMatch = lower.match(/(\d+(?:\.\d+)?)\s*(acres?|hectares?|bigha)/);
  if (landMatch) {
    entities.landArea = parseFloat(landMatch[1]);
    entities.landUnit = landMatch[2].replace(/s$/, ""); // normalise plural
  }

  // Quantity (for livestock) — "5 cows", "10 goats"
  const qtyMatch = lower.match(/(\d+)\s+(?:cow|buffalo|goat|sheep|hen|chicken)/);
  if (qtyMatch) {
    entities.quantity = parseInt(qtyMatch[1], 10);
  }

  return entities;
}

// ─── Intent scoring ──────────────────────────────────────────────────────────

/**
 * Score a single intent against a message.
 * Returns a score 0–N (raw keyword hit count).
 */
function scoreIntent(intentDef, lower) {
  let score = 0;
  for (const keyword of intentDef.keywords) {
    if (lower.includes(keyword)) score += 1;
  }
  return score;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Detect the intent of a message given optional context.
 *
 * @param {string} message        — raw user message text
 * @param {object} [context]      — normalised context (unused in Phase 2A,
 *                                  reserved for Phase 2B LLM handoff)
 * @returns {{ intent: string|null, confidence: number, entities: object }}
 */
function detectIntent(message, context = {}) {
  if (!message || typeof message !== "string") {
    return { intent: null, confidence: 0, entities: {} };
  }

  const lower = message.toLowerCase();
  const entities = extractEntities(message);
  const allIntents = getAllIntents();

  // Score every intent
  const scores = allIntents.map((def) => ({
    name: def.name,
    score: scoreIntent(def, lower),
  }));

  // Sort descending
  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  // No keyword matched at all
  if (best.score === 0) {
    return {
      intent: "general_financial_guidance",
      confidence: 0.3,
      entities,
    };
  }

  // Calculate confidence:
  //   - Single clear winner → high confidence
  //   - Tie or very close → lower confidence
  const gap = best.score - (second?.score || 0);
  let confidence;
  if (gap >= 3)       confidence = 0.9;
  else if (gap === 2) confidence = 0.8;
  else if (gap === 1) confidence = 0.7;
  else                confidence = 0.6; // tie — use first match but low confidence

  return {
    intent: best.name,
    confidence,
    entities,
  };
}

module.exports = { detectIntent };

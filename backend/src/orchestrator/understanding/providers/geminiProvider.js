/**
 * geminiProvider.js
 *
 * Understanding provider — uses Google Gemini to extract structured intent
 * and entities from a user's financial message.
 *
 * This is an EXTRACTION-ONLY layer.  It does NOT:
 *   - recommend schemes
 *   - calculate eligibility
 *   - provide financial advice
 *
 * Exported interface (stable — other providers must match this shape):
 *
 *   async understandWithGemini(message: string) → {
 *     language  : "te" | "en",
 *     intent    : string,
 *     entities  : {
 *       crop          : string | null,
 *       landArea      : number | null,
 *       landUnit      : string | null,
 *       amount        : number | null,
 *       equipment     : string | null,
 *       livestock     : string | null,
 *       insuranceType : string | null,
 *       asset         : string | null,
 *       income        : number | null,
 *       existingDebt  : number | null,
 *     },
 *     confidence: {
 *       intent   : number,
 *       entities : number,
 *     },
 *   }
 */

"use strict";

const { GoogleGenAI, Type } = require("@google/genai");
require("dotenv").config();
// ─── Gemini client (lazy-initialised so the module can be imported in tests
//     without a key, failing only when understandWithGemini is called) ────────
let _client = null;

function getClient() {
  if (_client) return _client;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your .env file before calling understandWithGemini()."
    );
  }

  _client = new GoogleGenAI({ apiKey });
  return _client;
}

// ─── Model ───────────────────────────────────────────────────────────────────
// Read from env so the model can be changed without touching code.
// Falls back to gemini-3.6-flash — the current stable Gemini Flash model.

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// ─── JSON response schema ─────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    language: {
      type: Type.STRING,
      description: "Detected language of the user message: 'te' for Telugu, 'en' for English.",
      enum: ["te", "en"],
      nullable: false,
    },
    intent: {
      type: Type.STRING,
      description: "The user's primary financial intent, chosen from the allowed enum values.",
      enum: [
        "crop_financing",
        "equipment_financing",
        "livestock_financing",
        "insurance",
        "savings",
        "investment",
        "general_financial_guidance",
      ],
      nullable: false,
    },
    entities: {
      type: Type.OBJECT,
      description: "Structured entities extracted from the message. Use null for any field that cannot be confidently extracted.",
      properties: {
        state: {
          type: Type.STRING,
          description: "Indian state name in English (e.g. 'Andhra Pradesh', 'Telangana'). Extract from answers like 'AP', 'Andhra', 'Telangana'. Map abbreviations to full names.",
          nullable: true,
        },
        district: {
          type: Type.STRING,
          description: "District name within the state, if mentioned.",
          nullable: true,
        },
        mandal: {
          type: Type.STRING,
          description: "Mandal or sub-district name, if mentioned.",
          nullable: true,
        },
        crop: {
          type: Type.STRING,
          description: "Crop name in English (e.g. 'paddy', 'wheat'). Map Telugu crop names to canonical English equivalents.",
          nullable: true,
        },
        landArea: {
          type: Type.NUMBER,
          description: "Numeric land area (e.g. 3 for '3 acres' or '3 ఎకరాలు' or 'three acres').",
          nullable: true,
        },
        landUnit: {
          type: Type.STRING,
          description: "Unit of land area: 'acre', 'hectare', or 'bigha'.",
          enum: ["acre", "hectare", "bigha"],
          nullable: true,
        },
        ownership: {
          type: Type.STRING,
          description: "Land ownership type. Map 'I own it', 'my own land', 'owned' to 'owned'; 'leased', 'rented', 'lease' to 'leased'; 'shared', 'joint' to 'shared'.",
          enum: ["owned", "leased", "shared"],
          nullable: true,
        },
        season: {
          type: Type.STRING,
          description: "Farming season if mentioned (e.g. 'kharif', 'rabi', 'zaid').",
          nullable: true,
        },
        amount: {
          type: Type.NUMBER,
          description: "Monetary amount in INR. Convert Telugu number expressions (e.g. 'యాభై వేలు' → 50000, 'ఒక లక్ష' → 100000, 'fifty thousand' → 50000).",
          nullable: true,
        },
        equipment: {
          type: Type.STRING,
          description: "Farm equipment mentioned (e.g. 'tractor', 'pump'). Canonical English name.",
          nullable: true,
        },
        livestock: {
          type: Type.STRING,
          description: "Livestock type mentioned (e.g. 'cow', 'buffalo', 'goat'). Canonical English name.",
          nullable: true,
        },
        insuranceType: {
          type: Type.STRING,
          description: "Type of insurance the user is asking about (e.g. 'crop insurance', 'livestock insurance').",
          nullable: true,
        },
        asset: {
          type: Type.STRING,
          description: "Any asset mentioned by the user that does not fit other categories.",
          nullable: true,
        },
        income: {
          type: Type.NUMBER,
          description: "Annual income in INR if stated or strongly implied (e.g. 'I earn 2 lakh', 'income is 1.5 lakh per year', 'రెండు లక్షలు ఆదాయం').",
          nullable: true,
        },
        existingDebt: {
          type: Type.NUMBER,
          description: "Existing loan or debt amount in INR if stated. Also extract when user says they have NO loans (set to 0 if user explicitly says no debt).",
          nullable: true,
        },
      },
      required: [
        "state", "district", "mandal",
        "crop", "landArea", "landUnit", "ownership", "season",
        "amount", "equipment", "livestock", "insuranceType", "asset",
        "income", "existingDebt",
      ],
      nullable: false,
    },
    confidence: {
      type: Type.OBJECT,
      description: "Confidence scores between 0.0 and 1.0.",
      properties: {
        intent:   { type: Type.NUMBER, description: "Confidence in the detected intent (0–1).", nullable: false },
        entities: { type: Type.NUMBER, description: "Overall confidence in entity extraction (0–1).", nullable: false },
      },
      required: ["intent", "entities"],
      nullable: false,
    },
  },
  required: ["language", "intent", "entities", "confidence"],
};

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intent and entity extraction engine for AI Saathi, a financial guidance application for rural farmers in India.

Your ONLY job is to analyse a user's message and return a structured JSON object.

Rules:
1. The user may write in Telugu, English, or a mix of both. Detect the language from the message content.
2. Understand Telugu semantically. Do NOT rely on hardcoded keyword matching.
3. Map Telugu crop names to canonical English equivalents (e.g. వరి → paddy, గోధుమ → wheat).
4. Convert Telugu number expressions to numeric INR values (e.g. యాభై వేలు → 50000, రెండు లక్షలు → 200000, 3 ఎకరాలు → landArea: 3, landUnit: "acre").
5. Extract ONLY information that is explicitly stated or strongly implied. Do NOT invent values.
6. Set any field to null if the information is not present in the message.
7. Do NOT provide financial advice, scheme recommendations, or eligibility information.
8. Do NOT include any explanation or prose — return ONLY the JSON.
9. Map Indian state abbreviations and short forms to full state names (e.g. AP → Andhra Pradesh, TS → Telangana, MH → Maharashtra, UP → Uttar Pradesh, KA → Karnataka, TN → Tamil Nadu).
10. When the user says they own land ("I own it", "my land", "my own land", "sontham"), extract ownership as "owned". When they say leased/rented, extract "leased". When joint/shared, extract "shared".
11. When extracting a "no loans" / "no debt" statement (e.g. "I don't have any loans", "no existing loans"), extract existingDebt as 0.`;

// ─── Context-aware prompt builder ─────────────────────────────────────────────

/**
 * Build a user-turn prompt that includes conversation context when available.
 * If the previous question asked for a specific field (lastAskedField), include
 * that hint so Gemini can correctly map short answers to the right entity.
 *
 * @param {string} message       — the raw user message
 * @param {string|null} lastAskedField  — the field the assistant just asked about
 * @param {string|null} conversationIntent — the established intent (if any)
 * @returns {string} — the prompt string to send as the user turn
 */
function buildUserPrompt(message, lastAskedField, conversationIntent) {
  const lines = [];

  if (conversationIntent && conversationIntent !== "general_financial_guidance") {
    lines.push(`Current conversation intent: ${conversationIntent}`);
  }

  if (lastAskedField) {
    lines.push(`The assistant's previous question was asking for the user's: ${lastAskedField}`);
    lines.push(`The user's reply below is likely answering that question. Extract the relevant entity accordingly.`);
  }

  lines.push(`User message: ${message}`);

  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse a user message and extract structured understanding.
 *
 * @param {string} message           — raw user message (Telugu, English, or mixed)
 * @param {object} [context]         — optional conversation context
 * @param {string} [context.lastAskedField]      — the field the assistant just asked for
 * @param {string} [context.conversationIntent]  — the established intent (if any)
 * @returns {Promise<object>} — structured extraction result matching RESPONSE_SCHEMA
 * @throws {Error} on missing API key, Gemini failure, or invalid response
 */
async function understandWithGemini(message, context = {}) {
  if (!message || typeof message !== "string" || message.trim() === "") {
    throw new Error("understandWithGemini: message must be a non-empty string.");
  }

  const client = getClient(); // throws if GEMINI_API_KEY missing

  const { lastAskedField = null, conversationIntent = null } = context;
  const userPrompt = buildUserPrompt(message.trim(), lastAskedField, conversationIntent);

  // ── Use the Interactions (Chat) API as recommended by Google ──────────
  let response;
  try {
    const chat = client.chats.create({
      model: MODEL,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1, // low temperature → deterministic extraction
      },
    });

    response = await chat.sendMessage({ message: userPrompt });
  } catch (err) {
    throw new Error(`Gemini API call failed: ${err.message}`);
  }

  // Extract text from the response
  const rawText =
    response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    response?.text ??
    null;

  if (!rawText || rawText.trim() === "") {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `Gemini response was not valid JSON. Raw: ${rawText.slice(0, 200)}`
    );
  }

  // Basic shape validation — ensure required top-level keys exist
  if (!parsed.language || !parsed.intent || !parsed.entities || !parsed.confidence) {
    throw new Error(
      `Gemini response is missing required fields. Got: ${Object.keys(parsed).join(", ")}`
    );
  }

  return parsed;
}

module.exports = { understandWithGemini };

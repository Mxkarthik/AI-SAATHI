"use strict";

/**
 * providerManager.js
 *
 * Selects and returns the configured AI understanding provider.
 *
 * Reads: process.env.AI_PROVIDER  ("gemini" | "ollama")
 * Falls back to "gemini" if the env var is missing or unrecognised.
 *
 * Each provider must implement:
 *   async understand(message: string) → { language, intent, entities, confidence }
 *
 * The manager exposes a single function:
 *   getProvider() → { understand: async (message) → ... }
 *
 * This keeps provider-specific code out of understandingService.js
 * and makes swapping providers a one-line env change.
 */

const { understandWithGemini } = require("./geminiProvider");
const { understandWithOllama } = require("./ollamaProvider");

/**
 * Returns the configured provider as a normalised object with
 * a single `understand(message)` method.
 *
 * @returns {{ understand: (message: string) => Promise<object> }}
 */
function getProvider() {
  const aiProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase().trim();

  switch (aiProvider) {
    case "gemini":
      return { understand: (message, context) => understandWithGemini(message, context) };

    case "ollama":
      return { understand: (message, context) => understandWithOllama(message, context) };

    default:
      console.warn(
        `providerManager: unknown AI_PROVIDER="${aiProvider}", falling back to gemini.`
      );
      return { understand: (message, context) => understandWithGemini(message, context) };
  }
}

module.exports = { getProvider };

"use strict";

/**
 * ollamaProvider.js
 *
 * Ollama understanding provider — stub for local/offline AI model support.
 *
 * This provider is NOT yet configured. It exists to keep the provider
 * abstraction intact so the architecture supports Ollama as an
 * experimental/fallback provider when it is set up.
 *
 * To enable: set AI_PROVIDER=ollama in .env and implement the
 * understandWithOllama function to call the local Ollama API.
 *
 * Contract (must match geminiProvider interface):
 *   async understandWithOllama(message) → { language, intent, entities, confidence }
 */

async function understandWithOllama(message) {
  throw new Error(
    "Ollama provider is not yet configured. " +
    "Set AI_PROVIDER=gemini in .env or configure the Ollama endpoint."
  );
}

module.exports = { understandWithOllama };

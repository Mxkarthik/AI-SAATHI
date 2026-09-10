"use strict";

/**
 * testUnderstanding.js
 *
 * Tests for understandingService.js — covers the four specified cases
 * plus provider fallback behaviour.
 *
 * Run:
 *   node src/orchestrator/understanding/testUnderstanding.js
 */

const { understandMessage, detectLanguage } = require("./understandingService");

// ─── Mini test runner ─────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;

function assert(name, cond, got) {
  if (cond) {
    console.log("  PASS:", name);
    pass++;
  } else {
    console.error("  FAIL:", name, got !== undefined ? `| got: ${JSON.stringify(got)}` : "");
    fail++;
  }
}

// ─── Helper: stub providerManager with a custom understand fn ─────────────────

function withProviderStub(understandFn, fn) {
  const managerPath = require.resolve("./providers/providerManager");
  const original = require.cache[managerPath];

  require.cache[managerPath] = {
    id: managerPath, filename: managerPath, loaded: true,
    exports: { getProvider: () => ({ understand: understandFn }) },
  };

  // Also clear understandingService cache so it re-requires the stub
  const svcPath = require.resolve("./understandingService");
  delete require.cache[svcPath];

  try {
    return fn();
  } finally {
    if (original) {
      require.cache[managerPath] = original;
    } else {
      delete require.cache[managerPath];
    }
    delete require.cache[svcPath];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {

  // ── TEST A ──────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" TEST A: Telugu crop financing with land area");
  console.log("═══════════════════════════════════════════════════════════\n");

  const messageA = "నాకు వ్యవసాయం కోసం డబ్బు కావాలి. నా దగ్గర 3 ఎకరాల భూమి ఉంది. వరి పంట వేస్తున్నాను.";
  const resultA = await understandMessage(messageA);

  console.log("  Provider:", resultA.provider);
  console.log("  Raw result:", JSON.stringify(resultA, null, 2));

  assert("A: language = 'te'",          resultA.language === "te",         resultA.language);
  assert("A: intent = crop_financing",   resultA.intent === "crop_financing", resultA.intent);
  assert("A: entities.crop = 'paddy'",   resultA.entities.crop === "paddy",  resultA.entities.crop);
  assert("A: entities.landArea = 3",     resultA.entities.landArea === 3,    resultA.entities.landArea);
  // Normalisation: Gemini returns "acre", schema requires "acres"
  assert("A: entities.landUnit = 'acres' (normalised)",
    resultA.entities.landUnit === "acres", resultA.entities.landUnit);

  // ── TEST B ──────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" TEST B: Telugu crop financing with amount");
  console.log("═══════════════════════════════════════════════════════════\n");

  const messageB = "నాకు వరి పంట కోసం యాభై వేల రూపాయలు కావాలి.";
  const resultB = await understandMessage(messageB);

  console.log("  Provider:", resultB.provider);
  console.log("  Raw result:", JSON.stringify(resultB, null, 2));

  assert("B: language = 'te'",          resultB.language === "te",          resultB.language);
  assert("B: intent = crop_financing",   resultB.intent === "crop_financing", resultB.intent);
  assert("B: entities.amount = 50000",   resultB.entities.amount === 50000,  resultB.entities.amount);

  // ── TEST C ──────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" TEST C: English equipment financing");
  console.log("═══════════════════════════════════════════════════════════\n");

  const messageC = "I want to buy a tractor for my farm. I need about 4 lakh rupees.";
  const resultC = await understandMessage(messageC);

  console.log("  Provider:", resultC.provider);
  console.log("  Raw result:", JSON.stringify(resultC, null, 2));

  assert("C: language = 'en'",              resultC.language === "en",              resultC.language);
  assert("C: intent = equipment_financing",  resultC.intent === "equipment_financing", resultC.intent);
  assert("C: entities.equipment = 'tractor'", resultC.entities.equipment === "tractor", resultC.entities.equipment);
  assert("C: entities.amount = 400000",      resultC.entities.amount === 400000,     resultC.entities.amount);

  // ── TEST D: Provider failure / fallback ─────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" TEST D: Provider failure → graceful fallback");
  console.log("═══════════════════════════════════════════════════════════\n");

  // D1: Provider throws → fallback response, no throw
  const resultD1 = await withProviderStub(
    async () => { throw new Error("Simulated provider failure"); },
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("I need help with farming");
    }
  );
  console.log("  D1 fallback result:", JSON.stringify(resultD1));
  assert("D1: fallback — no throw",
    resultD1 !== null && typeof resultD1 === "object");
  assert("D1: fallback — intent = general_financial_guidance",
    resultD1.intent === "general_financial_guidance", resultD1.intent);
  assert("D1: fallback — provider = 'fallback'",
    resultD1.provider === "fallback", resultD1.provider);
  assert("D1: fallback — language detected by regex (English)",
    resultD1.language === "en", resultD1.language);
  assert("D1: fallback — entities = {}",
    Object.keys(resultD1.entities).length === 0);
  assert("D1: fallback — confidence.intent = 0",
    resultD1.confidence.intent === 0);

  // D2: Provider throws + Telugu message → language detected by regex
  const resultD2 = await withProviderStub(
    async () => { throw new Error("Simulated provider failure"); },
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("నాకు సహాయం కావాలి");
    }
  );
  console.log("  D2 fallback (Telugu) result:", JSON.stringify(resultD2));
  assert("D2: fallback — language = 'te' (regex fallback)",
    resultD2.language === "te", resultD2.language);
  assert("D2: fallback — provider = 'fallback'",
    resultD2.provider === "fallback");

  // D3: A Telugu answer to the amount question must advance even when the
  // provider omits the amount or is unavailable.
  const resultD3Amount = await withProviderStub(
    async () => ({
      language: "te",
      intent: "crop_financing",
      entities: { amount: null },
    }),
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("నాకు యాభై వేల రూపాయలు కావాలి", { lastAskedField: "amount" });
    }
  );
  assert("D3 amount answer: Telugu phrase extracted as 50000",
    resultD3Amount.entities.amount === 50000, resultD3Amount.entities);

  // D4: Provider returns invalid shape → fallback
  const resultD3 = await withProviderStub(
    async () => ({ badShape: true }),   // missing language/intent/entities
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("test invalid shape");
    }
  );
  console.log("  D3 invalid shape result:", JSON.stringify(resultD3));
  assert("D4: invalid shape → fallback provider",
    resultD3.provider === "fallback", resultD3.provider);

  // ── TEST E: Normalisation unit tests ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" TEST E: Value normalisation");
  console.log("═══════════════════════════════════════════════════════════\n");

  // E1: "acre" → "acres"
  const resultE1 = await withProviderStub(
    async () => ({
      language: "en", intent: "crop_financing",
      entities: { landUnit: "acre", landArea: 2 },
      confidence: { intent: 0.9, entities: 0.9 },
    }),
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("2 acre farm");
    }
  );
  assert("E1: 'acre' normalised to 'acres'",
    resultE1.entities.landUnit === "acres", resultE1.entities.landUnit);

  // E2: "hectare" → "hectares"
  const resultE2 = await withProviderStub(
    async () => ({
      language: "en", intent: "crop_financing",
      entities: { landUnit: "hectare" },
      confidence: { intent: 0.9, entities: 0.9 },
    }),
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("3 hectare farm");
    }
  );
  assert("E2: 'hectare' normalised to 'hectares'",
    resultE2.entities.landUnit === "hectares", resultE2.entities.landUnit);

  // E3: "bigha" stays "bigha"
  const resultE3 = await withProviderStub(
    async () => ({
      language: "en", intent: "crop_financing",
      entities: { landUnit: "bigha" },
      confidence: { intent: 0.9, entities: 0.9 },
    }),
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("5 bigha");
    }
  );
  assert("E3: 'bigha' stays 'bigha'",
    resultE3.entities.landUnit === "bigha", resultE3.entities.landUnit);

  // E4: null landUnit dropped
  const resultE4 = await withProviderStub(
    async () => ({
      language: "en", intent: "crop_financing",
      entities: { landUnit: null, crop: "wheat" },
      confidence: { intent: 0.9, entities: 0.9 },
    }),
    async () => {
      const { understandMessage: um } = require("./understandingService");
      return um("I grow wheat");
    }
  );
  assert("E4: null entity values stripped",
    !("landUnit" in resultE4.entities) && resultE4.entities.crop === "wheat",
    resultE4.entities);

  // ── TEST F: Invalid input validation ────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" TEST F: Invalid input");
  console.log("═══════════════════════════════════════════════════════════\n");

  const throwsFor = async (label, fn) => {
    try {
      await fn();
      console.error("  FAIL:", label, "| expected throw, got no error");
      fail++;
    } catch (e) {
      console.log("  PASS:", label, `| threw: "${e.message}"`);
      pass++;
    }
  };

  await throwsFor("F1: null message",   () => understandMessage(null));
  await throwsFor("F2: empty string",   () => understandMessage(""));
  await throwsFor("F3: whitespace only",() => understandMessage("   "));
  await throwsFor("F4: number input",   () => understandMessage(42));

  // ── detectLanguage backward compat ──────────────────────────────────────────
  console.log("\n─── backward compat: detectLanguage export ────────────────\n");
  assert("detectLanguage('test') = 'en'", detectLanguage("test message") === "en");
  assert("detectLanguage('వరి') = 'te'",  detectLanguage("వరి పంట") === "te");

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(` Results: ${pass} passed, ${fail} failed`);
  console.log("═══════════════════════════════════════════════════════════\n");

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

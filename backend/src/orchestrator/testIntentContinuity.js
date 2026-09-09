"use strict";

/**
 * testIntentContinuity.js
 *
 * Focused deterministic tests for the intent-continuity fix in orchestratorService.
 * These tests use full stubs — no live Gemini calls.
 *
 * Run: node src/orchestrator/testIntentContinuity.js
 */

const proxyquire = require("proxyquire").noCallThru();

// ─── Test runner ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

function assertEq(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label} — expected "${expected}", got "${actual}"`);
}

function assert(condition, label) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

// ─── Shared stubs ────────────────────────────────────────────────────────────

const CROP_FINANCING_FIELDS = ["location", "crop", "landArea", "ownership", "season", "amount", "income", "existingDebt"];

/** Build a proxyquire-wired orchestratorService with custom understanding stub. */
function buildOrchestrator({ understandingStub, gapStub, questionStub } = {}) {
  // Default gap stub: uses the intent from context.currentMessage.intent
  const defaultGapStub = (context) => {
    const intent = context.currentMessage.intent;
    const allFields = CROP_FINANCING_FIELDS;
    const knownFields = context.knownFields || {};

    if (intent !== "crop_financing") {
      return { intent, requiredFields: [], collectedFields: [], missingFields: [], isComplete: true };
    }

    // Simple field resolver matching the real one
    const collected = allFields.filter(f => {
      if (f === "location") return !!knownFields.state;
      if (f === "crop")     return !!(knownFields.crop || (knownFields.crops && knownFields.crops.length > 0));
      if (f === "income")   return !!(knownFields.income || knownFields.farmIncome);
      return knownFields[f] !== undefined && knownFields[f] !== null && knownFields[f] !== "";
    });
    const missing = allFields.filter(f => !collected.includes(f));
    return {
      intent,
      requiredFields: allFields,
      collectedFields: collected,
      missingFields: missing,
      isComplete: missing.length === 0,
    };
  };

  const defaultQuestionStub = async ({ missingFields, context, language }) => {
    if (!missingFields || missingFields.length === 0) return null;
    return { field: missingFields[0], question: `Question for ${missingFields[0]}?`, language, source: "fallback" };
  };

  // A minimal but real-looking contextService
  const contextServiceStub = {
    buildContext: ({ profile, conversation, understanding }) => ({
      user: { profile: profile || null },
      conversation: {
        id: String(conversation._id || conversation.id || ""),
        language: conversation.language || "en",
        intent: conversation.intent || null,
        status: conversation.status || "active",
      },
      currentMessage: {
        language: understanding.language,
        intent: understanding.intent,
        entities: understanding.entities || {},
      },
      knownFields: { ...(profile || {}), ...(understanding.entities || {}) },
    }),
  };

  return proxyquire("./orchestratorService", {
    "./understanding/understandingService": { understandMessage: understandingStub },
    "./context/contextService": contextServiceStub,
    "./informationGap/informationGapService": { analyzeInformationGap: gapStub || defaultGapStub },
    "./questions/nextQuestionService": { getNextQuestion: questionStub || defaultQuestionStub },
  });
}

// ─── Shared fixtures ─────────────────────────────────────────────────────────

const CONV_CROP_FINANCING = { _id: "conv1", userId: "u1", language: "te", intent: "crop_financing", status: "active" };
const CONV_NO_INTENT      = { _id: "conv2", userId: "u1", language: "en", intent: null,             status: "active" };
const CONV_FALLBACK_INTENT = { _id: "conv3", userId: "u1", language: "en", intent: "general_financial_guidance", status: "active" };

// Profile already has location/crop/landArea/ownership — season,amount,income,debt missing
const PROFILE_PARTIAL = {
  state: "Andhra Pradesh",
  landArea: 3,
  landUnit: "acres",
  ownership: "owned",
  crops: ["paddy"],
};

// ─── TESTS ────────────────────────────────────────────────────────────────────

(async () => {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" Intent Continuity Tests");
  console.log("══════════════════════════════════════════════════════════\n");

  // TEST 1: Provider succeeds → existing intent preserved (pass-through)
  await runTest("TEST 1 — Provider succeeds: intent from Gemini is used", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "te",
        intent: "crop_financing",
        entities: {},
        confidence: { intent: 0.95, entities: 0.9 },
        provider: "gemini",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_CROP_FINANCING,
      profile: PROFILE_PARTIAL,
      message: "నాకు పంట రుణం కావాలి",
    });

    assertEq(result.understanding.provider, "gemini", "provider");
    assertEq(result.understanding.intent, "crop_financing", "intent from Gemini");
    assertEq(result.intent, "crop_financing", "orchestration.intent");
  });

  // TEST 2: Provider fails, conversation has intent → preserve conversation.intent
  await runTest("TEST 2 — Provider fallback + existing intent → intent preserved", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "te",
        intent: "general_financial_guidance", // fallback intent
        entities: {},
        confidence: { intent: 0, entities: 0 },
        provider: "fallback",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_CROP_FINANCING, // intent = "crop_financing"
      profile: PROFILE_PARTIAL,
      message: "ఖరీఫ్ సీజన్",
    });

    assertEq(result.understanding.provider, "fallback", "provider = fallback");
    assertEq(result.understanding.intent, "crop_financing", "understanding.intent patched to crop_financing");
    assertEq(result.intent, "crop_financing", "orchestration.intent = crop_financing");
    assertEq(result.status, "needs_information", "status = needs_information (NOT ready_for_decision)");
    assertEq(result.conversationState.intent, "crop_financing", "state intent preserved after fallback");
    assertEq(result.conversationState.stage, "information_collection", "state stage after fallback");
    assertEq(result.decisionContext.intent, "crop_financing", "decision context intent preserved after fallback");
    assertEq(result.decisionContext.status, "incomplete", "decision context status after fallback");
  });

  // TEST 3: Provider fallback + season entity in message → season not in missingFields
  await runTest("TEST 3 — Season answered during fallback → information gap advances", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "te",
        intent: "general_financial_guidance",
        entities: { season: "kharif" },  // understanding still extracted entities
        confidence: { intent: 0, entities: 0 },
        provider: "fallback",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_CROP_FINANCING,
      profile: PROFILE_PARTIAL,
      message: "ఖరీఫ్ సీజన్",
    });

    assertEq(result.intent, "crop_financing", "intent preserved");
    assertEq(result.status, "needs_information", "still needs more info");

    const missing = result.informationGap.missingFields;
    assert(!missing.includes("season"),     "season should NOT be missing (answered)");
    assert(!missing.includes("location"),   "location should NOT be missing (profile)");
    assert(!missing.includes("crop"),       "crop should NOT be missing (profile)");
    assert(!missing.includes("landArea"),   "landArea should NOT be missing (profile)");
    assert(!missing.includes("ownership"),  "ownership should NOT be missing (profile)");
    assert(missing.includes("amount"),      "amount still missing");
    assert(missing.includes("income"),      "income still missing");
    assert(missing.includes("existingDebt"),"existingDebt still missing");
    assertEq(result.conversationState.missingFields.join(","), "amount,income,existingDebt", "state remaining fields");
    assertEq(result.conversationState.lastAskedField, "amount", "state last asked field");

    console.log(`    remaining missingFields: [${missing.join(", ")}]`);
  });

  // TEST 4: No existing intent + provider fails → safe fallback preserved
  await runTest("TEST 4 — No existing intent + provider fails → fallback behavior unchanged", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "en",
        intent: "general_financial_guidance",
        entities: {},
        confidence: { intent: 0, entities: 0 },
        provider: "fallback",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_NO_INTENT, // intent = null
      profile: null,
      message: "I need help",
    });

    // With general_financial_guidance, requiredFields = [] → isComplete = true → ready_for_decision
    assertEq(result.understanding.intent, "general_financial_guidance", "fallback intent kept");
    assertEq(result.intent, "general_financial_guidance", "orchestration.intent");
    assertEq(result.status, "ready_for_decision", "safe fallback: ready_for_decision for general guidance");
  });

  // TEST 4b: conversation.intent = general_financial_guidance → still treated as no meaningful intent
  await runTest("TEST 4b — Existing intent = general_financial_guidance → not treated as meaningful", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "en",
        intent: "general_financial_guidance",
        entities: {},
        confidence: { intent: 0, entities: 0 },
        provider: "fallback",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_FALLBACK_INTENT, // intent = "general_financial_guidance"
      profile: null,
      message: "hi",
    });

    // general_financial_guidance is not a "meaningful" existing intent
    assertEq(result.understanding.intent, "general_financial_guidance", "not patched — not meaningful");
    assertEq(result.status, "ready_for_decision", "isComplete=true for general guidance");
  });

  // TEST 5: Provider fails, conversation.language = "te" → language from regex (reliable)
  await runTest("TEST 5 — Provider fails, Telugu message → language = 'te' via regex (reliable)", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "te",   // regex correctly detected Telugu
        intent: "general_financial_guidance",
        entities: {},
        confidence: { intent: 0, entities: 0 },
        provider: "fallback",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_CROP_FINANCING,
      profile: PROFILE_PARTIAL,
      message: "ఖరీఫ్ సీజన్",
    });

    assertEq(result.language, "te", "language = te (preserved from regex)");
    assertEq(result.understanding.language, "te", "understanding.language = te");
  });

  // TEST 5b: Provider fails on English-only message in a te conversation → language from regex = en
  await runTest("TEST 5b — Provider fails, English-only message → regex returns 'en' (not overridden by conv.language)", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "en",   // regex: no Telugu chars → en
        intent: "general_financial_guidance",
        entities: {},
        confidence: { intent: 0, entities: 0 },
        provider: "fallback",
      }),
    });

    const result = await orchestrate({
      conversation: CONV_CROP_FINANCING, // conv.language = "te"
      profile: PROFILE_PARTIAL,
      message: "season is kharif",   // English only
    });

    // We do NOT override regex language with conv.language — regex is reliable
    assertEq(result.language, "en", "language = en (regex wins, no override)");
  });

  // TEST 6: Provider returns a different valid intent → existing intent can change
  await runTest("TEST 6 — Valid new intent from Gemini → existing intent updated", async () => {
    const { orchestrate } = buildOrchestrator({
      understandingStub: async () => ({
        language: "en",
        intent: "equipment_financing", // Gemini successfully detected a NEW intent
        entities: { equipment: "tractor" },
        confidence: { intent: 0.92, entities: 0.9 },
        provider: "gemini",            // NOT a fallback
      }),
    });

    const result = await orchestrate({
      conversation: CONV_CROP_FINANCING,  // was crop_financing
      profile: null,
      message: "I need financing for a tractor",
    });

    // Provider succeeded → applyConversationContinuity is skipped entirely
    assertEq(result.understanding.provider, "gemini", "provider = gemini");
    assertEq(result.understanding.intent, "equipment_financing", "new intent from Gemini");
    assertEq(result.intent, "equipment_financing", "orchestration.intent updated to new intent");
  });

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n══════════════════════════════════════════════════════════`);
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log(`══════════════════════════════════════════════════════════`);
  if (failed > 0) process.exit(1);
})();

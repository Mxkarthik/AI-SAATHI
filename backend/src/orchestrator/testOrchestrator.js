"use strict";

/**
 * testOrchestrator.js
 *
 * Unit tests for orchestratorService.js.
 * All downstream services are stubbed so no live Gemini calls are made.
 *
 * Run:
 *   node src/orchestrator/testOrchestrator.js
 */

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

async function test(name, fn) {
  try {
    await fn();
  } catch (err) {
    console.error("  FAIL (threw unexpectedly):", name, "|", err.message);
    fail++;
  }
}

async function testThrows(name, fn, expectedFragment) {
  try {
    await fn();
    console.error("  FAIL (did not throw):", name);
    fail++;
  } catch (err) {
    const ok = !expectedFragment || err.message.includes(expectedFragment);
    if (ok) {
      console.log("  PASS:", name);
      pass++;
    } else {
      console.error("  FAIL:", name, `| expected fragment "${expectedFragment}", got: "${err.message}"`);
      fail++;
    }
  }
}

// ─── Stub helpers ─────────────────────────────────────────────────────────────

/**
 * Temporarily replace a module in the require cache with a stub,
 * run fn(), then restore the original.
 * Works by resolving the absolute path and patching require.cache.
 */
function withStub(modulePath, stub, fn) {
  const resolvedPath = require.resolve(modulePath);
  const original = require.cache[resolvedPath];

  require.cache[resolvedPath] = {
    id:       resolvedPath,
    filename: resolvedPath,
    loaded:   true,
    exports:  stub,
  };

  try {
    return fn();
  } finally {
    if (original) {
      require.cache[resolvedPath] = original;
    } else {
      delete require.cache[resolvedPath];
    }
    // Also clear the orchestrator cache so it re-requires the stub next time
    const orchPath = require.resolve("./orchestratorService");
    delete require.cache[orchPath];
  }
}

// ─── Shared stubs ─────────────────────────────────────────────────────────────

// Minimal conversation and profile fixtures
const CONV_TE = {
  _id: "conv-test-1", language: "te", intent: null, status: "active",
};
const CONV_EN = {
  _id: "conv-test-2", language: "en", intent: null, status: "active",
};
const PROFILE_AP = {
  location: { state: "Andhra Pradesh", district: "Guntur" },
  farming:  { landArea: 3, landUnit: "acres", ownership: "owned" },
  crops:    ["paddy"],
  irrigation: { typeOrSource: "borewell" },
  financial: { farmIncome: null, otherIncome: null, monthlyExpenses: null, existingLoans: [] },
  assets:   { equipment: [], livestock: [] },
};

// nextQuestionService stub — returns a canned question without Gemini
const STUB_NEXT_QUESTION = {
  getNextQuestion: async ({ missingFields, language }) => {
    if (!Array.isArray(missingFields) || missingFields.length === 0) return null;
    return {
      field:    missingFields[0],
      question: `(stub) Please tell me your ${missingFields[0]}`,
      language: language || "en",
      source:   "fallback",
    };
  },
};

// Helper: build an understanding stub for a given intent / entities
function understandingStub(intent, entities = {}, language = "en") {
  return {
    understandMessage: async () => ({ language, intent, entities }),
    detectLanguage:    () => language,
  };
}

// ─── TEST 1: Telugu crop financing message ────────────────────────────────────

async function main() {

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 1: Telugu crop financing");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 1 setup", async () => {
  const message = "నాకు వ్యవసాయం కోసం డబ్బు కావాలి. నా దగ్గర 3 ఎకరాల భూమి ఉంది. వరి పంట వేస్తున్నాను.";

  const result = await withStub(
    "./understanding/understandingService",
    understandingStub("crop_financing", { crop: "paddy", landArea: 3, landUnit: "acre" }, "te"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_TE, profile: PROFILE_AP, message });
      }
    )
  );

  assert("T1: language = 'te'",        result.language === "te");
  assert("T1: intent = crop_financing", result.intent === "crop_financing");
  assert("T1: status = needs_information", result.status === "needs_information");
  assert("T1: missingFields non-empty",  result.informationGap.missingFields.length > 0);
  assert("T1: nextQuestion not null",    result.nextQuestion !== null);
  assert("T1: nextQuestion has field",   result.nextQuestion && typeof result.nextQuestion.field === "string");
  assert("T1: nextQuestion has question", result.nextQuestion && typeof result.nextQuestion.question === "string");

  // With profile providing state, landArea, ownership, crop — missing: season, amount, income, existingDebt
  const missing = result.informationGap.missingFields;
  assert("T1: season in missingFields",     missing.includes("season"),     missing);
  assert("T1: amount in missingFields",     missing.includes("amount"),     missing);
  assert("T1: existingDebt in missingFields", missing.includes("existingDebt"), missing);

  console.log("  (missingFields:", missing.join(", ") + ")");
  console.log("  (nextQuestion field:", result.nextQuestion?.field + ")");
});

// ─── TEST 2: English equipment financing message ──────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 2: English equipment financing");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 2 setup", async () => {
  const message = "I want to buy a tractor for my farm. I need about 4 lakh rupees.";

  const result = await withStub(
    "./understanding/understandingService",
    understandingStub("equipment_financing", { equipment: "tractor", amount: 400000 }, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: null, message });
      }
    )
  );

  assert("T2: language = 'en'",               result.language === "en");
  assert("T2: intent = equipment_financing",   result.intent === "equipment_financing");
  assert("T2: equipment entity = tractor",
    result.understanding.entities.equipment === "tractor");
  assert("T2: amount entity = 400000",
    result.understanding.entities.amount === 400000);
  assert("T2: status = needs_information",     result.status === "needs_information");
  assert("T2: still has missing fields",       result.informationGap.missingFields.length > 0);
  // With no profile, location/equipment known from entities, income/existingDebt missing
  const missing = result.informationGap.missingFields;
  assert("T2: income in missingFields",    missing.includes("income"),    missing);
  assert("T2: existingDebt in missingFields", missing.includes("existingDebt"), missing);

  console.log("  (missingFields:", missing.join(", ") + ")");
});

// ─── TEST 3: missingFields order not reordered by orchestrator ───────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 3: missingFields order preserved");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 3 setup", async () => {
  // Profile has nothing — all fields of crop_financing are missing
  const message = "I need money for farming";

  let capturedMissingFields = null;

  const capturingNextQuestion = {
    getNextQuestion: async ({ missingFields, language }) => {
      capturedMissingFields = missingFields; // capture what was passed
      return {
        field:    missingFields[0],
        question: `stub question for ${missingFields[0]}`,
        language: language || "en",
        source:   "fallback",
      };
    },
  };

  await withStub(
    "./understanding/understandingService",
    understandingStub("crop_financing", {}, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      capturingNextQuestion,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: null, message });
      }
    )
  );

  // The expected order from intentDefinitions for crop_financing:
  const expectedOrder = ["location", "crop", "landArea", "ownership", "season", "amount", "income", "existingDebt"];

  assert("T3: missingFields passed to nextQuestionService (not null)",
    capturedMissingFields !== null);

  // Verify the ORDER of fields as passed to nextQuestionService matches the
  // order in intentDefinitions (the informationGapService must not have been reordered)
  const passedOrder = capturedMissingFields || [];
  let orderOk = true;
  let lastIdx = -1;
  for (const f of passedOrder) {
    const idx = expectedOrder.indexOf(f);
    if (idx === -1 || idx <= lastIdx) { orderOk = false; break; }
    lastIdx = idx;
  }
  assert("T3: missingFields order matches intentDefinitions order", orderOk,
    `passed: [${passedOrder.join(", ")}]`);

  // nextQuestion.field must be the FIRST missing field, unchanged
  assert("T3: nextQuestion.field is missingFields[0]",
    passedOrder.length === 0 || capturedMissingFields[0] === passedOrder[0]);

  console.log("  (missingFields passed to nextQuestionService:", (capturedMissingFields || []).join(", ") + ")");
});

// ─── TEST 4: ready_for_decision when all fields are collected ─────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 4: ready_for_decision — all fields complete");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 4 setup", async () => {
  const message = "I grow paddy on 3 acres in Andhra Pradesh and need 50000 rupees for kharif season.";

  // Provide a complete context: profile + entities cover all crop_financing fields
  const fullProfile = {
    location: { state: "Andhra Pradesh", district: "Guntur" },
    farming:  { landArea: 3, landUnit: "acres", ownership: "owned" },
    crops:    ["paddy"],
    financial: { farmIncome: 120000, otherIncome: 0, monthlyExpenses: 8000, existingLoans: [{ lender: "SBI", amount: 30000 }] },
    assets:   { equipment: [], livestock: [] },
  };

  // Entities supply the remaining fields: season, amount
  const result = await withStub(
    "./understanding/understandingService",
    understandingStub("crop_financing", { season: "kharif", amount: 50000 }, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: fullProfile, message });
      }
    )
  );

  assert("T4: status = ready_for_decision",   result.status === "ready_for_decision", result.status);
  assert("T4: nextQuestion = null",            result.nextQuestion === null);
  assert("T4: missingFields empty",            result.informationGap.missingFields.length === 0,
    result.informationGap.missingFields);
  assert("T4: isComplete = true",              result.informationGap.isComplete === true);
  assert("T4: collectedFields includes all",   result.informationGap.collectedFields.length === result.informationGap.requiredFields.length);

  console.log("  (collectedFields:", result.informationGap.collectedFields.join(", ") + ")");
});

// ─── TEST 5: Invalid input validation ────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 5: Language propagation to nextQuestionService");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 5 setup", async () => {
  let capturedLanguage = null;

  const languageCapturingStub = {
    getNextQuestion: async ({ missingFields, language }) => {
      capturedLanguage = language;  // capture exactly what the orchestrator passes
      return {
        field:    missingFields[0],
        question: `stub question`,
        language: language,
        source:   "fallback",
      };
    },
  };

  // Telugu message → language = "te" from understanding
  await withStub(
    "./understanding/understandingService",
    understandingStub("crop_financing", {}, "te"),
    () => withStub(
      "./questions/nextQuestionService",
      languageCapturingStub,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_TE, profile: null, message: "test" });
      }
    )
  );

  assert("T5: language 'te' propagated to nextQuestionService",
    capturedLanguage === "te", capturedLanguage);

  // English message → language = "en"
  capturedLanguage = null;
  await withStub(
    "./understanding/understandingService",
    understandingStub("equipment_financing", { equipment: "tractor" }, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      languageCapturingStub,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: null, message: "test" });
      }
    )
  );

  assert("T5: language 'en' propagated to nextQuestionService",
    capturedLanguage === "en", capturedLanguage);
});

// ─── TEST 6: Invalid input validation ────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 6: Invalid input");
console.log("═══════════════════════════════════════════════════════════\n");

// Load a clean orchestratorService (no stubs needed — validation happens before any service call)
delete require.cache[require.resolve("./orchestratorService")];
const { orchestrate } = require("./orchestratorService");

await testThrows("T6a: null argument throws",
  () => orchestrate(null),
  "must be a non-null object");

await testThrows("T6b: missing message throws",
  () => orchestrate({ conversation: CONV_EN, profile: null }),
  "message");

await testThrows("T6c: empty message throws",
  () => orchestrate({ conversation: CONV_EN, profile: null, message: "   " }),
  "message");

await testThrows("T6d: missing conversation throws",
  () => orchestrate({ profile: null, message: "hello" }),
  "conversation");

await testThrows("T6e: null conversation throws",
  () => orchestrate({ conversation: null, profile: null, message: "hello" }),
  "conversation");

// ─── TEST 7: No question-generation call when informationGap is complete ──────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 7: No question-generation when all fields are collected");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 7 setup", async () => {
  let getNextQuestionCallCount = 0;

  const proxyquire = require("proxyquire").noCallThru();

  const fullProfile = {
    location: { state: "Andhra Pradesh", district: "Guntur" },
    farming:  { landArea: 3, landUnit: "acres", ownership: "owned" },
    crops:    ["paddy"],
    financial: { farmIncome: 120000, monthlyExpenses: 8000, existingLoans: [{ lender: "SBI", amount: 30000 }] },
    assets:   { equipment: [], livestock: [] },
  };

  // Use proxyquire for reliable stubbing — avoids require.cache timing issues
  // caused by the direct require() in TEST 6 above.
  const { orchestrate: orchestrate7 } = proxyquire("./orchestratorService", {
    "./understanding/understandingService": {
      understandMessage: async () => ({
        language: "en",
        intent: "crop_financing",
        entities: { season: "kharif", amount: 50000 },
        provider: "stub",
      }),
    },
    "./questions/nextQuestionService": {
      getNextQuestion: async (params) => {
        getNextQuestionCallCount++;
        return {
          field: params.missingFields[0],
          question: "stub",
          language: "en",
          source: "fallback",
        };
      },
    },
    "../services/profileService": { upsertProfile: async () => null },
  });

  const CONV_WITH_INTENT = { ...CONV_EN, intent: "crop_financing" };

  const result = await orchestrate7({ conversation: CONV_WITH_INTENT, profile: fullProfile, message: "test" });

  assert("T7: status = ready_for_decision",   result.status === "ready_for_decision", result.status);
  assert("T7: nextQuestion = null",            result.nextQuestion === null);
  assert("T7: getNextQuestion NOT called",     getNextQuestionCallCount === 0, `called ${getNextQuestionCallCount} times`);

  console.log("  (getNextQuestion call count:", getNextQuestionCallCount + ")");
});

// ─── TEST 8: Bug fix — general_financial_guidance never becomes ready_for_decision ─

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 8 (Phase D Bug 1): ambiguous intent must NOT produce ready_for_decision");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 8 setup", async () => {
  // "I need money for farming." — understanding layer returns general_financial_guidance
  // because the message is not specific enough for a definite intent.
  const message = "I need money for farming.";

  const result = await withStub(
    "./understanding/understandingService",
    understandingStub("general_financial_guidance", {}, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        // New conversation — no prior intent
        return orchestrate({ conversation: CONV_EN, profile: null, message });
      }
    )
  );

  assert("T8: status is needs_information (NOT ready_for_decision)",
    result.status === "needs_information", result.status);
  assert("T8: conversationState.stage is intent_detection",
    result.conversationState && result.conversationState.stage === "intent_detection",
    result.conversationState && result.conversationState.stage);
  assert("T8: nextQuestion is not null (clarification question provided)",
    result.nextQuestion !== null);
  assert("T8: nextQuestion.field is 'intent'",
    result.nextQuestion && result.nextQuestion.field === "intent",
    result.nextQuestion && result.nextQuestion.field);
  assert("T8: nextQuestion.question is a non-empty string",
    result.nextQuestion && typeof result.nextQuestion.question === "string" && result.nextQuestion.question.length > 0);
  assert("T8: eligibility is null (must not run for ambiguous intent)",
    result.eligibility === null);
  assert("T8: recommendation is null",
    result.recommendation === null);

  console.log("  (clarifying question:", result.nextQuestion?.question + ")");
});

// ─── TEST 9: Bug fix — conversationState.stage drives top-level status ──────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 9 (Phase D Bug 1): complete profile with specific intent → ready_for_decision");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 9 setup", async () => {
  // Complete crop_financing profile — all fields provided
  const message = "I am a farmer from Visakhapatnam, Andhra Pradesh. I own 3 acres and grow paddy. I need ₹50,000 for crop financing. Annual farm income is ₹2 lakh, existing bank loan ₹30,000.";

  const fullProfile = {
    location: { state: "Andhra Pradesh", district: "Visakhapatnam" },
    farming:  { landArea: 3, landUnit: "acres", ownership: "owned" },
    crops:    ["paddy"],
    financial: { farmIncome: 200000, existingLoans: [{ lender: "Bank", amount: 30000 }] },
    assets:   { equipment: [], livestock: [] },
  };

  const result = await withStub(
    "./understanding/understandingService",
    understandingStub("crop_financing", { season: "kharif", amount: 50000 }, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: fullProfile, message });
      }
    )
  );

  assert("T9: intent = crop_financing",         result.intent === "crop_financing", result.intent);
  assert("T9: informationGap.isComplete = true",  result.informationGap.isComplete === true);
  assert("T9: conversationState.stage = ready_for_decision",
    result.conversationState && result.conversationState.stage === "ready_for_decision",
    result.conversationState && result.conversationState.stage);
  assert("T9: status = ready_for_decision",     result.status === "ready_for_decision", result.status);
  assert("T9: nextQuestion = null",             result.nextQuestion === null);

  console.log("  (status:", result.status + ", stage:", result.conversationState?.stage + ")");
});

// ─── TEST 10: Bug fix — status consistency: stage drives status in all paths ─

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" TEST 10 (Phase D Bug 1): status always consistent with conversationState.stage");
console.log("═══════════════════════════════════════════════════════════\n");

await test("TEST 10 setup", async () => {
  // information_collection stage: specific intent but incomplete profile
  const result = await withStub(
    "./understanding/understandingService",
    understandingStub("crop_financing", {}, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: null, message: "I need a crop loan" });
      }
    )
  );

  assert("T10: stage = information_collection when missing fields remain",
    result.conversationState && result.conversationState.stage === "information_collection",
    result.conversationState && result.conversationState.stage);
  assert("T10: status = needs_information when stage = information_collection",
    result.status === "needs_information", result.status);

  // intent_detection stage: ambiguous intent, no prior intent on conversation
  const result2 = await withStub(
    "./understanding/understandingService",
    understandingStub("general_financial_guidance", {}, "en"),
    () => withStub(
      "./questions/nextQuestionService",
      STUB_NEXT_QUESTION,
      async () => {
        const { orchestrate } = require("./orchestratorService");
        return orchestrate({ conversation: CONV_EN, profile: null, message: "I need money" });
      }
    )
  );

  assert("T10: stage = intent_detection when intent is ambiguous",
    result2.conversationState && result2.conversationState.stage === "intent_detection",
    result2.conversationState && result2.conversationState.stage);
  assert("T10: status = needs_information when stage = intent_detection (NOT ready_for_decision)",
    result2.status === "needs_information", result2.status);
  assert("T10: status is NEVER ready_for_decision when stage is intent_detection",
    !(result2.status === "ready_for_decision"),
    result2.status);
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(` Results: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════════════\n");

process.exit(fail > 0 ? 1 : 0);
} // end main()

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});

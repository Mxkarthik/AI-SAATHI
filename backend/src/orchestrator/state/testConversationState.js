"use strict";

const { deriveConversationState } = require("./conversationStateService");
const { analyzeInformationGap } = require("../informationGap/informationGapService");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL: ${name}\n${error.stack || error}`);
    failed++;
  }
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function gap({ collectedFields = [], missingFields = [], isComplete = false } = {}) {
  return { collectedFields, missingFields, isComplete };
}

test("no intent is in intent_detection", () => {
  const state = deriveConversationState({ language: "en" });
  equal(state.stage, "intent_detection", "stage");
  equal(state.intent, null, "intent");
  equal(state.isComplete, false, "isComplete");
});

test("intent with missing fields is in information_collection", () => {
  const state = deriveConversationState({
    intent: "crop_financing",
    language: "en",
    informationGap: gap({
      collectedFields: ["location", "crop"],
      missingFields: ["landArea"],
    }),
  });
  equal(state.stage, "information_collection", "stage");
  equal(state.missingFields[0], "landArea", "missing field");
});

test("complete intent is ready_for_decision", () => {
  const state = deriveConversationState({
    intent: "crop_financing",
    informationGap: gap({ collectedFields: ["location"], isComplete: true }),
  });
  equal(state.stage, "ready_for_decision", "stage");
  equal(state.isComplete, true, "isComplete");
  equal(state.lastAskedField, null, "lastAskedField");
});

test("lastAskedField comes from the generated current question", () => {
  const state = deriveConversationState({
    intent: "crop_financing",
    informationGap: gap({ missingFields: ["amount"] }),
    nextQuestion: { field: "amount", question: "How much do you need?" },
  });
  equal(state.lastAskedField, "amount", "lastAskedField");
});

test("language propagates from the orchestration result", () => {
  const state = deriveConversationState({
    conversation: { language: "en" },
    intent: "crop_financing",
    language: "te",
    informationGap: gap({ missingFields: ["amount"] }),
  });
  equal(state.language, "te", "language");
});

test("effective intent retains a meaningful existing conversation intent", () => {
  // The orchestrator passes its continuity-patched intent into this pure service.
  const state = deriveConversationState({
    conversation: { intent: "crop_financing", language: "te" },
    intent: "crop_financing",
    informationGap: gap({ missingFields: ["amount"] }),
  });
  equal(state.intent, "crop_financing", "intent after provider fallback");
  equal(state.stage, "information_collection", "stage");
});

test("crop financing advances after season and leaves amount, income, existingDebt", () => {
  const informationGap = analyzeInformationGap({
    currentMessage: { intent: "crop_financing" },
    knownFields: {
      state: "Andhra Pradesh",
      crops: ["paddy"],
      landArea: 3,
      ownership: "owned",
      season: "kharif",
    },
  });
  const state = deriveConversationState({
    intent: informationGap.intent,
    language: "en",
    informationGap,
    nextQuestion: { field: "amount" },
  });

  equal(state.stage, "information_collection", "stage");
  equal(state.missingFields.join(","), "amount,income,existingDebt", "remaining fields");
  equal(state.lastAskedField, "amount", "lastAskedField");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

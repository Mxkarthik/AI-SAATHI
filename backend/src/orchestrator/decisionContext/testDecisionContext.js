"use strict";

const { buildDecisionContext } = require("./decisionContextService");

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
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const COMPLETE_CONTEXT = {
  currentMessage: { intent: "crop_financing", language: "te" },
  knownFields: {
    state: "Andhra Pradesh", district: "Guntur", mandal: "Tenali",
    landArea: 3, landUnit: "acres", ownership: "owned", crops: ["paddy"],
    irrigation: "borewell", season: "kharif", amount: 50000, income: 200000,
    existingDebt: 10000, farmIncome: 180000, otherIncome: 20000,
    monthlyExpenses: 8000, existingLoans: [{ lender: "SBI", amount: 10000 }],
    equipment: ["pump"], livestock: ["cow"],
    insuranceType: "crop insurance", asset: "paddy crop",
    savingsGoal: "emergency fund", investmentAmount: 25000,
    investmentPeriod: "3 years", riskPreference: "moderate",
  },
};

const COMPLETE_GAP = {
  intent: "crop_financing",
  collectedFields: ["location", "crop", "landArea", "ownership", "season", "amount", "income", "existingDebt"],
  missingFields: [],
  isComplete: true,
};

const READY_STATE = { stage: "ready_for_decision", intent: "crop_financing", language: "te" };

test("complete crop financing context is ready", () => {
  const result = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: COMPLETE_GAP, conversationState: READY_STATE });
  equal(result.status, "ready", "status");
  equal(result.decision.isComplete, true, "isComplete");
  equal(result.intent, "crop_financing", "intent");
  equal(result.conversation.stage, "ready_for_decision", "conversation stage");
});

test("incomplete context preserves Information Gap missing fields exactly", () => {
  const gap = { ...COMPLETE_GAP, missingFields: ["amount", "income", "existingDebt"], isComplete: false };
  const result = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: gap, conversationState: READY_STATE });
  equal(result.status, "incomplete", "status");
  equal(result.decision.missingFields, gap.missingFields, "missingFields");
});

test("context facts are projected under user location, farming, financial, and assets", () => {
  const user = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: COMPLETE_GAP, conversationState: READY_STATE }).user;
  equal(user.location, { state: "Andhra Pradesh", district: "Guntur", mandal: "Tenali" }, "location");
  equal(user.farming, { landArea: 3, landUnit: "acres", ownership: "owned", irrigation: "borewell", season: "kharif", crops: ["paddy"] }, "farming");
  equal(user.financial.farmIncome, 180000, "farmIncome");
  equal(user.assets, { equipment: ["pump"], livestock: ["cow"] }, "assets");
  equal(user.intentSpecific, {
    insuranceType: "crop insurance",
    asset: "paddy crop",
    savingsGoal: "emergency fund",
    investmentAmount: 25000,
    investmentPeriod: "3 years",
    riskPreference: "moderate",
  }, "intent-specific fields");
});

test("intent-specific fields are projected additively without defaults", () => {
  const result = buildDecisionContext({
    context: { knownFields: { insuranceType: "crop insurance", savingsGoal: "" } },
    informationGap: { isComplete: false },
    conversationState: { intent: "insurance", language: "en" },
  });
  equal(result.user.intentSpecific, { insuranceType: "crop insurance" }, "available fields");
  equal(Object.prototype.hasOwnProperty.call(result.user.intentSpecific, "asset"), false, "missing asset");
  equal(Object.prototype.hasOwnProperty.call(result.user.intentSpecific, "investmentAmount"), false, "missing investment amount");
  equal(Object.prototype.hasOwnProperty.call(result.user.intentSpecific, "riskPreference"), false, "missing risk preference");
});

test("null, undefined, and empty intent-specific values stay absent", () => {
  const result = buildDecisionContext({
    context: {
      knownFields: {
        insuranceType: null,
        asset: undefined,
        savingsGoal: "",
        investmentAmount: null,
        investmentPeriod: "   ",
        riskPreference: undefined,
      },
    },
    informationGap: { isComplete: false },
    conversationState: { intent: "investment", language: "en" },
  });
  equal(result.user.intentSpecific, {}, "no fabricated intent-specific values");
});

test("crop, equipment, and livestock remain compatible", () => {
  const result = buildDecisionContext({
    context: { knownFields: { crop: "paddy", equipment: ["tractor"], livestock: ["cow"] } },
    informationGap: { isComplete: false },
    conversationState: { intent: "crop_financing", language: "en" },
  });
  equal(result.user.farming.crops, ["paddy"], "crop");
  equal(result.user.assets.equipment, ["tractor"], "equipment");
  equal(result.user.assets.livestock, ["cow"], "livestock");
});

test("a current-message singular crop is normalized into farming.crops", () => {
  const result = buildDecisionContext({
    context: { knownFields: { crop: "paddy" } },
    informationGap: { collectedFields: ["crop"], missingFields: [], isComplete: true },
    conversationState: READY_STATE,
  });
  equal(result.user.farming.crops, ["paddy"], "crops");
});

test("undefined and empty values are not copied", () => {
  const result = buildDecisionContext({
    context: { knownFields: { state: "", district: undefined, landArea: 0, crops: [] } },
    informationGap: { collectedFields: [], missingFields: ["location"], isComplete: false },
    conversationState: { intent: "crop_financing", language: "en" },
  });
  equal(result.user.location, {}, "location");
  equal(result.user.farming, { landArea: 0 }, "farming");
  equal(Object.prototype.hasOwnProperty.call(result.user.farming, "crops"), false, "no empty crops");
});

test("language propagates from Conversation State", () => {
  const result = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: COMPLETE_GAP, conversationState: READY_STATE });
  equal(result.language, "te", "language");
});

test("intent propagates from Conversation State", () => {
  const result = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: COMPLETE_GAP, conversationState: READY_STATE });
  equal(result.intent, "crop_financing", "intent");
});

test("continuity-patched state retains intent after provider fallback", () => {
  const result = buildDecisionContext({
    context: { currentMessage: { intent: "general_financial_guidance", language: "te" }, knownFields: {} },
    informationGap: { intent: "crop_financing", collectedFields: [], missingFields: ["amount"], isComplete: false },
    conversationState: { stage: "information_collection", intent: "crop_financing", language: "te" },
  });
  equal(result.intent, "crop_financing", "continuity intent");
});

test("Information Gap is the only source of completeness", () => {
  const result = buildDecisionContext({
    context: COMPLETE_CONTEXT,
    informationGap: { ...COMPLETE_GAP, isComplete: false, missingFields: ["income"] },
    conversationState: READY_STATE,
  });
  equal(result.status, "incomplete", "status");
  equal(result.decision.isComplete, false, "isComplete");
});

test("inputs are not mutated", () => {
  const context = JSON.parse(JSON.stringify(COMPLETE_CONTEXT));
  const gap = JSON.parse(JSON.stringify(COMPLETE_GAP));
  const state = { ...READY_STATE };
  const before = JSON.stringify({ context, gap, state });
  const result = buildDecisionContext({ context, informationGap: gap, conversationState: state });
  result.user.farming.crops.push("maize");
  result.user.financial.existingLoans[0].amount = 1;
  equal(JSON.stringify({ context, gap, state }), before, "inputs");
});

test("service is deterministic with no external dependencies", () => {
  const first = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: COMPLETE_GAP, conversationState: READY_STATE });
  const second = buildDecisionContext({ context: COMPLETE_CONTEXT, informationGap: COMPLETE_GAP, conversationState: READY_STATE });
  equal(first, second, "identical projection");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

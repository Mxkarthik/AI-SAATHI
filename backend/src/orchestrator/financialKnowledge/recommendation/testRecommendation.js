"use strict";

const assert = require("assert");
const path = require("path");
const proxyquire = require("proxyquire").noCallThru();
const dataset = require("../dataset/schemeDataset.json");
const {
  buildRecommendations,
} = require("./recommendationService");
const { classifyCandidates, CANDIDATE_CLASS } = require("./candidateFilter");
const { evaluateSuitabilitySignals } = require("./suitabilitySignals");
const { FACTOR_WEIGHTS, scoreFactors } = require("./recommendationPolicy");
const { getAllSchemeIds, getSchemesForIntent, SCHEME_INTENT_MAP, getSchemeMetadata } = require("../adapter/schemeRuleAdapter");
const { STATUS } = require("../eligibility/eligibilityService");

let passed = 0;
let failed = 0;
const asyncTests = [];

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

function asyncTest(name, fn) {
  asyncTests.push(Promise.resolve().then(fn).then(() => {
    console.log(`PASS: ${name}`);
    passed++;
  }).catch((error) => {
    console.error(`FAIL: ${name}\n${error.stack || error}`);
    failed++;
  }));
}

function context(intent, overrides = {}) {
  return {
    status: "ready",
    intent,
    language: "en",
    conversation: { stage: "ready_for_decision" },
    user: {
      location: { state: "Andhra Pradesh" },
      farming: { crops: ["paddy"], landArea: 3, season: "kharif" },
      financial: { amount: 50000 },
      assets: { equipment: ["tractor"], livestock: ["cow"] },
      intentSpecific: {
        insuranceType: "crop insurance",
        asset: "paddy crop",
        savingsGoal: "emergency fund",
        investmentAmount: 25000,
        investmentPeriod: "3 years",
        riskPreference: "moderate",
      },
      ...overrides.user,
    },
    ...overrides,
  };
}

function eligibilityFor(schemeIds, status = STATUS.INSUFFICIENT_VERIFIED_DATA) {
  return {
    schemeResults: schemeIds.map((schemeId) => ({
      schemeId,
      status,
      verificationRequired: status === STATUS.INSUFFICIENT_VERIFIED_DATA
        ? [`Verify ${schemeId}`]
        : [],
      sourceReferences: [`source:${schemeId}`],
    })),
    summary: { eligible: [], ineligible: [], insufficientData: schemeIds.slice() },
  };
}

const cropContext = context("crop_financing");
const cropEligibility = eligibilityFor(getSchemesForIntent("crop_financing"));
const cropOutput = buildRecommendations({ decisionContext: cropContext, eligibility: cropEligibility });

test("incomplete or unavailable input is safe", () => {
  assert.strictEqual(buildRecommendations({ decisionContext: null, eligibility: cropEligibility }), null);
  assert.strictEqual(buildRecommendations({ decisionContext: cropContext, eligibility: null }), null);
  assert.strictEqual(buildRecommendations({ decisionContext: cropContext, eligibility: { error: "failed" } }), null);
});

test("crop financing identifies only explicit mapped candidates", () => {
  assert.deepStrictEqual(
    cropOutput.verificationRequired.map((entry) => entry.schemeId),
    ["pm_kisan", "pmfby", "kisan_credit_card", "agriculture_infrastructure_fund"]
  );
  assert.strictEqual(cropOutput.recommendations.length, 0);
});

test("equipment financing maps only KCC and AIF", () => {
  const output = buildRecommendations({
    decisionContext: context("equipment_financing"),
    eligibility: eligibilityFor(["kisan_credit_card", "agriculture_infrastructure_fund"]),
  });
  assert.deepStrictEqual(output.verificationRequired.map((entry) => entry.schemeId), ["kisan_credit_card", "agriculture_infrastructure_fund"]);
});

test("livestock financing maps only KCC", () => {
  const output = buildRecommendations({
    decisionContext: context("livestock_financing"),
    eligibility: eligibilityFor(["kisan_credit_card"]),
  });
  assert.deepStrictEqual(output.verificationRequired.map((entry) => entry.schemeId), ["kisan_credit_card"]);
});

test("insurance maps only PMFBY", () => {
  const output = buildRecommendations({
    decisionContext: context("insurance"),
    eligibility: eligibilityFor(["pmfby"]),
  });
  assert.deepStrictEqual(output.verificationRequired.map((entry) => entry.schemeId), ["pmfby"]);
});

test("savings maps only PMJDY", () => {
  const output = buildRecommendations({
    decisionContext: context("savings"),
    eligibility: eligibilityFor(["pmjdy"]),
  });
  assert.deepStrictEqual(output.verificationRequired.map((entry) => entry.schemeId), ["pmjdy"]);
});

test("investment maps only PMJDY", () => {
  const output = buildRecommendations({
    decisionContext: context("investment"),
    eligibility: eligibilityFor(["pmjdy"]),
  });
  assert.deepStrictEqual(output.verificationRequired.map((entry) => entry.schemeId), ["pmjdy"]);
});

test("general guidance uses only explicitly mapped candidates", () => {
  const output = buildRecommendations({
    decisionContext: context("general_financial_guidance"),
    eligibility: eligibilityFor(SCHEME_INTENT_MAP.general_financial_guidance),
  });
  assert.deepStrictEqual(output.verificationRequired.map((entry) => entry.schemeId), ["pmjdy", "pm_kisan", "pmfby", "kisan_credit_card"]);
});

test("insufficient eligibility is verification-required and unranked", () => {
  assert.strictEqual(cropOutput.verificationRequired[0].candidateClass, CANDIDATE_CLASS.REQUIRES_VERIFICATION);
  assert.strictEqual(cropOutput.verificationRequired[0].score, null);
  assert.strictEqual(cropOutput.verificationRequired[0].eligibilityStatus, STATUS.INSUFFICIENT_VERIFIED_DATA);
  assert.strictEqual(cropOutput.recommendations.length, 0);
});

test("eligible KCC becomes rankable with a deterministic score", () => {
  const output = buildRecommendations({
    decisionContext: context("equipment_financing"),
    eligibility: {
      schemeResults: [
        {
          schemeId: "kisan_credit_card",
          status: STATUS.ELIGIBLE,
          verificationRequired: [],
          sourceReferences: ["eligibility-source:kcc"],
        },
        {
          schemeId: "agriculture_infrastructure_fund",
          status: STATUS.INSUFFICIENT_VERIFIED_DATA,
          verificationRequired: ["Verify project"],
          sourceReferences: ["eligibility-source:aif"],
        },
      ],
    },
  });
  assert.strictEqual(output.recommendations.length, 1);
  assert.strictEqual(output.recommendations[0].schemeId, "kisan_credit_card");
  assert.strictEqual(output.recommendations[0].candidateClass, CANDIDATE_CLASS.RANKABLE);
  assert.ok(output.recommendations[0].rank === 1);
  assert.ok(output.recommendations[0].score > 0);
});

test("explicitly ineligible schemes are excluded", () => {
  const output = buildRecommendations({
    decisionContext: context("livestock_financing"),
    eligibility: {
      schemeResults: [{
        schemeId: "kisan_credit_card",
        status: STATUS.INELIGIBLE,
        failedRules: [{ ruleId: "test-exclusion" }],
        verificationRequired: [],
        sourceReferences: ["source:ineligible"],
      }],
    },
  });
  assert.strictEqual(output.recommendations.length, 0);
  assert.strictEqual(output.excluded.length, 1);
  assert.strictEqual(output.excluded[0].candidateClass, CANDIDATE_CLASS.INELIGIBLE);
});

test("unmapped schemes are not applicable and never recommended", () => {
  const classified = classifyCandidates({ decisionContext: cropContext, eligibility: cropEligibility });
  assert.ok(classified.notApplicable.some((entry) => entry.schemeId === "enam"));
  assert.ok(!cropOutput.recommendations.some((entry) => entry.schemeId === "enam"));
  assert.ok(!cropOutput.verificationRequired.some((entry) => entry.schemeId === "enam"));
});

test("all 15 dataset schemes receive exactly one internal classification", () => {
  const classified = classifyCandidates({ decisionContext: cropContext, eligibility: cropEligibility });
  const total = classified.rankable.length + classified.requiresVerification.length + classified.ineligible.length + classified.notApplicable.length;
  assert.strictEqual(getAllSchemeIds().length, 15);
  assert.strictEqual(total, 15);
});

test("factor points equal the centralized policy contributions", () => {
  const metadata = getSchemeMetadata("kisan_credit_card");
  const factors = evaluateSuitabilitySignals({ schemeId: "kisan_credit_card", decisionContext: context("equipment_financing"), metadata });
  assert.strictEqual(scoreFactors(factors), factors.reduce((sum, factor) => sum + factor.points, 0));
  factors.forEach((factor) => assert.strictEqual(factor.points, factor.matched ? FACTOR_WEIGHTS[factor.id] : 0));
});

test("activity evidence is not double-counted across activity signals", () => {
  const factors = evaluateSuitabilitySignals({
    schemeId: "kisan_credit_card",
    decisionContext: context("equipment_financing"),
    metadata: getSchemeMetadata("kisan_credit_card"),
  });
  const activityMatches = factors.filter((factor) => ["crop_relevance", "equipment_relevance", "livestock_relevance"].includes(factor.id) && factor.matched);
  assert.strictEqual(activityMatches.length, 1);
  assert.strictEqual(activityMatches[0].id, "equipment_relevance");
});

test("missing data does not receive negative points", () => {
  const factors = evaluateSuitabilitySignals({
    schemeId: "kisan_credit_card",
    decisionContext: context("equipment_financing", { user: { location: {}, farming: {}, financial: {}, assets: {}, intentSpecific: {} } }),
    metadata: getSchemeMetadata("kisan_credit_card"),
  });
  assert.ok(factors.every((factor) => factor.points >= 0));
  assert.strictEqual(factors.find((factor) => factor.id === "need_match").points, 0);
});

test("source references and structured explanations are preserved", () => {
  const output = buildRecommendations({
    decisionContext: context("equipment_financing"),
    eligibility: {
      schemeResults: [
        {
          schemeId: "kisan_credit_card",
          status: STATUS.ELIGIBLE,
          verificationRequired: [],
          sourceReferences: ["eligibility-source:kcc"],
        },
        {
          schemeId: "agriculture_infrastructure_fund",
          status: STATUS.INSUFFICIENT_VERIFIED_DATA,
          verificationRequired: ["Verify project"],
          sourceReferences: [],
        },
      ],
    },
  });
  const recommendation = output.recommendations[0];
  assert.ok(recommendation.sourceReferences.includes("eligibility-source:kcc"));
  assert.ok(Array.isArray(recommendation.explanation.whyRecommended));
  assert.ok(typeof recommendation.explanation.caution === "string");
});

test("recommendation evaluation does not mutate DecisionContext", () => {
  const decisionContext = context("equipment_financing");
  const before = JSON.stringify(decisionContext);
  buildRecommendations({
    decisionContext,
    eligibility: eligibilityFor(["kisan_credit_card", "agriculture_infrastructure_fund"]),
  });
  assert.strictEqual(JSON.stringify(decisionContext), before);
});

test("recommendation output is deterministic", () => {
  const first = buildRecommendations({ decisionContext: context("equipment_financing"), eligibility: eligibilityFor(["kisan_credit_card", "agriculture_infrastructure_fund"]) });
  const second = buildRecommendations({ decisionContext: context("equipment_financing"), eligibility: eligibilityFor(["kisan_credit_card", "agriculture_infrastructure_fund"]) });
  assert.deepStrictEqual(first, second);
});

test("dataset remains authoritative and unchanged", () => {
  assert.strictEqual(dataset.version, "2026-09-09-expanded-verified");
  assert.strictEqual(dataset.recordCount, 15);
  assert.strictEqual(dataset.schemes.length, 15);
  assert.ok(path.join(__dirname, "../dataset/schemeDataset.json"));
});

test("policy does not expose unsupported financial scoring signals", () => {
  const forbidden = ["affordability", "emi", "interest", "risk", "approval_probability", "deadline"];
  assert.ok(forbidden.every((id) => !Object.prototype.hasOwnProperty.call(FACTOR_WEIGHTS, id)));
});

asyncTest("orchestrator gates recommendation after eligibility", async () => {
  let eligibilityCalls = 0;
  let recommendationCalls = 0;
  const orchestrator = proxyquire("../../orchestratorService", {
    "./understanding/understandingService": {
      understandMessage: async (message) => message === "ready"
        ? {
          language: "en",
          intent: "crop_financing",
          entities: {
            state: "Andhra Pradesh",
            crop: "paddy",
            landArea: 3,
            ownership: "owned",
            season: "kharif",
            amount: 50000,
            income: 200000,
            existingDebt: 0,
          },
          provider: "stub",
        }
        : { language: "en", intent: "crop_financing", entities: {}, provider: "stub" },
    },
    "./questions/nextQuestionService": {
      getNextQuestion: async ({ missingFields, language }) => ({
        field: missingFields[0], question: "?", language, source: "fallback",
      }),
    },
    "./financialKnowledge": {
      evaluateAllApplicableSchemes: () => {
        eligibilityCalls++;
        return { schemeResults: [], summary: {} };
      },
      buildRecommendations: () => {
        recommendationCalls++;
        return { marker: "recommendation-ran" };
      },
    },
    "../services/profileService": { upsertProfile: async () => null },
  });

  const conversation = { _id: "recommendation-gate", status: "active" };
  const incomplete = await orchestrator.orchestrate({ conversation, profile: null, message: "missing" });
  assert.strictEqual(incomplete.status, "needs_information");
  assert.strictEqual(incomplete.recommendation, null);
  assert.strictEqual(eligibilityCalls, 0);
  assert.strictEqual(recommendationCalls, 0);

  const ready = await orchestrator.orchestrate({ conversation, profile: null, message: "ready" });
  assert.strictEqual(ready.status, "ready_for_decision");
  assert.deepStrictEqual(ready.recommendation, { marker: "recommendation-ran" });
  assert.strictEqual(eligibilityCalls, 1);
  assert.strictEqual(recommendationCalls, 1);
});

Promise.all(asyncTests).then(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});

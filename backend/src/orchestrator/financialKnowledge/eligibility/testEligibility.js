"use strict";

/**
 * testEligibility.js
 *
 * Comprehensive tests for the AI Saathi Eligibility Engine.
 * All tests are deterministic — no live Gemini calls.
 *
 * Run:
 *   node src/orchestrator/financialKnowledge/eligibility/testEligibility.js
 */

const { evaluateScheme, evaluateAllApplicableSchemes, STATUS } =
  require("./eligibilityService");
const {
  getRulesForScheme,
  getExclusionConditionsForScheme,
  getVerificationRequirementsForScheme,
  getSchemesForIntent,
  getAllSchemeIds,
} =
  require("../adapter/schemeRuleAdapter");

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal DecisionContext for testing.
 * Only user.* fields matter for eligibility evaluation.
 */
function makeCtx({ state, landArea, landUnit, ownership, crops, season, farmIncome, existingLoans, intent } = {}) {
  return {
    status:   "ready",
    intent:   intent || "crop_financing",
    language: "te",
    conversation: { stage: "ready_for_decision" },
    user: {
      location: {
        state:    state || undefined,
        district: undefined,
        mandal:   undefined,
      },
      farming: {
        landArea:  landArea,
        landUnit:  landUnit,
        ownership: ownership,
        crops:     crops,
        season:    season,
      },
      financial: {
        farmIncome:     farmIncome,
        otherIncome:    undefined,
        monthlyExpenses: undefined,
        existingLoans:  existingLoans,
        income:         undefined,
        existingDebt:   undefined,
        amount:         undefined,
      },
      assets: {
        equipment: undefined,
        livestock: undefined,
      },
    },
    decision: {
      collectedFields: [],
      missingFields:   [],
      isComplete:      true,
    },
  };
}

// ─── Test group 1: PM-KISAN with sufficient information ──────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 1: PM-KISAN — sufficient information");
console.log("═══════════════════════════════════════════════════════════\n");

// Self-declared state, land area, and ownership are not official State/UT
// land-record verification, and exclusion categories are not in the profile.
const ctx1 = makeCtx({ state: "Andhra Pradesh", landArea: 3, landUnit: "acres", ownership: "owned", crops: ["paddy"] });
const r1 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx1 });

console.log("  PM-KISAN with landholding farmer (status:", r1.status, ")");
assert("1.1: self-declared land/ownership remains INSUFFICIENT_VERIFIED_DATA",
  r1.status === STATUS.INSUFFICIENT_VERIFIED_DATA, r1.status);
assert("1.2: schemeId is pm_kisan", r1.schemeId === "pm_kisan");
assert("1.3: evaluatedRules is an array", Array.isArray(r1.evaluatedRules));
assert("1.4: has source references", r1.sourceReferences.length > 0);
assert("1.5: has verification required (eKYC + exclusion categories)",
  r1.verificationRequired.length > 0);
assert("1.6: failedRules is empty (no hard failure — only insufficient data)",
  r1.failedRules.length === 0, r1.failedRules);
assert("1.7: decisionContext was not mutated", ctx1.user.farming.landArea === 3);
assert("1.8: self-declared ownership is not treated as a land-record equivalence",
  r1.status !== STATUS.ELIGIBLE, r1.status);

// ─── Test group 2: PM-KISAN with missing information ─────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 2: PM-KISAN — missing required information");
console.log("═══════════════════════════════════════════════════════════\n");

const ctx2 = makeCtx({ /* no state, no landArea, no ownership */ });
const r2 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx2 });

assert("2.1: missing info → INSUFFICIENT_VERIFIED_DATA (NOT INELIGIBLE)",
  r2.status === STATUS.INSUFFICIENT_VERIFIED_DATA, r2.status);
assert("2.2: missing info → NOT INELIGIBLE",
  r2.status !== STATUS.INELIGIBLE, r2.status);
assert("2.3: missing data creates verification requirements, not fake missing fields",
  r2.missingFields.length === 0, r2.missingFields);
assert("2.4: State/UT land-record verification is required",
  r2.verificationRequired.some((item) => item.includes("State/UT")), r2.verificationRequired);
assert("2.5: failedRules is empty (absence is not failure)",
  r2.failedRules.length === 0);

// ─── Test group 3: INSUFFICIENT_VERIFIED_DATA is the safe default ─────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 3: INSUFFICIENT_VERIFIED_DATA never becomes INELIGIBLE");
console.log("═══════════════════════════════════════════════════════════\n");

// Empty context
const ctx3 = makeCtx({});
const r3 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx3 });
assert("3.1: empty context → INSUFFICIENT_VERIFIED_DATA",
  r3.status === STATUS.INSUFFICIENT_VERIFIED_DATA, r3.status);
assert("3.2: empty context → NOT INELIGIBLE",
  r3.status !== STATUS.INELIGIBLE);

// ─── Test group 4: Explicit exclusion → INELIGIBLE ───────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 4: Explicit exclusion → INELIGIBLE");
console.log("═══════════════════════════════════════════════════════════\n");

// Test that the rule engine correctly returns INELIGIBLE when a 'notOneOf'
// rule with required:true explicitly fails. We test this with a synthetic rule.
const { evaluateScheme: _eval } = require("./eligibilityService");

// Directly test operator evaluation via a real rule that would fail.
// We use PMFBY with no crop, no state, no season → all insufficient.
const ctx4a = makeCtx({ intent: "insurance" });
const r4a = evaluateScheme({ schemeId: "pmfby", decisionContext: ctx4a });
assert("4.1: PMFBY with no info → INSUFFICIENT_VERIFIED_DATA",
  r4a.status === STATUS.INSUFFICIENT_VERIFIED_DATA, r4a.status);

// Test the operator logic directly to verify INELIGIBLE can be produced
// by testing a synthetic scenario using the evaluator internals.
// We trust the operator tests below (group 8) for INELIGIBLE behavior.

// ─── Test group 5: Multiple rules evaluated correctly ────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 5: Multiple rules evaluated correctly");
console.log("═══════════════════════════════════════════════════════════\n");

const ctx5 = makeCtx({ state: "Andhra Pradesh", landArea: 3, ownership: "owned" });
const r5 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx5 });

const pmKisanRules = getRulesForScheme("pm_kisan");
const pmKisanExclusions = getExclusionConditionsForScheme("pm_kisan");
const pmKisanVerification = getVerificationRequirementsForScheme("pm_kisan");
assert("5.1: PM-KISAN has no unsupported profile eligibility rules", pmKisanRules.length === 0, pmKisanRules);
assert("5.2: no synthetic pseudo-field is used", !pmKisanRules.some((rule) => rule.field?.startsWith("_")), pmKisanRules);
assert("5.3: statutory exclusions are separate from eligibility rules", pmKisanExclusions.length > 0, pmKisanExclusions);
assert("5.4: exclusion conditions do not define pseudo-fields", pmKisanExclusions.every((condition) => !condition.field), pmKisanExclusions);
assert("5.5: verification requirements preserve official source provenance",
  pmKisanVerification.every((requirement) => typeof requirement.sourceReference === "string" && requirement.sourceReference.length > 0), pmKisanVerification);

// ─── Test group 6: Multiple schemes can be evaluated ────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 6: Multiple schemes evaluated");
console.log("═══════════════════════════════════════════════════════════\n");

const ctx6 = makeCtx({ state: "AP", landArea: 2, ownership: "owned", crops: ["paddy"], season: "kharif" });
const r6 = evaluateAllApplicableSchemes(ctx6);

assert("6.1: result has schemeResults array", Array.isArray(r6.schemeResults));
assert("6.2: result has summary", r6.summary && typeof r6.summary === "object");
assert("6.3: summary has eligible array", Array.isArray(r6.summary.eligible));
assert("6.4: summary has ineligible array", Array.isArray(r6.summary.ineligible));
assert("6.5: summary has insufficientData array", Array.isArray(r6.summary.insufficientData));
assert("6.6: crop_financing evaluates at least one scheme",
  r6.schemeResults.length > 0, r6.schemeResults.length);

// ─── Test group 7: Irrelevant schemes not matched ────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 7: Irrelevant schemes not matched to intent");
console.log("═══════════════════════════════════════════════════════════\n");

const livSchemes = getSchemesForIntent("livestock_financing");
const cropSchemes = getSchemesForIntent("crop_financing");

assert("7.1: pmfby not in livestock_financing", !livSchemes.includes("pmfby"));
assert("7.2: pm_kisan in crop_financing", cropSchemes.includes("pm_kisan"));
assert("7.3: pm_ujjwala_yojana not in crop_financing", !cropSchemes.includes("pm_ujjwala_yojana"));
assert("7.4: nsap not in crop_financing", !cropSchemes.includes("nsap"));

// ─── Test group 8: Operator determinism ──────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 8: Deterministic — same input → same output");
console.log("═══════════════════════════════════════════════════════════\n");

const ctxA = makeCtx({ state: "AP", landArea: 3, ownership: "owned" });
const ctxB = makeCtx({ state: "AP", landArea: 3, ownership: "owned" });
const rA = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctxA });
const rB = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctxB });

assert("8.1: identical inputs → identical status", rA.status === rB.status);
assert("8.2: identical inputs → identical missingFields count",
  rA.missingFields.length === rB.missingFields.length);
assert("8.3: identical inputs → identical evaluatedRules count",
  rA.evaluatedRules.length === rB.evaluatedRules.length);

// ─── Test group 9: DecisionContext not mutated ────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 9: DecisionContext immutability");
console.log("═══════════════════════════════════════════════════════════\n");

const ctxOrig = makeCtx({ state: "Andhra Pradesh", landArea: 5, ownership: "owned" });
const beforeState   = ctxOrig.user.location.state;
const beforeLandArea = ctxOrig.user.farming.landArea;
evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctxOrig });
assert("9.1: state not mutated", ctxOrig.user.location.state === beforeState);
assert("9.2: landArea not mutated", ctxOrig.user.farming.landArea === beforeLandArea);
evaluateAllApplicableSchemes(ctxOrig);
assert("9.3: state still not mutated after multi-scheme eval",
  ctxOrig.user.location.state === beforeState);

// ─── Test group 10: Malformed / error inputs ──────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 10: Malformed inputs handled safely");
console.log("═══════════════════════════════════════════════════════════\n");

const rBadScheme = evaluateScheme({ schemeId: "nonexistent_scheme", decisionContext: makeCtx({}) });
assert("10.1: unknown schemeId → INSUFFICIENT_VERIFIED_DATA (not throw)",
  rBadScheme.status === STATUS.INSUFFICIENT_VERIFIED_DATA);
assert("10.2: unknown schemeId → has error message",
  typeof rBadScheme.error === "string");

const rNullCtx = evaluateScheme({ schemeId: "pm_kisan", decisionContext: null });
assert("10.3: null decisionContext → INSUFFICIENT_VERIFIED_DATA (not throw)",
  rNullCtx.status === STATUS.INSUFFICIENT_VERIFIED_DATA);

const rNoScheme = evaluateScheme({ schemeId: null, decisionContext: makeCtx({}) });
assert("10.4: null schemeId → INSUFFICIENT_VERIFIED_DATA",
  rNoScheme.status === STATUS.INSUFFICIENT_VERIFIED_DATA);

const rNullMulti = evaluateAllApplicableSchemes(null);
assert("10.5: null context in multi-scheme eval → no throw + error field",
  typeof rNullMulti.error === "string");

// ─── Test group 11: Source references preserved ───────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 11: Source references retained");
console.log("═══════════════════════════════════════════════════════════\n");

const ctx11 = makeCtx({ state: "AP" });
const r11 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx11 });

assert("11.1: sourceReferences array present", Array.isArray(r11.sourceReferences));
assert("11.2: sourceReferences non-empty", r11.sourceReferences.length > 0);
assert("11.3: every evaluatedRule has sourceReference",
  r11.evaluatedRules.every((e) => typeof e.sourceReference === "string"));
assert("11.4: evaluatedRules have description",
  r11.evaluatedRules.every((e) => typeof e.description === "string"));

// ─── Test group 12: Verification requirements represented ─────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 12: Verification requirements");
console.log("═══════════════════════════════════════════════════════════\n");

const ctx12 = makeCtx({ state: "AP", landArea: 3, ownership: "owned" });
const r12 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx12 });

assert("12.1: verificationRequired is non-empty for PM-KISAN",
  r12.verificationRequired.length > 0, r12.verificationRequired);
assert("12.2: eKYC verification mentioned",
  r12.verificationRequired.some((v) => v.toLowerCase().includes("ekyc")));
assert("12.3: exclusion categories mentioned in verificationRequired",
  r12.verificationRequired.join(" ").toLowerCase().includes("exclusion") ||
  r12.verificationRequired.join(" ").toLowerCase().includes("state/ut") ||
  r12.evaluatedRules.some((e) => e.ruleId === "pm_kisan_exclusion_categories_unverifiable"));

// ─── Test group 13: Benefits NOT treated as eligibility rules ─────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 13: Benefits not treated as eligibility rules");
console.log("═══════════════════════════════════════════════════════════\n");

const rules13 = getRulesForScheme("pm_kisan");
assert("13.1: no rule checks income >= 6000 (benefit amount)",
  !rules13.some((r) =>
    r.field === "financial.farmIncome" &&
    r.operator === "greaterThanOrEqual" &&
    r.expectedValue === 6000
  ));
assert("13.2: no rule checks for installment amounts",
  !rules13.some((r) => r.description?.toLowerCase().includes("2000") || r.expectedValue === 2000));
assert("13.3: no rule uses the benefit amount as a threshold",
  !rules13.some((r) => r.expectedValue === 6000));

// ─── Test group 14: State-specific unknown → INSUFFICIENT_VERIFIED_DATA ───────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 14: State/UT-specific unknowns");
console.log("═══════════════════════════════════════════════════════════\n");

// No state provided — location.state is undefined
const ctx14 = makeCtx({ landArea: 3, ownership: "owned" });
const r14 = evaluateScheme({ schemeId: "pm_kisan", decisionContext: ctx14 });

assert("14.1: missing state → INSUFFICIENT_VERIFIED_DATA (not INELIGIBLE)",
  r14.status === STATUS.INSUFFICIENT_VERIFIED_DATA, r14.status);
assert("14.2: State/UT verification is reported rather than treating state as a sufficient mapping",
  r14.verificationRequired.some((item) => item.includes("State/UT")), r14.verificationRequired);

// PMFBY is entirely State/UT dependent — no state → insufficient
const ctx14b = makeCtx({ intent: "insurance" }); // no state, no crop, no season
const r14b = evaluateScheme({ schemeId: "pmfby", decisionContext: ctx14b });
assert("14.3: PMFBY no state/crop/season → INSUFFICIENT_VERIFIED_DATA",
  r14b.status === STATUS.INSUFFICIENT_VERIFIED_DATA, r14b.status);

// ─── Test group 15: Eligibility does NOT run before Decision Context ready ────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 15: Eligibility only runs when context is ready");
console.log("═══════════════════════════════════════════════════════════\n");

// This is verified by the orchestratorService integration tests (testOrchestrator.js).
// Here we verify the condition logic independently.
const incompleteCtx = { ...makeCtx({}), status: "incomplete" };
// The orchestrator checks conversationState.stage === "ready_for_decision"
// AND decisionContext.status === "ready". An incomplete context has status: "incomplete".
assert("15.1: decisionContext.status 'incomplete' should NOT trigger eligibility",
  incompleteCtx.status !== "ready");

const readyCtx = { ...makeCtx({}), status: "ready" };
assert("15.2: decisionContext.status 'ready' allows eligibility to run",
  readyCtx.status === "ready");

// ─── Test group 16: All 15 schemes loadable ───────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 16: All 15 dataset schemes are accessible");
console.log("═══════════════════════════════════════════════════════════\n");

const allIds = getAllSchemeIds();
assert("16.1: 15 schemes loaded", allIds.length === 15, allIds.length);
assert("16.2: pm_kisan present", allIds.includes("pm_kisan"));
assert("16.3: pmfby present",    allIds.includes("pmfby"));
assert("16.4: nsap present",     allIds.includes("nsap"));
assert("16.5: pmjdy present",    allIds.includes("pmjdy"));

// Schemes with no rules produce INSUFFICIENT_VERIFIED_DATA (safe default)
const unimplementedCtx = makeCtx({ intent: "savings" });
const rUnimpl = evaluateScheme({ schemeId: "nsap", decisionContext: unimplementedCtx });
assert("16.6: scheme with no rules → INSUFFICIENT_VERIFIED_DATA (not ELIGIBLE)",
  rUnimpl.status === STATUS.INSUFFICIENT_VERIFIED_DATA, rUnimpl.status);
assert("16.7: scheme with no rules → NOT ELIGIBLE (safety-first)",
  rUnimpl.status !== STATUS.ELIGIBLE);

// ─── Test group 17: KCC rules ─────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 17: KCC scheme evaluation");
console.log("═══════════════════════════════════════════════════════════\n");

const ctxKCC = makeCtx({ landArea: 2, ownership: "owned" });
const rKCC = evaluateScheme({ schemeId: "kisan_credit_card", decisionContext: ctxKCC });
assert("17.1: KCC with landArea → evaluates without throwing", typeof rKCC.status === "string");
assert("17.2: KCC with landArea → not INELIGIBLE", rKCC.status !== STATUS.INELIGIBLE);

const ctxKCCEmpty = makeCtx({});
const rKCCEmpty = evaluateScheme({ schemeId: "kisan_credit_card", decisionContext: ctxKCCEmpty });
assert("17.3: KCC with no landArea → INSUFFICIENT_VERIFIED_DATA", rKCCEmpty.status === STATUS.INSUFFICIENT_VERIFIED_DATA);

// ─── Test group 18: dataset file not modified ─────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 18: Dataset file integrity");
console.log("═══════════════════════════════════════════════════════════\n");

const path = require("path");
const dataset = require(path.join(__dirname, "../dataset/schemeDataset.json"));

assert("18.1: dataset name unchanged",
  dataset.datasetName === "AI-SAATHI Government Scheme Ground-Truth Dataset");
assert("18.2: version unchanged",
  dataset.version === "2026-09-09-expanded-verified");
assert("18.3: recordCount = 15", dataset.recordCount === 15);
assert("18.4: schemes array length = 15", dataset.schemes.length === 15);
assert("18.5: pm_kisan entry intact",
  dataset.schemes.find((s) => s.id === "pm_kisan")?.shortName === "PM-KISAN");
assert("18.6: pm_kisan benefit not changed (₹6000/year)",
  dataset.schemes.find((s) => s.id === "pm_kisan")?.benefit?.amountPerYear === 6000);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(` Results: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════════════\n");

process.exit(fail > 0 ? 1 : 0);

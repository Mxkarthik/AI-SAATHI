"use strict";

/**
 * testContextualAnswers.js
 *
 * Focused regression tests for the Phase D contextual-answer regression.
 *
 * Verifies that short, natural answers to the current question are correctly
 * extracted, synced to the profile, reflected in collectedFields/missingFields,
 * and that the next question advances to the next missing field.
 *
 * All tests are deterministic — understandingService is stubbed with
 * the expected extraction result for each answer type.
 *
 * Run:
 *   node src/orchestrator/testContextualAnswers.js
 */

const proxyquire = require("proxyquire").noCallThru();

// ─── Mini test runner ─────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;
const asyncTests = [];

function test(name, fn) {
  const p = Promise.resolve()
    .then(() => fn())
    .then(() => { console.log(`  PASS: ${name}`); pass++; })
    .catch((err) => { console.error(`  FAIL: ${name}\n    ${err.message}`); fail++; });
  asyncTests.push(p);
}

function equal(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

function includes(arr, value, label) {
  if (!Array.isArray(arr) || !arr.includes(value)) {
    throw new Error(`${label}: expected [${(arr||[]).join(",")}] to include "${value}"`);
  }
}

function excludes(arr, value, label) {
  if (Array.isArray(arr) && arr.includes(value)) {
    throw new Error(`${label}: expected [${arr.join(",")}] to NOT include "${value}"`);
  }
}

// ─── Shared infrastructure ────────────────────────────────────────────────────

// A fresh stored profile per test — start empty
function makeProfile(overrides = {}) {
  return {
    location: { state: null, district: null, mandal: null },
    farming: { landArea: null, landUnit: null, ownership: null },
    crops: [],
    financial: { farmIncome: null, existingLoans: [] },
    assets: { equipment: [], livestock: [] },
    ...overrides,
  };
}

// Build an orchestrator instance with a stubbed understandingService.
// getNextQuestion is a real-ish stub that just picks missingFields[0].
function makeOrchestrator(understandStub, initialProfile = null) {
  // storedProfile starts as a deep copy of initialProfile (like MongoDB would)
  let storedProfile = initialProfile ? JSON.parse(JSON.stringify(initialProfile)) : null;

  const orchestrator = proxyquire("./orchestratorService", {
    "./understanding/understandingService": {
      understandMessage: understandStub,
    },
    "./questions/nextQuestionService": {
      getNextQuestion: async ({ missingFields, language }) => {
        if (!Array.isArray(missingFields) || missingFields.length === 0) return null;
        return {
          field: missingFields[0],
          question: `(stub) Please tell me your ${missingFields[0]}`,
          language: language || "en",
          source: "fallback",
        };
      },
    },
    "../services/profileService": {
      upsertProfile: async (_userId, changes) => {
        // Apply dot-notation changes on top of whatever profile we already have
        // (mirrors MongoDB $set semantics — existing fields not in changes are preserved)
        storedProfile = storedProfile || {};
        for (const [path, value] of Object.entries(changes)) {
          const keys = path.split(".");
          const last = keys.pop();
          let obj = storedProfile;
          for (const k of keys) {
            if (obj[k] == null) obj[k] = {};
            obj = obj[k];
          }
          obj[last] = value;
        }
        return JSON.parse(JSON.stringify(storedProfile));
      },
    },
  });

  return { orchestrator, getStoredProfile: () => storedProfile };
}

// Standard conversation fixture — intent already set to crop_financing
// (simulates a conversation that has passed intent detection)
const CONV = {
  _id: "test-conv-answers",
  language: "en",
  intent: "crop_financing",
  status: "active",
};

// ─── TEST GROUP 1: location answer ───────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 1: Location answer");
console.log("═══════════════════════════════════════════════════════════\n");

// Turn 1: lastAskedField = "location", user says "Andhra Pradesh"
// Gemini should extract state = "Andhra Pradesh"
test("1.1 'Andhra Pradesh' → state extracted, location collected", async () => {
  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "location", "lastAskedField passed to understand");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { state: "Andhra Pradesh" },
      provider: "stub",
    };
  });

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: makeProfile(),
    message: "Andhra Pradesh",
    lastAskedField: "location",
  });

  equal(result.intent, "crop_financing", "intent");
  equal(result.status, "needs_information", "status");
  excludes(result.informationGap.missingFields, "location", "location not missing");
  includes(result.informationGap.collectedFields, "location", "location collected");
  equal(result.nextQuestion.field, "crop", "next field is crop");
  equal(result.conversationState.lastAskedField, "crop", "lastAskedField updated to crop");
});

test("1.2 'AP' (abbreviation) → state extracted, location collected", async () => {
  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "location", "lastAskedField passed");
    // Gemini maps AP → Andhra Pradesh
    return {
      language: "en",
      intent: "crop_financing",
      entities: { state: "Andhra Pradesh" },
      provider: "stub",
    };
  });

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: makeProfile(),
    message: "AP",
    lastAskedField: "location",
  });

  excludes(result.informationGap.missingFields, "location", "location not missing after AP");
  equal(result.nextQuestion.field, "crop", "next field is crop");
});

test("1.3 location already in profile → collected from profile, not re-asked", async () => {
  const { orchestrator } = makeOrchestrator(async () => ({
    language: "en",
    intent: "crop_financing",
    entities: {},
    provider: "stub",
  }));

  const profileWithState = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
  });

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithState,
    message: "I need a crop loan",
  });

  excludes(result.informationGap.missingFields, "location", "location not missing");
  equal(result.nextQuestion.field, "crop", "next field is crop");
});

// ─── TEST GROUP 2: crop answer ────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 2: Crop answer");
console.log("═══════════════════════════════════════════════════════════\n");

test("2.1 'Paddy' → crop extracted, crop collected", async () => {
  const profileWithState = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
  });

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "crop", "lastAskedField passed");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { crop: "paddy" },
      provider: "stub",
    };
  }, profileWithState);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithState,
    message: "Paddy",
    lastAskedField: "crop",
  });

  excludes(result.informationGap.missingFields, "crop", "crop not missing");
  includes(result.informationGap.collectedFields, "crop", "crop collected");
  equal(result.nextQuestion.field, "landArea", "next field is landArea");
});

test("2.2 'I grow rice' → crop extracted as paddy", async () => {
  const profileWithState = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
  });

  const { orchestrator } = makeOrchestrator(async () => ({
    language: "en",
    intent: "crop_financing",
    entities: { crop: "paddy" },  // rice → paddy is Gemini's job
    provider: "stub",
  }), profileWithState);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithState,
    message: "I grow rice",
    lastAskedField: "crop",
  });

  excludes(result.informationGap.missingFields, "crop", "crop not missing");
  equal(result.nextQuestion.field, "landArea", "next field is landArea");
});

// ─── TEST GROUP 3: landArea answer ───────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 3: Land area answer");
console.log("═══════════════════════════════════════════════════════════\n");

test("3.1 '3 acres' → landArea=3 extracted, landArea collected", async () => {
  const profileWithStateCrop = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
  });

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "landArea", "lastAskedField passed");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { landArea: 3, landUnit: "acre" },
      provider: "stub",
    };
  }, profileWithStateCrop);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithStateCrop,
    message: "3 acres",
    lastAskedField: "landArea",
  });

  excludes(result.informationGap.missingFields, "landArea", "landArea not missing");
  includes(result.informationGap.collectedFields, "landArea", "landArea collected");
  equal(result.nextQuestion.field, "ownership", "next field is ownership");
});

test("3.2 'I have three acres' → landArea extracted, landUnit normalised", async () => {
  const profileWithStateCrop = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
  });

  // The understandingService stub returns post-normalisation values
  // (as understandingService.normaliseEntities converts "acre" → "acres").
  const { orchestrator } = makeOrchestrator(async () => ({
    language: "en",
    intent: "crop_financing",
    entities: { landArea: 3, landUnit: "acres" },  // already normalised by understandingService
    provider: "stub",
  }), profileWithStateCrop);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithStateCrop,
    message: "I have three acres",
    lastAskedField: "landArea",
  });

  excludes(result.informationGap.missingFields, "landArea", "landArea not missing");
  // landUnit should be "acres" (understandingService normalises "acre" → "acres")
  equal(result.context.knownFields.landUnit, "acres", "landUnit normalised to acres");
});

// ─── TEST GROUP 4: ownership answer ──────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 4: Ownership answer");
console.log("═══════════════════════════════════════════════════════════\n");

test("4.1 'I own it' → ownership=owned extracted, ownership collected", async () => {
  const profileWithStateAreaCrop = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
    farming: { landArea: 3, landUnit: "acres", ownership: null },
  });

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "ownership", "lastAskedField passed");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { ownership: "owned" },
      provider: "stub",
    };
  }, profileWithStateAreaCrop);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithStateAreaCrop,
    message: "I own it",
    lastAskedField: "ownership",
  });

  excludes(result.informationGap.missingFields, "ownership", "ownership not missing");
  includes(result.informationGap.collectedFields, "ownership", "ownership collected");
  equal(result.nextQuestion.field, "season", "next field is season");
});

test("4.2 \"It's my own land\" → ownership=owned normalised", async () => {
  const profilePartial = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
    farming: { landArea: 3, landUnit: "acres", ownership: null },
  });

  const { orchestrator } = makeOrchestrator(async () => ({
    language: "en",
    intent: "crop_financing",
    entities: { ownership: "owned" },
    provider: "stub",
  }), profilePartial);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profilePartial,
    message: "It's my own land",
    lastAskedField: "ownership",
  });

  excludes(result.informationGap.missingFields, "ownership", "ownership not missing");
  equal(result.nextQuestion.field, "season", "next field is season");
});

// ─── TEST GROUP 5: amount answer ─────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 5: Amount answer");
console.log("═══════════════════════════════════════════════════════════\n");

test("5.1 'I need fifty thousand' → amount=50000, amount collected", async () => {
  const profileWithMostFields = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
    farming: { landArea: 3, landUnit: "acres", ownership: "owned" },
  });

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "amount", "lastAskedField passed");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { amount: 50000 },
      provider: "stub",
    };
  }, profileWithMostFields);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileWithMostFields,
    message: "I need fifty thousand",
    lastAskedField: "amount",
    // season is still missing but we're testing amount here
  });

  excludes(result.informationGap.missingFields, "amount", "amount not missing");
  includes(result.informationGap.collectedFields, "amount", "amount collected");
});

// ─── TEST GROUP 6: income answer ─────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 6: Income answer");
console.log("═══════════════════════════════════════════════════════════\n");

test("6.1 'I earn around two lakh a year' → income=200000, synced to farmIncome", async () => {
  const profileBeforeIncome = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
    farming: { landArea: 3, landUnit: "acres", ownership: "owned" },
  });

  const { orchestrator, getStoredProfile } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "income", "lastAskedField passed");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { income: 200000 },
      provider: "stub",
    };
  }, profileBeforeIncome);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileBeforeIncome,
    message: "I earn around two lakh a year",
    lastAskedField: "income",
  });

  excludes(result.informationGap.missingFields, "income", "income not missing");
  includes(result.informationGap.collectedFields, "income", "income collected");

  // Verify income was synced to farmIncome in the profile
  const stored = getStoredProfile();
  if (stored) {
    equal(stored.financial?.farmIncome, 200000, "income synced to farmIncome");
  }
});

// ─── TEST GROUP 7: existingDebt answer ───────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 7: Existing debt answer");
console.log("═══════════════════════════════════════════════════════════\n");

test("7.1 'I don't have any loans' → existingDebt=0, collected", async () => {
  const profileBeforeDebt = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
    farming: { landArea: 3, landUnit: "acres", ownership: "owned" },
    financial: { farmIncome: 200000, existingLoans: [] },
  });

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    equal(context.lastAskedField, "existingDebt", "lastAskedField passed");
    return {
      language: "en",
      intent: "crop_financing",
      entities: { existingDebt: 0 },
      provider: "stub",
    };
  }, profileBeforeDebt);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileBeforeDebt,
    message: "I don't have any loans",
    lastAskedField: "existingDebt",
  });

  excludes(result.informationGap.missingFields, "existingDebt", "existingDebt not missing");
  includes(result.informationGap.collectedFields, "existingDebt", "existingDebt collected");
});

test("7.2 '30,000 rupees loan' → existingDebt=30000, collected", async () => {
  const profileBeforeDebt = makeProfile({
    location: { state: "Andhra Pradesh", district: null, mandal: null },
    crops: ["paddy"],
    farming: { landArea: 3, landUnit: "acres", ownership: "owned" },
    financial: { farmIncome: 200000, existingLoans: [] },
  });

  const { orchestrator, getStoredProfile } = makeOrchestrator(async () => ({
    language: "en",
    intent: "crop_financing",
    entities: { existingDebt: 30000 },
    provider: "stub",
  }), profileBeforeDebt);

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: profileBeforeDebt,
    message: "I have a bank loan of 30,000 rupees",
    lastAskedField: "existingDebt",
  });

  excludes(result.informationGap.missingFields, "existingDebt", "existingDebt not missing");
  includes(result.informationGap.collectedFields, "existingDebt", "existingDebt collected");
});

// ─── TEST GROUP 8: full progressive conversation simulation ──────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 8: Progressive conversation — no question repeats");
console.log("═══════════════════════════════════════════════════════════\n");

test("8.1 Full crop_financing conversation advances without repeating questions", async () => {
  // Simulate a complete multi-turn conversation.
  // Each turn provides the answer to exactly one field.
  // Verify that the nextQuestion.field advances monotonically.

  // Turn answers: map of lastAskedField → entities extracted
  const answerSequence = [
    { lastAskedField: "location",     entities: { state: "Andhra Pradesh" } },
    { lastAskedField: "crop",         entities: { crop: "paddy" } },
    { lastAskedField: "landArea",     entities: { landArea: 3, landUnit: "acres" } },
    { lastAskedField: "ownership",    entities: { ownership: "owned" } },
    { lastAskedField: "season",       entities: { season: "kharif" } },
    { lastAskedField: "amount",       entities: { amount: 50000 } },
    { lastAskedField: "income",       entities: { income: 200000 } },
    { lastAskedField: "existingDebt", entities: { existingDebt: 30000 } },
  ];

  const TRANSIENT_FIELDS = ["season", "amount", "existingDebt"];

  // Shared state that accumulates across turns (mirrors MongoDB + messageController)
  let storedProfile = makeProfile();
  let transientEntities = {};  // mirrors Message.intentData.transientEntities

  const answeredFields = [];

  for (let i = 0; i < answerSequence.length; i++) {
    const { lastAskedField, entities } = answerSequence[i];
    const currentProfile = JSON.parse(JSON.stringify(storedProfile));
    const currentTransient = { ...transientEntities };

    // Build a fresh orchestrator for this turn
    const { orchestrator, getStoredProfile } = makeOrchestrator(
      async (message, context) => {
        if (context.lastAskedField !== lastAskedField) {
          throw new Error(`turn ${i+1}: expected lastAskedField="${lastAskedField}", got "${context.lastAskedField}"`);
        }
        return {
          language: "en",
          intent: "crop_financing",
          entities,
          provider: "stub",
        };
      },
      currentProfile
    );

    const result = await orchestrator.orchestrate({
      userId: "u1",
      conversation: CONV,
      profile: currentProfile,
      message: `(stub answer for ${lastAskedField})`,
      lastAskedField,
      transientEntities: currentTransient,
    });

    // Update shared profile from this turn's sync
    const turnProfile = getStoredProfile();
    if (turnProfile) storedProfile = turnProfile;

    // Accumulate transient entities for next turn (mirrors messageController)
    const currentEntities = result.understanding?.entities || {};
    for (const field of TRANSIENT_FIELDS) {
      if (currentEntities[field] !== undefined && currentEntities[field] !== null) {
        transientEntities[field] = currentEntities[field];
      }
    }

    // The field we just answered should now be collected
    excludes(result.informationGap.missingFields, lastAskedField,
      `turn ${i+1}: '${lastAskedField}' not in missingFields`);
    includes(result.informationGap.collectedFields, lastAskedField,
      `turn ${i+1}: '${lastAskedField}' in collectedFields`);

    answeredFields.push(lastAskedField);

    // Verify no previously answered field is being asked again
    if (result.nextQuestion) {
      const nextField = result.nextQuestion.field;
      if (answeredFields.includes(nextField)) {
        throw new Error(
          `Turn ${i+1}: nextQuestion.field='${nextField}' was already answered — REPEAT DETECTED`
        );
      }
    }

    console.log(`    Turn ${i+1} (${lastAskedField}) → next: ${result.nextQuestion?.field || "COMPLETE"}, status: ${result.status}`);
  }

  console.log(`    All 8 fields answered without repetition.`);
});

// ─── TEST GROUP 9: context hint is passed correctly ──────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 9: lastAskedField context hint passing");
console.log("═══════════════════════════════════════════════════════════\n");

test("9.1 lastAskedField is passed to understandMessage as context", async () => {
  let capturedContext = null;

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    capturedContext = context;
    return {
      language: "en",
      intent: "crop_financing",
      entities: { state: "Telangana" },
      provider: "stub",
    };
  }, makeProfile());

  await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: makeProfile(),
    message: "Telangana",
    lastAskedField: "location",
  });

  equal(capturedContext.lastAskedField, "location", "lastAskedField in context");
  equal(capturedContext.conversationIntent, "crop_financing", "conversationIntent in context");
});

test("9.2 null lastAskedField when no previous question (first turn)", async () => {
  let capturedContext = null;

  const { orchestrator } = makeOrchestrator(async (message, context) => {
    capturedContext = context;
    return {
      language: "en",
      intent: "crop_financing",
      entities: {},
      provider: "stub",
    };
  });

  await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: makeProfile(),
    message: "I need a crop loan",
    // no lastAskedField
  });

  equal(capturedContext.lastAskedField, null, "lastAskedField is null on first turn");
});

// ─── TEST GROUP 10: profileSync of new entity fields ────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log(" GROUP 10: profileSync — new entity fields state/ownership/season");
console.log("═══════════════════════════════════════════════════════════\n");

const { deriveProfileSync } = require("./profileSync/profileSyncService");

test("10.1 state entity syncs to location.state", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { state: "Andhra Pradesh" } },
    profile: null,
  });
  equal(result.updated, true, "updated");
  equal(result.changes["location.state"], "Andhra Pradesh", "location.state");
});

test("10.2 ownership entity syncs to farming.ownership", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { ownership: "owned" } },
    profile: null,
  });
  equal(result.updated, true, "updated");
  equal(result.changes["farming.ownership"], "owned", "farming.ownership");
});

test("10.3 ownership 'leased' syncs correctly", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { ownership: "leased" } },
    profile: null,
  });
  equal(result.changes["farming.ownership"], "leased", "farming.ownership leased");
});

test("10.4 income entity syncs to financial.farmIncome", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { income: 200000 } },
    profile: null,
  });
  equal(result.updated, true, "updated");
  equal(result.changes["financial.farmIncome"], 200000, "financial.farmIncome");
});

test("10.5 existingDebt=0 ('no loans') syncs to empty existingLoans", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { existingDebt: 0 } },
    profile: { financial: { existingLoans: [] } },
  });
  // existingDebt=0 with empty loans → no change needed (already empty)
  // If existingLoans has entries, setting debt=0 clears them
  const result2 = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { existingDebt: 0 } },
    profile: { financial: { existingLoans: [{ lender: "SBI", amount: 50000 }] } },
  });
  equal(result2.changes["financial.existingLoans"], [], "existingLoans cleared on no-debt");
});

test("10.6 existingDebt=30000 syncs as single-entry loan", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { existingDebt: 30000 } },
    profile: { financial: { existingLoans: [] } },
  });
  equal(result.updated, true, "updated");
  const loans = result.changes["financial.existingLoans"];
  if (!Array.isArray(loans) || loans.length !== 1 || loans[0].amount !== 30000) {
    throw new Error(`existingLoans: expected [{amount:30000}], got ${JSON.stringify(loans)}`);
  }
});

test("10.7 income NOT synced again when farmIncome already set", () => {
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { income: 200000, farmIncome: 150000 } },
    profile: { financial: { farmIncome: null } },
  });
  // farmIncome is explicit → takes precedence over generic income
  equal(result.changes["financial.farmIncome"], 150000, "explicit farmIncome takes precedence");
});

test("10.8 season entity NOT synced to profile (no profile field for season)", () => {
  // season is in entities but has no matching profile path
  // It must reach knownFields via contextService but NOT be written to profile
  const result = deriveProfileSync({
    userId: "u1",
    understanding: { entities: { season: "kharif" } },
    profile: null,
  });
  // season should not be in changes (no profile path for it)
  const hasSeasonChange = Object.keys(result.changes).some(k => k.includes("season"));
  if (hasSeasonChange) throw new Error("season should not be synced to profile");
  // but season should NOT cause updated=false to mask other changes
});

test("10.9 state entity available in knownFields this turn via contextService", async () => {
  const { orchestrator } = makeOrchestrator(async () => ({
    language: "en",
    intent: "crop_financing",
    entities: { state: "Andhra Pradesh" },
    provider: "stub",
  }), makeProfile());

  const result = await orchestrator.orchestrate({
    userId: "u1",
    conversation: CONV,
    profile: makeProfile(),
    message: "Andhra Pradesh",
    lastAskedField: "location",
  });

  // state should appear in knownFields this turn
  equal(result.context.knownFields.state, "Andhra Pradesh", "state in knownFields");
  // location resolver should see it
  excludes(result.informationGap.missingFields, "location", "location not missing");
});

// ─── Run and report ───────────────────────────────────────────────────────────

Promise.all(asyncTests).then(() => {
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(` Results: ${pass} passed, ${fail} failed`);
  console.log(`═══════════════════════════════════════════════════════════\n`);
  process.exit(fail > 0 ? 1 : 0);
});

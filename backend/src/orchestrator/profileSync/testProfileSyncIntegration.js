"use strict";

const proxyquire = require("proxyquire").noCallThru();

let storedProfile = null;

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function applyChanges(profile, changes) {
  const next = clone(profile) || {};
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split(".");
    const last = keys.pop();
    let target = next;
    for (const key of keys) target = target[key] ||= {};
    target[last] = clone(value);
  }
  return next;
}

const orchestrator = proxyquire("../orchestratorService", {
  "./understanding/understandingService": {
    understandMessage: async (message) => message === "turn one"
      ? { language: "en", intent: "crop_financing", entities: { landArea: 3, landUnit: "acre", crop: "paddy" }, provider: "gemini" }
      : { language: "en", intent: "crop_financing", entities: {}, provider: "gemini" },
  },
  "./questions/nextQuestionService": {
    getNextQuestion: async ({ missingFields, language }) => ({
      field: missingFields[0], question: `Question for ${missingFields[0]}`, language, source: "fallback",
    }),
  },
  "../services/profileService": {
    upsertProfile: async (_userId, changes) => {
      storedProfile = applyChanges(storedProfile, changes);
      return clone(storedProfile);
    },
  },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const conversation = { _id: "conversation-1", language: "en", status: "active" };

  const firstTurn = await orchestrator.orchestrate({
    userId: "user-1", conversation, profile: storedProfile, message: "turn one",
  });

  assert(storedProfile.farming.landArea === 3, "turn 1 persists landArea");
  assert(storedProfile.farming.landUnit === "acres", "turn 1 persists canonical landUnit");
  assert(storedProfile.crops.includes("paddy"), "turn 1 persists crop");
  assert(!firstTurn.informationGap.missingFields.includes("landArea"), "turn 1 gap sees persisted land");
  assert(!firstTurn.informationGap.missingFields.includes("crop"), "turn 1 gap sees persisted crop");

  const secondTurn = await orchestrator.orchestrate({
    userId: "user-1", conversation, profile: storedProfile, message: "turn two",
  });

  assert(!secondTurn.informationGap.missingFields.includes("landArea"), "turn 2 context retrieves persisted land");
  assert(!secondTurn.informationGap.missingFields.includes("crop"), "turn 2 context retrieves persisted crop");
  assert(secondTurn.nextQuestion.field === "location", "turn 2 asks the next genuinely missing field");
  console.log("PASS: two-turn profile-sync integration");
})().catch((error) => {
  console.error(`FAIL: two-turn profile-sync integration\n${error.stack || error}`);
  process.exit(1);
});

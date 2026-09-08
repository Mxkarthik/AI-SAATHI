"use strict";

/**
 * testContext.js
 *
 * Manual test for buildContext() in contextService.js.
 *
 * Run:
 *   node src/orchestrator/context/testContext.js
 */

const { buildContext } = require("./contextService");

// ─── Test fixtures ────────────────────────────────────────────────────────────

const profile = {
  location: {
    state:    "Andhra Pradesh",
    district: "Visakhapatnam",
  },
  farming: {
    landArea:  3,
    landUnit:  "acres",
    ownership: "owned",
  },
  crops: ["paddy"],
  irrigation: {
    typeOrSource: "borewell",
  },
  financial: {
    farmIncome:      250000,
    otherIncome:     50000,
    monthlyExpenses: 15000,
    existingLoans:   [],          // empty array — hasValue([]) === false
  },
  assets: {
    equipment: ["pump"],
    livestock: ["cow"],
  },
};

const conversation = {
  _id:      "test-conversation-123",
  language: "te",
  intent:   "crop_financing",
  status:   "active",
};

const understanding = {
  language: "te",
  intent:   "crop_financing",
  entities: {
    crop:         "paddy",
    landArea:     3,
    landUnit:     "acres",
    amount:       50000,
    income:       null,       // null — must NOT appear in knownFields
    existingDebt: null,       // null — must NOT appear in knownFields
  },
};

// ─── Keep a snapshot of profile values we want to verify are untouched ────────

const profileFarmIncomeBefore = profile.financial.farmIncome;
const profileCropsBefore      = profile.crops.slice();   // shallow copy

// ─── Call buildContext ────────────────────────────────────────────────────────

const ctx = buildContext({ profile, conversation, understanding });

// ─── Print full output ────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log(" buildContext() output");
console.log("═══════════════════════════════════════════════════════\n");
console.dir(ctx, { depth: null });

// ─── Assertions ───────────────────────────────────────────────────────────────

let pass = 0;
let fail = 0;

function assert(label, condition, note) {
  if (condition) {
    console.log(`  ✓  ${label}`);
    pass++;
  } else {
    console.error(`  ✗  ${label}${note ? "  ← " + note : ""}`);
    fail++;
  }
}

console.log("\n─── knownFields assertions ────────────────────────────\n");

// From profile.location
assert("state = 'Andhra Pradesh'",
  ctx.knownFields.state === "Andhra Pradesh");

assert("district = 'Visakhapatnam'",
  ctx.knownFields.district === "Visakhapatnam");

// From profile.farming
assert("landArea = 3",
  ctx.knownFields.landArea === 3);

assert("landUnit = 'acres'",
  ctx.knownFields.landUnit === "acres");

assert("ownership = 'owned'",
  ctx.knownFields.ownership === "owned");

// From profile.crops (top-level array in schema)
assert("crops = ['paddy']",
  Array.isArray(ctx.knownFields.crops) &&
  ctx.knownFields.crops.length === 1 &&
  ctx.knownFields.crops[0] === "paddy");

// From profile.irrigation.typeOrSource
assert("irrigation = 'borewell'",
  ctx.knownFields.irrigation === "borewell");

// From profile.financial
assert("farmIncome = 250000",
  ctx.knownFields.farmIncome === 250000);

assert("otherIncome = 50000",
  ctx.knownFields.otherIncome === 50000);

assert("monthlyExpenses = 15000",
  ctx.knownFields.monthlyExpenses === 15000);

// existingLoans: [] is an empty array — hasValue([]) === false in contextService
// so it is intentionally absent from knownFields to avoid "we know it's empty" pollution.
assert("existingLoans absent (empty array → not a known value)",
  !("existingLoans" in ctx.knownFields),
  "hasValue([]) === false by design");

// From profile.assets
assert("equipment = ['pump']",
  Array.isArray(ctx.knownFields.equipment) &&
  ctx.knownFields.equipment[0] === "pump");

assert("livestock = ['cow']",
  Array.isArray(ctx.knownFields.livestock) &&
  ctx.knownFields.livestock[0] === "cow");

// From understanding.entities (non-null values)
assert("crop = 'paddy'  (from entity)",
  ctx.knownFields.crop === "paddy");

assert("amount = 50000  (from entity)",
  ctx.knownFields.amount === 50000);

// Null entities must NOT appear in knownFields
assert("income absent   (null entity → stripped)",
  !("income" in ctx.knownFields));

assert("existingDebt absent  (null entity → stripped)",
  !("existingDebt" in ctx.knownFields));

console.log("\n─── conversation assertions ───────────────────────────\n");

assert("conversation.id = 'test-conversation-123'",
  ctx.conversation.id === "test-conversation-123");

assert("conversation.language = 'te'",
  ctx.conversation.language === "te");

assert("conversation.intent = 'crop_financing'",
  ctx.conversation.intent === "crop_financing");

assert("conversation.status = 'active'",
  ctx.conversation.status === "active");

console.log("\n─── currentMessage assertions ─────────────────────────\n");

assert("currentMessage.language = 'te'",
  ctx.currentMessage.language === "te");

assert("currentMessage.intent = 'crop_financing'",
  ctx.currentMessage.intent === "crop_financing");

assert("currentMessage.entities.amount = 50000",
  ctx.currentMessage.entities.amount === 50000);

assert("currentMessage.entities has no null values",
  Object.values(ctx.currentMessage.entities).every(v => v !== null && v !== undefined));

console.log("\n─── mutation guard assertions ─────────────────────────\n");

assert("profile.financial.farmIncome unchanged",
  profile.financial.farmIncome === profileFarmIncomeBefore);

assert("profile.crops unchanged",
  profile.crops.length === profileCropsBefore.length &&
  profile.crops[0] === profileCropsBefore[0]);

assert("user.profile is same reference as input profile",
  ctx.user.profile === profile);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════");
console.log(` Results: ${pass} passed, ${fail} failed`);
console.log("═══════════════════════════════════════════════════════\n");

process.exit(fail > 0 ? 1 : 0);

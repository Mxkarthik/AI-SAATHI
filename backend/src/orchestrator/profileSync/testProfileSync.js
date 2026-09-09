"use strict";

const { deriveProfileSync } = require("./profileSyncService");

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

function sync(entities, profile = null) {
  return deriveProfileSync({ userId: "user-1", understanding: { entities }, profile });
}

test("landArea and landUnit sync", () => {
  equal(sync({ landArea: 3, landUnit: "acre" }).changes, {
    "farming.landArea": 3,
    "farming.landUnit": "acres",
  }, "changes");
});

test("crop sync", () => {
  equal(sync({ crop: "paddy" }).changes, { crops: ["paddy"] }, "changes");
});

test("multiple crops preserve existing values without duplicates", () => {
  equal(sync({ crops: ["Paddy", "maize"] }, { crops: ["paddy", "wheat"] }).changes, {
    crops: ["paddy", "wheat", "maize"],
  }, "changes");
});

test("ownership sync", () => {
  equal(sync({ ownership: "leased" }).changes, { "farming.ownership": "leased" }, "changes");
});

test("location sync supports explicit location fields", () => {
  equal(sync({ location: { state: "Andhra Pradesh", district: "Guntur", mandal: "Tenali" } }).changes, {
    "location.state": "Andhra Pradesh",
    "location.district": "Guntur",
    "location.mandal": "Tenali",
  }, "changes");
});

test("irrigation sync", () => {
  equal(sync({ irrigation: "borewell" }).changes, {
    "irrigation.typeOrSource": "borewell",
  }, "changes");
});

test("only source-labelled income fields are synced", () => {
  equal(sync({ income: 100000, farmIncome: 120000, otherIncome: 20000, monthlyExpenses: 8000 }).changes, {
    "financial.farmIncome": 120000,
    "financial.otherIncome": 20000,
    "financial.monthlyExpenses": 8000,
  }, "changes");
});

test("equipment sync", () => {
  equal(sync({ equipment: "tractor" }, { assets: { equipment: ["pump"] } }).changes, {
    "assets.equipment": ["pump", "tractor"],
  }, "changes");
});

test("livestock sync", () => {
  equal(sync({ livestock: "cow" }).changes, { "assets.livestock": ["cow"] }, "changes");
});

test("null, undefined, empty strings, and empty arrays do not overwrite", () => {
  const profile = {
    location: { state: "Telangana" },
    farming: { landArea: 5, landUnit: "acres", ownership: "owned" },
    crops: ["paddy"],
  };
  const result = sync({ state: "", landArea: null, landUnit: undefined, ownership: "", crop: [] }, profile);
  equal(result, { updated: false, changes: {} }, "result");
  equal(profile.farming.landArea, 5, "profile remains unchanged");
});

test("unrelated understanding entities are ignored", () => {
  equal(sync({ amount: 50000, insuranceType: "crop insurance", asset: "tractor", season: "kharif" }), {
    updated: false,
    changes: {},
  }, "result");
});

test("unmentioned existing profile fields are preserved", () => {
  const profile = {
    location: { state: "Andhra Pradesh" },
    farming: { landArea: 3, landUnit: "acres", ownership: "owned" },
    financial: { farmIncome: 200000 },
    crops: ["paddy"],
  };
  const result = sync({ crop: "maize" }, profile);
  equal(result.changes, { crops: ["paddy", "maize"] }, "minimal change");
  equal(profile.financial.farmIncome, 200000, "income preserved");
  equal(profile.farming.landArea, 3, "land preserved");
});

test("canonical land units are preserved", () => {
  equal(sync({ landUnit: "hectare" }).changes, { "farming.landUnit": "hectares" }, "canonical unit");
  equal(sync({ landUnit: "acres" }, { farming: { landUnit: "acres" } }), {
    updated: false,
    changes: {},
  }, "already canonical value");
});

test("no duplicate equipment or livestock array values are written", () => {
  equal(sync({ equipment: "TRACTOR", livestock: "cow" }, {
    assets: { equipment: ["tractor"], livestock: ["Cow"] },
  }), { updated: false, changes: {} }, "result");
});

test("only explicit schema paths are returned — arbitrary fields are blocked", () => {
  // Verify that injection of arbitrary/unsafe field paths does not produce changes.
  // existingDebt IS now explicitly handled, so it should appear in changes.
  const result = sync({ arbitraryPath: "unsafe", nested: { value: "unsafe" }, existingDebt: 1000 });
  const changesKeys = Object.keys(result.changes);
  // arbitraryPath and nested must NOT appear
  if (changesKeys.some(k => k === "arbitraryPath" || k.startsWith("nested"))) {
    throw new Error(`Unsafe paths leaked into changes: ${changesKeys.join(", ")}`);
  }
  // existingDebt: 1000 IS a valid sync operation → financial.existingLoans
  if (!changesKeys.includes("financial.existingLoans")) {
    throw new Error(`existingDebt sync expected financial.existingLoans, got: ${changesKeys.join(", ")}`);
  }
});

test("existing loans require a structured lender and amount", () => {
  equal(sync({ existingDebt: 50000, existingLoans: [{ lender: "SBI", amount: 50000 }, { amount: 2000 }] }).changes, {
    "financial.existingLoans": [{ lender: "SBI", amount: 50000 }],
  }, "changes");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

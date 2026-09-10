"use strict";

const { analyzeInformationGap } = require("./informationGapService");

const result = analyzeInformationGap({
  currentMessage: { intent: "crop_financing" },
  knownFields: {
    state: "Andhra Pradesh",
    crops: ["paddy"],
    landArea: 3,
    ownership: "owned",
    season: "kharif",
  },
});

let failed = 0;
function assert(name, condition) {
  if (condition) {
    console.log(`PASS: ${name}`);
  } else {
    console.error(`FAIL: ${name}`);
    failed++;
  }
}

assert("season is collected after it is answered", result.collectedFields.includes("season"));
assert("season is no longer missing", !result.missingFields.includes("season"));
assert(
  "crop financing leaves amount, income, existingDebt in definition order",
  result.missingFields.join(",") === "amount,income,existingDebt"
);
assert("the gap remains incomplete", result.isComplete === false);

console.log(`\nResults: ${failed === 0 ? "4 passed" : `${failed} failed`}`);
if (failed > 0) process.exit(1);

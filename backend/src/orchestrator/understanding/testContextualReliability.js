"use strict";

const assert = require("assert");
const proxyquire = require("proxyquire").noCallThru();

function understandingWithProvider(provider) {
  return proxyquire("./understandingService", {
    "./providers/providerManager": { getProvider: () => provider },
  });
}

async function expectContextual(text, field, expected) {
  const service = understandingWithProvider({
    understand: async () => { throw new Error("Gemini unavailable"); },
  });
  const result = await service.understandMessage(text, {
    lastAskedField: field,
    conversationIntent: "crop_financing",
    conversationLanguage: "te",
  });
  assert.deepStrictEqual(result.entities[field], expected, `${text} -> ${field}`);
  return result;
}

(async () => {
  for (const [text, expected] of [
    ["50000", 50000],
    ["₹50,000", 50000],
    ["50k", 50000],
    ["5 lakh", 500000],
    ["1.5 lakh", 150000],
    ["ఐదు లక్షలు", 500000],
    ["రెండు వేల ఐదు వందల రూపాయలు", 2500],
  ]) {
    await expectContextual(text, "amount", expected);
  }

  for (const [text, expected] of [
    ["No", false],
    ["లేదు", false],
    ["నాకు ఎలాంటి లోన్ లేదు", false],
    ["Yes", true],
    ["అవును", true],
  ]) {
    await expectContextual(text, "existingDebt", expected);
  }

  const debtWithAmount = await expectContextual("నాకు రెండు లక్షల లోన్ ఉంది", "existingDebt", true);
  assert.strictEqual(debtWithAmount.entities.existingLoanAmount, 200000);

  const uncertain = await expectContextual("కొంత డబ్బు", "amount", undefined);
  assert.strictEqual(uncertain.entities.amount, undefined);

  const provider = understandingWithProvider({
    understand: async () => ({
      language: "en",
      intent: "crop_financing",
      entities: { amount: "3", existingDebt: "unknown" },
    }),
  });
  const contextualPriority = await provider.understandMessage("5 lakh", {
    lastAskedField: "amount",
    conversationIntent: "crop_financing",
  });
  assert.strictEqual(contextualPriority.entities.amount, 500000);

  console.log("PASS: contextual amount/debt extraction, provider precedence, and ambiguity tests");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

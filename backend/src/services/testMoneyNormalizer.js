"use strict";

const assert = require("assert");
const { parseMoney } = require("./moneyNormalizer");

function expectValue(text, expected) {
  const result = parseMoney(text);
  assert.strictEqual(result.value, expected, `${text} -> ${result.value}`);
  assert.strictEqual(result.currency, "INR");
  assert.strictEqual(result.needsClarification, false);
}

[
  ["37", 37], ["684", 684], ["1847", 1847], ["12763", 12763],
  ["98451", 98451], ["137829", 137829], ["345678", 345678],
  ["782415", 782415], ["1234567", 1234567],
  ["₹1,250", 1250], ["₹12,500", 12500], ["₹1,25,000", 125000],
  ["₹3,45,678", 345678], ["₹12,34,567", 1234567], ["Rs. 50.50", 50.5],
  ["fifty", 50], ["fifty five", 55], ["three hundred seventy two", 372],
  ["one thousand eight hundred forty seven", 1847],
  ["twelve thousand seven hundred sixty three", 12763],
  ["one lakh thirty seven thousand eight hundred twenty nine", 137829],
  ["one crore twenty five lakh", 12500000],
  ["two crore five lakh twenty thousand", 20520000],
  ["యాభై", 50], ["యాభై ఐదు", 55], ["ఐదు వందల ఇరవై ఐదు", 525],
  ["రెండు వేల ఐదు వందలు", 2500], ["ఇరవై ఐదు వేలు", 25000],
  ["ఒక లక్ష ఇరవై ఐదు వేలు", 125000], ["ఐదు లక్షల యాభై వేలు", 550000],
  ["ఒక కోటి", 10000000], ["రెండు వేల rupees", 2000],
  ["2 lakh రూపాయలు", 200000], ["రెండు lakh రూపాయలు", 200000],
  ["five thousand రూపాయలు", 5000], ["ఐదు thousand rupees", 5000],
  ["₹2 lakh", 200000],
  ["నా దగ్గర 3 ఎకరాల భూమి ఉంది, కానీ నాకు 50000 రూపాయల లోన్ కావాలి.", 50000],
  ["నేను 3 ఎకరాల్లో పంట వేసి 20,000 రూపాయలు ఖర్చు చేశాను.", 20000],
].forEach(([text, expected]) => expectValue(text, expected));

for (const tens of [20, 30, 40, 50, 60, 70, 80, 90]) {
  const word = Object.entries({ twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 })
    .find(([, value]) => value === tens)[0];
  expectValue(`${word} five rupees`, tens + 5);
  expectValue(`${word} five thousand rupees`, (tens + 5) * 1000);
}

assert.strictEqual(parseMoney("కొంత డబ్బు ఖర్చు చేశాను").value, null);
assert.strictEqual(parseMoney("-500").value, null);
assert.strictEqual(parseMoney("Infinity").value, null);
console.log("PASS: money normalizer compositional, mixed-language, currency, ambiguity, and property tests");

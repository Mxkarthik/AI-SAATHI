"use strict";

const ENGLISH_VALUES = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};

const TELUGU_VALUES = {
  "సున్నా": 0, "ఒకటి": 1, "ఒక": 1, "ఒక్క": 1, "రెండు": 2, "మూడు": 3,
  "నాలుగు": 4, "ఐదు": 5, "ఆరు": 6, "ఏడు": 7, "ఎనిమిది": 8, "తొమ్మిది": 9,
  "పది": 10, "పదకొండు": 11, "పన్నెండు": 12, "పదమూడు": 13, "పద్నాలుగు": 14,
  "పదిహేను": 15, "పదహారు": 16, "పదిహేడు": 17, "పద్దెనిమిది": 18, "పంతొమ్మిది": 19,
  "ఇరవై": 20, "ముప్పై": 30, "నలభై": 40, "యాభై": 50, "అరవై": 60,
  "డెబ్బై": 70, "ఎనభై": 80, "తొంభై": 90,
};

const SCALE_VALUES = {
  hundred: 100, hundreds: 100,
  thousand: 1000, thousands: 1000,
  lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000,
  crore: 10000000, crores: 10000000,
  "వంద": 100, "వందలు": 100, "వందల": 100,
  "వెయ్యి": 1000, "వెయ్యి": 1000, "వేలు": 1000, "వేల": 1000, "వేలలు": 1000,
  "లక్ష": 100000, "లక్షలు": 100000, "లక్షల": 100000,
  "కోటి": 10000000, "కోట్లు": 10000000, "కోట్ల": 10000000,
};

const CURRENCY_WORDS = [
  "inr", "rs", "rupee", "rupees", "రూపాయి", "రూపాయలు", "రూపాయల",
];
const NUMBER_WORDS = new Set([...Object.keys(ENGLISH_VALUES), ...Object.keys(TELUGU_VALUES)]);
const SCALE_WORDS = new Set(Object.keys(SCALE_VALUES));
const FILLER_WORDS = new Set(["and", "మరియు"]);

function cleanTokens(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/[₹$]/g, " ₹ ")
    .split(/\s+/u)
    .map((token) => token.replace(/^[.,;:!?()[\]{}]+|[.,;:!?()[\]{}]+$/gu, ""))
    .filter(Boolean);
}

function parseNumericLiteral(token) {
  const cleaned = token.replace(/^₹|^rs\.?|^inr/i, "").replace(/,/g, "");
  if (!/^\d+(?:\.\d+)?$/u.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseWordTokens(tokens) {
  let total = 0;
  let current = 0;
  let matched = false;
  let decimalDigits = "";
  let decimalMode = false;

  for (const token of tokens) {
    if (token === "point" || token === "పాయింట్") {
      if (!matched || decimalMode) return null;
      decimalMode = true;
      continue;
    }
    if (FILLER_WORDS.has(token)) continue;

    const literal = parseNumericLiteral(token);
    if (decimalMode) {
      if (literal === null || !Number.isInteger(literal) || literal > 9) return null;
      decimalDigits += String(literal);
      matched = true;
      continue;
    }
    if (literal !== null) {
      current += literal;
      matched = true;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(ENGLISH_VALUES, token)) {
      current += ENGLISH_VALUES[token];
      matched = true;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(TELUGU_VALUES, token)) {
      current += TELUGU_VALUES[token];
      matched = true;
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(SCALE_VALUES, token)) {
      const scale = SCALE_VALUES[token];
      current = (current || 1) * scale;
      if (scale >= 1000) {
        total += current;
        current = 0;
      }
      matched = true;
      continue;
    }
    return null;
  }

  if (!matched || decimalMode && !decimalDigits) return null;
  const value = total + current;
  const decimalValue = decimalMode ? Number(`${value}.${decimalDigits}`) : value;
  return Number.isFinite(decimalValue) ? decimalValue : null;
}

function wordCandidate(tokens, start) {
  if (!NUMBER_WORDS.has(tokens[start]) && !SCALE_WORDS.has(tokens[start]) && parseNumericLiteral(tokens[start]) === null) {
    return null;
  }
  let end = start;
  let best = null;
  while (end < tokens.length) {
    const token = tokens[end];
    if (!NUMBER_WORDS.has(token) && !SCALE_WORDS.has(token) && !FILLER_WORDS.has(token)
      && token !== "point" && token !== "పాయింట్" && parseNumericLiteral(token) === null) break;
    const value = parseWordTokens(tokens.slice(start, end + 1));
    if (value !== null) best = { value, start, end };
    end += 1;
  }
  return best;
}

function findCandidates(tokens) {
  const candidates = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const literal = parseNumericLiteral(tokens[index]);
    if (literal !== null) candidates.push({ value: literal, start: index, end: index });
    const word = wordCandidate(tokens, index);
    if (word) candidates.push(word);
  }
  return candidates.filter((candidate, index, all) => !all.some((other, otherIndex) => (
    otherIndex !== index && other.start <= candidate.start && other.end >= candidate.end
      && (other.end - other.start) > (candidate.end - candidate.start)
  )));
}

function hasCurrencyAt(tokens, index) {
  const token = tokens[index]?.replace(/[.]$/u, "");
  return token === "₹" || CURRENCY_WORDS.includes(token);
}

function parseMoney(text) {
  if (/(?:^|[\s₹])[-+]\d[\d,]*(?:\.\d+)?(?:\s|$)/u.test(String(text || ""))) {
    return { value: null, currency: "INR", confidence: 0, source: "deterministic", needsClarification: true };
  }
  const tokens = cleanTokens(text);
  if (!tokens.length) return { value: null, currency: "INR", confidence: 0, source: "deterministic", needsClarification: true };

  const candidates = findCandidates(tokens).filter(({ value }) => Number.isFinite(value) && value > 0);
  const currencyIndexes = tokens.reduce((indexes, token, index) => {
    if (hasCurrencyAt(tokens, index)) indexes.push(index);
    return indexes;
  }, []);

  let selected = null;
  if (currencyIndexes.length) {
    const scored = candidates.map((candidate) => {
      const distance = Math.min(...currencyIndexes.map((currencyIndex) => (
        currencyIndex >= candidate.start ? currencyIndex - candidate.end : candidate.start - currencyIndex
      )));
      const adjacent = currencyIndexes.some((currencyIndex) => Math.abs(currencyIndex - candidate.end) <= 1);
      return { candidate, distance, adjacent };
    }).filter(({ distance }) => distance <= 10)
      .sort((a, b) => Number(b.adjacent) - Number(a.adjacent) || a.distance - b.distance);
    selected = scored[0]?.candidate || null;
  } else {
    selected = candidates.sort((a, b) => a.start - b.start)[0] || null;
  }

  if (!selected || !Number.isFinite(selected.value) || selected.value <= 0) {
    return { value: null, currency: "INR", confidence: 0, source: "deterministic", needsClarification: true };
  }

  return {
    value: selected.value,
    currency: "INR",
    confidence: currencyIndexes.length ? 1 : 0.9,
    source: "deterministic",
    needsClarification: false,
  };
}

module.exports = { parseMoney };

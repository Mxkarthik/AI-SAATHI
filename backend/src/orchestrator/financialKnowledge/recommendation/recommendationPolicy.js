"use strict";

const POLICY_VERSION = "phase4b-mvp-v1";

const FACTOR_WEIGHTS = Object.freeze({
  intent_match: 40,
  need_match: 25,
  crop_relevance: 15,
  equipment_relevance: 15,
  livestock_relevance: 15,
  geographic_relevance: 10,
  benefit_category_relevance: 10,
});

const FACTOR_ORDER = Object.freeze([
  "intent_match",
  "need_match",
  "crop_relevance",
  "equipment_relevance",
  "livestock_relevance",
  "geographic_relevance",
  "benefit_category_relevance",
]);

function scoreFactors(factors) {
  return factors.reduce((total, factor) => total + (factor.matched ? factor.points : 0), 0);
}

module.exports = {
  POLICY_VERSION,
  FACTOR_WEIGHTS,
  FACTOR_ORDER,
  scoreFactors,
};

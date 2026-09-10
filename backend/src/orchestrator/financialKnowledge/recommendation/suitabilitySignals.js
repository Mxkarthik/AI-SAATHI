"use strict";

const { getSchemesForIntent } = require("../adapter/schemeRuleAdapter");
const { FACTOR_ORDER, FACTOR_WEIGHTS } = require("./recommendationPolicy");

function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

function valuesForNeed(decisionContext, intent) {
  const user = decisionContext?.user || {};
  const financial = user.financial || {};
  const specific = user.intentSpecific || {};
  const farming = user.farming || {};

  switch (intent) {
    case "crop_financing":
    case "equipment_financing":
    case "livestock_financing":
      return hasValue(financial.amount)
        ? [{ path: "user.financial.amount", value: financial.amount }]
        : [];
    case "insurance":
      return [
        hasValue(specific.insuranceType)
          ? { path: "user.intentSpecific.insuranceType", value: specific.insuranceType }
          : null,
        hasValue(specific.asset)
          ? { path: "user.intentSpecific.asset", value: specific.asset }
          : null,
        hasValue(farming.crops)
          ? { path: "user.farming.crops", value: farming.crops }
          : null,
      ].filter(Boolean);
    case "savings":
      return hasValue(specific.savingsGoal)
        ? [{ path: "user.intentSpecific.savingsGoal", value: specific.savingsGoal }]
        : [];
    case "investment":
      return [
        hasValue(specific.investmentAmount)
          ? { path: "user.intentSpecific.investmentAmount", value: specific.investmentAmount }
          : null,
        hasValue(specific.investmentPeriod)
          ? { path: "user.intentSpecific.investmentPeriod", value: specific.investmentPeriod }
          : null,
        hasValue(specific.riskPreference)
          ? { path: "user.intentSpecific.riskPreference", value: specific.riskPreference }
          : null,
      ].filter(Boolean);
    default:
      return [];
  }
}

function factor(id, matched, evidence, explanation) {
  return {
    id,
    matched,
    points: matched ? FACTOR_WEIGHTS[id] : 0,
    evidence: evidence || [],
    explanation,
  };
}

const CROP_SCHEMES = new Set(["pm_kisan", "pmfby", "kisan_credit_card"]);
const EQUIPMENT_SCHEMES = new Set(["kisan_credit_card", "agriculture_infrastructure_fund"]);
const LIVESTOCK_SCHEMES = new Set(["kisan_credit_card"]);

const BENEFIT_CATEGORIES_BY_INTENT = {
  crop_financing: new Set([
    "agriculture_income_support",
    "crop_insurance",
    "agricultural_credit",
    "agri_infrastructure_finance",
  ]),
  equipment_financing: new Set(["agricultural_credit", "agri_infrastructure_finance"]),
  livestock_financing: new Set(["agricultural_credit"]),
  insurance: new Set(["crop_insurance"]),
  savings: new Set(["financial_inclusion"]),
  investment: new Set(["financial_inclusion"]),
  general_financial_guidance: new Set(),
};

function evaluateSuitabilitySignals({ schemeId, decisionContext, metadata } = {}) {
  const intent = decisionContext?.intent || null;
  const user = decisionContext?.user || {};
  const farming = user.farming || {};
  const assets = user.assets || {};
  const location = user.location || {};
  const needEvidence = valuesForNeed(decisionContext, intent);
  const mapped = getSchemesForIntent(intent).includes(schemeId);
  const benefitCategories = BENEFIT_CATEGORIES_BY_INTENT[intent] || new Set();
  const cropMatched = intent === "crop_financing" && CROP_SCHEMES.has(schemeId) && hasValue(farming.crops);
  const equipmentMatched = intent === "equipment_financing" && EQUIPMENT_SCHEMES.has(schemeId) && hasValue(assets.equipment);
  const livestockMatched = intent === "livestock_financing" && LIVESTOCK_SCHEMES.has(schemeId) && hasValue(assets.livestock);
  const stateAvailable = hasValue(location.state) && hasValue(metadata?.stateVariation);
  const benefitMatched = benefitCategories.has(metadata?.category) && needEvidence.length > 0;

  const factors = [
    factor(
      "intent_match",
      mapped,
      mapped ? [intent] : [],
      mapped
        ? "The scheme is explicitly mapped to the user's current intent."
        : "The scheme is not mapped to the user's current intent."
    ),
    factor(
      "need_match",
      needEvidence.length > 0,
      needEvidence.map((item) => item.value),
      needEvidence.length > 0
        ? "The user supplied information about the current intent-specific need."
        : "No intent-specific need information is available."
    ),
    factor(
      "crop_relevance",
      cropMatched,
      cropMatched ? [farming.crops] : [],
      cropMatched
        ? "The scheme has documented agricultural or crop relevance for the supplied crop context."
        : "No supported crop relevance could be established."
    ),
    factor(
      "equipment_relevance",
      equipmentMatched,
      equipmentMatched ? [assets.equipment] : [],
      equipmentMatched
        ? "The scheme has documented equipment or infrastructure relevance for the supplied equipment."
        : "No supported equipment relevance could be established."
    ),
    factor(
      "livestock_relevance",
      livestockMatched,
      livestockMatched ? [assets.livestock] : [],
      livestockMatched
        ? "The scheme has documented livestock or allied-activity relevance for the supplied livestock context."
        : "No supported livestock relevance could be established."
    ),
    factor(
      "geographic_relevance",
      stateAvailable,
      stateAvailable ? [location.state] : [],
      stateAvailable
        ? "The user's State is available for the scheme's documented State/UT considerations; this does not prove a current notification."
        : "No supported geographic relevance could be established."
    ),
    factor(
      "benefit_category_relevance",
      benefitMatched,
      benefitMatched ? [metadata.category] : [],
      benefitMatched
        ? "The documented scheme benefit category matches the supplied need type."
        : "No additional benefit-category match could be established."
    ),
  ];

  return FACTOR_ORDER.map((id) => factors.find((item) => item.id === id));
}

module.exports = { evaluateSuitabilitySignals, hasValue, valuesForNeed };

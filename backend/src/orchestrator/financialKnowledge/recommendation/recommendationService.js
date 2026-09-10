"use strict";

const {
  getSchemeMetadata,
  getSchemesForIntent,
} = require("../adapter/schemeRuleAdapter");
const { STATUS } = require("../eligibility/eligibilityService");
const { classifyCandidates, CANDIDATE_CLASS } = require("./candidateFilter");
const { evaluateSuitabilitySignals } = require("./suitabilitySignals");
const { POLICY_VERSION, scoreFactors } = require("./recommendationPolicy");
const { buildExplanationData } = require("./explanationData");

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourceReferences(metadata, eligibility) {
  return unique([
    metadata?.source?.officialPortal,
    metadata?.source?.operationalGuidelines,
    metadata?.source?.secondaryOfficialSource,
    ...(eligibility?.sourceReferences || []),
  ]);
}

function buildRecommendation({ schemeId, decisionContext, eligibility }) {
  const metadata = getSchemeMetadata(schemeId);
  const matchedFactors = evaluateSuitabilitySignals({
    schemeId,
    decisionContext,
    metadata,
  });
  const score = scoreFactors(matchedFactors);
  const explanation = buildExplanationData({ metadata, factors: matchedFactors, eligibility });
  const matched = matchedFactors.filter((factor) => factor.matched);
  const unmet = matchedFactors.filter((factor) => !factor.matched);

  return {
    schemeId,
    rank: null,
    score,
    candidateClass: CANDIDATE_CLASS.RANKABLE,
    eligibilityStatus: eligibility.status,
    matchedFactors: matched,
    unmetFactors: unmet,
    verificationRequired: eligibility.verificationRequired || [],
    sourceReferences: sourceReferences(metadata, eligibility),
    explanation,
  };
}

function buildVerificationEntry({ schemeId, eligibility }) {
  const metadata = getSchemeMetadata(schemeId);
  return {
    schemeId,
    candidateClass: CANDIDATE_CLASS.REQUIRES_VERIFICATION,
    score: null,
    eligibilityStatus: eligibility?.status || STATUS.INSUFFICIENT_VERIFIED_DATA,
    verificationRequired: eligibility?.verificationRequired || [],
    sourceReferences: sourceReferences(metadata, eligibility),
  };
}

function buildExcludedEntry({ schemeId, eligibility }) {
  const metadata = getSchemeMetadata(schemeId);
  return {
    schemeId,
    candidateClass: CANDIDATE_CLASS.INELIGIBLE,
    score: null,
    eligibilityStatus: eligibility.status,
    verificationRequired: eligibility.verificationRequired || [],
    sourceReferences: sourceReferences(metadata, eligibility),
  };
}

function buildRecommendations({ decisionContext, eligibility } = {}) {
  if (!decisionContext || typeof decisionContext !== "object") return null;
  if (!eligibility || typeof eligibility !== "object" || !Array.isArray(eligibility.schemeResults)) {
    return null;
  }
  if (eligibility.error) return null;

  const resultIds = new Set(eligibility.schemeResults.map((result) => result.schemeId));
  if (getSchemesForIntent(decisionContext.intent).some((schemeId) => !resultIds.has(schemeId))) {
    return null;
  }

  const classified = classifyCandidates({ decisionContext, eligibility });
  const recommendations = classified.rankable
    .filter((candidate) => candidate.eligibility?.status === STATUS.ELIGIBLE)
    .map((candidate) => buildRecommendation({
      schemeId: candidate.schemeId,
      decisionContext,
      eligibility: candidate.eligibility,
    }))
    .sort((left, right) => right.score - left.score || left.schemeId.localeCompare(right.schemeId));

  recommendations.forEach((recommendation, index) => {
    recommendation.rank = index + 1;
  });

  return {
    intent: classified.intent,
    policyVersion: POLICY_VERSION,
    recommendations,
    verificationRequired: classified.requiresVerification.map(buildVerificationEntry),
    excluded: classified.ineligible.map(buildExcludedEntry),
    notApplicable: classified.notApplicable.map(({ schemeId }) => ({
      schemeId,
      candidateClass: CANDIDATE_CLASS.NOT_APPLICABLE,
    })),
  };
}

module.exports = { buildRecommendations, buildRecommendation };

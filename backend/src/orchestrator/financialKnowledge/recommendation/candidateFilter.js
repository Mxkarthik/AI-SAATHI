"use strict";

const {
  getAllSchemeIds,
  getSchemesForIntent,
} = require("../adapter/schemeRuleAdapter");
const { STATUS } = require("../eligibility/eligibilityService");

const CANDIDATE_CLASS = Object.freeze({
  RANKABLE: "rankable",
  REQUIRES_VERIFICATION: "requires_verification",
  INELIGIBLE: "ineligible",
  NOT_APPLICABLE: "not_applicable",
});

function classifyCandidates({ decisionContext, eligibility } = {}) {
  const intent = decisionContext?.intent || null;
  const applicableIds = new Set(getSchemesForIntent(intent));
  const resultsByScheme = new Map(
    Array.isArray(eligibility?.schemeResults)
      ? eligibility.schemeResults.map((result) => [result.schemeId, result])
      : []
  );

  const rankable = [];
  const requiresVerification = [];
  const ineligible = [];
  const notApplicable = [];

  const orderedSchemeIds = [
    ...getSchemesForIntent(intent),
    ...getAllSchemeIds().filter((schemeId) => !applicableIds.has(schemeId)),
  ];

  for (const schemeId of orderedSchemeIds) {
    if (!applicableIds.has(schemeId)) {
      notApplicable.push({ schemeId, candidateClass: CANDIDATE_CLASS.NOT_APPLICABLE });
      continue;
    }

    const result = resultsByScheme.get(schemeId);
    if (!result || result.status === STATUS.INSUFFICIENT_VERIFIED_DATA) {
      requiresVerification.push({
        schemeId,
        candidateClass: CANDIDATE_CLASS.REQUIRES_VERIFICATION,
        eligibility: result || null,
      });
    } else if (result.status === STATUS.INELIGIBLE) {
      ineligible.push({
        schemeId,
        candidateClass: CANDIDATE_CLASS.INELIGIBLE,
        eligibility: result,
      });
    } else if (result.status === STATUS.ELIGIBLE) {
      rankable.push({
        schemeId,
        candidateClass: CANDIDATE_CLASS.RANKABLE,
        eligibility: result,
      });
    } else {
      requiresVerification.push({
        schemeId,
        candidateClass: CANDIDATE_CLASS.REQUIRES_VERIFICATION,
        eligibility: result,
      });
    }
  }

  return {
    intent,
    rankable,
    requiresVerification,
    ineligible,
    notApplicable,
  };
}

module.exports = { CANDIDATE_CLASS, classifyCandidates };

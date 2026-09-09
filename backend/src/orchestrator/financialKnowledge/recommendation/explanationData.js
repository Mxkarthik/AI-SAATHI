"use strict";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildExplanationData({ metadata, factors, eligibility } = {}) {
  const matchedFactors = (factors || []).filter((factor) => factor.matched);
  const whyRecommended = unique(matchedFactors.map((factor) => factor.explanation));
  const whatToVerify = unique(eligibility?.verificationRequired || []);
  const caution = eligibility?.status === "INSUFFICIENT_VERIFIED_DATA"
    ? "Eligibility depends on additional official verification."
    : "Eligibility and benefits remain subject to the official scheme conditions.";

  return {
    whyRecommended,
    whatToVerify,
    caution,
    sourceReferences: unique([
      metadata?.source?.officialPortal,
      metadata?.source?.operationalGuidelines,
      metadata?.source?.secondaryOfficialSource,
      ...(eligibility?.sourceReferences || []),
    ]),
  };
}

module.exports = { buildExplanationData };

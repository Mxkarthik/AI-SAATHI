"use strict";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const TELUGU_FACTOR_EXPLANATIONS = {
  intent_match: "ఈ పథకం మీ ప్రస్తుత ఆర్థిక అవసరానికి నేరుగా అనుసంధానించబడింది.",
  need_match: "మీ ప్రస్తుత అవసరానికి సంబంధించిన సమాచారాన్ని అందించారు.",
  crop_relevance: "మీరు అందించిన పంట సమాచారానికి ఈ పథకానికి వ్యవసాయ లేదా పంట సంబంధిత ప్రయోజనం ఉంది.",
  equipment_relevance: "మీరు అందించిన పరికరాల సమాచారానికి ఈ పథకానికి సంబంధం ఉంది.",
  livestock_relevance: "మీరు అందించిన పశుసంపద సమాచారానికి ఈ పథకానికి సంబంధం ఉంది.",
  geographic_relevance: "మీ రాష్ట్రం ఈ పథకానికి సంబంధించిన రాష్ట్ర/కేంద్రపాలిత ప్రాంత పరిధిలో ఉంది; ఇది ప్రస్తుత నోటిఫికేషన్‌కు హామీ కాదు.",
  benefit_category_relevance: "పథకం ప్రయోజన వర్గం మీరు తెలిపిన అవసరానికి సరిపోతుంది.",
};

const TELUGU_CAUTION = {
  insufficient: "అర్హతకు అదనపు అధికారిక ధృవీకరణ అవసరం.",
  general: "అర్హత మరియు ప్రయోజనాలు అధికారిక పథక నిబంధనలకు లోబడి ఉంటాయి.",
};

function buildExplanationData({ metadata, factors, eligibility, language = "en" } = {}) {
  const matchedFactors = (factors || []).filter((factor) => factor.matched);
  const isTelugu = language === "te";
  const whyRecommended = unique(matchedFactors.map((factor) => (
    isTelugu ? TELUGU_FACTOR_EXPLANATIONS[factor.id] || factor.explanation : factor.explanation
  )));
  const whatToVerify = unique(eligibility?.verificationRequired || []);
  const caution = eligibility?.status === "INSUFFICIENT_VERIFIED_DATA"
    ? (isTelugu ? TELUGU_CAUTION.insufficient : "Eligibility depends on additional official verification.")
    : (isTelugu ? TELUGU_CAUTION.general : "Eligibility and benefits remain subject to the official scheme conditions.");

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

"use strict";

/**
 * financialKnowledge/index.js
 *
 * Entry point for the Financial Knowledge layer.
 * Re-exports the public APIs of the adapter and eligibility service.
 */

const { evaluateScheme, evaluateAllApplicableSchemes, STATUS } =
  require("./eligibility/eligibilityService");

const {
  getSchemesForIntent,
  getRulesForScheme,
  getExclusionConditionsForScheme,
  getVerificationRequirementsForScheme,
  getSchemeMetadata,
  getAllSchemeIds,
  SCHEME_INTENT_MAP,
} = require("./adapter/schemeRuleAdapter");

module.exports = {
  // Eligibility
  evaluateScheme,
  evaluateAllApplicableSchemes,
  STATUS,

  // Adapter
  getSchemesForIntent,
  getRulesForScheme,
  getExclusionConditionsForScheme,
  getVerificationRequirementsForScheme,
  getSchemeMetadata,
  getAllSchemeIds,
  SCHEME_INTENT_MAP,
};

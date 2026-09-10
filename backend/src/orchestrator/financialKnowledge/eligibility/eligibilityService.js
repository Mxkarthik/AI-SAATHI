"use strict";

/**
 * eligibilityService.js
 *
 * Deterministic eligibility engine for AI Saathi.
 *
 * Three-state model:
 *   ELIGIBLE                 — all evaluable required conditions satisfied,
 *                              no known exclusion applies
 *   INELIGIBLE               — a verified required condition explicitly fails
 *                              OR a verified exclusion condition applies
 *   INSUFFICIENT_VERIFIED_DATA — not enough verified information to decide
 *
 * IMPORTANT:
 *   - The engine is deterministic: same input → same output, always.
 *   - No LLM, eval(), or Function() is used.
 *   - Missing information → INSUFFICIENT_VERIFIED_DATA (never INELIGIBLE).
 *   - Every rule evaluation preserves its source reference.
 *   - DecisionContext and profile are treated as read-only.
 *
 * Supported operators: exists | equals | oneOf | notOneOf |
 *                      greaterThanOrEqual | lessThanOrEqual
 */

const {
  getRulesForScheme,
  getExclusionConditionsForScheme,
  getVerificationRequirementsForScheme,
  getSchemeMetadata,
  getSchemesForIntent,
} = require("../adapter/schemeRuleAdapter");

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS = Object.freeze({
  ELIGIBLE:                   "ELIGIBLE",
  INELIGIBLE:                 "INELIGIBLE",
  INSUFFICIENT_VERIFIED_DATA: "INSUFFICIENT_VERIFIED_DATA",
});

// ─── Field access ─────────────────────────────────────────────────────────────

/**
 * Safely read a dot-notation path from the decision context's user object.
 * Reads only actual DecisionContext user fields.
 *
 * @param {object} decisionContext
 * @param {string} fieldPath        — e.g. "farming.landArea", "location.state"
 * @returns {*}                     — the field value, or undefined if absent
 */
function readField(decisionContext, fieldPath) {
  const user = decisionContext?.user;
  if (!user) return undefined;

  const parts = fieldPath.split(".");
  if (parts.length !== 2) return undefined;

  const [section, key] = parts;
  return user[section]?.[key];
}

/**
 * Determine whether a value is "present" (meaningful, non-null, non-empty).
 */
function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

// ─── Operator evaluators ──────────────────────────────────────────────────────

/**
 * Evaluate a single rule against the field value.
 *
 * Returns one of:
 *   "pass"        — condition satisfied
 *   "fail"        — condition not satisfied (explicit disqualifier)
 *   "unknown"     — field absent; cannot evaluate
 *   "error"       — rule itself is malformed / unsupported operator
 */
function evaluateOperator(rule, fieldValue) {
  if (!rule || typeof rule.operator !== "string") return "error";

  switch (rule.operator) {

    case "exists":
      if (!hasValue(fieldValue)) return "unknown";
      return "pass";

    case "equals":
      if (!hasValue(fieldValue)) return "unknown";
      return fieldValue === rule.expectedValue ? "pass" : "fail";

    case "oneOf": {
      if (!hasValue(fieldValue)) return "unknown";
      const allowed = Array.isArray(rule.expectedValue) ? rule.expectedValue : [rule.expectedValue];
      return allowed.includes(fieldValue) ? "pass" : "fail";
    }

    case "notOneOf": {
      if (!hasValue(fieldValue)) return "unknown";
      const excluded = Array.isArray(rule.expectedValue) ? rule.expectedValue : [rule.expectedValue];
      return excluded.includes(fieldValue) ? "fail" : "pass";
    }

    case "greaterThanOrEqual":
      if (!hasValue(fieldValue)) return "unknown";
      if (typeof fieldValue !== "number") return "error";
      return fieldValue >= rule.expectedValue ? "pass" : "fail";

    case "lessThanOrEqual":
      if (!hasValue(fieldValue)) return "unknown";
      if (typeof fieldValue !== "number") return "error";
      return fieldValue <= rule.expectedValue ? "pass" : "fail";

    default:
      return "error";
  }
}

// ─── Single rule evaluation ───────────────────────────────────────────────────

/**
 * Evaluate one rule against the decision context.
 *
 * @param {object} rule            — from schemeRuleAdapter
 * @param {object} decisionContext — read-only
 * @returns {{ ruleId, result, outcome, fieldValue, sourceReference, description }}
 *
 * outcome: "pass" | "ineligible" | "insufficient_data" | "error"
 */
function evaluateRule(rule, decisionContext) {
  if (!rule || typeof rule !== "object" || !rule.id) {
    return {
      ruleId:          "unknown",
      result:          "error",
      outcome:         "error",
      fieldValue:      undefined,
      sourceReference: "",
      description:     "Malformed rule",
    };
  }

  if (!rule.operator) {
    return {
      ruleId:          rule.id,
      result:          "error",
      outcome:         "error",
      fieldValue:      undefined,
      sourceReference: rule.sourceReference || "",
      description:     `Rule "${rule.id}" has no operator`,
    };
  }

  const fieldValue = readField(decisionContext, rule.field);
  const opResult   = evaluateOperator(rule, fieldValue);

  let outcome;
  if (opResult === "error") {
    outcome = "error";
  } else if (opResult === "unknown") {
    // Field is absent — cannot evaluate
    outcome = "insufficient_data";
  } else if (opResult === "pass") {
    outcome = rule.isExclusion ? "ineligible" : "pass";
  } else {
    // opResult === "fail"
    outcome = rule.isExclusion ? "pass"       // exclusion does not apply → good
                               : (rule.required ? "ineligible" : "insufficient_data");
  }

  return {
    ruleId:          rule.id,
    result:          opResult,
    outcome,
    fieldValue,
    sourceReference: rule.sourceReference || "",
    description:     rule.description     || "",
  };
}

// ─── Scheme evaluation ────────────────────────────────────────────────────────

/**
 * Evaluate eligibility for one scheme.
 *
 * @param {object} params
 * @param {string}  params.schemeId       — e.g. "pm_kisan"
 * @param {object}  params.decisionContext — read-only, from decisionContextService
 * @returns {{ schemeId, status, evaluatedRules, failedRules, missingFields,
 *             verificationRequired, sourceReferences }}
 */
function evaluateScheme({ schemeId, decisionContext }) {
  // ── Guard inputs ───────────────────────────────────────────────────────────
  if (!schemeId || typeof schemeId !== "string") {
    return {
      schemeId:             schemeId || "unknown",
      status:               STATUS.INSUFFICIENT_VERIFIED_DATA,
      evaluatedRules:       [],
      failedRules:          [],
      missingFields:        [],
      verificationRequired: [],
      sourceReferences:     [],
      error:                "schemeId must be a non-empty string",
    };
  }

  if (!decisionContext || typeof decisionContext !== "object") {
    return {
      schemeId,
      status:               STATUS.INSUFFICIENT_VERIFIED_DATA,
      evaluatedRules:       [],
      failedRules:          [],
      missingFields:        [],
      verificationRequired: [],
      sourceReferences:     [],
      error:                "decisionContext must be a non-null object",
    };
  }

  // ── Load scheme metadata ───────────────────────────────────────────────────
  const schemeMeta = getSchemeMetadata(schemeId);
  if (!schemeMeta) {
    return {
      schemeId,
      status:               STATUS.INSUFFICIENT_VERIFIED_DATA,
      evaluatedRules:       [],
      failedRules:          [],
      missingFields:        [],
      verificationRequired: [],
      sourceReferences:     [],
      error:                `Unknown scheme ID: "${schemeId}"`,
    };
  }

  // ── Load rules ─────────────────────────────────────────────────────────────
  const rules = getRulesForScheme(schemeId);
  const exclusionConditions = getExclusionConditionsForScheme(schemeId);
  const verificationDefinitions = getVerificationRequirementsForScheme(schemeId);
  if (rules.length === 0 && verificationDefinitions.length === 0) {
    // No rules implemented yet for this scheme → cannot evaluate
    return {
      schemeId,
      status:               STATUS.INSUFFICIENT_VERIFIED_DATA,
      evaluatedRules:       [],
      failedRules:          [],
      missingFields:        [],
      verificationRequired: [`No eligibility rules have been implemented for scheme "${schemeId}"`],
      exclusionConditions,
      sourceReferences:     [schemeMeta.source?.officialPortal || ""].filter(Boolean),
    };
  }

  // ── Evaluate each rule ─────────────────────────────────────────────────────
  const evaluatedRules     = [];
  const failedRules        = [];
  const missingFields      = [];
  const verificationRequired = verificationDefinitions.map((requirement) => requirement.description);
  const sourceReferences   = new Set();

  let hasIneligible       = false;
  // Official verification requirements that cannot be evaluated from the
  // current DecisionContext keep the result safely insufficient.
  let hasInsufficientData = verificationDefinitions.length > 0;

  for (const requirement of verificationDefinitions) {
    if (requirement.sourceReference) sourceReferences.add(requirement.sourceReference);
  }

  for (const rule of rules) {
    const evaluation = evaluateRule(rule, decisionContext);
    evaluatedRules.push(evaluation);

    if (evaluation.sourceReference) {
      sourceReferences.add(evaluation.sourceReference);
    }

    switch (evaluation.outcome) {
      case "ineligible":
        hasIneligible = true;
        failedRules.push(evaluation);
        break;

      case "insufficient_data":
        hasInsufficientData = true;
        if (rule.field) {
          missingFields.push(rule.field);
        } else {
          verificationRequired.push(evaluation.description || rule.id);
        }
        break;

      case "error":
        // Treat rule errors conservatively: cannot verify → insufficient data
        hasInsufficientData = true;
        verificationRequired.push(`Rule error: ${evaluation.description || rule.id}`);
        break;

      case "pass":
      default:
        // Rule satisfied — no action needed
        break;
    }
  }

  // ── Determine final status ─────────────────────────────────────────────────
  let status;
  if (hasIneligible) {
    // At least one hard exclusion / required condition explicitly failed
    status = STATUS.INELIGIBLE;
  } else if (hasInsufficientData) {
    // No explicit failure, but we cannot confirm all conditions
    status = STATUS.INSUFFICIENT_VERIFIED_DATA;
  } else {
    // All evaluable rules passed, no exclusions triggered
    status = STATUS.ELIGIBLE;
  }

  return {
    schemeId,
    status,
    evaluatedRules,
    failedRules,
    missingFields:        [...new Set(missingFields)],
    verificationRequired: [...new Set(verificationRequired)],
    exclusionConditions,
    sourceReferences:     [...sourceReferences],
  };
}

// ─── Multi-scheme evaluation ──────────────────────────────────────────────────

/**
 * Evaluate all schemes relevant to the current intent.
 * Does NOT rank schemes — that is a future responsibility.
 *
 * @param {object} decisionContext — read-only
 * @returns {{ intent, schemeResults, summary }}
 */
function evaluateAllApplicableSchemes(decisionContext) {
  if (!decisionContext || typeof decisionContext !== "object") {
    return {
      intent:        null,
      schemeResults: [],
      summary:       { eligible: [], ineligible: [], insufficientData: [] },
      error:         "decisionContext must be a non-null object",
    };
  }

  const intent        = decisionContext.intent || null;
  const schemeIds     = getSchemesForIntent(intent || "general_financial_guidance");

  const schemeResults = schemeIds.map((schemeId) =>
    evaluateScheme({ schemeId, decisionContext })
  );

  const summary = {
    eligible:        schemeResults.filter((r) => r.status === STATUS.ELIGIBLE).map((r) => r.schemeId),
    ineligible:      schemeResults.filter((r) => r.status === STATUS.INELIGIBLE).map((r) => r.schemeId),
    insufficientData: schemeResults.filter((r) => r.status === STATUS.INSUFFICIENT_VERIFIED_DATA).map((r) => r.schemeId),
  };

  return { intent, schemeResults, summary };
}

module.exports = {
  evaluateScheme,
  evaluateAllApplicableSchemes,
  STATUS,
};

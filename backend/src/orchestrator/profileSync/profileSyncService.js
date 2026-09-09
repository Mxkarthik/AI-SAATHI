"use strict";

// This service is a pure, schema-aware projection. It deliberately maps only
// approved understanding fields to FinancialProfile paths; it never performs
// persistence or determines which facts are required for an intent.

const LAND_UNIT_MAP = {
  acre: "acres",
  acres: "acres",
  hectare: "hectares",
  hectares: "hectares",
  bigha: "bigha",
};

const OWNERSHIP_VALUES = new Set(["owned", "leased", "shared"]);

function meaningful(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function stringValue(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function nonNegativeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function readEntity(entities, name) {
  return entities[name] ?? entities.location?.[name] ?? null;
}

function normaliseLandUnit(value) {
  const text = stringValue(value);
  return text ? LAND_UNIT_MAP[text.toLowerCase()] || null : null;
}

function normaliseOwnership(value) {
  const text = stringValue(value);
  return text && OWNERSHIP_VALUES.has(text.toLowerCase()) ? text.toLowerCase() : null;
}

function valuesFrom(entityValue) {
  const values = Array.isArray(entityValue) ? entityValue : [entityValue];
  return values.map(stringValue).filter(Boolean);
}

function appendUnique(existing, additions) {
  const result = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(
    result
      .filter(meaningful)
      .map((value) => String(value).trim().toLowerCase())
  );

  for (const value of additions) {
    const key = value.toLowerCase();
    if (!seen.has(key)) {
      result.push(value);
      seen.add(key);
    }
  }
  return result;
}

function structuredLoans(value) {
  if (!Array.isArray(value)) return [];

  return value.filter((loan) => {
    return loan && typeof loan === "object" &&
      stringValue(loan.lender) !== null &&
      nonNegativeNumber(loan.amount) !== null;
  }).map((loan) => ({ lender: loan.lender.trim(), amount: loan.amount }));
}

function appendUniqueLoans(existing, additions) {
  const result = Array.isArray(existing) ? existing.slice() : [];
  const seen = new Set(result.map((loan) => `${loan?.lender || ""}`.trim().toLowerCase() + `:${loan?.amount}`));
  for (const loan of additions) {
    const key = `${loan.lender}`.toLowerCase() + `:${loan.amount}`;
    if (!seen.has(key)) {
      result.push(loan);
      seen.add(key);
    }
  }
  return result;
}

/**
 * Compute the minimal FinancialProfile update for current understanding.
 * `userId` is accepted to keep the service API aligned with orchestration,
 * but persistence remains the profile service's responsibility.
 */
function deriveProfileSync({ userId, understanding, profile = null } = {}) {
  void userId;
  const entities = understanding?.entities;
  if (!entities || typeof entities !== "object") {
    return { updated: false, changes: {} };
  }

  const changes = {};
  const assignString = (entityName, path, existingValue) => {
    const value = stringValue(readEntity(entities, entityName));
    if (value !== null && value !== existingValue) changes[path] = value;
  };

  assignString("state", "location.state", profile?.location?.state);
  assignString("district", "location.district", profile?.location?.district);
  assignString("mandal", "location.mandal", profile?.location?.mandal);

  const landArea = nonNegativeNumber(entities.landArea);
  if (landArea !== null && landArea !== profile?.farming?.landArea) {
    changes["farming.landArea"] = landArea;
  }

  const landUnit = normaliseLandUnit(entities.landUnit);
  if (landUnit !== null && landUnit !== profile?.farming?.landUnit) {
    changes["farming.landUnit"] = landUnit;
  }

  const ownership = normaliseOwnership(entities.ownership);
  if (ownership !== null && ownership !== profile?.farming?.ownership) {
    changes["farming.ownership"] = ownership;
  }

  const cropValues = valuesFrom(entities.crop ?? entities.crops);
  const crops = appendUnique(profile?.crops, cropValues);
  if (cropValues.length > 0 && JSON.stringify(crops) !== JSON.stringify(profile?.crops || [])) {
    changes.crops = crops;
  }

  assignString("irrigation", "irrigation.typeOrSource", profile?.irrigation?.typeOrSource);

  // Generic `income` is intentionally not synced: current understanding does
  // not identify whether it is farm or other income. Explicit source-labelled
  // entities can be safely persisted if introduced by a provider later.
  for (const [entityName, path, existing] of [
    ["farmIncome", "financial.farmIncome", profile?.financial?.farmIncome],
    ["otherIncome", "financial.otherIncome", profile?.financial?.otherIncome],
    ["monthlyExpenses", "financial.monthlyExpenses", profile?.financial?.monthlyExpenses],
  ]) {
    const value = nonNegativeNumber(entities[entityName]);
    if (value !== null && value !== existing) changes[path] = value;
  }

  const equipmentValues = valuesFrom(entities.equipment);
  const equipment = appendUnique(profile?.assets?.equipment, equipmentValues);
  if (equipmentValues.length > 0 && JSON.stringify(equipment) !== JSON.stringify(profile?.assets?.equipment || [])) {
    changes["assets.equipment"] = equipment;
  }

  const livestockValues = valuesFrom(entities.livestock);
  const livestock = appendUnique(profile?.assets?.livestock, livestockValues);
  if (livestockValues.length > 0 && JSON.stringify(livestock) !== JSON.stringify(profile?.assets?.livestock || [])) {
    changes["assets.livestock"] = livestock;
  }

  const loans = structuredLoans(entities.existingLoans);
  const existingLoans = appendUniqueLoans(profile?.financial?.existingLoans, loans);
  if (loans.length > 0 && JSON.stringify(existingLoans) !== JSON.stringify(profile?.financial?.existingLoans || [])) {
    changes["financial.existingLoans"] = existingLoans;
  }

  return { updated: Object.keys(changes).length > 0, changes };
}

module.exports = { deriveProfileSync };

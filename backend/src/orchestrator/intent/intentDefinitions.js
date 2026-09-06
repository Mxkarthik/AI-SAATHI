/**
 * intentDefinitions.js
 *
 * Defines every intent AI Saathi can recognise, along with the fields
 * required to reach a decision for that intent.
 *
 * Structure per intent:
 *   name          — machine key (matches the intent string used throughout)
 *   description   — human-readable summary (for logging / future UI)
 *   requiredFields— ordered list of fields needed before a recommendation
 *                   can be made. Fields are listed in priority order:
 *                   the first unknown field will be asked first.
 *   keywords      — simple string patterns used by the deterministic detector
 *
 * Field names are dot-notation paths that map to the FinancialProfile
 * schema OR to conversation-extracted entities:
 *   profile.location.state   → from FinancialProfile
 *   profile.farming.landArea → from FinancialProfile
 *   entity.crop              → extracted from messages (not in profile yet)
 *   entity.season            → extracted from messages
 *   entity.amount            → extracted from messages
 *   entity.income            → extracted from messages / profile.financial.farmIncome
 *   entity.existingDebt      → extracted from messages / profile.financial.existingLoans
 */

const INTENTS = {
  crop_financing: {
    name: "crop_financing",
    description: "Financing for seasonal crop cultivation (seeds, fertiliser, labour)",
    requiredFields: [
      "profile.location.state",
      "entity.crop",
      "profile.farming.landArea",
      "profile.farming.ownership",
      "entity.season",
      "entity.amount",
      "entity.income",
      "entity.existingDebt",
    ],
    keywords: [
      "crop", "crops", "farming", "farm", "cultivation", "paddy", "rice",
      "wheat", "cotton", "maize", "sugarcane", "groundnut", "kharif",
      "rabi", "season", "seeds", "fertiliser", "fertilizer", "harvest",
      "agriculture", "agricultural", "money for farming", "loan for crop",
    ],
  },

  equipment_financing: {
    name: "equipment_financing",
    description: "Financing for farm equipment (tractor, pump, machinery)",
    requiredFields: [
      "profile.location.state",
      "profile.farming.landArea",
      "entity.equipmentType",
      "entity.amount",
      "entity.income",
      "entity.existingDebt",
    ],
    keywords: [
      "tractor", "pump", "machine", "machinery", "equipment", "implement",
      "thresher", "sprayer", "harvester", "motor", "irrigation pump",
      "buy tractor", "buy machine",
    ],
  },

  livestock_financing: {
    name: "livestock_financing",
    description: "Financing for purchase or maintenance of livestock",
    requiredFields: [
      "profile.location.state",
      "entity.livestockType",
      "entity.quantity",
      "entity.amount",
      "entity.income",
      "entity.existingDebt",
    ],
    keywords: [
      "cow", "buffalo", "goat", "sheep", "poultry", "hen", "chicken",
      "cattle", "dairy", "animal husbandry", "livestock", "milch",
      "buy cow", "buy buffalo",
    ],
  },

  insurance: {
    name: "insurance",
    description: "Crop or livestock insurance guidance",
    requiredFields: [
      "profile.location.state",
      "entity.crop",
      "profile.farming.landArea",
      "entity.season",
    ],
    keywords: [
      "insurance", "insure", "crop insurance", "pmfby", "pradhan mantri fasal",
      "fasal bima", "bima", "protect crop", "claim",
    ],
  },

  savings: {
    name: "savings",
    description: "Savings scheme guidance for rural households",
    requiredFields: [
      "entity.income",
      "entity.monthlyExpenses",
    ],
    keywords: [
      "save", "savings", "save money", "recurring deposit", "rd", "fixed deposit",
      "fd", "post office", "jan dhan", "savings scheme",
    ],
  },

  investment: {
    name: "investment",
    description: "Basic investment guidance for rural households",
    requiredFields: [
      "entity.income",
      "entity.existingDebt",
      "entity.amount",
    ],
    keywords: [
      "invest", "investment", "mutual fund", "sip", "shares", "stock",
      "gold", "returns", "grow money", "double money",
    ],
  },

  general_financial_guidance: {
    name: "general_financial_guidance",
    description: "General financial advice with no specific product intent",
    requiredFields: [
      "entity.income",
    ],
    keywords: [
      "help", "advice", "guide", "guidance", "money", "financial", "finance",
      "need money", "money problem", "debt", "loan", "credit",
    ],
  },
};

/**
 * Returns the definition for a given intent name, or null if not found.
 * @param {string} intentName
 * @returns {object|null}
 */
function getIntentDefinition(intentName) {
  return INTENTS[intentName] || null;
}

/**
 * Returns all intent definitions as an array.
 * @returns {object[]}
 */
function getAllIntents() {
  return Object.values(INTENTS);
}

module.exports = { INTENTS, getIntentDefinition, getAllIntents };

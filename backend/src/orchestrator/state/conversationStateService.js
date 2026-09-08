const intentDefinitions = {
  crop_financing: {
    name: "Crop Financing",

    requiredFields: [
      "location",
      "crop",
      "landArea",
      "ownership",
      "season",
      "amount",
      "income",
      "existingDebt"
    ]
  },

  equipment_financing: {
    name: "Equipment Financing",

    requiredFields: [
      "location",
      "equipment",
      "landArea",
      "income",
      "amount",
      "existingDebt"
    ]
  },

  livestock_financing: {
    name: "Livestock Financing",

    requiredFields: [
      "location",
      "livestock",
      "income",
      "amount",
      "existingDebt"
    ]
  },

  insurance: {
    name: "Insurance",

    requiredFields: [
      "location",
      "insuranceType",
      "asset"
    ]
  },

  savings: {
    name: "Savings",

    requiredFields: [
      "location",
      "income",
      "monthlyExpenses",
      "savingsGoal"
    ]
  },

  investment: {
    name: "Investment",

    requiredFields: [
      "location",
      "income",
      "investmentAmount",
      "investmentPeriod",
      "riskPreference"
    ]
  },

  general_financial_guidance: {
    name: "General Financial Guidance",

    requiredFields: []
  }
};

module.exports = intentDefinitions;
const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    lender: { type: String, maxlength: 100 },
    amount: { type: Number, min: 0, max: 999999999 },
  },
  { _id: false }
);

const financialProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    location: {
      state:    { type: String, maxlength: 100 },
      district: { type: String, maxlength: 100 },
      mandal:   { type: String, maxlength: 100 },
    },

    farming: {
      landArea:  { type: Number, min: 0, max: 999999 },
      landUnit:  { type: String, enum: ["acres", "hectares", "bigha"] },
      ownership: { type: String, enum: ["owned", "leased", "shared"] },
    },

    crops: {
      type: [{ type: String, maxlength: 100 }],
      validate: {
        validator: (arr) => arr.length <= 50,
        message: "crops array cannot exceed 50 entries",
      },
    },

    irrigation: {
      typeOrSource: { type: String, maxlength: 200 },
    },

    financial: {
      farmIncome:      { type: Number, min: 0, max: 999999999 },
      otherIncome:     { type: Number, min: 0, max: 999999999 },
      monthlyExpenses: { type: Number, min: 0, max: 999999999 },
      existingLoans: {
        type: [loanSchema],
        validate: {
          validator: (arr) => arr.length <= 20,
          message: "existingLoans array cannot exceed 20 entries",
        },
      },
    },

    assets: {
      equipment: {
        type: [{ type: String, maxlength: 100 }],
        validate: {
          validator: (arr) => arr.length <= 50,
          message: "equipment array cannot exceed 50 entries",
        },
      },
      livestock: {
        type: [{ type: String, maxlength: 100 }],
        validate: {
          validator: (arr) => arr.length <= 50,
          message: "livestock array cannot exceed 50 entries",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

const FinancialProfile = mongoose.model(
  "FinancialProfile",
  financialProfileSchema
);

module.exports = FinancialProfile;

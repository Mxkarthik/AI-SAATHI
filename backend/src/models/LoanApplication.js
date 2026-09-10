"use strict";

const mongoose = require("mongoose");

const VALID_STATUSES = ["calculated", "sent_to_bank", "approved", "rejected"];

const loanApplicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schemeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanScheme",
      required: true,
    },

    // Denormalised snapshot so history is readable even if the scheme changes.
    bankName:            { type: String, required: true },
    bankCode:            { type: String, required: true },
    schemeName:          { type: String, required: true },
    schemeCode:          { type: String, required: true },
    category:            { type: String, required: true },

    // What the user asked for.
    requestedAmount:  { type: Number, required: true },
    tenureMonths:     { type: Number, required: true },
    interestRatePercent: { type: Number, required: true },

    // Computed result.
    emi:                { type: Number, required: true },
    eligible:           { type: Boolean, required: true },
    maxEligibleAmount:  { type: Number, required: true },

    // Income snapshot used for this calculation.
    monthlyIncomeUsed:    { type: Number, required: true },
    monthlyExpensesUsed:  { type: Number, required: true },
    disposableIncomeUsed: { type: Number, required: true },

    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "calculated",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoanApplication", loanApplicationSchema);

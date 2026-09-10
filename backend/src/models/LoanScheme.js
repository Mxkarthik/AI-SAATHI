"use strict";

const mongoose = require("mongoose");

const loanSchemeSchema = new mongoose.Schema(
  {
    bankName:             { type: String, required: true },          // "Andhra Bank"
    bankCode:             { type: String, required: true },          // "ANDB"
    schemeName:           { type: String, required: true },
    schemeCode:           { type: String, required: true, unique: true },
    category:             { type: String, required: true },          // "Crop Loan" | "Equipment Loan" | etc.
    interestRatePercent:  { type: Number, required: true },          // annual %
    minAmount:            { type: Number, required: true },
    maxAmount:            { type: Number, required: true },
    minTenureMonths:      { type: Number, required: true },
    maxTenureMonths:      { type: Number, required: true },
    processingFeePercent: { type: Number, required: true, default: 0 },
    affordabilityRatio:   { type: Number, required: true },          // 0–1
    description:          { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LoanScheme", loanSchemeSchema);

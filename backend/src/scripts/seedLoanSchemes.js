/**
 * seedLoanSchemes.js
 *
 * One-time idempotent seed for the LoanScheme collection.
 * Run from the backend/ directory:
 *   node src/scripts/seedLoanSchemes.js
 *
 * Safe to re-run — uses findOneAndUpdate with upsert:true keyed on schemeCode.
 */

"use strict";

require("dotenv").config();

// Use Google DNS — same fix as server.js — so Atlas SRV lookup resolves on Windows.
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const connectDatabase = require("../config/database");
const LoanScheme = require("../models/LoanScheme");

const SCHEMES = [
  // ─── ANDHRA BANK ──────────────────────────────────────────────────────────
  {
    bankName: "Andhra Bank",
    bankCode: "ANDB",
    schemeName: "Kisan Credit Card (KCC)",
    schemeCode: "ANDB-KCC",
    category: "Crop Loan",
    interestRatePercent: 7.0,
    minAmount: 10000,
    maxAmount: 300000,
    minTenureMonths: 6,
    maxTenureMonths: 12,
    processingFeePercent: 0,
    affordabilityRatio: 0.6,
    description:
      "Short-term revolving credit for crop cultivation and farm inputs.",
  },
  {
    bankName: "Andhra Bank",
    bankCode: "ANDB",
    schemeName: "Agriculture Tractor / Farm Equipment Loan",
    schemeCode: "ANDB-TRACTOR",
    category: "Equipment Loan",
    interestRatePercent: 9.5,
    minAmount: 200000,
    maxAmount: 1500000,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    processingFeePercent: 1.0,
    affordabilityRatio: 0.4,
    description:
      "Purchase of tractors, harvesters, and other farm machinery.",
  },
  {
    bankName: "Andhra Bank",
    bankCode: "ANDB",
    schemeName: "Land Purchase / Development Loan",
    schemeCode: "ANDB-LAND",
    category: "Land Loan",
    interestRatePercent: 10.5,
    minAmount: 500000,
    maxAmount: 5000000,
    minTenureMonths: 24,
    maxTenureMonths: 180,
    processingFeePercent: 1.0,
    affordabilityRatio: 0.4,
    description:
      "Purchase of agricultural land or land development/improvement.",
  },

  // ─── BANK OF BARODA ───────────────────────────────────────────────────────
  {
    bankName: "Bank of Baroda",
    bankCode: "BOB",
    schemeName: "Baroda Kisan Credit Card",
    schemeCode: "BOB-KCC",
    category: "Crop Loan",
    interestRatePercent: 7.0,
    minAmount: 10000,
    maxAmount: 300000,
    minTenureMonths: 6,
    maxTenureMonths: 12,
    processingFeePercent: 0,
    affordabilityRatio: 0.6,
    description: "Revolving credit line for seasonal agricultural needs.",
  },
  {
    bankName: "Bank of Baroda",
    bankCode: "BOB",
    schemeName: "Baroda Agri Gold Loan",
    schemeCode: "BOB-GOLD",
    category: "Gold Loan",
    interestRatePercent: 8.5,
    minAmount: 20000,
    maxAmount: 2500000,
    minTenureMonths: 6,
    maxTenureMonths: 36,
    processingFeePercent: 0.5,
    affordabilityRatio: 0.5,
    description:
      "Quick-disbursal loan against gold jewellery for farming needs.",
  },
  {
    bankName: "Bank of Baroda",
    bankCode: "BOB",
    schemeName: "Baroda Tractor / Farm Equipment Loan",
    schemeCode: "BOB-TRACTOR",
    category: "Equipment Loan",
    interestRatePercent: 9.75,
    minAmount: 200000,
    maxAmount: 1200000,
    minTenureMonths: 12,
    maxTenureMonths: 72,
    processingFeePercent: 1.0,
    affordabilityRatio: 0.4,
    description: "Purchase of tractors and farm machinery.",
  },

  // ─── PUNJAB NATIONAL BANK ─────────────────────────────────────────────────
  {
    bankName: "Punjab National Bank",
    bankCode: "PNB",
    schemeName: "PNB Kisan Credit Card",
    schemeCode: "PNB-KCC",
    category: "Crop Loan",
    interestRatePercent: 7.0,
    minAmount: 10000,
    maxAmount: 300000,
    minTenureMonths: 6,
    maxTenureMonths: 12,
    processingFeePercent: 0,
    affordabilityRatio: 0.6,
    description: "Short-term crop and input financing.",
  },
  {
    bankName: "Punjab National Bank",
    bankCode: "PNB",
    schemeName: "PNB Farm Mechanization Loan",
    schemeCode: "PNB-MECH",
    category: "Equipment Loan",
    interestRatePercent: 9.25,
    minAmount: 150000,
    maxAmount: 1500000,
    minTenureMonths: 12,
    maxTenureMonths: 84,
    processingFeePercent: 1.0,
    affordabilityRatio: 0.4,
    description: "Tractors, power tillers, and irrigation equipment.",
  },
  {
    bankName: "Punjab National Bank",
    bankCode: "PNB",
    schemeName: "PNB Rural Housing / Land Improvement Loan",
    schemeCode: "PNB-HOUSING",
    category: "Land Loan",
    interestRatePercent: 10.0,
    minAmount: 300000,
    maxAmount: 3000000,
    minTenureMonths: 24,
    maxTenureMonths: 180,
    processingFeePercent: 1.0,
    affordabilityRatio: 0.4,
    description:
      "Construction, renovation, or land improvement in rural areas.",
  },
];

async function seed() {
  await connectDatabase();

  let inserted = 0;
  let updated = 0;

  for (const scheme of SCHEMES) {
    const existing = await LoanScheme.findOne({ schemeCode: scheme.schemeCode });
    await LoanScheme.findOneAndUpdate(
      { schemeCode: scheme.schemeCode },
      scheme,
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    if (existing) {
      updated++;
    } else {
      inserted++;
    }
  }

  console.log(`Seed complete: ${inserted} inserted, ${updated} updated.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

"use strict";

/**
 * loanService.js
 *
 * All loan-related business logic:
 *   - income / expense computation (delegates to existing transactionService)
 *   - EMI calculation (standard reducing-balance formula)
 *   - eligibility determination
 *
 * NEVER duplicates the MongoDB aggregation logic that already lives in
 * transactionService — it calls those functions directly.
 */

const mongoose = require("mongoose");
const transactionService = require("./transactionService");
const FinancialProfile = require("../models/FinancialProfile");
const LoanScheme = require("../models/LoanScheme");
const LoanApplication = require("../models/LoanApplication");

// ─── EMI formula (standard reducing balance) ─────────────────────────────────
// P  = principal
// r  = monthly interest rate  (annualRate / 12 / 100)
// n  = tenure in months
function calcEMI(principal, annualRatePercent, tenureMonths) {
  if (annualRatePercent === 0) return principal / tenureMonths;
  const r = annualRatePercent / 12 / 100;
  const n = tenureMonths;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

// ─── Inverse: largest principal whose EMI ≤ maxEMI ───────────────────────────
function calcMaxPrincipal(maxEMI, annualRatePercent, tenureMonths) {
  if (annualRatePercent === 0) return maxEMI * tenureMonths;
  const r = annualRatePercent / 12 / 100;
  const n = tenureMonths;
  const factor = Math.pow(1 + r, n);
  return (maxEMI * (factor - 1)) / (r * factor);
}

// ─── Derive average monthly income / expenses from transaction history ────────
async function getUserFinancials(userId) {
  const monthlySummary = await transactionService.getMonthlySummary(userId);
  const monthsWithData = monthlySummary.length;

  if (monthsWithData === 0) {
    return { hasData: false };
  }

  const totalEarnings = monthlySummary.reduce((s, m) => s + m.earnings, 0);
  const totalExpenses = monthlySummary.reduce((s, m) => s + m.expenses, 0);

  const avgMonthlyIncome   = totalEarnings / monthsWithData;
  const avgMonthlyExpenses = totalExpenses / monthsWithData;
  let   disposableIncome   = avgMonthlyIncome - avgMonthlyExpenses;

  // Optional: subtract existing loan obligations from FinancialProfile if present.
  try {
    const profile = await FinancialProfile.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (profile?.financial?.existingLoans?.length) {
      // Treat the stored amount as a rough monthly obligation proxy
      // (sum of all outstanding balances / 12 as a conservative annual slice).
      // This is a gentle offset — not a precise EMI recalculation.
      const totalExistingLoanBalance = profile.financial.existingLoans.reduce(
        (s, l) => s + (l.amount || 0),
        0
      );
      const existingObligation = totalExistingLoanBalance / 12;
      disposableIncome = Math.max(0, disposableIncome - existingObligation);
    }
  } catch {
    // FinancialProfile is optional — never block on its absence or any error.
  }

  return {
    hasData: true,
    avgMonthlyIncome,
    avgMonthlyExpenses,
    disposableIncome,
    monthsWithData,
  };
}

// ─── Core eligibility check ───────────────────────────────────────────────────
async function checkEligibility(userId, schemeId, requestedAmount, tenureMonths) {
  // 1. Load scheme
  const scheme = await LoanScheme.findById(schemeId).lean();
  if (!scheme) throw Object.assign(new Error("Scheme not found."), { status: 404 });

  // 2. Validate inputs against scheme bounds
  if (requestedAmount < scheme.minAmount || requestedAmount > scheme.maxAmount) {
    throw Object.assign(
      new Error(
        `Amount must be between ₹${scheme.minAmount.toLocaleString("en-IN")} and ₹${scheme.maxAmount.toLocaleString("en-IN")} for this scheme.`
      ),
      { status: 400 }
    );
  }
  if (tenureMonths < scheme.minTenureMonths || tenureMonths > scheme.maxTenureMonths) {
    throw Object.assign(
      new Error(
        `Tenure must be between ${scheme.minTenureMonths} and ${scheme.maxTenureMonths} months for this scheme.`
      ),
      { status: 400 }
    );
  }

  // 3. Get user financials
  const fin = await getUserFinancials(userId);
  if (!fin.hasData) {
    throw Object.assign(
      new Error(
        "We need some Budget Assistant history first. Please record your income and expenses in Budget Assistant, then come back here."
      ),
      { status: 422, noData: true }
    );
  }

  const { avgMonthlyIncome, avgMonthlyExpenses, disposableIncome } = fin;

  // 4. Check if any amount is affordable at all
  if (disposableIncome <= 0) {
    const result = {
      eligible: false,
      emi: calcEMI(requestedAmount, scheme.interestRatePercent, tenureMonths),
      maxEligibleAmount: 0,
      monthlyIncomeUsed: avgMonthlyIncome,
      monthlyExpensesUsed: avgMonthlyExpenses,
      disposableIncomeUsed: disposableIncome,
      affordabilityRatio: scheme.affordabilityRatio,
      bankName: scheme.bankName,
      bankCode: scheme.bankCode,
      schemeName: scheme.schemeName,
      schemeCode: scheme.schemeCode,
      category: scheme.category,
      interestRatePercent: scheme.interestRatePercent,
      tenureMonths,
      requestedAmount,
      message:
        "Your recorded expenses currently exceed your income, so no EMI is affordable right now.",
    };
    return result;
  }

  // 5. Compute EMI and affordability
  const maxAffordableEMI = disposableIncome * scheme.affordabilityRatio;
  const emi = calcEMI(requestedAmount, scheme.interestRatePercent, tenureMonths);
  const eligible = emi <= maxAffordableEMI;

  // 6. Max eligible amount (clamped to scheme max, floored at 0)
  let maxEligibleAmount = calcMaxPrincipal(
    maxAffordableEMI,
    scheme.interestRatePercent,
    tenureMonths
  );
  maxEligibleAmount = Math.max(0, Math.min(maxEligibleAmount, scheme.maxAmount));
  maxEligibleAmount = Math.round(maxEligibleAmount);

  return {
    eligible,
    emi: Math.round(emi),
    maxEligibleAmount,
    monthlyIncomeUsed: Math.round(avgMonthlyIncome),
    monthlyExpensesUsed: Math.round(avgMonthlyExpenses),
    disposableIncomeUsed: Math.round(disposableIncome),
    affordabilityRatio: scheme.affordabilityRatio,
    bankName: scheme.bankName,
    bankCode: scheme.bankCode,
    schemeName: scheme.schemeName,
    schemeCode: scheme.schemeCode,
    category: scheme.category,
    interestRatePercent: scheme.interestRatePercent,
    tenureMonths,
    requestedAmount,
  };
}

// ─── Save eligibility result as a LoanApplication ────────────────────────────
async function applyForLoan(userId, schemeId, requestedAmount, tenureMonths) {
  const result = await checkEligibility(userId, schemeId, requestedAmount, tenureMonths);

  const application = await LoanApplication.create({
    userId: new mongoose.Types.ObjectId(userId),
    schemeId,
    bankName:            result.bankName,
    bankCode:            result.bankCode,
    schemeName:          result.schemeName,
    schemeCode:          result.schemeCode,
    category:            result.category,
    requestedAmount:     result.requestedAmount,
    tenureMonths:        result.tenureMonths,
    interestRatePercent: result.interestRatePercent,
    emi:                 result.emi,
    eligible:            result.eligible,
    maxEligibleAmount:   result.maxEligibleAmount,
    monthlyIncomeUsed:   result.monthlyIncomeUsed,
    monthlyExpensesUsed: result.monthlyExpensesUsed,
    disposableIncomeUsed: result.disposableIncomeUsed,
    status: "calculated",
  });

  return { result, application };
}

// ─── Fetch all applications for a user ───────────────────────────────────────
async function getApplications(userId) {
  return LoanApplication.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .lean();
}

// ─── Update application status (ownership-checked) ───────────────────────────
async function updateApplicationStatus(userId, applicationId, status) {
  const VALID = ["sent_to_bank", "approved", "rejected", "calculated"];
  if (!VALID.includes(status)) {
    throw Object.assign(new Error(`Invalid status: ${status}`), { status: 400 });
  }

  const doc = await LoanApplication.findOneAndUpdate(
    { _id: applicationId, userId: new mongoose.Types.ObjectId(userId) },
    { $set: { status } },
    { new: true }
  );

  if (!doc) {
    throw Object.assign(new Error("Application not found."), { status: 404 });
  }
  return doc;
}

// ─── Get all schemes grouped by bank ─────────────────────────────────────────
async function getBanksWithSchemes() {
  const schemes = await LoanScheme.find().lean().sort({ bankCode: 1, schemeCode: 1 });

  const bankMap = new Map();
  for (const s of schemes) {
    if (!bankMap.has(s.bankCode)) {
      bankMap.set(s.bankCode, { bankName: s.bankName, bankCode: s.bankCode, schemes: [] });
    }
    bankMap.get(s.bankCode).schemes.push(s);
  }

  return Array.from(bankMap.values());
}

module.exports = {
  checkEligibility,
  applyForLoan,
  getApplications,
  updateApplicationStatus,
  getBanksWithSchemes,
  calcEMI,
};

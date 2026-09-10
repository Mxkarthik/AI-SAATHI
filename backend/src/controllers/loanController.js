"use strict";

const loanService = require("../services/loanService");

// ─── GET /api/loans/banks ─────────────────────────────────────────────────────
async function getBanks(req, res) {
  try {
    const banks = await loanService.getBanksWithSchemes();
    return res.json({ success: true, banks });
  } catch (err) {
    console.error("getBanks error:", err);
    return res.status(500).json({ success: false, message: "Failed to load banks." });
  }
}

// ─── POST /api/loans/eligibility ─────────────────────────────────────────────
// Live "what-if" check — does NOT persist anything.
async function checkEligibility(req, res) {
  const { schemeId, requestedAmount, tenureMonths } = req.body;

  if (!schemeId || requestedAmount == null || tenureMonths == null) {
    return res.status(400).json({
      success: false,
      message: "schemeId, requestedAmount, and tenureMonths are required.",
    });
  }

  try {
    const result = await loanService.checkEligibility(
      req.userId,
      schemeId,
      Number(requestedAmount),
      Number(tenureMonths)
    );
    return res.json({ success: true, result });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Eligibility check failed.",
      noData: err.noData || false,
    });
  }
}

// ─── POST /api/loans/apply ────────────────────────────────────────────────────
// Same as eligibility but SAVES a LoanApplication record.
async function applyForLoan(req, res) {
  const { schemeId, requestedAmount, tenureMonths } = req.body;

  if (!schemeId || requestedAmount == null || tenureMonths == null) {
    return res.status(400).json({
      success: false,
      message: "schemeId, requestedAmount, and tenureMonths are required.",
    });
  }

  try {
    const { result, application } = await loanService.applyForLoan(
      req.userId,
      schemeId,
      Number(requestedAmount),
      Number(tenureMonths)
    );
    return res.status(201).json({ success: true, result, application });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      message: err.message || "Application failed.",
      noData: err.noData || false,
    });
  }
}

// ─── GET /api/loans/applications ─────────────────────────────────────────────
async function getApplications(req, res) {
  try {
    const applications = await loanService.getApplications(req.userId);
    return res.json({ success: true, applications });
  } catch (err) {
    console.error("getApplications error:", err);
    return res.status(500).json({ success: false, message: "Failed to load applications." });
  }
}

// ─── PATCH /api/loans/applications/:id/status ────────────────────────────────
async function updateApplicationStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: "status is required." });
  }

  try {
    const application = await loanService.updateApplicationStatus(req.userId, id, status);
    return res.json({ success: true, application });
  } catch (err) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: err.message || "Failed to update status.",
    });
  }
}

module.exports = {
  getBanks,
  checkEligibility,
  applyForLoan,
  getApplications,
  updateApplicationStatus,
};

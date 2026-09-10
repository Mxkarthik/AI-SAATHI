"use strict";

const express = require("express");
const loanController = require("../controllers/loanController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// Static routes must come before /:id-style routes.
router.get("/banks",        authMiddleware, loanController.getBanks);
router.get("/applications", authMiddleware, loanController.getApplications);

router.post("/eligibility", authMiddleware, loanController.checkEligibility);
router.post("/apply",       authMiddleware, loanController.applyForLoan);

router.patch("/applications/:id/status", authMiddleware, loanController.updateApplicationStatus);

module.exports = router;

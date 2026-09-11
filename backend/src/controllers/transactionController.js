const mongoose = require("mongoose");
const transactionService = require("../services/transactionService");
const { parseTransactionText } = require("../services/transactionParser");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * POST /api/transactions/voice
 * Body: { text: string }
 * Parses a spoken/typed sentence and, if it's unambiguous, saves it.
 * If the sentence is incomplete or ambiguous, returns a clarification
 * message instead of guessing.
 */
const createFromVoice = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { text } = req.body || {};
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ success: false, message: "Empty speech transcript." });
    }

    const parsed = parseTransactionText(text);
    if (!parsed.success) {
      // Ambiguous/incomplete — ask for clarification, do not save.
      return res.status(400).json({ success: false, message: parsed.message });
    }

    const transaction = await transactionService.createTransaction(req.userId, parsed.data);

    return res.status(201).json({
      success: true,
      message: "Transaction saved successfully",
      transaction,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Create from voice error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/transactions/preview
 * Parses a transcript without persisting a transaction.
 */
const previewFromVoice = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ success: false, message: "Empty speech transcript." });
  }

  const parsed = parseTransactionText(text);
  if (!parsed.success) {
    return res.status(200).json({ success: false, needsClarification: true, message: parsed.message });
  }

  return res.status(200).json({ success: true, needsClarification: false, parsed: parsed.data });
};

/**
 * POST /api/transactions
 * Body: { type, amount, category?, description?, sourceText?, date? }
 * Direct structured create (manual entry / editing tools).
 */
const createTransaction = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { type, amount, category, description, sourceText, date } = req.body || {};

    if (!type || !transactionService.VALID_TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: "A valid type (expense, earning, saving) is required" });
    }

    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Amount is required and must be greater than 0" });
    }

    const transaction = await transactionService.createTransaction(req.userId, {
      type,
      amount: numericAmount,
      category,
      description,
      sourceText,
      date,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction saved successfully",
      transaction,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Create transaction error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions?type=&category=&startDate=&endDate=
 */
const getTransactions = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { type, category, startDate, endDate } = req.query;
    const transactions = await transactionService.getTransactions(req.userId, {
      type,
      category,
      startDate,
      endDate,
    });

    return res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/summary
 */
const getSummary = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const summary = await transactionService.getSummary(req.userId);
    return res.status(200).json({ success: true, ...summary });
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/expense-breakdown
 */
const getExpenseBreakdown = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const breakdown = await transactionService.getExpenseBreakdown(req.userId);
    return res.status(200).json({ success: true, breakdown });
  } catch (error) {
    console.error("Get expense breakdown error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/monthly-summary
 */
const getMonthlySummary = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const monthly = await transactionService.getMonthlySummary(req.userId);
    return res.status(200).json({ success: true, monthly });
  } catch (error) {
    console.error("Get monthly summary error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/:id
 */
const getTransactionById = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID" });
    }

    const transaction = await transactionService.getTransactionById(req.userId, req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({ success: true, transaction });
  } catch (error) {
    console.error("Get transaction by id error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/transactions/:id
 */
const updateTransaction = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID" });
    }

    if (req.body.type && !transactionService.VALID_TYPES.includes(req.body.type)) {
      return res.status(400).json({ success: false, message: "A valid type (expense, earning, saving) is required" });
    }
    if (req.body.amount !== undefined) {
      const numericAmount = Number(req.body.amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
      }
      req.body.amount = numericAmount;
    }

    const transaction = await transactionService.updateTransaction(req.userId, req.params.id, req.body);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({ success: true, message: "Transaction updated successfully", transaction });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Update transaction error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/top-expenses?limit=5
 */
const getTopExpenses = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
    const topExpenses = await transactionService.getTopExpenses(req.userId, limit);
    return res.status(200).json({ success: true, topExpenses });
  } catch (error) {
    console.error("Get top expenses error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/category-trend
 */
const getCategoryTrend = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const trend = await transactionService.getCategoryTrend(req.userId);
    return res.status(200).json({ success: true, trend });
  } catch (error) {
    console.error("Get category trend error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/transactions/spending-by-day
 */
const getSpendingByDayOfWeek = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const byDay = await transactionService.getSpendingByDayOfWeek(req.userId);
    return res.status(200).json({ success: true, byDay });
  } catch (error) {
    console.error("Get spending by day error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/transactions/:id
 */
const deleteTransaction = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid transaction ID" });
    }

    const transaction = await transactionService.deleteTransaction(req.userId, req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  createFromVoice,
  previewFromVoice,
  createTransaction,
  getTransactions,
  getSummary,
  getExpenseBreakdown,
  getMonthlySummary,
  getTopExpenses,
  getCategoryTrend,
  getSpendingByDayOfWeek,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
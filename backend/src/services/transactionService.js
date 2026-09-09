const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

const VALID_TYPES = ["expense", "earning", "saving"];

function calculateLoanAffordability({ monthlyIncome = 0, monthlyExpenditure = 0 }) {
  const income = Number.isFinite(monthlyIncome) ? monthlyIncome : 0;
  const expenditure = Number.isFinite(monthlyExpenditure) ? monthlyExpenditure : 0;
  const disposableIncome = Math.max(0, income - expenditure);
  const suggestedEmiMin = Math.round(disposableIncome * 0.2);
  const suggestedEmiMax = Math.round(disposableIncome * 0.3);
  const repaymentPeriodMin = 12;
  const repaymentPeriodMax = 36;

  return {
    disposableIncome,
    suggestedEmi: {
      min: suggestedEmiMin,
      max: suggestedEmiMax,
    },
    estimatedRepaymentCapacity: suggestedEmiMax,
    suggestedLoanAmount: {
      min: suggestedEmiMin * repaymentPeriodMin,
      max: suggestedEmiMax * repaymentPeriodMax,
    },
    suggestedRepaymentPeriod: {
      min: repaymentPeriodMin,
      max: repaymentPeriodMax,
    },
  };
}

function toObjectId(userId) {
  return new mongoose.Types.ObjectId(userId);
}

async function createTransaction(userId, data) {
  const transaction = new Transaction({
    userId,
    type: data.type,
    amount: data.amount,
    category: data.category || "Other",
    description: data.description || "",
    sourceText: data.sourceText || "",
    date: data.date || new Date(),
  });

  return transaction.save();
}

async function getTransactions(userId, filters = {}) {
  const query = { userId };

  if (filters.type && VALID_TYPES.includes(filters.type)) {
    query.type = filters.type;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  return Transaction.find(query).sort({ date: -1, createdAt: -1 });
}

async function getTransactionById(userId, id) {
  return Transaction.findOne({ _id: id, userId });
}

async function updateTransaction(userId, id, data) {
  const allowedFields = ["type", "amount", "category", "description", "date"];
  const update = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) update[field] = data[field];
  }

  return Transaction.findOneAndUpdate(
    { _id: id, userId },
    { $set: update },
    { new: true, runValidators: true, context: "query" }
  );
}

async function deleteTransaction(userId, id) {
  return Transaction.findOneAndDelete({ _id: id, userId });
}

async function getSummary(userId) {
  const rows = await Transaction.aggregate([
    { $match: { userId: toObjectId(userId) } },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  const totals = { expense: 0, earning: 0, saving: 0 };
  for (const row of rows) {
    totals[row._id] = row.total;
  }

  const totalExpenses = totals.expense;
  const totalEarnings = totals.earning;
  const totalSavings = totals.saving;
  const netBalance = totalEarnings - totalExpenses;

  return {
    totalExpenses,
    totalEarnings,
    totalSavings,
    netBalance,
    profitLoss: netBalance,
  };
}

async function getExpenseBreakdown(userId) {
  const rows = await Transaction.aggregate([
    { $match: { userId: toObjectId(userId), type: "expense" } },
    { $group: { _id: "$category", amount: { $sum: "$amount" } } },
    { $sort: { amount: -1 } },
  ]);

  return rows.map((row) => ({ category: row._id || "Other", amount: row.amount }));
}

async function getMonthlySummary(userId) {
  const rows = await Transaction.aggregate([
    { $match: { userId: toObjectId(userId) } },
    {
      $group: {
        _id: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  const byMonth = new Map();
  for (const row of rows) {
    const month = row._id.month;
    if (!byMonth.has(month)) {
      byMonth.set(month, { month, expenses: 0, earnings: 0, savings: 0 });
    }
    const entry = byMonth.get(month);
    if (row._id.type === "expense") entry.expenses = row.total;
    if (row._id.type === "earning") entry.earnings = row.total;
    if (row._id.type === "saving") entry.savings = row.total;
  }

  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
}

async function getLoanSummary(userId) {
  const [summary, monthly] = await Promise.all([
    getSummary(userId),
    getMonthlySummary(userId),
  ]);

  const monthCount = monthly.length;
  const monthlyIncome = monthCount
    ? monthly.reduce((total, month) => total + month.earnings, 0) / monthCount
    : 0;
  const monthlyExpenditure = monthCount
    ? monthly.reduce((total, month) => total + month.expenses, 0) / monthCount
    : 0;

  return {
    totalEarnings: summary.totalEarnings,
    totalExpenditure: summary.totalExpenses,
    netBalance: summary.netBalance,
    profitLoss: summary.profitLoss,
    monthlyIncome,
    monthlyExpenditure,
    transactionHistoryMonths: monthCount,
    ...calculateLoanAffordability({ monthlyIncome, monthlyExpenditure }),
  };
}

/**
 * Returns the top N expense transactions (by amount) for a user.
 * @param {string} userId
 * @param {number} limit – default 5
 */
async function getTopExpenses(userId, limit = 5) {
  const rows = await Transaction.find({ userId, type: "expense" })
    .sort({ amount: -1 })
    .limit(limit)
    .lean();

  return rows.map((t) => ({
    _id: t._id,
    amount: t.amount,
    category: t.category || "Other",
    description: t.description || t.sourceText || "",
    date: t.date,
  }));
}

/**
 * Returns per-category monthly totals so the frontend can draw a trend per category.
 * Shape: [{ month: "2026-09", category: "Food", amount: 3200 }, ...]
 */
async function getCategoryTrend(userId) {
  const rows = await Transaction.aggregate([
    { $match: { userId: toObjectId(userId), type: "expense" } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: "%Y-%m", date: "$date" } },
          category: "$category",
        },
        amount: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.month": 1, "_id.category": 1 } },
  ]);

  return rows.map((r) => ({
    month: r._id.month,
    category: r._id.category || "Other",
    amount: r.amount,
  }));
}

/**
 * Returns spending totals grouped by day-of-week (0=Sun … 6=Sat).
 * Shape: [{ day: 0, label: "Sun", amount: 1200 }, ...]
 */
async function getSpendingByDayOfWeek(userId) {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const rows = await Transaction.aggregate([
    { $match: { userId: toObjectId(userId), type: "expense" } },
    {
      $group: {
        _id: { $dayOfWeek: "$date" }, // 1=Sun … 7=Sat (MongoDB convention)
        amount: { $sum: "$amount" },
      },
    },
  ]);

  // Build a full 7-day array, filling zeros where there's no data.
  const map = {};
  for (const r of rows) {
    // MongoDB $dayOfWeek: 1=Sun, 7=Sat → convert to 0-based
    map[r._id - 1] = r.amount;
  }

  return DAY_LABELS.map((label, i) => ({ day: i, label, amount: map[i] || 0 }));
}

module.exports = {
  calculateLoanAffordability,
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getExpenseBreakdown,
  getMonthlySummary,
  getLoanSummary,
  getTopExpenses,
  getCategoryTrend,
  getSpendingByDayOfWeek,
  VALID_TYPES,
};
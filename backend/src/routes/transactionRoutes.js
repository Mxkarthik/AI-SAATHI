const express = require("express");
const transactionController = require("../controllers/transactionController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// NOTE: static paths (/voice, /summary, etc.) must be declared before the
// /:id route, otherwise Express will treat "summary" etc. as an :id value.

router.post("/voice", authMiddleware, transactionController.createFromVoice);

router.get("/summary", authMiddleware, transactionController.getSummary);
router.get("/expense-breakdown", authMiddleware, transactionController.getExpenseBreakdown);
router.get("/monthly-summary", authMiddleware, transactionController.getMonthlySummary);
router.get("/top-expenses", authMiddleware, transactionController.getTopExpenses);
router.get("/category-trend", authMiddleware, transactionController.getCategoryTrend);
router.get("/spending-by-day", authMiddleware, transactionController.getSpendingByDayOfWeek);

router.post("/", authMiddleware, transactionController.createTransaction);
router.get("/", authMiddleware, transactionController.getTransactions);

router.get("/:id", authMiddleware, transactionController.getTransactionById);
router.put("/:id", authMiddleware, transactionController.updateTransaction);
router.delete("/:id", authMiddleware, transactionController.deleteTransaction);

module.exports = router;
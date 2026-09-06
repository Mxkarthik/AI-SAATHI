const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const conversationController = require("../controllers/conversationController");

const router = express.Router();

router.post("/", authMiddleware, conversationController.createConversation);
router.get("/", authMiddleware, conversationController.listConversations);
router.get("/:conversationId", authMiddleware, conversationController.getConversation);

module.exports = router;

const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const messageController = require("../controllers/messageController");

// mergeParams: true allows access to :conversationId from the parent router path
const router = express.Router({ mergeParams: true });

router.post("/", authMiddleware, messageController.createMessage);
router.get("/", authMiddleware, messageController.getMessages);

module.exports = router;

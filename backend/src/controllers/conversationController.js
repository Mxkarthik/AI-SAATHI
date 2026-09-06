const conversationService = require("../services/conversationService");

const createConversation = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { language, intent, status } = req.body || {};
    const conversation = await conversationService.createConversation(req.userId, {
      language,
      intent,
      status,
    });
    return res.status(201).json({ conversation });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Create conversation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const listConversations = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const conversations = await conversationService.getConversationsByUserId(req.userId);
    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("List conversations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getConversation = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const conversation = await conversationService.getConversationById(
      req.params.conversationId,
      req.userId
    );
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    return res.status(200).json({ conversation });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { createConversation, listConversations, getConversation };

const messageService = require("../services/messageService");

const createMessage = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { role, content, language, intentData } = req.body || {};
    const result = await messageService.createMessage(
      req.params.conversationId,
      req.userId,
      { role, content, language, intentData }
    );
    if (!result) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    return res.status(201).json({ message: result });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Create message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMessages = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const messages = await messageService.getMessagesByConversationId(
      req.params.conversationId,
      req.userId
    );
    if (!messages) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { createMessage, getMessages };

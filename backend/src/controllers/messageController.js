const messageService = require("../services/messageService");
const conversationService = require("../services/conversationService");
const profileService = require("../services/profileService");
const { orchestrate } = require("../orchestrator/orchestratorService");

const createMessage = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { content, language } = req.body || {};
    
    // Validate message content
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ success: false, message: "Message content is required and must be a non-empty string" });
    }

    // Verify conversation exists and belongs to user
    const conversationId = req.params.conversationId;
    const conversation = await conversationService.getConversationById(conversationId, req.userId);
    if (!conversation) {
      // Returns 404 to avoid leaking existence of other users' conversations
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    // Persist user's message FIRST
    const userMessage = await messageService.createMessage(
      conversationId,
      req.userId,
      { role: "user", content, language: language || conversation.language || "en" }
    );

    // Load FinancialProfile (may be null, orchestrator handles this)
    const profile = await profileService.getProfileByUserId(req.userId);

    // Call orchestrate
    let orchestration;
    try {
      orchestration = await orchestrate({
        userId: req.userId,
        conversation,
        profile,
        message: content
      });
    } catch (err) {
      console.error("Orchestrator error:", err);
      // Return 500 on orchestrator failure, do not delete user message, do not create fake assistant response
      return res.status(500).json({ success: false, message: "Internal server error" });
    }

    // Persist conversation language and intent
    const updateData = {};
    if (orchestration.language && orchestration.language !== conversation.language) {
      updateData.language = orchestration.language;
    }
    if (orchestration.intent && orchestration.intent !== conversation.intent) {
      updateData.intent = orchestration.intent;
    }
    if (Object.keys(updateData).length > 0) {
      await conversationService.updateConversation(conversationId, req.userId, updateData);
    }

    // Determine assistant message
    let assistantMessageContent = "I need more information.";
    let assistantMessageLanguage = orchestration.language || "en";

    if (orchestration.status === "needs_information") {
      if (orchestration.nextQuestion) {
        assistantMessageContent = orchestration.nextQuestion.question;
        assistantMessageLanguage = orchestration.nextQuestion.language;
      }
    } else if (orchestration.status === "ready_for_decision") {
      if (orchestration.language === "te") {
        assistantMessageContent = "ధన్యవాదాలు. మీ అవసరాన్ని అర్థం చేసుకోవడానికి అవసరమైన సమాచారం ఇప్పుడు ఉంది. ఇప్పుడు సరైన ఎంపికలను పరిశీలించవచ్చు.";
      } else {
        assistantMessageContent = "Thank you. I have enough information to understand your requirement. We can now evaluate suitable options.";
      }
    }

    // Persist assistant message
    const assistantMessage = await messageService.createMessage(
      conversationId,
      req.userId,
      { 
        role: "assistant", 
        content: assistantMessageContent, 
        language: assistantMessageLanguage 
      }
    );

    // Return clean API response
    return res.status(200).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        orchestration
      }
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Create message error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
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

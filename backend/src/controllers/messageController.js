/**
 * messageController.js
 *
 * Thin HTTP layer for message endpoints.
 * POST flow:
 *   1. Validate auth
 *   2. Persist the user's message (role: "user")
 *   3. Run orchestratorService.processMessage()
 *   4. If orchestrator returns a question: persist it as role "assistant"
 *   5. Return the orchestration result to the caller
 */

const messageService      = require("../services/messageService");
const orchestratorService = require("../orchestrator/orchestratorService");

// ── POST /api/conversations/:conversationId/messages ─────────────────────────

const createMessage = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { content, language, intentData } = req.body || {};

    // Validate required fields
    if (!content || typeof content !== "string" || content.trim() === "") {
      return res.status(400).json({ message: "content is required" });
    }

    // ── 1. Persist the user's message ────────────────────────────────────
    const userMessage = await messageService.createMessage(
      req.params.conversationId,
      req.userId,
      { role: "user", content: content.trim(), language, intentData }
    );

    if (!userMessage) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // ── 2. Run orchestration ─────────────────────────────────────────────
    const orchestration = await orchestratorService.processMessage({
      userId:         req.userId,
      conversationId: req.params.conversationId,
      message:        content.trim(),
    });

    // ── 3. Persist assistant message when orchestrator has a question ─────
    let assistantMessage = null;
    if (
      orchestration.status === "needs_information" &&
      orchestration.nextQuestion
    ) {
      // The assistant message content is the questionKey for now.
      // The language layer (Phase 2B) will translate this into
      // a natural-language question in Telugu or English.
      const questionContent = orchestration.nextQuestion.questionKey;

      assistantMessage = await messageService.createMessage(
        req.params.conversationId,
        req.userId,
        {
          role:    "assistant",
          content: questionContent,
          language,
          // Store the full orchestration result in intentData for debugging
          intentData: {
            intent:       orchestration.intent,
            confidence:   orchestration.confidence,
            missingFields: orchestration.missingFields,
            nextQuestion: orchestration.nextQuestion,
            entities:     orchestration.entities,
          },
        }
      );
    }

    // ── 4. Return orchestration result ───────────────────────────────────
    return res.status(201).json({
      userMessage,
      assistantMessage,   // null when status is "decision_ready" or "unrecognised"
      orchestration,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Create message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ── GET /api/conversations/:conversationId/messages ──────────────────────────

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

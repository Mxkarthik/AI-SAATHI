const messageService = require("../services/messageService");
const conversationService = require("../services/conversationService");
const profileService = require("../services/profileService");
const { orchestrate } = require("../orchestrator/orchestratorService");
const { getSchemeMetadata } = require("../orchestrator/financialKnowledge/adapter/schemeRuleAdapter");

// ─── Deterministic recommendation message builder ─────────────────────────────
//
// Formats a natural-language assistant message from the structured
// recommendation output. Uses ONLY what the recommendation engine has
// produced — no invented figures, benefits, eligibility claims, or deadlines.
//
// Parameters:
//   rec      — orchestration.recommendation object
//   isTelugu — boolean, true when language === "te"
//
// Returns a string safe for persisting as an assistant message.
function buildRecommendationMessage(rec, isTelugu) {
  const eligible = Array.isArray(rec.recommendations) ? rec.recommendations : [];
  const verificationNeeded = Array.isArray(rec.verificationRequired) ? rec.verificationRequired : [];

  const lines = [];

  if (eligible.length > 0) {
    if (isTelugu) {
      lines.push("మీ వివరాల ఆధారంగా, క్రింది పథకాలు సంబంధితంగా అనిపిస్తున్నాయి:");
    } else {
      lines.push("Based on the details you provided, here are the potentially relevant schemes:");
    }

    for (const entry of eligible) {
      const meta = getSchemeMetadata(entry.schemeId);
      const displayName = meta ? (meta.shortName || meta.name) : entry.schemeId;
      const whyList = entry.explanation && Array.isArray(entry.explanation.whyRecommended)
        ? entry.explanation.whyRecommended
        : [];
      const caution = entry.explanation && entry.explanation.caution
        ? entry.explanation.caution
        : null;

      if (isTelugu) {
        lines.push(`\n• ${displayName}`);
        if (whyList.length > 0) {
          lines.push(`  కారణాలు: ${whyList.join("; ")}`);
        }
        if (caution) {
          lines.push(`  గమనిక: ${caution}`);
        }
      } else {
        lines.push(`\n• ${displayName}`);
        if (whyList.length > 0) {
          lines.push(`  Why relevant: ${whyList.join("; ")}`);
        }
        if (caution) {
          lines.push(`  Note: ${caution}`);
        }
      }
    }
  }

  if (verificationNeeded.length > 0) {
    if (isTelugu) {
      lines.push("\nమరింత ధృవీకరణ అవసరమైన పథకాలు కూడా ఉన్నాయి. స్థానిక అధికారులను లేదా సేవా కేంద్రాన్ని సంప్రదించండి.");
    } else {
      lines.push("\nSome additional schemes may apply but require official verification. Please contact your local authorities or a Common Service Centre for guidance.");
    }
  }

  if (lines.length === 0) {
    return isTelugu
      ? "మీ సమాచారం అందింది. అయితే, ప్రస్తుతం ఖచ్చితమైన పథకం సిఫారసు చేయడానికి అధికారిక ధృవీకరణ అవసరం."
      : "I've reviewed your details. Official verification is needed before a specific scheme can be confirmed.";
  }

  return lines.join("\n");
}

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
    const isTelugu = assistantMessageLanguage === "te";

    if (orchestration.status === "needs_information") {
      if (orchestration.nextQuestion) {
        assistantMessageContent = orchestration.nextQuestion.question;
        assistantMessageLanguage = orchestration.nextQuestion.language || assistantMessageLanguage;
      } else {
        // nextQuestion is null but we still need information — safe generic fallback
        assistantMessageContent = isTelugu
          ? "దయచేసి మీ అవసరం గురించి మరిన్ని వివరాలు చెప్పండి."
          : "Could you please share more details about what you need?";
      }
    } else if (orchestration.status === "ready_for_decision" || orchestration.status === "completed") {
      const rec = orchestration.recommendation;

      if (!rec || !Array.isArray(rec.recommendations) || rec.recommendations.length === 0) {
        // Genuinely ready for decision but no recommendation could be produced
        // (e.g. eligibility is insufficient_verified_data for all schemes).
        if (isTelugu) {
          assistantMessageContent =
            "మీ సమాచారం అందింది. అయితే, ప్రస్తుతం ఖచ్చితమైన పథకం సిఫారసు చేయడానికి అధికారిక ధృవీకరణ అవసరం. సంబంధిత అధికారులను సంప్రదించండి.";
        } else {
          assistantMessageContent =
            "I've reviewed your details. At this stage, official verification is needed before a specific scheme can be confirmed. Please contact the relevant authorities or a local service centre.";
        }
      } else {
        // Build deterministic message from structured recommendation data only.
        // No invented figures, eligibility claims, benefits, or deadlines.
        assistantMessageContent = buildRecommendationMessage(rec, isTelugu);
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

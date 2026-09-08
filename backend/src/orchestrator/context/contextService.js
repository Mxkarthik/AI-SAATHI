/**
 * contextService.js
 *
 * Loads and normalises all context the orchestrator needs for a single turn.
 * Delegates ALL database operations to existing services — no MongoDB calls here.
 *
 * Returned shape:
 * {
 *   userId,           string
 *   user,             User document | null
 *   currentMessage,   string
 *   conversation,     Conversation document | null
 *   recentMessages,   Message[] (last N, oldest-first)
 *   profile,          FinancialProfile document | null
 * }
 */

const userService         = require("../../services/userService");
const conversationService = require("../../services/conversationService");
const messageService      = require("../../services/messageService");
const profileService      = require("../../services/profileService");
const User                = require("../../models/User");

// How many recent messages to load for conversation context
const RECENT_MESSAGE_LIMIT = 10;

/**
 * Load the full context for an orchestration turn.
 *
 * @param {object} params
 * @param {string} params.userId         — authenticated user's MongoDB _id string
 * @param {string} params.conversationId — conversation being participated in
 * @param {string} params.message        — the raw user message text
 * @returns {Promise<object>}            — normalised context object
 * @throws  if userId or conversationId ownership verification fails
 */
async function loadContext({ userId, conversationId, message }) {
  // Load in parallel where possible — user + conversation are independent
  const [user, conversation, profile] = await Promise.all([
    User.findById(userId).lean(),
    conversationService.getConversationById(conversationId, userId),
    profileService.getProfileByUserId(userId),
  ]);

  // Security: conversation ownership was verified by getConversationById.
  // If null is returned the conversation doesn't exist or belongs to someone else.
  if (!conversation) {
    const err = new Error("Conversation not found or access denied");
    err.statusCode = 404;
    throw err;
  }

  // Load recent messages for this conversation (ownership already confirmed above)
  const allMessages = await messageService.getMessagesByConversationId(
    conversationId,
    userId
  );

  // Take only the last N messages to keep the context window manageable
  const recentMessages = Array.isArray(allMessages)
    ? allMessages.slice(-RECENT_MESSAGE_LIMIT)
    : [];

  return {
    userId,
    user,
    currentMessage: message,
    conversation,
    recentMessages,
    profile: profile || null,
  };
}

module.exports = { loadContext };

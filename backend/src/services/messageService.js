const Message = require("../models/Message");
const conversationService = require("./conversationService");

/**
 * Create a message in a conversation, verifying ownership first.
 * Returns null if the conversation doesn't exist or isn't owned by requestingUserId.
 */
async function createMessage(conversationId, requestingUserId, messageData) {
  const conversation = await conversationService.getConversationById(
    conversationId,
    requestingUserId
  );
  if (!conversation) return null;
  return Message.create({ conversationId, ...messageData });
}

/**
 * Get all messages for a conversation, verifying ownership first.
 * Returns null if the conversation doesn't exist or isn't owned by requestingUserId.
 * Messages are returned sorted chronologically (createdAt ascending).
 */
async function getMessagesByConversationId(conversationId, requestingUserId) {
  const conversation = await conversationService.getConversationById(
    conversationId,
    requestingUserId
  );
  if (!conversation) return null;
  return Message.find({ conversationId }).sort({ createdAt: 1 });
}

module.exports = { createMessage, getMessagesByConversationId };

const Conversation = require("../models/Conversation");

/**
 * Create a new conversation for the given user.
 */
async function createConversation(userId, data) {
  return Conversation.create({ userId, ...data });
}

/**
 * Get a conversation by ID, but only if it belongs to requestingUserId.
 * Returns null if not found or not owned.
 */
async function getConversationById(conversationId, requestingUserId) {
  const conv = await Conversation.findById(conversationId);
  if (!conv || conv.userId.toString() !== requestingUserId.toString()) {
    return null;
  }
  return conv;
}

/**
 * Get all conversations belonging to a user.
 */
async function getConversationsByUserId(userId) {
  return Conversation.find({ userId });
}

/**
 * Update a conversation, but only if it belongs to requestingUserId.
 * Returns null if not found or not owned.
 */
async function updateConversation(conversationId, requestingUserId, updateData) {
  const existing = await getConversationById(conversationId, requestingUserId);
  if (!existing) return null;
  return Conversation.findByIdAndUpdate(
    conversationId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
}

module.exports = {
  createConversation,
  getConversationById,
  getConversationsByUserId,
  updateConversation,
};

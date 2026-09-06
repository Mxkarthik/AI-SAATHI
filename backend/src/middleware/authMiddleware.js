/**
 * Authentication middleware.
 * Sets req.userId from the active session (OAuth) or falls back to
 * the x-user-id header for development testing.
 */
const authMiddleware = (req, res, next) => {
  // Primary: session userId (set by Google OAuth)
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }

  // DEV-ONLY FALLBACK — remove this block once OAuth is verified in production
  const headerUserId = req.headers["x-user-id"];
  if (
    headerUserId &&
    typeof headerUserId === "string" &&
    headerUserId.trim().length > 0
  ) {
    req.userId = headerUserId.trim();
  }

  next();
};

module.exports = { authMiddleware };

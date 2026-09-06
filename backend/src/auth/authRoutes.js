const express = require("express");
const passport = require("passport");

const router = express.Router();

/**
 * GET /auth/google
 * Initiates the Google OAuth 2.0 flow.
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * GET /auth/google/callback
 * Handles the Google OAuth callback.
 * On success: stores userId in session and redirects to the Dashboard.
 * On failure: redirects to "/".
 */
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Store the user's MongoDB _id in the session so authMiddleware can read it
    req.session.userId = req.user._id.toString();
    res.redirect(process.env.DASHBOARD_URL || "http://localhost:5173");
  }
);

/**
 * GET /auth/me
 * Returns the current authenticated user, or 401 if not logged in.
 */
router.get("/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.status(200).json({ user: req.user });
});

/**
 * GET /auth/logout
 * Destroys the session and logs the user out.
 */
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout error" });
    }
    req.session.destroy();
    res.status(200).json({ message: "Logged out" });
  });
});

module.exports = router;

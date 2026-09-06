const express = require("express");
const profileController = require("../controllers/profileController");

// Placeholder auth middleware — will be replaced by JWT middleware
// Reads x-user-id header, validates it is a non-empty string, sets req.userId
const authMiddleware = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (userId && typeof userId === "string" && userId.trim().length > 0) {
    req.userId = userId.trim();
  }
  next(); // controller handles missing req.userId with 401
};

const router = express.Router();

router.get("/", authMiddleware, profileController.getProfile);
router.patch("/", authMiddleware, profileController.upsertProfile);

module.exports = router;

"use strict";

const express = require("express");
const multer = require("multer");
const { authMiddleware } = require("../middleware/authMiddleware");
const { transcribe, synthesize } = require("./voiceController");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/transcribe", authMiddleware, upload.single("file"), transcribe);
router.post("/synthesize", authMiddleware, synthesize);

module.exports = router;

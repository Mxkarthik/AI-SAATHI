const express = require("express");
const multer = require("multer");
const loanDocumentController = require("../controllers/loanDocumentController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { SUPPORTED_MIME_TYPES } = require("../services/loanDocumentService");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!SUPPORTED_MIME_TYPES.has(file.mimetype)) {
      return callback(new Error("Only JPG, PNG, and WEBP images are supported."));
    }
    return callback(null, true);
  },
});

const handleUpload = (req, res, next) => {
  upload.single("document")(req, res, (error) => {
    if (error) {
      return res.status(422).json({
        status: "failure",
        message: error.message || "The document upload could not be processed.",
      });
    }
    return next();
  });
};

router.post("/ocr", authMiddleware, handleUpload, loanDocumentController.uploadDocumentForOcr);

module.exports = router;
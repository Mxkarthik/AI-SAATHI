const { processDocument } = require("../services/loanDocumentService");

const uploadDocumentForOcr = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ status: "failure", message: "Unauthorized" });
  }

  if (!req.file) {
    return res.status(400).json({ status: "failure", message: "Please upload a document image." });
  }

  if (!req.body.documentType) {
    return res.status(400).json({ status: "failure", message: "A document type is required." });
  }

  const result = await processDocument({
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    documentType: req.body.documentType,
  });

  return res.status(result.status === "failure" ? 422 : 200).json(result);
};

module.exports = { uploadDocumentForOcr };
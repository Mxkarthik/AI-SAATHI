const { createWorker } = require("tesseract.js");

const SUPPORTED_DOCUMENT_TYPES = new Set([
  "identity",
  "pan",
  "income",
  "land",
  "tractorQuotation",
  "cropPlan",
  "bankStatement",
  "bankForm",
]);

const SUPPORTED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function maskSensitiveValue(value) {
  const normalized = String(value || "").replace(/\s+/g, "");
  if (normalized.length <= 4) return "****";
  return `${"*".repeat(normalized.length - 4)}${normalized.slice(-4)}`;
}

function firstMatch(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : null;
}

function extractFields(documentType, text) {
  const fields = {};
  const normalizedText = text.replace(/\r/g, "").replace(/[ \t]+/g, " ");

  if (documentType === "identity") {
    const name = firstMatch(normalizedText, /(?:full\s+name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,})/i);
    const idNumber = firstMatch(normalizedText, /\b(?:\d[ -]?){12}\b/);
    if (name) fields.name = name;
    if (idNumber) fields.idNumber = maskSensitiveValue(idNumber);
  }

  if (documentType === "pan") {
    const panNumber = firstMatch(normalizedText, /\b[A-Z]{5}\d{4}[A-Z]\b/i);
    const name = firstMatch(normalizedText, /(?:full\s+name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,})/i);
    if (panNumber) fields.panNumber = maskSensitiveValue(panNumber);
    if (name) fields.name = name;
  }

  if (documentType === "income") {
    const income = firstMatch(normalizedText, /(?:monthly|annual)?\s*(?:income|salary)\s*[:\-]?\s*₹?\s*([\d,]+)/i);
    const employer = firstMatch(normalizedText, /(?:employer|company|employer name)\s*[:\-]\s*([A-Za-z0-9 &.]{2,})/i);
    if (income) fields.incomeAmount = income;
    if (employer) fields.employer = employer;
  }

  if (documentType === "land") {
    const surveyNumber = firstMatch(normalizedText, /(?:survey|plot|patta)\s*(?:no\.?|number)?\s*[:\-]?\s*([A-Za-z0-9\/-]+)/i);
    const area = firstMatch(normalizedText, /(?:area|extent)\s*[:\-]?\s*([\d.]+\s*(?:acres?|hectares?|ha)?)/i);
    if (surveyNumber) fields.surveyNumber = maskSensitiveValue(surveyNumber);
    if (area) fields.area = area;
  }

  if (documentType === "tractorQuotation") {
    const vendor = firstMatch(normalizedText, /(?:dealer|vendor|seller)\s*[:\-]\s*([A-Za-z0-9 &.]{2,})/i);
    const amount = firstMatch(normalizedText, /(?:total|price|amount)\s*[:\-]?\s*₹?\s*([\d,]+)/i);
    if (vendor) fields.vendor = vendor;
    if (amount) fields.amount = amount;
  }

  if (documentType === "cropPlan") {
    const crop = firstMatch(normalizedText, /(?:crop|crops)\s*[:\-]\s*([A-Za-z ,]+)/i);
    const season = firstMatch(normalizedText, /season\s*[:\-]\s*([A-Za-z]+)/i);
    if (crop) fields.crop = crop;
    if (season) fields.season = season;
  }

  if (documentType === "bankStatement") {
    const accountNumber = firstMatch(normalizedText, /(?:account|a\/c)\s*(?:no\.?|number)?\s*[:\-]?\s*([A-Za-z0-9-]{6,})/i);
    const accountHolder = firstMatch(normalizedText, /(?:account holder|name)\s*[:\-]\s*([A-Za-z][A-Za-z .]{2,})/i);
    if (accountNumber) fields.accountNumber = maskSensitiveValue(accountNumber);
    if (accountHolder) fields.accountHolder = accountHolder;
  }

  return fields;
}

async function processDocument({ buffer, mimetype, documentType }) {
  if (!SUPPORTED_DOCUMENT_TYPES.has(documentType)) {
    return { status: "failure", message: "This document type is not supported." };
  }

  if (!SUPPORTED_MIME_TYPES.has(mimetype)) {
    return { status: "failure", message: "Upload a JPG, PNG, or WEBP image for OCR." };
  }

  let worker;
  try {
    worker = await createWorker("eng");
    const result = await worker.recognize(buffer);
    const confidence = Math.round(result.data.confidence || 0);
    const fields = extractFields(documentType, result.data.text || "");

    if (confidence < 45 || Object.keys(fields).length === 0) {
      return {
        status: "unclear",
        message: "The document could not be read clearly. Upload a sharper, well-lit image and review the fields manually.",
        confidence,
        fields,
      };
    }

    return {
      status: "success",
      message: "Relevant information extracted. Review it before continuing.",
      confidence,
      fields,
    };
  } catch (error) {
    console.error("Loan document OCR error:", error);
    return {
      status: "failure",
      message: "We could not process this document. Please try another clear image.",
    };
  } finally {
    if (worker) await worker.terminate();
  }
}

module.exports = { processDocument, SUPPORTED_MIME_TYPES };
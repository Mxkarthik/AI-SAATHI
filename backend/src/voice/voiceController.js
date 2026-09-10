"use strict";

const { transcribeAudio } = require("./sarvamSttService");
const { synthesizeSpeech } = require("./sarvamTtsService");

async function transcribe(req, res) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Audio file is required" });
    }

    const result = await transcribeAudio({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      originalname: req.file.originalname,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.code === "SARVAM_NOT_CONFIGURED") {
      return res.status(503).json({ success: false, message: "Speech transcription is not configured" });
    }
    if (error.code === "EMPTY_AUDIO" || error.code === "EMPTY_TRANSCRIPT") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(502).json({ success: false, message: "Speech transcription is temporarily unavailable" });
  }
}

async function synthesize(req, res) {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const result = await synthesizeSpeech({
      text: req.body?.text,
      languageCode: req.body?.languageCode,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error.code === "SARVAM_NOT_CONFIGURED") {
      return res.status(503).json({ success: false, message: "Speech synthesis is not configured" });
    }
    if (error.code === "INVALID_TTS_TEXT" || error.code === "INVALID_TTS_LANGUAGE") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === "EMPTY_TTS_AUDIO") {
      return res.status(502).json({ success: false, message: "Speech synthesis returned no audio" });
    }
    return res.status(502).json({ success: false, message: "Speech synthesis is temporarily unavailable" });
  }
}

module.exports = { transcribe, synthesize };

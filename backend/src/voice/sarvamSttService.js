"use strict";

const SARVAM_ENDPOINT = "https://api.sarvam.ai/speech-to-text";

async function transcribeAudio({ buffer, mimetype, originalname } = {}) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    const error = new Error("Speech transcription is not configured.");
    error.code = "SARVAM_NOT_CONFIGURED";
    throw error;
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error("Audio file is empty.");
    error.code = "EMPTY_AUDIO";
    throw error;
  }

  const form = new FormData();
  const filename = originalname || "voice.webm";
  const type = mimetype || "audio/webm";
  form.append("file", new Blob([buffer], { type }), filename);
  form.append("model", "saaras:v3");
  form.append("mode", "transcribe");
  form.append("language_code", "unknown");

  let response;
  try {
    response = await fetch(SARVAM_ENDPOINT, {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: form,
    });
  } catch {
    const error = new Error("Speech transcription is temporarily unavailable.");
    error.code = "SARVAM_NETWORK_ERROR";
    throw error;
  }

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error("Speech transcription failed.");
    error.code = "SARVAM_API_ERROR";
    error.status = response.status;
    throw error;
  }

  const transcript = typeof payload.transcript === "string" ? payload.transcript.trim() : "";
  if (!transcript) {
    const error = new Error("No speech was detected. Please try again.");
    error.code = "EMPTY_TRANSCRIPT";
    throw error;
  }

  return {
    transcript,
    languageCode: payload.language_code || null,
  };
}

module.exports = { transcribeAudio };

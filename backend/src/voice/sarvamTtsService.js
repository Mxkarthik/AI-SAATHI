"use strict";

const SARVAM_TTS_ENDPOINT = "https://api.sarvam.ai/text-to-speech";

async function synthesizeSpeech({ text, languageCode } = {}) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    const error = new Error("Speech synthesis is not configured.");
    error.code = "SARVAM_NOT_CONFIGURED";
    throw error;
  }
  if (typeof text !== "string" || text.trim() === "") {
    const error = new Error("Text is required.");
    error.code = "INVALID_TTS_TEXT";
    throw error;
  }
  if (typeof languageCode !== "string" || !/^[a-z]{2}-IN$/i.test(languageCode)) {
    const error = new Error("A valid language code is required.");
    error.code = "INVALID_TTS_LANGUAGE";
    throw error;
  }

  let response;
  try {
    response = await fetch(SARVAM_TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.trim(),
        target_language_code: languageCode,
        language_code: languageCode,
        model: "bulbul:v3",
        speaker: "shubh",
        output_audio_codec: "wav",
        speech_sample_rate: 24000,
      }),
    });
  } catch {
    const error = new Error("Speech synthesis is temporarily unavailable.");
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
    const error = new Error("Speech synthesis failed.");
    error.code = "SARVAM_API_ERROR";
    error.status = response.status;
    throw error;
  }

  const audio = Array.isArray(payload.audios) ? payload.audios[0] : null;
  if (typeof audio !== "string" || audio.length === 0) {
    const error = new Error("Speech synthesis returned no audio.");
    error.code = "EMPTY_TTS_AUDIO";
    throw error;
  }

  return {
    audio,
    mimeType: "audio/wav",
    languageCode,
  };
}

module.exports = { synthesizeSpeech };

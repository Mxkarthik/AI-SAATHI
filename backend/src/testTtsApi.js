const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const voiceRoutes = require("./voice/voiceRoutes");

const app = express();
app.use(express.json());
app.use("/api/voice", voiceRoutes);

async function run() {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.SARVAM_API_KEY;
  const calls = [];

  process.env.SARVAM_API_KEY = "test-server-key";
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ audios: ["UklGRg=="] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    const response = await request(app)
      .post("/api/voice/synthesize")
      .set("x-user-id", "test-user")
      .send({ text: "నమస్కారం! నేను AI సాథి.", languageCode: "te-IN" });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      audio: "UklGRg==",
      mimeType: "audio/wav",
      languageCode: "te-IN",
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.sarvam.ai/text-to-speech");
    assert.equal(calls[0].options.headers["api-subscription-key"], "test-server-key");

    const payload = JSON.parse(calls[0].options.body);
    assert.equal(payload.model, "bulbul:v3");
    assert.equal(payload.target_language_code, "te-IN");
    assert.equal(payload.text, "నమస్కారం! నేను AI సాథి.");
    assert.equal(payload.speaker, "shubh");

    const englishResponse = await request(app)
      .post("/api/voice/synthesize")
      .set("x-user-id", "test-user")
      .send({ text: "Hello, I am AI Saathi.", languageCode: "en-IN" });
    assert.equal(englishResponse.status, 200);
    const englishPayload = JSON.parse(calls[1].options.body);
    assert.equal(englishPayload.target_language_code, "en-IN");
    assert.equal(englishPayload.text, "Hello, I am AI Saathi.");

    delete process.env.SARVAM_API_KEY;
    const missingKeyResponse = await request(app)
      .post("/api/voice/synthesize")
      .set("x-user-id", "test-user")
      .send({ text: "Hello, I am AI Saathi.", languageCode: "en-IN" });
    assert.equal(missingKeyResponse.status, 503);
    assert.equal(calls.length, 2);

    console.log("PASS: TTS endpoint forwards provider settings and returns base64 audio");
    console.log("PASS: TTS endpoint rejects missing server-side API key");
  } finally {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.SARVAM_API_KEY;
    else process.env.SARVAM_API_KEY = originalApiKey;
  }
}

run().catch((error) => {
  console.error("FAIL: TTS API tests");
  console.error(error.stack || error);
  process.exitCode = 1;
});
"use strict";

/**
 * testE2EReal.js
 *
 * Real end-to-end integration test for AI Saathi backend.
 *
 * What this tests:
 *  - Real MongoDB connection (uses MONGODB_URI from .env)
 *  - Real Express HTTP server
 *  - Real Conversation / Message / FinancialProfile / User documents
 *  - Real orchestration pipeline (understanding → context → gap → question)
 *  - Real Gemini calls (or graceful fallback if quota-limited)
 *
 * Authentication: uses the DEV-ONLY x-user-id header that already exists
 * in authMiddleware.js.  This is safe because the middleware itself
 * constrains it to the dev environment.
 *
 * Test data:
 *  - Creates a unique test user, conversation, and partial profile.
 *  - Cleans up after itself in the finally block.
 *
 * Run:  node src/testE2EReal.js
 */

require("dotenv").config();
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const http = require("http");
const mongoose = require("mongoose");
const request = require("supertest");

// ── Models (direct access for test setup / teardown only) ─────────────────────
const User = require("./models/User");
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");
const FinancialProfile = require("./models/FinancialProfile");

// ── App ───────────────────────────────────────────────────────────────────────
const app = require("./app");

// ── Test state ────────────────────────────────────────────────────────────────
let testUser = null;
let testConversation = null;
let testProfile = null;
let server = null;

let passed = 0;
let failed = 0;
const results = [];

// ── Helpers ───────────────────────────────────────────────────────────────────
function assert(condition, label) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

function assertEq(actual, expected, label) {
  if (actual !== expected)
    throw new Error(`${label} — expected "${expected}", got "${actual}"`);
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
    results.push({ name, status: "PASS" });
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
    failed++;
    results.push({ name, status: "FAIL", error: err.message });
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
async function setup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✔  MongoDB connected");

  // Create isolated test user (unique email guarantees no collision)
  const uid = Date.now();
  testUser = await User.create({
    name: "E2E Test User",
    email: `e2e-test-${uid}@saathi-test.invalid`,
    authProvider: "google",
    authProviderId: `test-${uid}`,
  });
  console.log(`✔  Test user created: ${testUser._id}`);

  // Create conversation
  testConversation = await Conversation.create({
    userId: testUser._id,
    language: "en",
    status: "active",
  });
  console.log(`✔  Test conversation created: ${testConversation._id}`);

  // Create partial FinancialProfile — state, land, ownership, crop known
  // season, amount, income, existingDebt are MISSING → system must ask for them
  testProfile = await FinancialProfile.create({
    userId: testUser._id,
    location: { state: "Andhra Pradesh" },
    farming: {
      landArea: 3,
      landUnit: "acres",
      ownership: "owned",
    },
    crops: ["paddy"],
  });
  console.log(`✔  Test profile created: ${testProfile._id}`);

  server = http.createServer(app);
}

// ── Teardown ──────────────────────────────────────────────────────────────────
async function teardown() {
  try {
    if (testUser) {
      await Message.deleteMany({ conversationId: testConversation?._id });
      await Conversation.deleteMany({ userId: testUser._id });
      await FinancialProfile.deleteMany({ userId: testUser._id });
      await User.deleteOne({ _id: testUser._id });
      console.log("\n✔  Test data cleaned up");
    }
  } catch (err) {
    console.warn("  WARN: cleanup error:", err.message);
  }
  await mongoose.disconnect();
}

// ── Auth helper ───────────────────────────────────────────────────────────────
// Uses the DEV-ONLY x-user-id header from authMiddleware.js
function authed(req) {
  return req.set("x-user-id", testUser._id.toString());
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

let turn1Response = null; // saved for multi-turn test

async function runAllTests() {
  const convId = testConversation._id.toString();

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SECTION A — Error cases (no Gemini needed)");
  console.log("══════════════════════════════════════════════════════════");

  await runTest("A1 — Empty content → 400", async () => {
    const res = await authed(
      request(app)
        .post(`/api/conversations/${convId}/messages`)
    ).send({ content: "" });
    assertEq(res.status, 400, "HTTP status");
    assertEq(res.body.success, false, "success=false");
  });

  await runTest("A2 — Whitespace-only content → 400", async () => {
    const res = await authed(
      request(app)
        .post(`/api/conversations/${convId}/messages`)
    ).send({ content: "   " });
    assertEq(res.status, 400, "HTTP status");
  });

  await runTest("A3 — Missing content field → 400", async () => {
    const res = await authed(
      request(app)
        .post(`/api/conversations/${convId}/messages`)
    ).send({});
    assertEq(res.status, 400, "HTTP status");
  });

  await runTest("A4 — Non-string content → 400", async () => {
    const res = await authed(
      request(app)
        .post(`/api/conversations/${convId}/messages`)
    ).send({ content: 123 });
    assertEq(res.status, 400, "HTTP status");
  });

  await runTest("A5 — Unknown conversation ID → 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await authed(
      request(app)
        .post(`/api/conversations/${fakeId}/messages`)
    ).send({ content: "hello" });
    assertEq(res.status, 404, "HTTP status");
  });

  await runTest("A6 — Conversation belonging to another user → 404", async () => {
    // Create a second user's conversation
    const otherUser = await User.create({
      name: "Other User",
      email: `other-${Date.now()}@saathi-test.invalid`,
      authProvider: "google",
      authProviderId: `other-${Date.now()}`,
    });
    const otherConv = await Conversation.create({
      userId: otherUser._id,
      language: "en",
      status: "active",
    });

    const res = await authed(
      request(app)
        .post(`/api/conversations/${otherConv._id}/messages`)
    ).send({ content: "hello" });

    // Cleanup
    await Conversation.deleteOne({ _id: otherConv._id });
    await User.deleteOne({ _id: otherUser._id });

    assertEq(res.status, 404, "HTTP status (ownership hidden as 404)");
  });

  await runTest("A7 — No auth header → 401", async () => {
    const res = await request(app)
      .post(`/api/conversations/${convId}/messages`)
      .send({ content: "hello" });
    assertEq(res.status, 401, "HTTP status");
  });

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SECTION B — Language detection (no Gemini-intent needed)");
  console.log("══════════════════════════════════════════════════════════");

  const { detectLanguage } = require("./orchestrator/understanding/understandingService");

  await runTest("B1 — Telugu message detected as 'te'", async () => {
    const lang = detectLanguage("నాకు వ్యవసాయం కోసం డబ్బు కావాలి");
    assertEq(lang, "te", "language");
  });

  await runTest("B2 — English message detected as 'en'", async () => {
    const lang = detectLanguage("I need money for farming");
    assertEq(lang, "en", "language");
  });

  await runTest("B3 — Mixed message → detected as 'te' (Telugu chars present)", async () => {
    const lang = detectLanguage("I need వరి crop loan");
    assertEq(lang, "te", "language");
  });

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SECTION C — Real orchestration turn (Gemini live call)");
  console.log("══════════════════════════════════════════════════════════");
  console.log(" NOTE: If Gemini is quota-limited the understanding layer");
  console.log(" falls back to deterministic mode. Tests adapt accordingly.");
  console.log("══════════════════════════════════════════════════════════\n");

  await runTest("C1 — Telugu crop-financing message: HTTP 200 + structure", async () => {
    const res = await authed(
      request(app)
        .post(`/api/conversations/${convId}/messages`)
    ).send({ content: "నాకు వ్యవసాయం కోసం డబ్బు కావాలి" });

    // Store for later assertions and multi-turn
    turn1Response = res;

    assertEq(res.status, 200, "HTTP status");
    assertEq(res.body.success, true, "success=true");
    assert(res.body.data, "data exists");
    assert(res.body.data.userMessage, "userMessage exists");
    assert(res.body.data.assistantMessage, "assistantMessage exists");
    assert(res.body.data.orchestration, "orchestration exists");
  });

  if (turn1Response?.status === 200) {
    const orch = turn1Response.body.data.orchestration;

    await runTest("C2 — Orchestration language = 'te'", async () => {
      assertEq(orch.language, "te", "orchestration.language");
    });

    await runTest("C3 — Orchestration intent: Gemini or graceful fallback", async () => {
      // With a profile that has state/crop/land/ownership, and message about
      // farm financing in Telugu, Gemini should return crop_financing.
      // Fallback returns general_financial_guidance.
      const validIntents = ["crop_financing", "general_financial_guidance"];
      assert(
        validIntents.includes(orch.intent),
        `intent "${orch.intent}" should be one of: ${validIntents.join(", ")}`
      );
      console.log(`      → intent detected: ${orch.intent}`);
    });

    await runTest("C4 — Status is 'needs_information' (fields still missing)", async () => {
      assertEq(orch.status, "needs_information", "orchestration.status");
    });

    await runTest("C5 — nextQuestion is not null", async () => {
      assert(orch.nextQuestion !== null, "nextQuestion should not be null");
      assert(orch.nextQuestion, "nextQuestion exists");
    });

    await runTest("C6 — nextQuestion.question is a non-empty string", async () => {
      const q = orch.nextQuestion?.question;
      assert(typeof q === "string" && q.trim().length > 0, "question is non-empty string");
      console.log(`      → question: "${q.substring(0, 80)}${q.length > 80 ? "…" : ""}"`);
    });

    await runTest("C7 — nextQuestion.language = 'te'", async () => {
      assertEq(orch.nextQuestion?.language, "te", "question language");
    });

    await runTest("C8 — nextQuestion.field is a string", async () => {
      const f = orch.nextQuestion?.field;
      assert(typeof f === "string" && f.length > 0, "field is non-empty string");
      console.log(`      → field asked: "${f}"`);
    });

    await runTest("C9 — informationGap.isComplete = false", async () => {
      assertEq(orch.informationGap?.isComplete, false, "isComplete");
    });

    await runTest("C10 — Profile fields are NOT re-asked (crop/landArea/ownership/location)", async () => {
      const missing = orch.informationGap?.missingFields || [];
      // Profile already has: state (location), landArea, ownership, crops
      assert(!missing.includes("location"), "location should NOT be missing (state known)");
      assert(!missing.includes("crop"), "crop should NOT be missing (crops known)");
      assert(!missing.includes("landArea"), "landArea should NOT be missing");
      assert(!missing.includes("ownership"), "ownership should NOT be missing");
    });

    await runTest("C11 — assistant message content = nextQuestion.question", async () => {
      const astContent = turn1Response.body.data.assistantMessage.content;
      const question = orch.nextQuestion?.question;
      assertEq(astContent, question, "assistantMessage.content");
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SECTION D — MongoDB persistence verification");
  console.log("══════════════════════════════════════════════════════════");

  await runTest("D1 — User message persisted in DB", async () => {
    const msgs = await Message.find({ conversationId: testConversation._id, role: "user" });
    assert(msgs.length >= 1, "At least one user message in DB");
    const last = msgs[msgs.length - 1];
    assert(last.content === "నాకు వ్యవసాయం కోసం డబ్బు కావాలి", "user message content matches");
  });

  await runTest("D2 — Assistant message persisted in DB", async () => {
    const msgs = await Message.find({ conversationId: testConversation._id, role: "assistant" });
    assert(msgs.length >= 1, "At least one assistant message in DB");
    const last = msgs[msgs.length - 1];
    assert(typeof last.content === "string" && last.content.length > 0, "assistant content non-empty");
    assert(last.language === "te", `assistant language = te (got: ${last.language})`);
  });

  await runTest("D3 — Both messages belong to test conversation", async () => {
    const msgs = await Message.find({ conversationId: testConversation._id });
    assert(msgs.length >= 2, "At least 2 messages in conversation");
    for (const m of msgs) {
      assert(
        m.conversationId.toString() === testConversation._id.toString(),
        `message ${m._id} belongs to correct conversation`
      );
    }
  });

  await runTest("D4 — Conversation language updated to 'te'", async () => {
    const fresh = await Conversation.findById(testConversation._id);
    assertEq(fresh.language, "te", "conversation.language in DB");
  });

  await runTest("D5 — Conversation intent persisted (if Gemini succeeded)", async () => {
    const fresh = await Conversation.findById(testConversation._id);
    // intent may be crop_financing (Gemini) or null/general_financial_guidance (fallback)
    console.log(`      → conversation.intent in DB: "${fresh.intent}"`);
    assert(fresh.intent !== undefined, "intent field present");
  });

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SECTION E — Multi-turn conversation");
  console.log("══════════════════════════════════════════════════════════");

  let turn2Response = null;

  await runTest("E1 — Second message uses same conversation, progresses state", async () => {
    // Determine what field was asked in turn 1
    const askedField = turn1Response?.body?.data?.orchestration?.nextQuestion?.field;

    // Map the field to a realistic Telugu answer
    const answers = {
      season: "ఖరీఫ్ సీజన్",
      amount: "50000 రూపాయలు కావాలి",
      income: "నా వార్షిక ఆదాయం 200000 రూపాయలు",
      existingDebt: "నాకు అప్పులు లేవు",
    };

    // Fallback to a generic answer if field not mapped
    const answer = answers[askedField] || "50000 రూపాయలు అవసరం";
    console.log(`      → Answering field "${askedField}" with: "${answer}"`);

    const res = await authed(
      request(app)
        .post(`/api/conversations/${convId}/messages`)
    ).send({ content: answer });

    turn2Response = res;

    assertEq(res.status, 200, "HTTP status");
    assertEq(res.body.success, true, "success=true");
    assert(res.body.data.userMessage, "userMessage exists");
    assert(res.body.data.assistantMessage, "assistantMessage exists");
    assert(res.body.data.orchestration, "orchestration exists");
  });

  if (turn2Response?.status === 200) {
    const orch2 = turn2Response.body.data.orchestration;

    await runTest("E2 — Turn 2 language = 'te'", async () => {
      assertEq(orch2.language, "te", "orchestration.language");
    });

    await runTest("E3 — Previously asked field not asked again (progression)", async () => {
      const prevField = turn1Response?.body?.data?.orchestration?.nextQuestion?.field;
      const nextField = orch2.nextQuestion?.field;
      if (nextField) {
        assert(
          nextField !== prevField,
          `Field progressed from "${prevField}" to "${nextField}"`
        );
        console.log(`      → Progressed from "${prevField}" → "${nextField}"`);
      } else {
        // nextQuestion may be null if all fields are now complete
        console.log(`      → nextQuestion null: all fields collected or general intent`);
      }
    });

    await runTest("E4 — Total messages in DB = 4 (2 user + 2 assistant)", async () => {
      const msgs = await Message.find({ conversationId: testConversation._id });
      assert(msgs.length >= 4, `Expected >= 4 messages, got ${msgs.length}`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(" SECTION F — English language detection via API");
  console.log("══════════════════════════════════════════════════════════");

  // Create a fresh conversation for English test to avoid state bleed
  const engConv = await Conversation.create({
    userId: testUser._id,
    language: "en",
    status: "active",
  });

  await runTest("F1 — English message → orchestration.language = 'en'", async () => {
    const res = await authed(
      request(app)
        .post(`/api/conversations/${engConv._id}/messages`)
    ).send({ content: "I need money for farming" });

    assertEq(res.status, 200, "HTTP status");
    assertEq(res.body.data.orchestration.language, "en", "language");
    const q = res.body.data.orchestration.nextQuestion?.question;
    if (q) console.log(`      → question: "${q.substring(0, 80)}${q.length > 80 ? "…" : ""}"`);
  });

  await Conversation.deleteOne({ _id: engConv._id });
  await Message.deleteMany({ conversationId: engConv._id });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await setup();
    await runAllTests();
  } catch (err) {
    console.error("\nFATAL setup error:", err.message);
    failed++;
  } finally {
    await teardown();
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(` RESULTS: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════════════════════");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✔" : "✘";
    console.log(`  ${icon}  ${r.name}`);
    if (r.error) console.log(`       ${r.error}`);
  }

  if (failed > 0) process.exit(1);
})();

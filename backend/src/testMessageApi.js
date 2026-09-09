const express = require('express');
const request = require('supertest');
const proxyquire = require('proxyquire').noCallThru();

// Test runner helper
let passed = 0;
let failed = 0;

async function runTest(name, testFn) {
  try {
    await testFn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err.stack || err);
    failed++;
  }
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg} - expected ${expected}, got ${actual}`);
  }
}

(async () => {
  console.log('Running API Integration Tests...');

  // Mock factories
  const createMocks = () => {
    return {
      conversationService: {
        getConversationById: async (id, userId) => {
          if (id === 'conv_123' && userId === 'valid_user') {
            return { _id: id, userId, language: 'en', intent: null };
          }
          return null;
        },
        updateConversation: async (id, userId, data) => ({ _id: id, userId, ...data }),
        createConversation: async () => {},
        getConversationsByUserId: async () => {}
      },
      messageService: {
        createMessage: async (convId, userId, data) => ({ _id: 'msg_' + Math.random(), conversationId: convId, userId, ...data }),
        getMessagesByConversationId: async () => []
      },
      profileService: {
        getProfileByUserId: async (userId) => {
          if (userId === 'valid_user') return { _id: 'prof_1', userId };
          return null;
        },
        upsertProfile: async () => {}
      },
      orchestratorService: {
        orchestrate: async () => ({
          status: 'needs_information',
          language: 'en',
          intent: 'general',
          informationGap: { isComplete: false },
          nextQuestion: { question: 'What?', language: 'en', source: 'fallback' }
        })
      }
    };
  };

  const setupApp = (mocks) => {
    const authMiddleware = (req, res, next) => {
      if (req.headers.authorization === 'Bearer VALID') {
        req.userId = 'valid_user';
        next();
      } else if (req.headers.authorization === 'Bearer VALID_B') {
        req.userId = 'user_b';
        next();
      } else {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      }
    };

    const messageController = proxyquire('./controllers/messageController', {
      '../services/conversationService': mocks.conversationService,
      '../services/messageService': mocks.messageService,
      '../services/profileService': mocks.profileService,
      '../orchestrator/orchestratorService': mocks.orchestratorService
    });

    const router = express.Router({ mergeParams: true });
    router.post('/', authMiddleware, messageController.createMessage);

    const app = express();
    app.use(express.json());
    app.use('/api/conversations/:conversationId/messages', router);
    return app;
  };

  // TEST 1 — Valid needs-information flow
  await runTest('TEST 1 - Valid needs-information flow', async () => {
    const mocks = createMocks();
    let createdMessages = [];
    
    mocks.messageService.createMessage = async (convId, userId, data) => {
      const msg = { _id: 'msg_' + createdMessages.length, conversationId: convId, userId, ...data };
      createdMessages.push(msg);
      return msg;
    };
    
    mocks.orchestratorService.orchestrate = async () => ({
      status: "needs_information",
      language: "te",
      intent: "crop_financing",
      informationGap: {
        requiredFields: ["location", "crop", "landArea"],
        collectedFields: ["crop"],
        missingFields: ["location", "landArea"],
        isComplete: false
      },
      nextQuestion: {
        field: "location",
        question: "మీరు ఏ ప్రాంతంలో వ్యవసాయం చేస్తున్నారు?",
        language: "te",
        source: "fallback"
      }
    });

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'I need a loan for paddy' });

    assertEq(res.status, 200, 'HTTP status should be 200');
    assertEq(res.body.success, true, 'success should be true');
    assertEq(createdMessages.length, 2, 'Should persist exactly two messages');
    
    const userMsg = createdMessages[0];
    const astMsg = createdMessages[1];
    
    assertEq(userMsg.role, 'user', 'First message is user');
    assertEq(astMsg.role, 'assistant', 'Second message is assistant');
    assertEq(astMsg.content, "మీరు ఏ ప్రాంతంలో వ్యవసాయం చేస్తున్నారు?", 'Assistant message content matches question');
    assertEq(astMsg.language, "te", 'Assistant message language matches question language');
    assertEq(res.body.data.orchestration.status, "needs_information", 'Returns orchestration state');
  });

  // TEST 2 — Ready-for-decision flow
  await runTest('TEST 2 - Ready-for-decision flow', async () => {
    const mocks = createMocks();
    let createdMessages = [];
    mocks.messageService.createMessage = async (convId, userId, data) => {
      const msg = { role: data.role, content: data.content, language: data.language };
      createdMessages.push(msg);
      return msg;
    };

    mocks.orchestratorService.orchestrate = async () => ({
      status: "ready_for_decision",
      language: "en",
      intent: "crop_financing",
      informationGap: { missingFields: [], collectedFields: [], isComplete: true },
      nextQuestion: null
    });

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'I have 3 acres of land' });

    assertEq(res.status, 200, 'HTTP status 200');
    assertEq(createdMessages.length, 2, 'Persists two messages');
    
    const astMsg = createdMessages[1];
    assertEq(astMsg.role, 'assistant', 'Is assistant message');
    assertEq(astMsg.content, "Thank you. I have enough information to understand your requirement. We can now evaluate suitable options.", 'Transition message matches');
  });

  // TEST 3 — Telugu conversation ready-for-decision
  await runTest('TEST 3 - Telugu conversation ready-for-decision', async () => {
    const mocks = createMocks();
    let createdMessages = [];
    mocks.messageService.createMessage = async (convId, userId, data) => {
      createdMessages.push(data);
      return data;
    };

    mocks.orchestratorService.orchestrate = async () => ({
      status: "ready_for_decision",
      language: "te",
      intent: "crop_financing",
      nextQuestion: null
    });

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'నేను వరి పండిస్తున్నాను' });

    assertEq(res.status, 200, 'HTTP status 200');
    assertEq(createdMessages[1].content, "ధన్యవాదాలు. మీ అవసరాన్ని అర్థం చేసుకోవడానికి అవసరమైన సమాచారం ఇప్పుడు ఉంది. ఇప్పుడు సరైన ఎంపికలను పరిశీలించవచ్చు.", 'Telugu transition message');
    assertEq(createdMessages[1].language, "te", 'Assistant language te');
  });

  // TEST 4 — Conversation ownership
  await runTest('TEST 4 - Conversation ownership', async () => {
    const mocks = createMocks();
    let orchCalled = false;
    mocks.orchestratorService.orchestrate = async () => { orchCalled = true; return {}; };

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID_B') // User B trying to access User A's conv
      .send({ content: 'Hello' });

    assertEq(res.status, 404, 'Returns 404 when not owned');
    assertEq(orchCalled, false, 'Orchestrator not called');
  });

  // TEST 5 — Conversation not found
  await runTest('TEST 5 - Conversation not found', async () => {
    const mocks = createMocks();
    let orchCalled = false;
    mocks.orchestratorService.orchestrate = async () => { orchCalled = true; return {}; };

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_doesnotexist/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'Hello' });

    assertEq(res.status, 404, 'Returns 404');
    assertEq(orchCalled, false, 'Orchestrator not called');
  });

  // TEST 6 — Invalid message
  await runTest('TEST 6 - Invalid message', async () => {
    const mocks = createMocks();
    let orchCalled = false;
    mocks.orchestratorService.orchestrate = async () => { orchCalled = true; return {}; };

    const cases = [
      {}, // missing content
      { content: '' }, // empty
      { content: '   ' }, // whitespace
      { content: 123 } // non-string
    ];

    const app = setupApp(mocks);
    for (const c of cases) {
      const res = await request(app)
        .post('/api/conversations/conv_123/messages')
        .set('Authorization', 'Bearer VALID')
        .send(c);
      
      assertEq(res.status, 400, `Returns 400 for ${JSON.stringify(c)}`);
    }
    assertEq(orchCalled, false, 'Orchestrator not called');
  });

  // TEST 7 — Orchestrator failure
  await runTest('TEST 7 - Orchestrator failure', async () => {
    const mocks = createMocks();
    let userMsgPersisted = false;
    let assistantMsgPersisted = false;
    mocks.messageService.createMessage = async (convId, userId, data) => {
      if (data.role === 'user') userMsgPersisted = true;
      if (data.role === 'assistant') assistantMsgPersisted = true;
      return { _id: 'm1', ...data };
    };
    
    mocks.orchestratorService.orchestrate = async () => {
      throw new Error('Fake internal error');
    };

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'trigger error' });

    assertEq(res.status, 500, 'Returns 500');
    assertEq(res.body.message, 'Internal server error', 'Error message is safe');
    assertEq(res.body.success, false, 'success is false');
    assertEq(userMsgPersisted, true, 'User message was still persisted before failure');
    assertEq(assistantMsgPersisted, false, 'No fake assistant response created');
  });

  // TEST 8 — Profile missing
  await runTest('TEST 8 - Profile missing', async () => {
    const mocks = createMocks();
    mocks.profileService.getProfileByUserId = async () => null; // Missing profile
    
    let passedProfile = undefined;
    mocks.orchestratorService.orchestrate = async (params) => {
      passedProfile = params.profile;
      return { status: 'ready_for_decision', language: 'en' };
    };

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'Hello' });

    assertEq(res.status, 200, 'Returns 200');
    assertEq(passedProfile, null, 'Orchestrator called with null profile');
  });

  // TEST 9 — Conversation intent/language persistence
  await runTest('TEST 9 - Conversation intent/language persistence', async () => {
    const mocks = createMocks();
    let updateCalled = false;
    let updateData = null;
    
    mocks.conversationService.updateConversation = async (id, uid, data) => {
      updateCalled = true;
      updateData = data;
      return {};
    };
    
    mocks.orchestratorService.orchestrate = async () => ({
      status: "needs_information",
      language: "te",
      intent: "crop_financing"
    });

    const app = setupApp(mocks);
    const res = await request(app)
      .post('/api/conversations/conv_123/messages')
      .set('Authorization', 'Bearer VALID')
      .send({ content: 'Hello in telugu' });

    assertEq(res.status, 200, 'Returns 200');
    assertEq(updateCalled, true, 'updateConversation was called');
    assertEq(updateData.language, 'te', 'Updated language to te');
    assertEq(updateData.intent, 'crop_financing', 'Updated intent to crop_financing');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();

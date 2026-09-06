# Implementation Plan: Phase 1 — Identity & Persistent Context

## Overview

Implement the Conversation/Message data layer, shared auth middleware, Google OAuth, and a minimal Dashboard login gate. Tasks follow dependency order: models → middleware → services → controllers/routes → app wiring → OAuth → frontend.

All backend code is CommonJS (`require`/`module.exports`). No try/catch in services. `req.userId` is the single source of truth for the requesting user's identity in all controllers.

---

## Tasks

- [x] 1. Create `src/models/Conversation.js`
  - Define Mongoose schema with fields: `userId` (ObjectId, ref `"User"`, required, `index: true`), `language` (String, enum `["en","te"]`, default `"en"`), `intent` (String, optional), `status` (String, enum `["active","completed","archived"]`, default `"active"`)
  - Add `{ timestamps: true }` to schema options
  - Export the model as `module.exports = mongoose.model("Conversation", conversationSchema)`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 1.1 Write property and unit tests for Conversation model (`tests/models/conversation.test.js`)
    - Set up `mongodb-memory-server` + Mongoose connection in `beforeAll`/`afterAll`
    - **Property 1: Conversation language enum enforcement** — use `fast-check` with `fc.string()` to generate arbitrary language values; assert save succeeds iff value ∈ `["en","te"]`; run 100 iterations
      - `// Feature: phase1-identity-context, Property 1: Conversation language enum enforcement`
    - **Property 2: Conversation status enum enforcement** — use `fast-check` with `fc.string()` to generate arbitrary status values; assert save succeeds iff value ∈ `["active","completed","archived"]`; run 100 iterations
      - `// Feature: phase1-identity-context, Property 2: Conversation status enum enforcement`
    - Example test: create Conversation without `intent` → succeeds
    - Example test: new Conversation has `createdAt` and `updatedAt`
    - _Requirements: 1.1–1.5_

- [x] 2. Create `src/models/Message.js`
  - Define Mongoose schema with fields: `conversationId` (ObjectId, ref `"Conversation"`, required, `index: true`), `role` (String, enum `["user","assistant","system"]`, required), `content` (String, required), `language` (String, default `"en"`), `intentData` (`mongoose.Schema.Types.Mixed`, optional)
  - Add `{ timestamps: true }` to schema options
  - Export the model as `module.exports = mongoose.model("Message", messageSchema)`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 2.1 Write property and unit tests for Message model (`tests/models/message.test.js`)
    - **Property 3: Message role enum enforcement** — use `fast-check` with `fc.string()` to generate arbitrary role values; assert save succeeds iff value ∈ `["user","assistant","system"]`; run 100 iterations
      - `// Feature: phase1-identity-context, Property 3: Message role enum enforcement`
    - Example test: omitting `content` produces ValidationError
    - Example test: new Message without `language` defaults to `"en"`
    - Example test: Message with and without `intentData` both save successfully
    - Example test: `createdAt` and `updatedAt` are present
    - _Requirements: 2.1–2.6_

- [x] 3. Create `src/middleware/authMiddleware.js`
  - Implement `authMiddleware(req, res, next)`:
    1. If `req.session && req.session.userId` is truthy → set `req.userId = req.session.userId` and call `next()`; return
    2. Add comment `// DEV-ONLY FALLBACK — remove this block once OAuth is verified`
    3. Read `req.headers["x-user-id"]`; if present and non-empty string after trim → set `req.userId = headerUserId.trim()`
    4. Call `next()` in all branches
  - Export: `module.exports = { authMiddleware }`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.1 Write property and unit tests for AuthMiddleware (`tests/middleware/authMiddleware.test.js`)
    - **Property 4: AuthMiddleware session propagation** — use `fast-check` with `fc.string({ minLength: 1 })` to generate userId strings; for each, mock `req.session.userId = userId`; assert `req.userId === userId` after middleware runs; run 100 iterations
      - `// Feature: phase1-identity-context, Property 4: AuthMiddleware session propagation`
    - **Property 5: AuthMiddleware x-user-id fallback trimming** — use `fast-check` with `fc.string({ minLength: 1 })` to generate strings, then wrap with random leading/trailing spaces; mock no session; assert `req.userId === trimmedValue`; run 100 iterations
      - `// Feature: phase1-identity-context, Property 5: AuthMiddleware x-user-id fallback trimming`
    - Example test: no session + no header → `req.userId` is `undefined` and `next` was called once
    - _Requirements: 3.1–3.5_

- [x] 4. Update `src/routes/profileRoutes.js` to use shared AuthMiddleware
  - At the top of the file, add: `const { authMiddleware } = require("../middleware/authMiddleware")`
  - Remove the inline `authMiddleware` function definition (the block starting with `// Placeholder auth middleware`)
  - Replace both usages of the inline `authMiddleware` on `router.get` and `router.patch` with the imported `authMiddleware`
  - No other changes to this file
  - _Requirements: 3.6_

- [x] 5. Create `src/services/conversationService.js`
  - Implement four exported functions — **no try/catch in any function**:
    1. `createConversation(userId, data)` — calls `Conversation.create({ userId, ...data })` and returns the result
    2. `getConversationById(conversationId, requestingUserId)` — calls `Conversation.findById(conversationId)`; if result is null or `result.userId.toString() !== requestingUserId.toString()` return `null`; else return result
    3. `getConversationsByUserId(userId)` — calls `Conversation.find({ userId })` and returns the array
    4. `updateConversation(conversationId, requestingUserId, updateData)` — first calls `getConversationById(conversationId, requestingUserId)`; if null return null; else calls `Conversation.findByIdAndUpdate(conversationId, { $set: updateData }, { new: true, runValidators: true })` and returns result
  - Export: `module.exports = { createConversation, getConversationById, getConversationsByUserId, updateConversation }`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 5.1 Write property and unit tests for conversationService (`tests/services/conversationService.test.js`)
    - Set up `mongodb-memory-server` in `beforeAll`; seed test users with valid ObjectIds
    - **Property 6: Conversation ownership isolation — read** — use `fast-check` to generate two distinct userId strings (convert to ObjectId); create a Conversation for userId_A; assert `getConversationById(id, userId_A)` returns doc and `getConversationById(id, userId_B)` returns null; run 100 iterations
      - `// Feature: phase1-identity-context, Property 6: Conversation ownership isolation — read`
    - **Property 7: Conversation list completeness** — use `fast-check` to generate an array of 2–10 userId strings and distribute conversations among them; for a random queried userId assert the returned array length equals the seeded count for that user and all docs have matching userId; run 100 iterations
      - `// Feature: phase1-identity-context, Property 7: Conversation list completeness`
    - **Property 8: Conversation ownership isolation — update** — use `fast-check` to generate two distinct userIds; create a Conversation for userId_A; assert `updateConversation(id, userId_B, { intent: "loan" })` returns null and doc is unchanged; assert `updateConversation(id, userId_A, { intent: "loan" })` returns updated doc; run 100 iterations
      - `// Feature: phase1-identity-context, Property 8: Conversation ownership isolation — update`
    - Example test: `getConversationById` with a random valid ObjectId that does not exist returns null
    - _Requirements: 4.1–4.8_

- [x] 6. Create `src/services/messageService.js`
  - Implement two exported functions — **no try/catch**:
    1. `createMessage(conversationId, requestingUserId, messageData)` — calls `conversationService.getConversationById(conversationId, requestingUserId)`; if null return null; else calls `Message.create({ conversationId, ...messageData })` and returns result
    2. `getMessagesByConversationId(conversationId, requestingUserId)` — calls `conversationService.getConversationById(conversationId, requestingUserId)`; if null return null; else calls `Message.find({ conversationId }).sort({ createdAt: 1 })` and returns the array
  - Export: `module.exports = { createMessage, getMessagesByConversationId }`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.1 Write property and unit tests for messageService (`tests/services/messageService.test.js`)
    - **Property 9: Message creation ownership enforcement** — use `fast-check` to generate two distinct userIds; create a Conversation for userId_A; assert `createMessage(convId, userId_B, { role: "user", content: "hi" })` returns null; assert `createMessage(convId, userId_A, { role: "user", content: "hi" })` returns a Message doc; run 100 iterations
      - `// Feature: phase1-identity-context, Property 9: Message creation ownership enforcement`
    - **Property 10: Message chronological sort invariant** — use `fast-check` to generate an array of 2–20 message contents with randomly shuffled timestamps; insert them all; call `getMessagesByConversationId`; assert the returned array is sorted by `createdAt` ascending; run 100 iterations
      - `// Feature: phase1-identity-context, Property 10: Message chronological sort invariant`
    - Example test: `getMessagesByConversationId` with a non-owned conversation returns null
    - _Requirements: 5.1–5.5_

- [x] 7. Create `src/controllers/conversationController.js`
  - Implement three exported async handler functions, each with try/catch:
    1. `createConversation(req, res)` — guard `!req.userId` → 401; extract `{ language, intent, status }` from `req.body`; call `conversationService.createConversation(req.userId, { language, intent, status })`; respond 201 with `{ conversation }`
    2. `listConversations(req, res)` — guard `!req.userId` → 401; call `conversationService.getConversationsByUserId(req.userId)`; respond 200 with `{ conversations }`
    3. `getConversation(req, res)` — guard `!req.userId` → 401; call `conversationService.getConversationById(req.params.conversationId, req.userId)`; if null respond 404 `{ message: "Conversation not found" }`; else respond 200 with `{ conversation }`
  - Catch block responds 500 `{ message: "Internal server error" }`; log error with `console.error`
  - Export: `module.exports = { createConversation, listConversations, getConversation }`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 7.1 Write property and unit tests for conversationController (`tests/controllers/conversationController.test.js`)
    - Use `supertest` to make HTTP requests; mock `conversationService` with `jest.mock`
    - **Property 11: Conversation controller — create happy path** — use `fast-check` to generate valid conversation body objects (language ∈ `["en","te"]`, optional intent strings); mock `createConversation` to return the body merged with `{ _id: "...", userId: "testUser" }`; assert 201 and body contains conversation with userId matching the auth header; run 100 iterations
      - `// Feature: phase1-identity-context, Property 11: Conversation controller — create happy path`
    - **Property 12: Conversation controller — list completeness** — use `fast-check` to generate arrays of 0–10 conversation objects; mock `getConversationsByUserId` to return that array; assert 200 and `body.conversations.length === generatedArray.length`; run 100 iterations
      - `// Feature: phase1-identity-context, Property 12: Conversation controller — list completeness`
    - Example test: POST without x-user-id header → 401
    - Example test: GET /:id when service returns null → 404
    - _Requirements: 6.1–6.7_

- [x] 8. Create `src/routes/conversationRoutes.js`
  - Import `express`, `{ authMiddleware }` from `../middleware/authMiddleware`, and `conversationController` from `../controllers/conversationController`
  - Define router:
    - `router.post("/", authMiddleware, conversationController.createConversation)`
    - `router.get("/", authMiddleware, conversationController.listConversations)`
    - `router.get("/:conversationId", authMiddleware, conversationController.getConversation)`
  - Export: `module.exports = router`
  - _Requirements: 6.1–6.7_

- [-] 9. Create `src/controllers/messageController.js`
  - Implement two exported async handler functions, each with try/catch:
    1. `createMessage(req, res)` — guard `!req.userId` → 401; extract `{ role, content, language, intentData }` from `req.body`; call `messageService.createMessage(req.params.conversationId, req.userId, { role, content, language, intentData })`; if null → 404 `{ message: "Conversation not found" }`; else respond 201 with `{ message: result }`
    2. `getMessages(req, res)` — guard `!req.userId` → 401; call `messageService.getMessagesByConversationId(req.params.conversationId, req.userId)`; if null → 404 `{ message: "Conversation not found" }`; else respond 200 with `{ messages }`
  - Catch block responds 500; log error
  - Export: `module.exports = { createMessage, getMessages }`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 9.1 Write property and unit tests for messageController (`tests/controllers/messageController.test.js`)
    - Use `supertest`; mock `messageService` with `jest.mock`
    - **Property 13: Message controller — create happy path** — use `fast-check` to generate message bodies with role ∈ `["user","assistant","system"]` and non-empty content strings; mock `createMessage` to return the body merged with `{ _id: "...", conversationId: "conv1" }`; assert 201 and body.message has correct role and content; run 100 iterations
      - `// Feature: phase1-identity-context, Property 13: Message controller — create happy path`
    - **Property 14: Message controller — get chronological order** — use `fast-check` to generate arrays of message objects with `createdAt` timestamps; mock `getMessagesByConversationId` to return the array already sorted (service responsibility); assert 200 and the response array equals the mocked array in order; run 100 iterations
      - `// Feature: phase1-identity-context, Property 14: Message controller — get chronological order`
    - Example test: POST without auth → 401
    - Example test: POST when service returns null → 404
    - Example test: GET when service returns null → 404
    - _Requirements: 7.1–7.6_

- [ ] 10. Create `src/routes/messageRoutes.js`
  - Import `express`, `{ authMiddleware }` from `../middleware/authMiddleware`, and `messageController` from `../controllers/messageController`
  - Define router with `mergeParams: true` so `:conversationId` from the parent router is accessible:
    ```js
    const router = express.Router({ mergeParams: true });
    ```
  - `router.post("/", authMiddleware, messageController.createMessage)`
  - `router.get("/", authMiddleware, messageController.getMessages)`
  - Export: `module.exports = router`
  - _Requirements: 7.1–7.6_

- [~] 11. Register conversation and message routes in `src/app.js`
  - Add at the top (after existing requires):
    ```js
    const conversationRoutes = require("./routes/conversationRoutes");
    const messageRoutes = require("./routes/messageRoutes");
    ```
  - Add after the existing route registrations (before `module.exports = app`):
    ```js
    app.use("/api/conversations", conversationRoutes);
    app.use("/api/conversations/:conversationId/messages", messageRoutes);
    ```
  - Do NOT remove or modify existing `/api/users` or `/api/profile` registrations
  - _Requirements: 6.7_

- [~] 12. Checkpoint — Conversation/Message layer smoke test
  - Ensure all tests pass: `npx jest tests/models tests/middleware tests/services tests/controllers --runInBand`
  - Manually smoke-test with curl or Postman using `x-user-id` header:
    - POST `/api/conversations` → expect 201
    - GET `/api/conversations` → expect 200 with array
    - POST `/api/conversations/:id/messages` → expect 201
    - GET `/api/conversations/:id/messages` → expect 200 with array
  - Ask the user if any issues arise before continuing.

- [~] 13. Install OAuth dependencies
  - In `backend/` directory run: `npm install passport@0.7.0 passport-google-oauth20@2.0.0 express-session@1.18.1`
  - Verify the three packages appear in `backend/package.json` under `dependencies`
  - _Requirements: 8.1–8.10_

- [~] 14. Create `src/auth/passport.js`
  - Require: `passport`, `GoogleStrategy` from `passport-google-oauth20`, `userService` from `../services/userService`, `User` from `../models/User`
  - Configure strategy:
    ```js
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback"
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const user = await userService.createUser({
          name, email, authProvider: "google", authProviderId: profile.id
        });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }));
    ```
  - Implement `passport.serializeUser((user, done) => done(null, user._id.toString()))`
  - Implement `passport.deserializeUser(async (id, done) => { try { const user = await User.findById(id); done(null, user); } catch(err) { done(err); } })`
  - No exports needed (side-effect module)
  - _Requirements: 8.1, 8.2, 8.3_

- [~] 15. Create `src/auth/authRoutes.js`
  - Require: `express`, `passport`
  - Define router:
    - `GET /google` → `passport.authenticate("google", { scope: ["profile", "email"] })`
    - `GET /google/callback` → `passport.authenticate("google", { failureRedirect: "/" })` then handler: `req.session.userId = req.user._id.toString()` then `res.redirect(process.env.DASHBOARD_URL || "http://localhost:5173")`
    - `GET /me` → handler: if `!req.user` return 401 `{ message: "Not authenticated" }`; else 200 `{ user: req.user }`
    - `GET /logout` → handler: `req.logout((err) => { if (err) return res.status(500).json({ message: "Logout error" }); req.session.destroy(); res.status(200).json({ message: "Logged out" }); })`
  - Export: `module.exports = router`
  - _Requirements: 8.4, 8.5, 8.6, 8.7_

- [~] 16. Update `src/app.js` to wire session, passport, and auth routes
  - Add requires at top of file (after existing requires):
    ```js
    const session = require("express-session");
    const passport = require("passport");
    require("./auth/passport");  // configures passport strategies (side-effect)
    const authRoutes = require("./auth/authRoutes");
    ```
  - Add middleware in this order, **before** route registrations:
    ```js
    app.use(session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    ```
  - Add route registration **before** `module.exports = app`:
    ```js
    app.use("/auth", authRoutes);
    ```
  - Do NOT remove or modify any existing routes or middleware
  - Add `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and optionally `GOOGLE_CALLBACK_URL` and `DASHBOARD_URL` to `backend/.env`
  - _Requirements: 8.8, 8.9, 8.10_

- [~] 17. Checkpoint — Test OAuth flow end-to-end
  - Start the backend: `npm run dev`
  - Open browser and navigate to `http://localhost:5000/auth/google`
  - Complete Google sign-in; confirm redirect to Dashboard URL
  - Call `GET http://localhost:5000/auth/me` in browser/Postman; confirm `{ user: { ... } }` is returned
  - Call `GET http://localhost:5000/api/conversations` (no x-user-id header); confirm 200 (session-authenticated)
  - Call `GET http://localhost:5000/auth/logout`; call `/auth/me` again; confirm 401
  - Ask the user if any issues arise before continuing.

- [~] 18. Create `Dashboard/src/hooks/useAuth.js`
  - Create directory `Dashboard/src/hooks/` if it does not exist
  - Implement hook using `useState` and `useEffect`:
    ```js
    import { useState, useEffect } from "react";
    export function useAuth() {
      const [user, setUser] = useState(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      useEffect(() => {
        fetch("/auth/me", { credentials: "include" })
          .then(res => {
            if (!res.ok) throw new Error("Not authenticated");
            return res.json();
          })
          .then(data => { setUser(data.user); setLoading(false); })
          .catch(err => { setError(err); setUser(null); setLoading(false); });
      }, []);
      return { user, loading, error };
    }
    ```
  - _Requirements: 9.1, 9.2, 9.3_

- [~] 19. Create `Dashboard/src/pages/LoginPage.jsx`
  - Implement a minimal login page component:
    ```jsx
    export default function LoginPage() {
      return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              AI SAATHI
            </h1>
            <p className="text-gray-400">Sign in to continue</p>
            <button
              onClick={() => { window.location.href = "/auth/google"; }}
              className="px-6 py-3 bg-yellow-400 text-gray-950 font-semibold rounded-lg hover:bg-yellow-300 transition"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      );
    }
    ```
  - _Requirements: 9.4_

- [~] 20. Update `Dashboard/src/App.jsx` to add auth gate
  - Import `useAuth` from `./hooks/useAuth` and `LoginPage` from `./pages/LoginPage`
  - At the top of the `App` component body, call `const { user, loading } = useAuth()`
  - Add conditional rendering before the existing `return` statement:
    ```jsx
    if (loading) return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <span className="text-gray-400">Loading…</span>
      </div>
    );
    if (!user) return <LoginPage />;
    ```
  - The existing `return` statement (with BrowserRouter, Sidebar, Routes) remains **completely unchanged**
  - Do NOT modify any existing page components or Sidebar/Header components
  - _Requirements: 9.5, 9.6, 9.7, 9.8_

- [~] 21. Configure Vite proxy for `/auth` routes in Dashboard
  - Open `Dashboard/vite.config.js`
  - Add a `server.proxy` entry so `/auth` is forwarded to the backend (avoids CORS during dev):
    ```js
    server: {
      proxy: {
        "/auth": "http://localhost:5000",
        "/api": "http://localhost:5000"
      }
    }
    ```
  - This enables `fetch("/auth/me", { credentials: "include" })` to work in the Dashboard dev server without cross-origin issues
  - _Requirements: 9.1–9.7_

- [~] 22. Phase 1 final non-regression test
  - Run backend tests: `npx jest --runInBand` — all tests must pass
  - Start backend and Dashboard dev servers
  - Verify the full auth flow: Dashboard shows LoginPage → sign in with Google → Dashboard shows main layout → existing pages (FinancialNews, InvestmentAssistant, etc.) load unchanged
  - Verify existing endpoints still work: `GET /api/profile` with `x-user-id` header → 200; `POST /api/users` → 201
  - Ask the user to confirm before closing the spec.

---

## Notes

- Tasks marked with `*` are optional (testing tasks) and can be skipped for a faster MVP; run them to ensure correctness properties hold.
- The `x-user-id` fallback in AuthMiddleware is intentionally temporary. After OAuth is confirmed working (checkpoint 17), delete the `// DEV-ONLY FALLBACK` block from `authMiddleware.js` — no other file changes needed.
- All services are intentionally try/catch-free; this is by design to keep error propagation explicit.
- `messageRoutes.js` uses `mergeParams: true` because message routes are mounted under `/api/conversations/:conversationId/messages` and need access to `:conversationId` from the parent path.
- Environment variables to add to `backend/.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `GOOGLE_CALLBACK_URL` (optional), `DASHBOARD_URL` (optional).

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3"] },
    { "wave": 2, "tasks": ["4", "5"] },
    { "wave": 3, "tasks": ["6", "7", "8"] },
    { "wave": 4, "tasks": ["9", "10"] },
    { "wave": 5, "tasks": ["11"] },
    { "wave": 6, "tasks": ["12"] },
    { "wave": 7, "tasks": ["13"] },
    { "wave": 8, "tasks": ["14", "15"] },
    { "wave": 9, "tasks": ["16"] },
    { "wave": 10, "tasks": ["17"] },
    { "wave": 11, "tasks": ["18", "19", "21"] },
    { "wave": 12, "tasks": ["20"] },
    { "wave": 13, "tasks": ["22"] }
  ]
}
```

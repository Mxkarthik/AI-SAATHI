# Design Document: Phase 1 — Identity & Persistent Context

## Overview

This document describes the technical design for Phase 1 of AI Saathi. The goal is to layer identity (Google OAuth 2.0 via Passport.js) and persistent conversation context (Conversation + Message models with ownership enforcement) onto the existing Express + Mongoose backend, and to add a minimal auth-gate to the React Dashboard.

The backend is Node.js with CommonJS modules, Express ^5.2.1, Mongoose ^9.9.5. The frontend is React 19 + Vite. All new backend code follows the existing conventions: no try/catch in services, controllers own error responses, route files stay thin.

---

## Architecture

```
Browser (Dashboard)
    │
    ├─ GET /auth/google         ─────────────────────────────────────────┐
    │                                                                     │
    │  (redirected by Google)                                             ▼
    └─ GET /auth/google/callback ←── Google OAuth 2.0 ──► PassportConfig
                                                              │
                                                              ▼
                                                     userService.createUser
                                                     (find-or-create)
                                                              │
                                                              ▼
                                                     Session cookie issued
                                                     req.session.userId = _id

API requests (with session cookie or x-user-id header)
    │
    ▼
AuthMiddleware
    │  sets req.userId
    ▼
Route Handlers
    ├── /api/profile          → profileController (unchanged)
    ├── /api/conversations    → conversationController
    │       └── /:id/messages → messageController
    └── /api/users            → userController (unchanged)

Service Layer (no try/catch)
    ├── conversationService   → Conversation model
    ├── messageService        → Message model + conversationService
    ├── profileService        → FinancialProfile model (unchanged)
    └── userService           → User model (unchanged)
```

### Authentication Flow

```
1. User clicks "Sign in with Google"
2. Browser navigates to GET /auth/google
3. Passport redirects to Google OAuth consent screen
4. Google redirects to GET /auth/google/callback with code
5. Passport exchanges code for profile
6. GoogleStrategy callback → userService.createUser (find-or-create)
7. passport.serializeUser stores user._id.toString() in session
8. Session cookie returned to browser
9. All subsequent API requests include session cookie
10. AuthMiddleware reads req.session.userId → sets req.userId
11. Controllers work unchanged
```

### Dev-Only Fallback Path

During development, when no Google OAuth session exists, AuthMiddleware accepts `x-user-id` header. This fallback will be removed (single block deletion) once OAuth is verified end-to-end.

---

## Components and Interfaces

### `src/models/Conversation.js`

```js
{
  userId:    ObjectId (ref: "User", required, indexed),
  language:  String   (enum: ["en","te"], default: "en"),
  intent:    String   (optional),
  status:    String   (enum: ["active","completed","archived"], default: "active"),
  timestamps: true
}
```

### `src/models/Message.js`

```js
{
  conversationId: ObjectId (ref: "Conversation", required, indexed),
  role:           String   (enum: ["user","assistant","system"], required),
  content:        String   (required),
  language:       String   (default: "en"),
  intentData:     Mixed    (optional),
  timestamps: true
}
```

### `src/middleware/authMiddleware.js`

```js
function authMiddleware(req, res, next) {
  // Primary: session (set by OAuth)
  if (req.session && req.session.userId) {
    req.userId = req.session.userId;
    return next();
  }
  // DEV-ONLY FALLBACK — remove this block once OAuth is verified
  const headerUserId = req.headers["x-user-id"];
  if (headerUserId && typeof headerUserId === "string" && headerUserId.trim().length > 0) {
    req.userId = headerUserId.trim();
  }
  next();
}
module.exports = { authMiddleware };
```

### `src/services/conversationService.js`

| Function | Signature | Returns |
|---|---|---|
| createConversation | (userId, data) | Conversation doc |
| getConversationById | (conversationId, requestingUserId) | Conversation doc or null |
| getConversationsByUserId | (userId) | Array of Conversation docs |
| updateConversation | (conversationId, requestingUserId, updateData) | Updated doc or null |

Ownership check pattern used in `getConversationById` and `updateConversation`:
```js
const conv = await Conversation.findById(conversationId);
if (!conv || conv.userId.toString() !== requestingUserId.toString()) return null;
```

### `src/services/messageService.js`

| Function | Signature | Returns |
|---|---|---|
| createMessage | (conversationId, requestingUserId, messageData) | Message doc or null |
| getMessagesByConversationId | (conversationId, requestingUserId) | Array of Message docs (asc) or null |

`messageService` calls `conversationService.getConversationById` internally for ownership check before any Message operation.

### `src/controllers/conversationController.js`

| Handler | Route | Behavior |
|---|---|---|
| createConversation | POST /api/conversations | 201 + doc; 401 if no userId |
| listConversations | GET /api/conversations | 200 + array |
| getConversation | GET /api/conversations/:conversationId | 200 + doc; 404 if null |

### `src/controllers/messageController.js`

| Handler | Route | Behavior |
|---|---|---|
| createMessage | POST /api/conversations/:conversationId/messages | 201 + doc; 401 if no userId; 404 if null |
| getMessages | GET /api/conversations/:conversationId/messages | 200 + array; 404 if null |

### `src/auth/passport.js`

- Configures `GoogleStrategy` with `clientID`, `clientSecret`, `callbackURL`
- Calls `userService.createUser({ name, email, authProvider: "google", authProviderId })`
- `serializeUser`: stores `user._id.toString()`
- `deserializeUser`: calls `User.findById(id)`

### `src/auth/authRoutes.js`

| Route | Method | Description |
|---|---|---|
| /auth/google | GET | Initiates OAuth; scopes: profile, email |
| /auth/google/callback | GET | Handles callback; redirects to Dashboard on success |
| /auth/me | GET | Returns `{ user }` or 401 |
| /auth/logout | GET | Destroys session; returns 200 |

### `Dashboard/src/hooks/useAuth.js`

```js
// Calls GET /auth/me on mount
// Returns { user, loading, error }
```

### `Dashboard/src/pages/LoginPage.jsx`

- Single "Sign in with Google" button
- `onClick`: `window.location.href = '/auth/google'`

### Updated `src/app.js`

```js
// Added:
const session = require("express-session");
const passport = require("passport");
require("./auth/passport");  // side-effect: configures passport
const authRoutes = require("./auth/authRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/api/conversations", conversationRoutes);
// message routes nested inside conversationRoutes via express Router
```

---

## Data Models

### Conversation Document

```
{
  _id:       ObjectId,
  userId:    ObjectId  → User._id,
  language:  "en" | "te",
  intent:    String | undefined,
  status:    "active" | "completed" | "archived",
  createdAt: Date,
  updatedAt: Date
}
```

### Message Document

```
{
  _id:            ObjectId,
  conversationId: ObjectId  → Conversation._id,
  role:           "user" | "assistant" | "system",
  content:        String,
  language:       "en" | "te" | any,
  intentData:     any | undefined,
  createdAt:      Date,
  updatedAt:      Date
}
```

### Index Strategy

- `Conversation.userId` — index: enables fast lookup of all conversations per user
- `Message.conversationId` — index: enables fast retrieval of all messages in a conversation
- Mongoose applies these indexes automatically via `index: true` on the field definition

### Relationships

```
User (1) ──────── (N) Conversation
Conversation (1) ── (N) Message
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Conversation language enum enforcement

*For any* string value supplied as `language` when creating a Conversation, the Mongoose validation SHALL accept the value if and only if it is in `["en", "te"]`; any other string SHALL produce a ValidationError.

**Validates: Requirements 1.2**

---

### Property 2: Conversation status enum enforcement

*For any* string value supplied as `status` when creating a Conversation, Mongoose validation SHALL accept the value if and only if it is in `["active", "completed", "archived"]`; any other string SHALL produce a ValidationError.

**Validates: Requirements 1.4**

---

### Property 3: Message role enum enforcement

*For any* string value supplied as `role` when creating a Message, Mongoose validation SHALL accept the value if and only if it is in `["user", "assistant", "system"]`; any other string SHALL produce a ValidationError.

**Validates: Requirements 2.2**

---

### Property 4: AuthMiddleware session propagation

*For any* non-empty string value placed in `req.session.userId`, the AuthMiddleware SHALL set `req.userId` to exactly that value and call `next()`.

**Validates: Requirements 3.1**

---

### Property 5: AuthMiddleware x-user-id fallback trimming

*For any* non-empty string value (including strings with leading/trailing whitespace) supplied in the `x-user-id` header when no session userId exists, the AuthMiddleware SHALL set `req.userId` to the trimmed version of that value.

**Validates: Requirements 3.2**

---

### Property 6: Conversation ownership isolation — read

*For any* Conversation document owned by `userId_A`, calling `getConversationById(id, userId_B)` where `userId_B ≠ userId_A` SHALL return `null`; calling it with `userId_A` SHALL return the Conversation document.

**Validates: Requirements 4.2, 4.3**

---

### Property 7: Conversation list completeness

*For any* collection of Conversation documents distributed across multiple userIds, `getConversationsByUserId(userId)` SHALL return exactly the subset of documents whose `userId` field matches the queried value — no more, no fewer.

**Validates: Requirements 4.5**

---

### Property 8: Conversation ownership isolation — update

*For any* Conversation document owned by `userId_A`, calling `updateConversation(id, userId_B, data)` where `userId_B ≠ userId_A` SHALL return `null` and SHALL NOT modify the document; calling it with `userId_A` and valid `updateData` SHALL return the updated document with the changes applied.

**Validates: Requirements 4.6, 4.7**

---

### Property 9: Message creation ownership enforcement

*For any* Conversation owned by `userId_A`, calling `createMessage(convId, userId_B, messageData)` where `userId_B ≠ userId_A` SHALL return `null` and create no Message document; calling it with `userId_A` and valid `messageData` SHALL return a persisted Message document with the correct `conversationId` and fields.

**Validates: Requirements 5.1, 5.2**

---

### Property 10: Message chronological sort invariant

*For any* set of Messages belonging to an owned Conversation, `getMessagesByConversationId(convId, ownerId)` SHALL return the messages in strictly non-decreasing order of `createdAt`, regardless of the order in which they were inserted.

**Validates: Requirements 5.3**

---

### Property 11: Conversation controller — create happy path

*For any* valid conversation creation body sent to `POST /api/conversations` by an authenticated user (non-null `req.userId`), the response SHALL have status 201 and a body containing the created Conversation document with a `userId` matching the authenticated user.

**Validates: Requirements 6.1**

---

### Property 12: Conversation controller — list completeness

*For any* authenticated user with N conversations, `GET /api/conversations` SHALL return an array of exactly N items, each belonging to that user.

**Validates: Requirements 6.3**

---

### Property 13: Message controller — create happy path

*For any* valid message body sent to `POST /api/conversations/:conversationId/messages` by the owning user, the response SHALL have status 201 and a body containing a Message document with the correct `role`, `content`, and `conversationId`.

**Validates: Requirements 7.1**

---

### Property 14: Message controller — get chronological order

*For any* set of messages in a conversation owned by the requesting user, `GET /api/conversations/:conversationId/messages` SHALL return an array sorted by `createdAt` ascending.

**Validates: Requirements 7.4**

---

## Error Handling

### Service Layer (no try/catch)

Services let errors propagate. Database errors (network, duplicate key, validation) surface to controllers as thrown exceptions.

### Controller Layer

All controllers follow this pattern:

```js
const handler = async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ message: "Unauthorized" });
    // ... call service
    const result = await someService.doSomething(...);
    if (result === null) return res.status(404).json({ message: "... not found" });
    res.status(200).json({ ... });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Handler error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

### Auth Error Cases

| Scenario | Response |
|---|---|
| No session + no x-user-id header | 401 from controller |
| OAuth callback failure | Passport redirects to Dashboard (failure URL) |
| Session missing during deserializeUser | Passport clears session; next request gets 401 |
| x-user-id header present but empty string | AuthMiddleware ignores it; req.userId not set |

### Ownership Errors

- Service returns `null` for any ownership failure
- Controller uniformly returns HTTP 404 (not 403) to avoid leaking existence of other users' resources

---

## Testing Strategy

### Scope and Approach

The testing strategy uses a dual approach:
- **Unit / integration tests** — for schema validation, service functions, and controller HTTP behavior, using an in-memory MongoDB instance (e.g., `mongodb-memory-server`) so no live database is required
- **Property-based tests** — for the 14 correctness properties identified above, using `fast-check` as the PBT library

Property-based tests run a minimum of **100 iterations** each. Each test is annotated with a comment in the format:
```
// Feature: phase1-identity-context, Property N: <property text>
```

### Test File Layout

```
backend/
  tests/
    models/
      conversation.test.js   — Properties 1, 2; schema examples
      message.test.js        — Property 3; schema examples
    middleware/
      authMiddleware.test.js — Properties 4, 5; edge case (no userId)
    services/
      conversationService.test.js — Properties 6, 7, 8
      messageService.test.js      — Properties 9, 10
    controllers/
      conversationController.test.js — Properties 11, 12
      messageController.test.js      — Properties 13, 14
    auth/
      oauth.integration.test.js — Manual / integration: OAuth flow (1-2 examples)
```

### PBT Configuration (`fast-check`)

```js
const fc = require("fast-check");
// Minimum 100 runs per property
fc.assert(fc.property(...), { numRuns: 100 });
```

### Unit Test Targets (example-based, no PBT)

- Schema optionality for `intent` and `intentData`
- Timestamps present after creation
- `getConversationById` returns null for non-existent ObjectId
- AuthMiddleware: both session path and header path set req.userId; missing both leaves req.userId undefined
- Controller 401 when req.userId missing
- Controller 404 when service returns null
- OAuth flow: integration test with mocked Google profile verifying session creation and user find-or-create

### Not Tested Programmatically

- Google OAuth redirect URLs (require live Google endpoint)
- `express-session` cookie behavior (framework responsibility)
- Frontend visual rendering and CSS (not testable as properties)
- Code comment presence (code review)
- `req.body.userId` rejection (code review + controller unit test)

### Testing Framework Setup

Add to `backend/package.json` devDependencies:
```json
"jest": "^29.x",
"mongodb-memory-server": "^10.x",
"fast-check": "^3.x",
"supertest": "^7.x"
```

Run tests: `npx jest --runInBand` (runInBand prevents parallel MongoDB memory server conflicts)

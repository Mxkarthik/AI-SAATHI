# Requirements Document

## Introduction

Phase 1 of AI Saathi establishes the identity and persistent context layer for a Node.js + Express + MongoDB backend. This phase delivers: (1) Conversation and Message data models that track multi-turn AI chat sessions per user; (2) service and controller layers with ownership-enforced access; (3) a shared authentication middleware replacing inline per-route auth logic; (4) Google OAuth 2.0 via Passport.js so real users can sign in; and (5) a minimal login surface in the existing React Dashboard. Together these form the foundation all future AI interaction features depend on.

The backend stack is Node.js + Express ^5.2.1 + Mongoose ^9.9.5 using CommonJS modules. The frontend is React 19 + Vite with react-router-dom ^7.

---

## Glossary

- **System**: The AI Saathi backend Express application.
- **Dashboard**: The AI Saathi React + Vite frontend application in `Dashboard/src`.
- **Conversation**: A MongoDB document representing a single chat session belonging to one User, modelled by `src/models/Conversation.js`.
- **Message**: A MongoDB document representing a single chat turn within a Conversation, modelled by `src/models/Message.js`.
- **ConversationService**: The module at `src/services/conversationService.js` that encapsulates all Conversation database operations.
- **MessageService**: The module at `src/services/messageService.js` that encapsulates all Message database operations.
- **ConversationController**: The module at `src/controllers/conversationController.js` that handles HTTP requests for Conversation endpoints.
- **MessageController**: The module at `src/controllers/messageController.js` that handles HTTP requests for Message endpoints.
- **AuthMiddleware**: The shared module at `src/middleware/authMiddleware.js` that identifies the requesting user and sets `req.userId`.
- **PassportConfig**: The module at `src/auth/passport.js` that configures Passport.js with the Google OAuth 2.0 strategy.
- **AuthRoutes**: The module at `src/auth/authRoutes.js` that exposes OAuth initiation, callback, session query, and logout endpoints.
- **Ownership**: The constraint that a user may only read or modify Conversations and Messages that were created by that same user.
- **req.userId**: The string value set on the Express request object by AuthMiddleware, representing the authenticated user's MongoDB `_id`.
- **x-user-id**: The HTTP request header used as a development-only fallback to supply `req.userId` when no active session exists.
- **GoogleStrategy**: The Passport.js strategy for Google OAuth 2.0, provided by the `passport-google-oauth20` package.
- **Session**: A server-side session managed by `express-session`, identified by a cookie, that persists `req.session.userId` across requests after OAuth login.

---

## Requirements

### Requirement 1: Conversation Model

**User Story:** As a developer, I want a Conversation Mongoose model, so that AI chat sessions can be stored and queried per user.

#### Acceptance Criteria

1. THE Conversation model SHALL define a `userId` field of type `mongoose.Schema.Types.ObjectId` referencing `"User"`, marked required, with a database index.
2. THE Conversation model SHALL define a `language` field of type String with a default of `"en"` and an enum restricted to `["en", "te"]`.
3. THE Conversation model SHALL define an `intent` field of type String that is optional (not required).
4. THE Conversation model SHALL define a `status` field of type String with an enum of `["active", "completed", "archived"]` and a default of `"active"`.
5. THE Conversation model SHALL include Mongoose `timestamps: true` so `createdAt` and `updatedAt` fields are automatically managed.

---

### Requirement 2: Message Model

**User Story:** As a developer, I want a Message Mongoose model, so that individual chat turns can be stored, retrieved, and associated with a Conversation.

#### Acceptance Criteria

1. THE Message model SHALL define a `conversationId` field of type `mongoose.Schema.Types.ObjectId` referencing `"Conversation"`, marked required, with a database index.
2. THE Message model SHALL define a `role` field of type String, marked required, with an enum restricted to `["user", "assistant", "system"]`.
3. THE Message model SHALL define a `content` field of type String, marked required.
4. THE Message model SHALL define a `language` field of type String with a default of `"en"`.
5. THE Message model SHALL define an `intentData` field of type `mongoose.Schema.Types.Mixed` that is optional (not required), reserved for future AI extraction.
6. THE Message model SHALL include Mongoose `timestamps: true` so `createdAt` and `updatedAt` fields are automatically managed.

---

### Requirement 3: Shared Authentication Middleware

**User Story:** As a developer, I want a single importable authentication middleware, so that all API routes identify the requesting user consistently without duplicating logic.

#### Acceptance Criteria

1. THE AuthMiddleware SHALL read the value from `req.session.userId` and assign it to `req.userId` when a valid session exists.
2. IF `req.session.userId` is absent or falsy, THEN THE AuthMiddleware SHALL read `req.headers["x-user-id"]`, trim the value, and assign it to `req.userId` as a development-only fallback.
3. THE AuthMiddleware SHALL include a clearly visible code comment marking the `x-user-id` branch as `DEV-ONLY FALLBACK`.
4. WHEN neither a session nor the `x-user-id` header provides a valid user identifier, THE AuthMiddleware SHALL call `next()` without setting `req.userId`, leaving the controller responsible for returning a 401 response.
5. THE AuthMiddleware SHALL be exported as a named export from `src/middleware/authMiddleware.js` and importable by any route file.
6. WHEN `src/routes/profileRoutes.js` is updated, THE System SHALL import `authMiddleware` from `src/middleware/authMiddleware.js` instead of defining it inline, with no other changes to that file.

---

### Requirement 4: Conversation Service

**User Story:** As a developer, I want a ConversationService with ownership-enforced operations, so that conversation data is never exposed or modified across user boundaries.

#### Acceptance Criteria

1. WHEN `ConversationService.createConversation(userId, data)` is called, THE ConversationService SHALL create and return a new Conversation document with `userId` set to the provided value and `data` fields merged in.
2. WHEN `ConversationService.getConversationById(conversationId, requestingUserId)` is called and the Conversation's `userId` matches `requestingUserId`, THE ConversationService SHALL return the Conversation document.
3. IF `ConversationService.getConversationById(conversationId, requestingUserId)` is called and the Conversation's `userId` does not match `requestingUserId`, THEN THE ConversationService SHALL return `null`.
4. IF `ConversationService.getConversationById(conversationId, requestingUserId)` is called and no Conversation with that `conversationId` exists, THEN THE ConversationService SHALL return `null`.
5. WHEN `ConversationService.getConversationsByUserId(userId)` is called, THE ConversationService SHALL return an array of all Conversation documents whose `userId` matches the provided value.
6. WHEN `ConversationService.updateConversation(conversationId, requestingUserId, updateData)` is called and ownership is confirmed, THE ConversationService SHALL apply `updateData` to the Conversation and return the updated document.
7. IF `ConversationService.updateConversation(conversationId, requestingUserId, updateData)` is called and the Conversation is not owned by `requestingUserId`, THEN THE ConversationService SHALL return `null`.
8. THE ConversationService SHALL NOT wrap database calls in try/catch blocks; errors SHALL bubble up to the calling controller.

---

### Requirement 5: Message Service

**User Story:** As a developer, I want a MessageService with ownership-enforced operations, so that messages can only be created and read within conversations the requesting user owns.

#### Acceptance Criteria

1. WHEN `MessageService.createMessage(conversationId, requestingUserId, messageData)` is called and the Conversation exists and is owned by `requestingUserId`, THE MessageService SHALL create and return a new Message document associated with that Conversation.
2. IF `MessageService.createMessage(conversationId, requestingUserId, messageData)` is called and the Conversation does not exist or is not owned by `requestingUserId`, THEN THE MessageService SHALL return `null`.
3. WHEN `MessageService.getMessagesByConversationId(conversationId, requestingUserId)` is called and ownership is confirmed, THE MessageService SHALL return all Message documents for that Conversation sorted by `createdAt` ascending.
4. IF `MessageService.getMessagesByConversationId(conversationId, requestingUserId)` is called and ownership is not confirmed, THEN THE MessageService SHALL return `null`.
5. THE MessageService SHALL NOT wrap database calls in try/catch blocks; errors SHALL bubble up to the calling controller.

---

### Requirement 6: Conversation Controller and Routes

**User Story:** As a frontend developer, I want Conversation HTTP endpoints, so that the Dashboard can create and list chat sessions for the authenticated user.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/conversations` with a valid `req.userId`, THE ConversationController SHALL call `ConversationService.createConversation` and respond with HTTP 201 and the created Conversation.
2. IF a POST request is made to `/api/conversations` and `req.userId` is absent, THEN THE ConversationController SHALL respond with HTTP 401 and a JSON body `{ "message": "Unauthorized" }`.
3. WHEN a GET request is made to `/api/conversations` with a valid `req.userId`, THE ConversationController SHALL call `ConversationService.getConversationsByUserId` and respond with HTTP 200 and an array of Conversations.
4. WHEN a GET request is made to `/api/conversations/:conversationId` with a valid `req.userId` and the user owns the Conversation, THE ConversationController SHALL respond with HTTP 200 and the Conversation document.
5. IF a GET request is made to `/api/conversations/:conversationId` and ownership is not confirmed (service returns `null`), THEN THE ConversationController SHALL respond with HTTP 404 and `{ "message": "Conversation not found" }`.
6. THE ConversationController SHALL read the requesting user's identity exclusively from `req.userId`; userId SHALL NOT be accepted from `req.body` or `req.query`.
7. THE System SHALL register Conversation routes at `/api/conversations` in `src/app.js`.

---

### Requirement 7: Message Controller and Routes

**User Story:** As a frontend developer, I want Message HTTP endpoints, so that the Dashboard can post and retrieve messages within a conversation the user owns.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/conversations/:conversationId/messages` with a valid `req.userId` and the user owns the Conversation, THE MessageController SHALL call `MessageService.createMessage` and respond with HTTP 201 and the created Message.
2. IF a POST request is made to `/api/conversations/:conversationId/messages` and `req.userId` is absent, THEN THE MessageController SHALL respond with HTTP 401 and `{ "message": "Unauthorized" }`.
3. IF a POST request is made to `/api/conversations/:conversationId/messages` and the service returns `null` (ownership or existence failure), THEN THE MessageController SHALL respond with HTTP 404 and `{ "message": "Conversation not found" }`.
4. WHEN a GET request is made to `/api/conversations/:conversationId/messages` with a valid `req.userId` and ownership is confirmed, THE MessageController SHALL respond with HTTP 200 and the messages array sorted chronologically.
5. IF a GET request is made to `/api/conversations/:conversationId/messages` and ownership is not confirmed, THEN THE MessageController SHALL respond with HTTP 404 and `{ "message": "Conversation not found" }`.
6. THE MessageController SHALL read the requesting user's identity exclusively from `req.userId`.

---

### Requirement 8: Google OAuth 2.0 Authentication

**User Story:** As a user, I want to sign in with my Google account, so that AI Saathi can identify me and persist my data securely across sessions.

#### Acceptance Criteria

1. THE System SHALL configure Passport.js with a `GoogleStrategy` in `src/auth/passport.js`, using `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` environment variables and a callback URL derived from the environment.
2. WHEN the GoogleStrategy callback is invoked with a verified Google profile, THE PassportConfig SHALL call `userService.createUser` with the profile's email, name, and Google provider details (find-or-create semantics).
3. THE PassportConfig SHALL implement `passport.serializeUser` to store `user._id.toString()` in the session and `passport.deserializeUser` to look up the user by that id.
4. THE AuthRoutes SHALL expose `GET /auth/google` to initiate the Google OAuth flow with scopes `["profile", "email"]`.
5. WHEN Google redirects to `GET /auth/google/callback`, THE AuthRoutes SHALL complete the Passport verification and redirect the browser to the Dashboard home URL on success.
6. THE AuthRoutes SHALL expose `GET /auth/me` that returns HTTP 200 with `{ user: req.user }` when a session exists, or HTTP 401 with `{ "message": "Not authenticated" }` when no session exists.
7. THE AuthRoutes SHALL expose `GET /auth/logout` that destroys the session and responds with HTTP 200 and `{ "message": "Logged out" }`.
8. THE System SHALL add `express-session` middleware to `src/app.js` with `SESSION_SECRET` from the environment, `resave: false`, and `saveUninitialized: false`.
9. THE System SHALL initialize `passport` and `passport.session()` in `src/app.js` after the session middleware.
10. THE System SHALL register `AuthRoutes` at `/auth` in `src/app.js` without removing existing `/api/users` or `/api/profile` routes.

---

### Requirement 9: Frontend Minimal Auth Integration

**User Story:** As a user, I want the Dashboard to detect whether I am logged in and show a login button when I am not, so that I can authenticate without navigating away from the app manually.

#### Acceptance Criteria

1. THE Dashboard SHALL expose a `useAuth` hook in `Dashboard/src/hooks/useAuth.js` that calls `GET /auth/me` on mount and returns `{ user, loading, error }`.
2. WHEN `GET /auth/me` returns HTTP 200, THE useAuth hook SHALL set `user` to the returned user object and `loading` to `false`.
3. WHEN `GET /auth/me` returns a non-200 status, THE useAuth hook SHALL set `user` to `null` and `loading` to `false`.
4. THE Dashboard SHALL expose a `LoginPage` component in `Dashboard/src/pages/LoginPage.jsx` that displays a "Sign in with Google" button which navigates the browser to `GET /auth/google` on click.
5. WHEN `useAuth` reports `loading: true`, THE Dashboard App SHALL render a loading indicator instead of the main layout.
6. WHEN `useAuth` reports `user: null` and `loading: false`, THE Dashboard App SHALL render the `LoginPage` component instead of the main layout.
7. WHEN `useAuth` reports a non-null `user` and `loading: false`, THE Dashboard App SHALL render the existing main layout unchanged.
8. THE Dashboard SHALL NOT redesign or modify existing page components (`FinancialNews`, `InvestmentAssistant`, `BudgetAssistant`, `Community`, `LoanAssistant`).

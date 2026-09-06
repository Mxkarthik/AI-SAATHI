# Requirements Document

## Introduction

The FinancialProfile feature extends the AI Saathi backend with a dedicated profile layer that captures agricultural and financial information for each user. Because a farmer's profile is built incrementally — across multiple sessions and interactions — every field is optional and the system supports partial updates at any time. Two HTTP endpoints expose this capability: one to fetch the current profile and one to create or update it. Authentication is enforced through a middleware contract (`req.userId`) so that a user can never read or modify another user's profile.

## Glossary

- **FinancialProfile**: The Mongoose document that stores agricultural and financial data for a single User. One document exists per User.
- **ProfileService**: The service module (`src/services/profileService.js`) responsible for all business logic and MongoDB operations related to FinancialProfile documents.
- **ProfileController**: The controller module (`src/controllers/profileController.js`) responsible for handling HTTP request/response concerns for profile endpoints.
- **ProfileRoutes**: The Express router module (`src/routes/profileRoutes.js`) responsible for mapping HTTP methods and paths to ProfileController handlers.
- **Auth_Middleware**: A future Express middleware that authenticates incoming requests and sets `req.userId` to the authenticated user's MongoDB ObjectId before any profile handler runs.
- **Upsert**: A MongoDB `findOneAndUpdate` operation with `upsert: true` that creates the document if it does not exist or updates it if it does, returning the resulting document.
- **LandUnit**: An enumerated value describing the unit of land area measurement. Valid values: `acres`, `hectares`, `bigha`.
- **Ownership**: An enumerated value describing how a farmer holds their land. Valid values: `owned`, `leased`, `shared`.

---

## Requirements

### Requirement 1: FinancialProfile Data Model

**User Story:** As a backend developer, I want a Mongoose schema that represents a farmer's agricultural and financial profile, so that the data is consistently structured and persisted in MongoDB.

#### Acceptance Criteria

1. THE FinancialProfile SHALL define a `userId` field that references the `User` model as a MongoDB ObjectId, is required and unique in the collection, enforcing a one-profile-per-user constraint.
2. THE FinancialProfile SHALL define a `location` sub-document with three optional string fields — `state`, `district`, and `mandal` — each with a maximum length of 100 characters.
3. THE FinancialProfile SHALL define a `farming` sub-document with optional fields: `landArea` (Number, min: 0, max: 999999), `landUnit` (String, enum: `acres` / `hectares` / `bigha`), and `ownership` (String, enum: `owned` / `leased` / `shared`).
4. THE FinancialProfile SHALL define a `crops` field as an optional array of strings (max 50 entries, each string max 100 characters) representing crop names.
5. THE FinancialProfile SHALL define an `irrigation` sub-document with an optional `typeOrSource` string field (max 200 characters).
6. THE FinancialProfile SHALL define a `financial` sub-document with optional fields: `farmIncome` (Number, min: 0, max: 999999999), `otherIncome` (Number, min: 0, max: 999999999), `monthlyExpenses` (Number, min: 0, max: 999999999), and `existingLoans` (array of up to 20 objects, each with optional `lender` string (max 100 chars) and optional `amount` number (min: 0, max: 999999999)).
7. THE FinancialProfile SHALL define an `assets` sub-document with optional fields: `equipment` (array of up to 50 strings, each max 100 characters) and `livestock` (array of up to 50 strings, each max 100 characters).
8. THE FinancialProfile SHALL include Mongoose `timestamps` so that `createdAt` and `updatedAt` are automatically managed.
9. THE FinancialProfile SHALL set no top-level fields as required except `userId`, so that the profile can be created and updated incrementally.
10. IF a `PATCH /api/profile` request provides an invalid enum value for `landUnit` or `ownership`, THEN the system SHALL reject the request with HTTP 400 and a JSON body containing a `message` field describing the validation error.

---

### Requirement 2: Fetch Profile Endpoint

**User Story:** As an authenticated user, I want to retrieve my financial profile, so that I can see the information currently stored about me.

#### Acceptance Criteria

1. THE ProfileRoutes SHALL expose a `GET /api/profile` endpoint that invokes the ProfileController's fetch handler.
2. WHEN a `GET /api/profile` request is received, THE ProfileController SHALL read the authenticated user's identity exclusively from `req.userId` and SHALL NOT read `userId` from `req.body`, `req.query`, or `req.params`.
3. IF `req.userId` is absent or null at the time the handler executes, THEN THE ProfileController SHALL return HTTP 401 with a JSON body containing a `message` field set to `"Unauthorized"`.
4. IF `req.userId` is present and resolves to an existing FinancialProfile document, THEN THE ProfileController SHALL delegate to ProfileService and return HTTP 200 with a JSON body containing a `profile` field holding the document.
5. IF `req.userId` is present but does not resolve to an existing FinancialProfile document, THEN THE ProfileController SHALL return HTTP 404 with a JSON body containing a `message` field set to `"Profile not found"`.
6. IF an unexpected error occurs during the fetch operation, THEN THE ProfileController SHALL return HTTP 500 with a JSON body containing a `message` field set to `"Internal server error"`.
7. THE ProfileService SHALL implement a `getProfileByUserId(userId)` function that queries MongoDB for a FinancialProfile document where `userId` matches the provided value and returns the document or `null`.

---

### Requirement 3: Create or Update Profile Endpoint

**User Story:** As an authenticated user, I want to create or update my financial profile with partial data, so that I can build up my profile gradually over multiple interactions.

#### Acceptance Criteria

1. THE ProfileRoutes SHALL expose a `PATCH /api/profile` endpoint that invokes the ProfileController's upsert handler.
2. WHEN a `PATCH /api/profile` request is received, THE ProfileController SHALL read the authenticated user's identity exclusively from `req.userId` and SHALL NOT read or trust a `userId` value from `req.body`.
3. IF `req.body` is absent, empty, or not a non-empty object containing at least one recognized profile field, THEN THE ProfileController SHALL return HTTP 400 with a JSON body containing a `message` field set to `"Request body must contain at least one profile field"`.
4. WHEN a `PATCH /api/profile` request is received with a valid body (a non-empty object with at least one recognized profile field, with any `userId` field stripped), THE ProfileService SHALL perform a MongoDB upsert — creating the document if none exists for `req.userId`, or merging the provided top-level profile fields into the existing document if one does — and return the resulting document.
5. WHEN the upsert operation succeeds, THE ProfileController SHALL return HTTP 200 with a JSON body containing a `message` field set to `"Profile saved successfully"` and a `profile` field holding the resulting document.
6. IF the upsert operation fails due to a Mongoose validation error (e.g., invalid enum value, number out of range), THEN THE ProfileController SHALL return HTTP 400 with a JSON body containing a `message` field describing the validation error.
7. IF an unexpected error occurs during the upsert operation, THEN THE ProfileController SHALL return HTTP 500 with a JSON body containing a `message` field set to `"Internal server error"`.

---

### Requirement 4: Route Registration

**User Story:** As a backend developer, I want the profile routes registered in the main Express application, so that the endpoints are reachable under the `/api/profile` path.

#### Acceptance Criteria

1. THE ProfileRoutes module SHALL use `express.Router()` and export the router instance.
2. WHEN the application starts, THE App SHALL register ProfileRoutes under the `/api/profile` prefix in `app.js` using `app.use("/api/profile", profileRoutes)`.
3. WHEN the profile routes are added to `app.js`, THE existing `GET /api/users` and `POST /api/users` endpoints SHALL remain reachable and return their existing responses, confirming that `userRoutes`, `userController`, `userService`, and the `User` model were not modified.

---

### Requirement 5: Layered Architecture Compliance

**User Story:** As a backend developer, I want each layer to have a single, well-defined responsibility, so that the codebase remains maintainable and consistent with existing conventions.

#### Acceptance Criteria

1. THE ProfileRoutes module SHALL contain only `express.Router()` declarations and route-to-handler bindings; it SHALL NOT import Mongoose models and SHALL NOT call any Mongoose query methods directly.
2. THE ProfileController SHALL read from `req` and write to `res`, and SHALL delegate all data retrieval and persistence to ProfileService methods; it SHALL NOT call any Mongoose query methods (e.g., `findOne`, `findOneAndUpdate`, `save`) directly.
3. THE ProfileService SHALL contain all Mongoose query calls and business logic; it SHALL NOT import `express`, and its exported functions SHALL NOT accept or reference `req` or `res` objects.
4. THE FinancialProfile model file SHALL contain only the Mongoose schema definition and the `mongoose.model()` call; it SHALL NOT import or reference controllers, services, or route modules.

---

### Requirement 6: Test Commands Documentation

**User Story:** As a developer, I want ready-to-use curl and PowerShell test commands for both profile endpoints, so that I can manually verify the feature after deployment without writing my own HTTP calls.

#### Acceptance Criteria

1. THE documentation SHALL provide a `curl` command for `GET /api/profile` targeting `http://localhost:5000/api/profile` that includes an `x-user-id` header set to a hardcoded 24-character hexadecimal MongoDB ObjectId string (e.g., `507f1f77bcf86cd799439011`).
2. THE documentation SHALL provide a `curl` command for `PATCH /api/profile` targeting `http://localhost:5000/api/profile` that includes the same `x-user-id` header and a JSON body with at least one representative field from each of the following groups: `location`, `farming`, `crops`, `irrigation`, `financial`, and `assets`.
3. THE documentation SHALL provide PowerShell `Invoke-RestMethod` commands for both endpoints using the same URL, the same `x-user-id` header value, and structurally equivalent request bodies as the curl counterparts.
4. THE documentation SHALL include a note stating that the `x-user-id` header is used only for manual testing with the placeholder middleware and will be replaced by proper JWT-based authentication in production.

# Implementation Plan: financial-profile

## Overview

Implement the `financial-profile` feature following the existing layered architecture (`model → service → controller → routes → app registration`). New files are created in isolation; only `app.js` is modified. Authentication uses a placeholder middleware that reads `x-user-id` from request headers and sets `req.userId`.

## Tasks

- [x] 1. Create the FinancialProfile Mongoose model
  - [x] 1.1 Create `backend/src/models/FinancialProfile.js`
    - Define `loanSchema` with `{ _id: false }`, optional `lender` (String, maxlength: 100) and `amount` (Number, min: 0, max: 999999999)
    - Define `financialProfileSchema` with `userId` (ObjectId, ref: `'User'`, required, unique), `location`, `farming`, `crops`, `irrigation`, `financial`, and `assets` sub-documents/arrays exactly as specified in the design
    - Add array-length custom validators for `crops` (≤ 50), `financial.existingLoans` (≤ 20), `assets.equipment` (≤ 50), `assets.livestock` (≤ 50)
    - Enable `{ timestamps: true }` on the schema
    - Export `mongoose.model('FinancialProfile', financialProfileSchema)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

  - [ ]* 1.2 Write property test for string length constraints (Property 1)
    - **Property 1: String length constraints are enforced universally**
    - Use `fast-check` with `mongodb-memory-server` for an in-memory MongoDB instance
    - Generate strings of length `maxlength + 1` to `maxlength + 200` for each constrained field; assert `ValidationError` is thrown
    - Generate strings of length 0 to `maxlength`; assert document passes validation
    - Run ≥ 100 iterations
    - Tag: `// Feature: financial-profile, Property 1: string length constraints`
    - **Validates: Requirements 1.2, 1.4, 1.5, 1.6, 1.7**

  - [ ]* 1.3 Write property test for numeric range and enum constraints (Property 2)
    - **Property 2: Numeric range and enum constraints are enforced universally**
    - Use `fc.integer({ min: -999999, max: -1 })` and values above each field's max for numeric fields; assert rejection
    - Use `fc.string()` filtered to exclude valid enum values for `landUnit` and `ownership`; assert rejection
    - Valid values within range and valid enum members should pass
    - Run ≥ 100 iterations
    - Tag: `// Feature: financial-profile, Property 2: numeric range and enum constraints`
    - **Validates: Requirements 1.3, 1.6, 1.10**

  - [ ]* 1.4 Write property test for array size limits (Property 3)
    - **Property 3: Array size limits are enforced universally**
    - Generate arrays exceeding each limit (`crops` > 50, `existingLoans` > 20, `equipment` / `livestock` > 50); assert `ValidationError`
    - Arrays within limits should be accepted
    - Run ≥ 100 iterations
    - Tag: `// Feature: financial-profile, Property 3: array size limits`
    - **Validates: Requirements 1.4, 1.6, 1.7**

- [x] 2. Implement ProfileService
  - [x] 2.1 Create `backend/src/services/profileService.js`
    - Import `FinancialProfile` from `'../models/FinancialProfile'`
    - Implement `async getProfileByUserId(userId)` — calls `FinancialProfile.findOne({ userId })`, returns document or `null`
    - Implement `async upsertProfile(userId, profileData)` — calls `FinancialProfile.findOneAndUpdate({ userId }, { $set: profileData }, { new: true, upsert: true, runValidators: true, context: 'query' })`, returns the resulting document
    - Export both functions
    - _Requirements: 2.7, 3.4, 5.3_

  - [ ]* 2.2 Write property test for upsert round-trip (Property 4)
    - **Property 4: Upsert round-trip — created or updated profile is retrievable with correct data**
    - Use `mongodb-memory-server` for in-memory MongoDB
    - Generate arbitrary valid profile data objects (all fields optional, all within constraints) with `fast-check`
    - Assert that `upsertProfile(userId, data)` followed by `getProfileByUserId(userId)` returns a document whose fields reflect the written values
    - Also test sequential upserts: each merge is reflected in subsequent fetch
    - Run ≥ 100 iterations
    - Tag: `// Feature: financial-profile, Property 4: upsert round-trip`
    - **Validates: Requirements 2.4, 2.7, 3.4, 3.5**

- [x] 3. Checkpoint — model and service layer complete
  - Ensure all non-optional tests pass, ask the user if questions arise.

- [x] 4. Implement ProfileController
  - [x] 4.1 Create `backend/src/controllers/profileController.js`
    - Import `profileService` from `'../services/profileService'`
    - Define `RECOGNISED_FIELDS = ['location', 'farming', 'crops', 'irrigation', 'financial', 'assets']`
    - Implement `async getProfile(req, res)`:
      - Guard: `if (!req.userId)` → 401 `{ message: "Unauthorized" }`
      - Delegate to `profileService.getProfileByUserId(req.userId)`
      - If `null` → 404 `{ message: "Profile not found" }`
      - Otherwise → 200 `{ profile }`
      - Catch-all → 500 `{ message: "Internal server error" }`
    - Implement `async upsertProfile(req, res)`:
      - Guard: `if (!req.userId)` → 401 `{ message: "Unauthorized" }`
      - Strip `userId` from `req.body`: `const { userId: _stripped, ...sanitisedBody } = req.body`
      - Check `RECOGNISED_FIELDS.some(f => f in sanitisedBody)`; if false → 400 `{ message: "Request body must contain at least one profile field" }`
      - Delegate to `profileService.upsertProfile(req.userId, sanitisedBody)`
      - Success → 200 `{ message: "Profile saved successfully", profile }`
      - `error.name === 'ValidationError'` → 400 `{ message: error.message }`
      - Catch-all → 500 `{ message: "Internal server error" }`
    - Export `{ getProfile, upsertProfile }`
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.2_

  - [ ]* 4.2 Write property test for empty/unrecognised PATCH body rejection (Property 5)
    - **Property 5: Empty or unrecognised PATCH body is rejected universally**
    - Use `fast-check` to generate objects containing only non-recognised keys, plus hardcoded `{}` and `{ userId: "..." }`
    - Assert controller returns HTTP 400 with `{ message: "Request body must contain at least one profile field" }`
    - Run ≥ 100 iterations
    - Tag: `// Feature: financial-profile, Property 5: empty body rejection`
    - **Validates: Requirements 3.3**

  - [ ]* 4.3 Write property test for invalid enum/range → HTTP 400 (Property 6)
    - **Property 6: Invalid enum or out-of-range values in PATCH body produce HTTP 400**
    - Generate PATCH bodies with invalid `landUnit` / `ownership` strings (not in enum) and out-of-range numeric values
    - Assert controller returns 400, never 200 or 500
    - Run ≥ 100 iterations
    - Tag: `// Feature: financial-profile, Property 6: invalid enum/range → HTTP 400`
    - **Validates: Requirements 1.10, 3.6**

- [x] 5. Implement ProfileRoutes and auth placeholder middleware
  - [x] 5.1 Create `backend/src/routes/profileRoutes.js`
    - Define the auth placeholder middleware inline:
      ```js
      const authMiddleware = (req, res, next) => {
        const userId = req.headers['x-user-id'];
        if (userId) req.userId = userId;
        next();
      };
      ```
    - Create `express.Router()` instance
    - Register `router.get('/', authMiddleware, profileController.getProfile)`
    - Register `router.patch('/', authMiddleware, profileController.upsertProfile)`
    - Export the router
    - No Mongoose imports; no direct query calls
    - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [x] 6. Register profile routes in app.js
  - [x] 6.1 Modify `backend/src/app.js`
    - Add `const profileRoutes = require('./routes/profileRoutes');` after the `userRoutes` import
    - Add `app.use('/api/profile', profileRoutes);` after `app.use('/api/users', userRoutes)`
    - Do NOT modify any other line in `app.js`
    - _Requirements: 4.2, 4.3_

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify existing `GET /` and `POST /api/users` still work (non-regression, Requirement 4.3)

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- `fast-check` and `mongodb-memory-server` must be added to `devDependencies` before running property tests: `npm install --save-dev fast-check mongodb-memory-server`
- Jest is the recommended test runner (add `jest` to `devDependencies` if not already present)
- The `x-user-id` placeholder middleware lives in `profileRoutes.js`; the controller only ever reads `req.userId`
- Do NOT modify `userRoutes.js`, `userController.js`, `userService.js`, `User.js`, or `server.js`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 5, "tasks": ["6.1"] }
  ]
}
```

# Design Document — financial-profile

## Overview

The `financial-profile` feature extends the AI Saathi backend with a dedicated layer for storing and retrieving a farmer's agricultural and financial information. Because a farmer builds their profile incrementally across many sessions, the design favours a flexible, partial-update model: no field beyond `userId` is required, and every PATCH request merges only the supplied fields into the existing document.

Two HTTP endpoints are exposed under `/api/profile`:

| Method | Path          | Purpose                              |
|--------|---------------|--------------------------------------|
| GET    | /api/profile  | Fetch the authenticated user's profile |
| PATCH  | /api/profile  | Create or update the profile (upsert) |

Authentication is handled through a lightweight placeholder middleware that reads `req.headers['x-user-id']` and writes it to `req.userId`. This contract will be preserved when real JWT authentication is introduced later — the controller layer only ever reads `req.userId` and never touches the raw header.

---

## Architecture

The feature follows the existing three-layer architecture of the backend:

```
HTTP Request
     │
     ▼
[ Auth Middleware ]   ← reads x-user-id header → sets req.userId
     │
     ▼
[ ProfileRoutes ]     ← express.Router(), maps paths to handlers
     │
     ▼
[ ProfileController ] ← HTTP concerns only (req/res), delegates to service
     │
     ▼
[ ProfileService ]    ← all Mongoose queries and business logic
     │
     ▼
[ FinancialProfile ]  ← Mongoose model / MongoDB collection
```

Each layer has a single, well-defined responsibility:

- **ProfileRoutes** — router declarations and route-to-handler bindings only.
- **ProfileController** — reads `req`, writes `res`, delegates all data work to ProfileService.
- **ProfileService** — all MongoDB operations; never touches `req` or `res`.
- **FinancialProfile model** — Mongoose schema and `mongoose.model()` call only.

This is identical to the convention used by the existing `userRoutes → userController → userService → User` stack.

---

## Components and Interfaces

### Auth Placeholder Middleware

A small inline middleware (defined in `profileRoutes.js` or as a shared file if preferred) that bridges the header to the controller contract:

```js
// Placeholder — will be replaced by JWT middleware
const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    req.userId = userId;
  }
  next(); // always call next; 401 is the controller's responsibility
};
```

The middleware sets `req.userId` when the header is present and calls `next()` unconditionally. Absence of the header means `req.userId` remains `undefined`, which the controller interprets as unauthenticated.

### ProfileRoutes (`src/routes/profileRoutes.js`)

```
GET  /api/profile  → authMiddleware → profileController.getProfile
PATCH /api/profile → authMiddleware → profileController.upsertProfile
```

No Mongoose imports. No query logic. Router export only.

### ProfileController (`src/controllers/profileController.js`)

Exports two handlers:

**`getProfile(req, res)`**
1. Guard: if `!req.userId` → 401 `{ message: "Unauthorized" }`.
2. Delegate to `profileService.getProfileByUserId(req.userId)`.
3. If `null` returned → 404 `{ message: "Profile not found" }`.
4. Otherwise → 200 `{ profile }`.
5. Catch-all → 500 `{ message: "Internal server error" }`.

**`upsertProfile(req, res)`**
1. Guard: if `!req.userId` → 401 `{ message: "Unauthorized" }`.
2. Validate body: strip `userId` from `req.body`; if the remaining object has no recognised profile key → 400 `{ message: "Request body must contain at least one profile field" }`.
3. Delegate to `profileService.upsertProfile(req.userId, sanitisedBody)`.
4. Success → 200 `{ message: "Profile saved successfully", profile }`.
5. Mongoose `ValidationError` → 400 `{ message: error.message }`.
6. Catch-all → 500 `{ message: "Internal server error" }`.

### ProfileService (`src/services/profileService.js`)

Exports two functions:

**`getProfileByUserId(userId)`**
```js
async function getProfileByUserId(userId) {
  return FinancialProfile.findOne({ userId });
  // returns document or null
}
```

**`upsertProfile(userId, profileData)`**
```js
async function upsertProfile(userId, profileData) {
  return FinancialProfile.findOneAndUpdate(
    { userId },
    { $set: profileData },
    { new: true, upsert: true, runValidators: true, context: 'query' }
  );
}
```

Key options:
- `new: true` — return the document after update.
- `upsert: true` — create if not found.
- `runValidators: true` — run Mongoose validators on update (required for enum/range checks on PATCH).
- `context: 'query'` — required for validators that rely on `this` in query context.

### app.js modification

Add after the existing `userRoutes` registration:

```js
const profileRoutes = require('./routes/profileRoutes');
// ...
app.use('/api/profile', profileRoutes);
```

No other changes to `app.js`.

---

## Data Models

### FinancialProfile Schema (`src/models/FinancialProfile.js`)

```js
const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  lender: { type: String, maxlength: 100 },
  amount: { type: Number, min: 0, max: 999999999 }
}, { _id: false });

const financialProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  location: {
    state:    { type: String, maxlength: 100 },
    district: { type: String, maxlength: 100 },
    mandal:   { type: String, maxlength: 100 }
  },

  farming: {
    landArea:  { type: Number, min: 0, max: 999999 },
    landUnit:  { type: String, enum: ['acres', 'hectares', 'bigha'] },
    ownership: { type: String, enum: ['owned', 'leased', 'shared'] }
  },

  crops: {
    type: [{ type: String, maxlength: 100 }],
    validate: {
      validator: (arr) => arr.length <= 50,
      message: 'crops array cannot exceed 50 entries'
    }
  },

  irrigation: {
    typeOrSource: { type: String, maxlength: 200 }
  },

  financial: {
    farmIncome:      { type: Number, min: 0, max: 999999999 },
    otherIncome:     { type: Number, min: 0, max: 999999999 },
    monthlyExpenses: { type: Number, min: 0, max: 999999999 },
    existingLoans: {
      type: [loanSchema],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'existingLoans array cannot exceed 20 entries'
      }
    }
  },

  assets: {
    equipment: {
      type: [{ type: String, maxlength: 100 }],
      validate: {
        validator: (arr) => arr.length <= 50,
        message: 'equipment array cannot exceed 50 entries'
      }
    },
    livestock: {
      type: [{ type: String, maxlength: 100 }],
      validate: {
        validator: (arr) => arr.length <= 50,
        message: 'livestock array cannot exceed 50 entries'
      }
    }
  }

}, { timestamps: true });

const FinancialProfile = mongoose.model('FinancialProfile', financialProfileSchema);
module.exports = FinancialProfile;
```

**Design decisions:**

- `loanSchema` uses `{ _id: false }` to suppress auto-generated `_id` on sub-documents since individual loans are not addressed by id.
- Array-length constraints (crops ≤ 50, loans ≤ 20, equipment/livestock ≤ 50) are implemented as Mongoose custom validators because Mongoose does not have a built-in `maxlength` for arrays.
- All fields except `userId` are optional, supporting incremental profile building.
- `unique: true` on `userId` enforces the one-profile-per-user constraint at the database index level.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is a good candidate for property-based testing on its validation and service layers. The schema imposes numeric ranges, string length limits, and enum constraints that must hold universally across all inputs, not just the specific examples developers choose to test. The service layer has a round-trip `upsert → fetch` property that should hold for any valid profile data.

The recommended PBT library for Node.js is **[fast-check](https://github.com/dubzzz/fast-check)**. Each property test must run a minimum of 100 iterations.

**Redundancy reflection:** 1.2–1.7 and 1.10 all test "schema/validation rejects invalid input and accepts valid input." These are grouped into two consolidated properties (string length vs. numeric range/enum) to avoid a long list of near-identical properties. 2.4 and 2.7 describe the same fetch round-trip from HTTP and service perspectives — consolidated into Property 4. 3.4 and 3.5 describe the same upsert operation — consolidated into Property 4 as well. 3.3 and 3.6 test distinct validation paths (empty body vs. bad values) and are kept separate as Properties 5 and 6. Final set: six distinct properties.

---

### Property 1: String length constraints are enforced universally

*For any* string value assigned to a FinancialProfile string field that has a `maxlength` constraint (`location.state`, `location.district`, `location.mandal`, `irrigation.typeOrSource`, `crops[]`, `financial.existingLoans[].lender`, `assets.equipment[]`, `assets.livestock[]`), if the string length exceeds the field's declared maximum, Mongoose schema validation SHALL reject the document with a validation error; if the length is within the maximum, the document SHALL be accepted.

**Validates: Requirements 1.2, 1.4, 1.5, 1.6, 1.7**

---

### Property 2: Numeric range and enum constraints are enforced universally

*For any* numeric value assigned to `farming.landArea`, `financial.farmIncome`, `financial.otherIncome`, `financial.monthlyExpenses`, or `financial.existingLoans[].amount`, if the value is below 0 or above the field's declared maximum, Mongoose validation SHALL reject the document. For any string value assigned to `farming.landUnit` or `farming.ownership` that is not a member of the declared enum, Mongoose validation SHALL reject the document. Valid values within range and valid enum members SHALL be accepted.

**Validates: Requirements 1.3, 1.6, 1.10**

---

### Property 3: Array size limits are enforced universally

*For any* array assigned to `crops`, `assets.equipment`, or `assets.livestock`, if the array contains more than 50 elements, Mongoose validation SHALL reject the document. For `financial.existingLoans`, if the array contains more than 20 elements, Mongoose validation SHALL reject the document. Arrays within their declared limits SHALL be accepted.

**Validates: Requirements 1.4, 1.6, 1.7**

---

### Property 4: Upsert round-trip — created or updated profile is retrievable with correct data

*For any* valid profile data object (containing any subset of recognised profile fields with values within their constraints), calling `profileService.upsertProfile(userId, data)` followed by `profileService.getProfileByUserId(userId)` SHALL return a document whose fields reflect the values that were written. The same property holds when multiple sequential upserts are performed: each upsert merges its fields into the document, and a subsequent fetch returns the latest merged state.

**Validates: Requirements 2.4, 2.7, 3.4, 3.5**

---

### Property 5: Empty or unrecognised PATCH body is rejected universally

*For any* PATCH `/api/profile` request whose body contains no recognised profile fields (including the empty object `{}`, a body with only a `userId` key, and a body with only unrecognised keys), the ProfileController SHALL return HTTP 400 with `{ message: "Request body must contain at least one profile field" }`, regardless of the specific keys or values present in the unrecognised body.

**Validates: Requirements 3.3**

---

### Property 6: Invalid enum or out-of-range values in PATCH body produce HTTP 400

*For any* PATCH `/api/profile` request that contains a value for `farming.landUnit` or `farming.ownership` that is not a valid enum member, or a numeric value for any bounded numeric field that falls outside `[0, max]`, the ProfileController SHALL return HTTP 400 with a JSON body containing a `message` field describing the validation error. The response SHALL never be 200 or 500 for these inputs.

**Validates: Requirements 1.10, 3.6**

---

## Error Handling

| Scenario | Layer | HTTP Status | Response body |
|---|---|---|---|
| Missing / null `req.userId` | Controller | 401 | `{ message: "Unauthorized" }` |
| Profile not found (GET) | Controller | 404 | `{ message: "Profile not found" }` |
| Empty / unrecognised PATCH body | Controller | 400 | `{ message: "Request body must contain at least one profile field" }` |
| Mongoose `ValidationError` (PATCH) | Controller | 400 | `{ message: <error.message> }` |
| Any other thrown error | Controller | 500 | `{ message: "Internal server error" }` |

**Mongoose ValidationError detection:**

```js
if (error.name === 'ValidationError') {
  return res.status(400).json({ message: error.message });
}
```

**Body sanitisation:**

Before passing `req.body` to the service, the controller strips the `userId` key to prevent a caller from overriding ownership:

```js
const { userId: _stripped, ...sanitisedBody } = req.body;
```

**Recognised fields check:**

```js
const RECOGNISED_FIELDS = ['location', 'farming', 'crops', 'irrigation', 'financial', 'assets'];
const hasRecognisedField = RECOGNISED_FIELDS.some(f => f in sanitisedBody);
if (!hasRecognisedField) {
  return res.status(400).json({ message: 'Request body must contain at least one profile field' });
}
```

---

## Testing Strategy

### Unit Tests (example-based)

Use a test runner such as **Jest** (not yet installed — add `jest` to `devDependencies`).

**Model-level examples:**
- Creating a FinancialProfile with only `userId` succeeds (Requirement 1.9).
- Creating two FinancialProfiles with the same `userId` throws a duplicate-key error (Requirement 1.1).
- A newly-created document has `createdAt` and `updatedAt` Date fields (Requirement 1.8).

**Controller examples (using `supertest` + mocks):**
- GET without `x-user-id` header → 401 (Requirement 2.3).
- GET with valid userId, profile not found → 404 (Requirement 2.5).
- GET, service throws unexpectedly → 500 (Requirement 2.6).
- PATCH, service throws unexpectedly → 500 (Requirement 3.7).
- PATCH, body is `{}` → 400 (Requirement 3.3).
- PATCH, body has only `userId` key → 400 (Requirement 3.3).

**Non-regression examples:**
- POST `/api/users` still returns 201 after profile routes are registered (Requirement 4.3).
- GET `/` still returns the health message (Requirement 4.3).

### Property-Based Tests (fast-check)

Install: `npm install --save-dev fast-check`

Each property test must run **≥ 100 iterations** (fast-check default is 100).

Tag format: `// Feature: financial-profile, Property <N>: <short description>`

**Property 1 — String length constraints**
- Generator: arbitrary strings of length `maxlength + 1` to `maxlength + 200` for each constrained field.
- Assertion: `FinancialProfile.validate()` (or a save to in-memory MongoDB via `mongodb-memory-server`) throws/rejects with a ValidationError.
- Complement: arbitrary strings of length 0 to `maxlength` pass validation.

**Property 2 — Numeric range and enum constraints**
- Generator: `fc.integer({ min: -999999, max: -1 })` (below 0) and `fc.integer({ min: max+1 })` (above max) for numeric fields; `fc.string()` filtered to exclude valid enum values for enum fields.
- Assertion: Mongoose validation rejects out-of-range / non-enum values.

**Property 3 — Array size limits**
- Generator: `fc.array(fc.string({ maxLength: 100 }), { minLength: limit + 1, maxLength: limit + 20 })` for each array field.
- Assertion: Mongoose validation rejects oversized arrays.

**Property 4 — Upsert round-trip**
- Generator: arbitrary valid profile data objects (all fields optional, all within constraints).
- Assertion: `upsertProfile(userId, data)` followed by `getProfileByUserId(userId)` returns a document that includes all the written field values.
- Uses `mongodb-memory-server` for an in-memory MongoDB instance.

**Property 5 — Empty body rejection**
- Generator: `fc.object()` filtered/mapped to contain only non-recognised keys, plus hardcoded `{}` and `{ userId: fc.string() }`.
- Assertion: PATCH handler returns 400 with the specified message.

**Property 6 — Invalid enum/range → HTTP 400**
- Generator: PATCH bodies containing invalid enum strings or out-of-range numbers.
- Assertion: PATCH handler returns 400 (not 200 or 500).

### Integration Smoke Tests

These are run against a live local server (not automated in CI initially):

- Smoke test: `require('./routes/profileRoutes')` is an Express router.
- Smoke test: `app.js` registers `/api/profile` (verify the route is listed in `app._router.stack`).
- Manual: run the curl/PowerShell commands from Requirement 6 documentation against `localhost:5000` and verify expected responses.

---

## Manual Test Commands

> **Note:** The `x-user-id` header is used only for manual testing with the placeholder middleware and **will be replaced by proper JWT-based authentication in production.**

Replace `507f1f77bcf86cd799439011` with any 24-character hex MongoDB ObjectId.

### curl

**GET /api/profile**
```bash
curl -s -X GET http://localhost:5000/api/profile \
  -H "x-user-id: 507f1f77bcf86cd799439011"
```

**PATCH /api/profile**
```bash
curl -s -X PATCH http://localhost:5000/api/profile \
  -H "x-user-id: 507f1f77bcf86cd799439011" \
  -H "Content-Type: application/json" \
  -d '{
    "location": { "state": "Andhra Pradesh", "district": "Guntur", "mandal": "Tenali" },
    "farming":  { "landArea": 4.5, "landUnit": "acres", "ownership": "owned" },
    "crops":    ["rice", "groundnut"],
    "irrigation": { "typeOrSource": "canal" },
    "financial": {
      "farmIncome": 120000,
      "otherIncome": 20000,
      "monthlyExpenses": 8000,
      "existingLoans": [{ "lender": "SBI", "amount": 50000 }]
    },
    "assets": {
      "equipment": ["tractor"],
      "livestock": ["2 buffaloes"]
    }
  }'
```

### PowerShell

**GET /api/profile**
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/profile" `
  -Method GET `
  -Headers @{ "x-user-id" = "507f1f77bcf86cd799439011" }
```

**PATCH /api/profile**
```powershell
$body = @{
  location   = @{ state = "Andhra Pradesh"; district = "Guntur"; mandal = "Tenali" }
  farming    = @{ landArea = 4.5; landUnit = "acres"; ownership = "owned" }
  crops      = @("rice", "groundnut")
  irrigation = @{ typeOrSource = "canal" }
  financial  = @{
    farmIncome      = 120000
    otherIncome     = 20000
    monthlyExpenses = 8000
    existingLoans   = @(@{ lender = "SBI"; amount = 50000 })
  }
  assets     = @{
    equipment = @("tractor")
    livestock = @("2 buffaloes")
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "http://localhost:5000/api/profile" `
  -Method PATCH `
  -Headers @{ "x-user-id" = "507f1f77bcf86cd799439011" } `
  -ContentType "application/json" `
  -Body $body
```

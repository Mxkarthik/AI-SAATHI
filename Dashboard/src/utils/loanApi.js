/**
 * loanApi.js
 *
 * Thin fetch wrapper for /api/loans/*.
 * Mirrors the pattern used in transactionApi.js — relative paths
 * (proxied to backend by vite.config.js) with credentials included.
 */

async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    // non-JSON response — fall through
  }

  if (!res.ok) {
    const err = new Error(data.message || "Something went wrong. Please try again.");
    err.noData = data.noData || false;
    err.status = res.status;
    throw err;
  }

  return data;
}

/** GET /api/loans/banks → { success, banks: [{ bankName, bankCode, schemes: [...] }] } */
export const getBanks = () => request("/api/loans/banks");

/**
 * POST /api/loans/eligibility — live preview, nothing persisted.
 * @param {string} schemeId
 * @param {number} requestedAmount
 * @param {number} tenureMonths
 */
export const checkEligibility = (schemeId, requestedAmount, tenureMonths) =>
  request("/api/loans/eligibility", {
    method: "POST",
    body: JSON.stringify({ schemeId, requestedAmount, tenureMonths }),
  });

/**
 * POST /api/loans/apply — persists a LoanApplication record.
 * Returns { success, result, application }
 */
export const applyForLoan = (schemeId, requestedAmount, tenureMonths) =>
  request("/api/loans/apply", {
    method: "POST",
    body: JSON.stringify({ schemeId, requestedAmount, tenureMonths }),
  });

/** GET /api/loans/applications → { success, applications: [...] } */
export const getApplications = () => request("/api/loans/applications");

/**
 * PATCH /api/loans/applications/:id/status
 * @param {string} id  — application _id
 * @param {string} status — "sent_to_bank" | "approved" | "rejected"
 */
export const updateApplicationStatus = (id, status) =>
  request(`/api/loans/applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

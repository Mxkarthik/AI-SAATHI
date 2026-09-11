/**
 * transactionApi.js
 *
 * Thin fetch wrapper for /api/transactions/*.
 * Uses relative paths (proxied to the backend by vite.config.js) and
 * `credentials: "include"` so the session cookie set by Google OAuth is sent,
 * matching the pattern already used in hooks/useAuth.js.
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
    // Non-JSON response (e.g. network-level failure page) — fall through.
  }

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

export const getSummary = () => request("/api/transactions/summary");

export const getTransactions = (filters = {}) => {
  const params = new URLSearchParams(filters);
  const qs = params.toString();
  return request(`/api/transactions${qs ? `?${qs}` : ""}`);
};

export const getExpenseBreakdown = () => request("/api/transactions/expense-breakdown");

export const getMonthlySummary = () => request("/api/transactions/monthly-summary");

export const createTransactionFromVoice = (text) =>
  request("/api/transactions/voice", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const previewTransactionFromVoice = (text) =>
  request("/api/transactions/preview", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const deleteTransaction = (id) =>
  request(`/api/transactions/${id}`, { method: "DELETE" });

export const getTopExpenses = (limit = 5) =>
  request(`/api/transactions/top-expenses?limit=${limit}`);

export const getCategoryTrend = () =>
  request("/api/transactions/category-trend");

export const getSpendingByDay = () =>
  request("/api/transactions/spending-by-day");
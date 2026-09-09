async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch {
    throw new Error("AI Saathi is unavailable right now. Please try again.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep the user-facing error generic for non-JSON responses.
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    throw new Error(data.message || "Something went wrong. Please try again.");
  }

  return data;
}

export function createConversation({ language = "en", intent = undefined } = {}) {
  return request("/api/conversations", {
    method: "POST",
    body: JSON.stringify({ language, ...(intent ? { intent } : {}) }),
  });
}

export function sendMessage(conversationId, { content, language = "en" }) {
  return request(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, language }),
  });
}

export function getConversation(conversationId) {
  return request(`/api/conversations/${conversationId}`);
}

export function getMessages(conversationId) {
  return request(`/api/conversations/${conversationId}/messages`);
}

export function getProfile() {
  return request("/api/profile");
}

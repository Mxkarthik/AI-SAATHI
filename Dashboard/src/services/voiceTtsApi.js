export async function synthesizeSpeech(text, languageCode) {
  let response;
  try {
    response = await fetch("/api/voice/synthesize", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, languageCode }),
    });
  } catch {
    throw new Error("Speech synthesis is unavailable. Please try again.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep provider details out of the UI.
  }

  if (!response.ok || !data.success || typeof data.audio !== "string") {
    throw new Error(data.message || "Speech synthesis failed. Please try again.");
  }
  return data;
}

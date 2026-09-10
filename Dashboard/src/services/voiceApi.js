export async function transcribeAudio(blob, filename = "voice.webm") {
  const form = new FormData();
  form.append("file", blob, filename);

  let response;
  try {
    response = await fetch("/api/voice/transcribe", {
      method: "POST",
      credentials: "include",
      body: form,
    });
  } catch {
    throw new Error("Speech transcription is unavailable. Please try again.");
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep network/provider details out of the UI.
  }

  if (!response.ok) {
    throw new Error(data.message || "Speech transcription failed. Please try again.");
  }
  if (!data.success || typeof data.transcript !== "string" || !data.transcript.trim()) {
    throw new Error("No speech was detected. Please try again.");
  }

  return data;
}

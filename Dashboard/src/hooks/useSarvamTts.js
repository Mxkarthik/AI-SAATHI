import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech } from "../services/voiceTtsApi";

const LANGUAGE_CODES = { en: "en-IN", te: "te-IN" };

export function useSarvamTts({ onStatusChange } = {}) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const updateStatus = useCallback((nextStatus) => {
    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
  }, []);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    cleanupAudio();
    updateStatus("idle");
  }, [cleanupAudio, updateStatus]);

  const speak = useCallback(async (text, language) => {
    if (!text?.trim()) return false;

    cleanupAudio();
    setError("");
    updateStatus("generating");

    try {
      const languageCode = LANGUAGE_CODES[language] || language;
      const result = await synthesizeSpeech(text, languageCode);
      const bytes = Uint8Array.from(atob(result.audio), (character) => character.charCodeAt(0));
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: result.mimeType || "audio/wav" }));
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      objectUrlRef.current = objectUrl;
      audio.onended = () => {
        cleanupAudio();
        updateStatus("finished");
      };
      audio.onerror = () => {
        cleanupAudio();
        setError("Audio playback failed. The response is still available as text.");
        updateStatus("error");
      };
      updateStatus("playing");
      await audio.play();
      return true;
    } catch (playbackError) {
      cleanupAudio();
      setError(playbackError.message || "Audio playback is unavailable. The response is still available as text.");
      updateStatus("error");
      return false;
    }
  }, [cleanupAudio, updateStatus]);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  return { status, error, speak, stopSpeaking };
}

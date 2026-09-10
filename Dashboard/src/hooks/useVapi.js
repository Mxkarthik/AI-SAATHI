import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";

const PUBLIC_KEY = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const ASSISTANT_ID = import.meta.env.VITE_VAPI_ASSISTANT_ID;

function readTranscript(message) {
  if (!message || message.type !== "transcript" || message.role !== "user") return null;
  if (message.transcriptType && message.transcriptType !== "final") return null;
  const transcript = typeof message.transcript === "string" ? message.transcript.trim() : "";
  return transcript || null;
}

export function useVapi({ onUserTranscript, onStatusChange } = {}) {
  const vapiRef = useRef(null);
  const onUserTranscriptRef = useRef(onUserTranscript);
  const onStatusChangeRef = useRef(onStatusChange);
  const statusRef = useRef("disconnected");
  const assistantMutedRef = useRef(false);
  const transcriptInFlightRef = useRef(false);
  const lastTranscriptRef = useRef("");
  const [status, setStatus] = useState("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    onUserTranscriptRef.current = onUserTranscript;
  }, [onUserTranscript]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const updateStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
  }, []);

  useEffect(() => {
    if (!PUBLIC_KEY) return undefined;

    const vapi = new Vapi(PUBLIC_KEY);
    vapiRef.current = vapi;

    const handleCallStart = () => {
      setError("");
      updateStatus("connected");
    };
    const handleCallEnd = () => {
      setIsMuted(false);
      assistantMutedRef.current = false;
      transcriptInFlightRef.current = false;
      updateStatus("disconnected");
    };
    const handleSpeechStart = () => {
      if (!assistantMutedRef.current) updateStatus("speaking");
    };
    const handleSpeechEnd = () => {
      updateStatus(assistantMutedRef.current ? "thinking" : "listening");
    };
    const handleError = (event) => {
      setError("Voice is unavailable. You can type your answer instead.");
      updateStatus("error");
      console.error("Vapi voice error", event);
    };
    const handleMessage = (message) => {
      const transcript = readTranscript(message);
      if (!transcript || transcriptInFlightRef.current || transcript === lastTranscriptRef.current) return;
      transcriptInFlightRef.current = true;
      lastTranscriptRef.current = transcript;
      console.log("[VAPI] FINAL USER TRANSCRIPT:", transcript);
      // Suppress Vapi's automatic model response while AI Saathi's backend
      // produces the single authoritative assistant response. E.3 intentionally
      // does not unmute or speak a Vapi response after this transcript.
      vapi.send({ type: "control", control: "mute-assistant" });
      assistantMutedRef.current = true;
      updateStatus("thinking");
      Promise.resolve(onUserTranscriptRef.current?.(transcript))
        .catch(() => {})
        .finally(() => {
          transcriptInFlightRef.current = false;
        });
    };

    vapi.on("call-start", handleCallStart);
    vapi.on("call-end", handleCallEnd);
    vapi.on("speech-start", handleSpeechStart);
    vapi.on("speech-end", handleSpeechEnd);
    vapi.on("message", handleMessage);
    vapi.on("error", handleError);

    return () => {
      vapi.removeListener("call-start", handleCallStart);
      vapi.removeListener("call-end", handleCallEnd);
      vapi.removeListener("speech-start", handleSpeechStart);
      vapi.removeListener("speech-end", handleSpeechEnd);
      vapi.removeListener("message", handleMessage);
      vapi.removeListener("error", handleError);
      vapi.stop().catch(() => {});
      vapiRef.current = null;
    };
  }, [updateStatus]);

  const startVoiceCall = useCallback(async () => {
    if (!PUBLIC_KEY || !ASSISTANT_ID) {
      const message = "Voice is not configured yet. You can type your answer instead.";
      setError(message);
      updateStatus("error");
      return false;
    }
    if (!vapiRef.current || statusRef.current === "connected" || statusRef.current === "connecting") return statusRef.current === "connected";

    try {
      setError("");
      updateStatus("connecting");
      await vapiRef.current.start(ASSISTANT_ID, {
        firstMessageMode: "assistant-speaks-first",
        clientMessages: ["transcript", "status-update", "speech-update"],
      });
      return true;
    } catch (startError) {
      setError("Voice is unavailable. You can type your answer instead.");
      updateStatus("error");
      console.error("Vapi start error", startError);
      return false;
    }
  }, [updateStatus]);

  const stopVoiceCall = useCallback(async () => {
    if (!vapiRef.current) return;
    await vapiRef.current.stop();
    updateStatus("disconnected");
  }, [updateStatus]);

  const setMuted = useCallback((muted) => {
    if (!vapiRef.current) return;
    vapiRef.current.setMuted(muted);
    setIsMuted(muted);
  }, []);

  return {
    status,
    isMuted,
    error,
    isConfigured: Boolean(PUBLIC_KEY && ASSISTANT_ID),
    startVoiceCall,
    stopVoiceCall,
    setMuted,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../services/voiceApi";

function getRecorderOptions() {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    ["audio/webm;codecs=opus", "webm"],
    ["audio/webm", "webm"],
    ["audio/ogg;codecs=opus", "ogg"],
    ["audio/mp4", "m4a"],
  ];
  const supported = candidates.find(([mimeType]) => MediaRecorder.isTypeSupported?.(mimeType));
  return supported ? { mimeType: supported[0], extension: supported[1] } : { mimeType: "", extension: "webm" };
}

export function useSarvamRecorder({ onTranscript, onStatusChange } = {}) {
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const onTranscriptRef = useRef(onTranscript);
  const onStatusChangeRef = useRef(onStatusChange);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const updateStatus = useCallback((nextStatus) => {
    setStatus(nextStatus);
    onStatusChangeRef.current?.(nextStatus);
  }, []);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    if (status === "recording" || status === "transcribing") return;
    const options = getRecorderOptions();
    if (!options || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording is not supported in this browser.");
      updateStatus("error");
      return;
    }

    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, options.mimeType ? { mimeType: options.mimeType } : undefined);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        cleanupStream();
        setError("Recording failed. Please try again.");
        updateStatus("error");
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: options.mimeType || "audio/webm" });
        cleanupStream();
        if (blob.size === 0) {
          setError("No speech was recorded. Please try again.");
          updateStatus("error");
          return;
        }
        updateStatus("transcribing");
        try {
          const result = await transcribeAudio(blob, `voice.${options.extension}`);
          await onTranscriptRef.current?.(result.transcript, result.languageCode);
          updateStatus("idle");
        } catch (transcriptionError) {
          setError(transcriptionError.message);
          updateStatus("error");
        }
      };
      recorder.start();
      updateStatus("recording");
    } catch (recordingError) {
      cleanupStream();
      setError(recordingError?.name === "NotAllowedError"
        ? "Microphone permission was denied. You can type instead."
        : "Microphone is unavailable. You can type instead.");
      updateStatus("error");
    }
  }, [cleanupStream, status, updateStatus]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  return { status, error, startRecording, stopRecording };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { getConversation, getMessages, sendMessage } from "../../services/aiSaathiApi";
import { useSarvamRecorder } from "../../hooks/useSarvamRecorder";
import { useSarvamTts } from "../../hooks/useSarvamTts";
import AiParticipant from "./AiParticipant";
import CallControls from "./CallControls";
import CallHeader from "./CallHeader";
import CurrentMessage from "./CurrentMessage";
import MessageComposer from "./MessageComposer";
import RecommendationPanel from "./RecommendationPanel";
import SituationPanel from "./SituationPanel";
import SarvamTtsTester from "./SarvamTtsTester";
import TranscriptPreview from "./TranscriptPreview";
import UserParticipant from "./UserParticipant";

export default function CallInterface({ user, conversationId, onLeave }) {
  const { t, language } = useLanguage();
  const [aiState, setAiState] = useState("ready");
  const [duration, setDuration] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [orchestration, setOrchestration] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleTtsStatus = useCallback((status) => {
    if (status === "generating") setAiState("thinking");
    else if (status === "playing") setAiState("speaking");
    else if (status === "finished") setAiState("ready");
    else if (status === "error") setAiState("error");
  }, []);
  const { error: ttsError, speak, stopSpeaking } = useSarvamTts({ onStatusChange: handleTtsStatus });
  const handleVoiceStatus = useCallback((status) => {
    if (status === "recording") setAiState("listening");
    else if (status === "transcribing") setAiState("thinking");
    else if (status === "error") setAiState("error");
    else if (status === "idle") setAiState("ready");
  }, []);

  const handleSend = useCallback(async (content, restoreMessage, messageLanguage = currentLanguage) => {
    if (submitting) return;
    const transcript = content.trim();
    if (!transcript) return;

    setSubmitting(true);
    setError("");
    setAiState("thinking");
    console.log("[AI-SAATHI] Sending transcript to backend:", transcript);

    try {
      const response = await sendMessage(conversationId, {
        content: transcript,
        language: messageLanguage,
      });
      const result = response?.data;
      if (!result?.orchestration || !result.userMessage || !result.assistantMessage) {
        throw new Error("The backend returned an incomplete response. Please try again.");
      }

      console.log("[AI-SAATHI] Backend response:", result);
      console.log("[AI-SAATHI] Next question:", result.orchestration.nextQuestion?.question || null);
      setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
      setOrchestration(result.orchestration);
      if (result.orchestration.language === "en" || result.orchestration.language === "te") {
        setCurrentLanguage(result.orchestration.language);
      }
      void speak(
        result.assistantMessage.content,
        result.orchestration.language || result.assistantMessage.language || currentLanguage,
      );
    } catch (sendError) {
      restoreMessage?.();
      setError(sendError.message || "Unable to process your message. Please try again.");
      setAiState("error");
    } finally {
      setSubmitting(false);
    }
  }, [conversationId, currentLanguage, speak, submitting]);

  const handleVoiceTranscript = useCallback((transcript, languageCode) => {
    console.log("[AI-SAATHI] Sarvam transcript language:", languageCode || "unknown");
    const detectedLanguage = languageCode?.toLowerCase().startsWith("te")
      ? "te"
      : languageCode?.toLowerCase().startsWith("en")
        ? "en"
        : currentLanguage;
    setCurrentLanguage(detectedLanguage);
    handleSend(transcript, undefined, detectedLanguage);
  }, [currentLanguage, handleSend]);

  const {
    status: recorderStatus,
    error: recorderError,
    startRecording,
    stopRecording,
  } = useSarvamRecorder({ onTranscript: handleVoiceTranscript, onStatusChange: handleVoiceStatus });

  useEffect(() => {
    const timer = window.setInterval(() => setDuration((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadConversation() {
      setLoadingConversation(true);
      setError("");
      try {
        const [, messagesResult] = await Promise.all([
          getConversation(conversationId),
          getMessages(conversationId),
        ]);
        if (!active) return;
        setMessages(Array.isArray(messagesResult.messages) ? messagesResult.messages : []);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoadingConversation(false);
      }
    }
    loadConversation();
    return () => { active = false; };
  }, [conversationId, language]);

  const isReadyForDecision = orchestration?.conversationState?.stage === "ready_for_decision"
    && orchestration?.decisionContext?.status === "ready";
  const activeQuestion = orchestration?.status === "needs_information"
    ? orchestration.nextQuestion?.question || ""
    : "";
  const recommendation = isReadyForDecision ? orchestration?.recommendation : null;

  useEffect(() => {
    if (recorderError) setError(recorderError);
    if (ttsError) setError(ttsError);
  }, [recorderError, ttsError]);

  return (
    <div className="relative min-h-full overflow-hidden bg-gray-950 text-white">
      <CallHeader duration={duration} />
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 pb-8 sm:px-6 lg:px-8" aria-label={t("schemeAI", "liveCall")}>
        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{error}</span>
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <AiParticipant aiState={loadingConversation ? "thinking" : aiState} />
          <UserParticipant user={user} />
        </div>
        <CurrentMessage
          message={activeQuestion}
          ready={isReadyForDecision}
        />
        <MessageComposer disabled={loadingConversation || submitting} onSend={handleSend} />
        <SarvamTtsTester />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.6fr)]">
          <SituationPanel
            context={orchestration?.context}
            decisionContext={orchestration?.decisionContext}
            informationGap={orchestration?.informationGap}
          />
          {recommendation && <RecommendationPanel recommendation={recommendation} />}
        </div>
        <TranscriptPreview messages={messages} />
        <div className="flex flex-col items-center gap-3 border-t border-gray-800 pt-5">
          <CallControls
            isMuted={false}
            voiceStatus="disconnected"
            recorderStatus={recorderStatus}
            onToggleMute={() => {}}
            onStartVoice={startRecording}
            onStopVoice={stopRecording}
            onLeave={() => { stopSpeaking(); onLeave(); }}
            onSettings={() => setSettingsOpen((value) => !value)}
          />
          <p className="min-h-5 text-center text-xs text-gray-500" aria-live="polite">
            {settingsOpen ? t("schemeAI", "settingsComingSoon") : t("schemeAI", "localPreview")}
          </p>
        </div>
      </main>
    </div>
  );
}

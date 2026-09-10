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
import TranscriptPreview from "./TranscriptPreview";
import UserParticipant from "./UserParticipant";

const TELUGU_WELCOME = "నమస్కారం! నేను AI సాథి. మీ ఆర్థిక అవసరాలను అర్థం చేసుకోవడానికి నేను మీకు సహాయం చేస్తాను.";

export default function CallInterface({ user, conversationId, welcomeInTelugu = false, onLeave }) {
  const { t, language } = useLanguage();
  const [aiState, setAiState] = useState("ready");
  const [duration, setDuration] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [orchestration, setOrchestration] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [error, setError] = useState("");
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceError, setVoiceError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const handleVoiceStatus = useCallback((status) => {
    if (status === "recording") {
      setVoiceError("");
      setVoiceState("listening");
      setAiState("listening");
    } else if (status === "transcribing") {
      setVoiceState("transcribing");
      setAiState("transcribing");
    } else if (status === "error") {
      setVoiceState("error");
      setAiState("error");
    } else if (status === "idle") {
      setVoiceState("idle");
      setAiState("ready");
    }
  }, []);

  const handleTtsStatus = useCallback((status) => {
    if (status === "generating") {
      stopRecording();
      setVoiceState("thinking");
      setAiState("thinking");
    } else if (status === "playing") {
      stopRecording();
      setVoiceState("speaking");
      setAiState("speaking");
    } else if (status === "finished" || status === "error") {
      setVoiceState("idle");
      setAiState("ready");
    }
  }, []);

  const { error: ttsError, speak, stopSpeaking, unlockPlayback } = useSarvamTts({ onStatusChange: handleTtsStatus });

  const handleSend = useCallback(async (content, restoreMessage, messageLanguage = currentLanguage, fromVoice = false) => {
    if (submitting) return;
    const transcript = content.trim();
    if (!transcript) return;

    setSubmitting(true);
    setError("");
    setAiState("thinking");
    if (fromVoice) {
      setVoiceError("");
      setVoiceState("thinking");
    }
    console.log("[AI-SAATHI] Sending transcript to backend:", transcript);

    try {
      const response = await sendMessage(conversationId, {
        content: transcript,
        language: messageLanguage,
      });
      const result = response?.data || response;
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
      if (fromVoice) {
        await speak(
          result.assistantMessage.content,
          result.orchestration.language || result.assistantMessage.language || currentLanguage,
        );
      }
    } catch (sendError) {
      restoreMessage?.();
      if (fromVoice) {
        setError(sendError.message || "Unable to process your message. Please try again.");
        setVoiceState("error");
        setAiState("error");
      } else {
        setError(sendError.message || "Unable to process your message. Please try again.");
        setAiState("error");
      }
    } finally {
      setSubmitting(false);
      if (!fromVoice) setAiState("ready");
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
    return handleSend(transcript, undefined, detectedLanguage, true);
  }, [currentLanguage, handleSend]);

  const {
    status: recorderStatus,
    error: recorderError,
    startRecording,
    stopRecording,
  } = useSarvamRecorder({ onTranscript: handleVoiceTranscript, onStatusChange: handleVoiceStatus });

  const microphoneLocked = loadingConversation || submitting || ["transcribing", "thinking", "speaking"].includes(voiceState);

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
        const loadedMessages = Array.isArray(messagesResult.messages) ? messagesResult.messages : [];
        if (welcomeInTelugu && loadedMessages.length === 0) {
          const welcomeMessage = {
            _id: `welcome-${conversationId}`,
            role: "assistant",
            content: TELUGU_WELCOME,
            language: "te",
          };
          setMessages([welcomeMessage]);
          setCurrentLanguage("te");
          await speak(TELUGU_WELCOME, "te-IN");
        } else {
          setMessages(loadedMessages);
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoadingConversation(false);
      }
    }
    loadConversation();
    return () => { active = false; };
  }, [conversationId, language, speak, welcomeInTelugu]);

  const isReadyForDecision = orchestration?.conversationState?.stage === "ready_for_decision"
    && orchestration?.decisionContext?.status === "ready";
  const activeQuestion = orchestration?.nextQuestion?.question || "";
  const recommendation = isReadyForDecision ? orchestration?.recommendation : null;

  useEffect(() => {
    if (recorderError) setError(recorderError);
    if (recorderError) setVoiceState("idle");
  }, [recorderError]);

  useEffect(() => {
    if (ttsError) {
      setVoiceError("Voice playback unavailable. You can continue with text.");
      setVoiceState("idle");
    }
  }, [ttsError]);

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
            voiceState={voiceState}
            disabled={microphoneLocked}
            onToggleMute={() => {}}
            onStartVoice={() => {
              unlockPlayback();
              startRecording();
            }}
            onStopVoice={stopRecording}
            onLeave={() => {
              stopRecording();
              stopSpeaking();
              onLeave();
            }}
            onSettings={() => setSettingsOpen((value) => !value)}
          />
          <p className="min-h-5 text-center text-xs text-gray-500" aria-live="polite">
            {settingsOpen ? t("schemeAI", "settingsComingSoon") : voiceError || t("schemeAI", "localPreview")}
          </p>
        </div>
      </main>
    </div>
  );
}

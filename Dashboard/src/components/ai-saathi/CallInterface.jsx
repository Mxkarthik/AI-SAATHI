import { useEffect, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { getConversation, getMessages, sendMessage } from "../../services/aiSaathiApi";
import AiParticipant from "./AiParticipant";
import CallControls from "./CallControls";
import CallHeader from "./CallHeader";
import CurrentMessage from "./CurrentMessage";
import MessageComposer from "./MessageComposer";
import RecommendationPanel from "./RecommendationPanel";
import SituationPanel from "./SituationPanel";
import TranscriptPreview from "./TranscriptPreview";
import UserParticipant from "./UserParticipant";

export default function CallInterface({ user, conversationId, onLeave }) {
  const { t, language } = useLanguage();
  const [isMuted, setIsMuted] = useState(false);
  const [aiState, setAiState] = useState("ready");
  const [duration, setDuration] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [orchestration, setOrchestration] = useState(null);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [retryMessage, setRetryMessage] = useState("");

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
        const [conversationResult, messagesResult] = await Promise.all([
          getConversation(conversationId),
          getMessages(conversationId),
        ]);
        if (!active) return;
        setMessages(Array.isArray(messagesResult.messages) ? messagesResult.messages : []);
        const conversation = conversationResult.conversation;
        if (conversation?.language && conversation.language !== language) {
          // Backend language is authoritative for future message submissions.
        }
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoadingConversation(false);
      }
    }
    loadConversation();
    return () => { active = false; };
  }, [conversationId, language]);

  const activeQuestion = orchestration?.status === "needs_information"
    ? orchestration.nextQuestion?.question || ""
    : "";

  const isReadyForDecision = orchestration?.conversationState?.stage === "ready_for_decision"
    && orchestration?.decisionContext?.status === "ready";
  const recommendation = isReadyForDecision ? orchestration?.recommendation : null;

  const handleSend = async (content, restoreMessage) => {
    if (submitting) return;
    setSubmitting(true);
    setRetryMessage("");
    setError("");
    setAiState("thinking");
    try {
      const response = await sendMessage(conversationId, { content, language });
      const result = response?.data;
      if (!result?.orchestration || !result.userMessage || !result.assistantMessage) {
        throw new Error("The backend returned an incomplete response. Please try again.");
      }
      setMessages((current) => [...current, result.userMessage, result.assistantMessage]);
      setOrchestration(result.orchestration);
      setAiState(result.orchestration.nextQuestion ? "speaking" : "ready");
    } catch (sendError) {
      restoreMessage();
      setRetryMessage(content);
      setError(sendError.message);
      setAiState("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-gray-950 text-white">
      <CallHeader duration={duration} />
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 pb-8 sm:px-6 lg:px-8" aria-label={t("schemeAI", "liveCall")}>
        {error && (
          <div className="flex flex-col gap-3 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <span>{error}</span>
            {retryMessage && <span className="text-xs text-red-300">{t("schemeAI", "retryBySending")}</span>}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <AiParticipant aiState={loadingConversation ? "thinking" : aiState} />
          <UserParticipant user={user} />
        </div>
        <CurrentMessage
          message={loadingConversation ? "" : activeQuestion}
          ready={isReadyForDecision}
        />
        {isReadyForDecision && !recommendation && (
          <p className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-4 py-3 text-sm text-yellow-200" aria-live="polite">
            {t("schemeAI", "understandingOptions")}
          </p>
        )}
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
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((value) => !value)}
            onLeave={onLeave}
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

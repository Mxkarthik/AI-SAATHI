import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, Bot, CheckCircle2, Languages, LockKeyhole, Mic, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../i18n/LanguageContext";
import CallInterface from "../components/ai-saathi/CallInterface";
import { createConversation } from "../services/aiSaathiApi";

export default function SchemeAI() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConversationId = searchParams.get("conversationId") || "";
  const [hasJoined, setHasJoined] = useState(Boolean(initialConversationId));
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const welcomeName = user?.name?.trim() || null;

  if (hasJoined) {
    return <CallInterface
      user={user}
      conversationId={conversationId}
      onLeave={() => {
        setHasJoined(false);
        setConversationId("");
        setSearchParams({}, { replace: true });
      }}
    />;
  }

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const response = await createConversation({ language });
      const id = response?.conversation?._id || response?.conversation?.id;
      if (!id) throw new Error(t("schemeAI", "conversationCreateError"));
      setConversationId(id);
      setSearchParams({ conversationId: id }, { replace: true });
      setHasJoined(true);
    } catch (error) {
      setJoinError(error.message || t("schemeAI", "genericError"));
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-gray-950 px-4 py-6 text-white sm:px-6 sm:py-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_52%_18%,rgba(234,179,8,0.09),transparent_30%),linear-gradient(135deg,rgba(17,24,39,0.92),rgba(3,7,18,1))]" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {t("schemeAI", "eyebrow")}
            </div>
            <h1 id="scheme-ai-title" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t("schemeAI", "title")}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {welcomeName ? `${t("schemeAI", "welcome")}, ${welcomeName}` : t("schemeAI", "welcome")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400" aria-label={t("schemeAI", "languageLabel")}>
            <Languages className="h-4 w-4 text-yellow-400" aria-hidden="true" />
            <span className={language === "en" ? "text-white" : ""}>English</span>
            <span className="text-gray-600" aria-hidden="true">/</span>
            <span className={language === "te" ? "text-white" : ""}>తెలుగు</span>
          </div>
        </header>

        <main className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]" aria-labelledby="scheme-ai-title">
          <section className="relative flex min-h-[31rem] flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/75 px-5 py-10 text-center shadow-2xl shadow-black/20 sm:min-h-[35rem] sm:px-10" aria-labelledby="preview-title">
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 text-xs font-semibold text-yellow-300">
              <span className="h-2 w-2 rounded-full bg-yellow-400 motion-safe:animate-pulse" aria-hidden="true" />
              {t("schemeAI", "ready")}
            </div>

            <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-yellow-300/30 bg-gray-950/80 shadow-[0_0_85px_rgba(234,179,8,0.14)] motion-safe:animate-[pulse_5s_ease-in-out_infinite] sm:h-48 sm:w-48">
              <div className="absolute inset-3 rounded-full border border-yellow-400/20" />
              <div className="absolute inset-9 rounded-full bg-yellow-400/10" />
              <Bot className="relative h-16 w-16 text-yellow-300" strokeWidth={1.35} aria-hidden="true" />
            </div>

            <h2 id="preview-title" className="mt-8 text-2xl font-bold text-white sm:text-3xl">
              {t("schemeAI", "previewTitle")}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-gray-400 sm:text-base">
              {t("schemeAI", "description")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
              <span className="rounded-full border border-gray-700 bg-gray-950/70 px-3 py-1.5">{t("schemeAI", "benefitSpeak")}</span>
              <span className="rounded-full border border-gray-700 bg-gray-950/70 px-3 py-1.5">{t("schemeAI", "benefitUnderstand")}</span>
              <span className="rounded-full border border-gray-700 bg-gray-950/70 px-3 py-1.5">{t("schemeAI", "benefitLanguage")}</span>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-400">
                  <Mic className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-semibold text-white">{t("schemeAI", "microphone")}</h2>
                  <p className="text-sm text-gray-400">{t("schemeAI", "microphoneReady")}</p>
                </div>
              </div>
              <p className="mt-4 border-t border-gray-800 pt-4 text-xs leading-5 text-gray-500">
                {t("schemeAI", "microphoneNote")}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-white">{t("schemeAI", "privacy")}</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-400">{t("schemeAI", "privacyNote")}</p>
                </div>
              </div>
            </div>

            <div className="mt-auto rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5">
              <p className="text-sm leading-6 text-gray-300">{t("schemeAI", "callPrompt")}</p>
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-gray-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {joining ? t("schemeAI", "starting") : t("schemeAI", "joinCall")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <p className="mt-3 min-h-5 text-center text-xs text-red-300" aria-live="polite">
                {joinError}
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

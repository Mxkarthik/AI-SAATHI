import { useLanguage } from "../../i18n/LanguageContext";

const STATUS_KEYS = {
  ready: "callReady",
  listening: "callListening",
  thinking: "callThinking",
  speaking: "callSpeaking",
  error: "callError",
};

export default function CallStatus({ status = "ready" }) {
  const { t } = useLanguage();
  const isThinking = status === "thinking";
  const isError = status === "error";

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${isError ? "text-red-300" : "text-gray-300"}`}>
      <span
        className={`h-2.5 w-2.5 rounded-full ${isError ? "bg-red-400" : "bg-yellow-400"} ${isThinking ? "motion-safe:animate-pulse" : ""}`}
        aria-hidden="true"
      />
      {isThinking ? `${t("schemeAI", STATUS_KEYS[status])}...` : t("schemeAI", STATUS_KEYS[status] || STATUS_KEYS.ready)}
    </span>
  );
}

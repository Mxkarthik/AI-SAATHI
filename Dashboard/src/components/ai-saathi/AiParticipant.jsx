import { Bot } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";
import CallStatus from "./CallStatus";

export default function AiParticipant({ aiState = "ready" }) {
  const { t } = useLanguage();
  const active = aiState === "speaking" || aiState === "listening";

  return (
    <article className={`relative flex min-h-[22rem] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-gray-900/80 p-6 text-center transition-colors duration-500 sm:min-h-[28rem] ${active ? "border-yellow-400/40" : "border-gray-800"}`} aria-label={t("schemeAI", "aiParticipant")}>
      <div className={`relative flex h-36 w-36 items-center justify-center rounded-full border border-yellow-300/30 bg-gray-950/90 shadow-[0_0_75px_rgba(234,179,8,0.14)] sm:h-44 sm:w-44 ${active ? "motion-safe:animate-[pulse_3s_ease-in-out_infinite]" : ""}`}>
        <div className="absolute inset-3 rounded-full border border-yellow-400/20" />
        <div className="absolute inset-9 rounded-full bg-yellow-400/10" />
        <Bot className="relative h-14 w-14 text-yellow-300 sm:h-16 sm:w-16" strokeWidth={1.35} aria-hidden="true" />
      </div>
      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">AI SAATHI</p>
      <div className="mt-3"><CallStatus status={aiState} /></div>
    </article>
  );
}

import { Bot, CheckCircle2 } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function CurrentMessage({ message, ready = false }) {
  const { t } = useLanguage();

  return (
    <section className={`rounded-2xl border px-5 py-5 sm:px-6 ${ready ? "border-yellow-400/30 bg-yellow-400/5" : "border-yellow-400/20 bg-gray-900/90"}`} aria-labelledby="current-ai-message-title" data-testid="active-current-question">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-300">
          {ready ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
        </div>
        <div>
          <p id="current-ai-message-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">
            {ready ? t("schemeAI", "understandingOptions") : t("schemeAI", "currentQuestion")}
          </p>
          <p className="mt-2 text-lg font-semibold leading-8 text-white sm:text-xl">
            {message ? `“${message}”` : <span className="text-gray-500">{ready ? t("schemeAI", "readyMessage") : t("schemeAI", "waitingForMessage")}</span>}
          </p>
        </div>
      </div>
    </section>
  );
}

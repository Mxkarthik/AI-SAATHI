import { Bot } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function CurrentMessage({ message }) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/80 px-5 py-4 sm:px-6" aria-labelledby="current-ai-message-title">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-yellow-400/10 text-yellow-300">
          <Bot className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p id="current-ai-message-title" className="text-xs font-semibold uppercase tracking-[0.16em] text-yellow-300">{t("schemeAI", "aiLabel")}</p>
          <p className="mt-1 text-base leading-7 text-white sm:text-lg">
            {message ? `“${message}”` : <span className="text-gray-500">{t("schemeAI", "waitingForMessage")}</span>}
          </p>
        </div>
      </div>
    </section>
  );
}

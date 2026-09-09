import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function TranscriptPreview({ messages = [] }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/70" aria-labelledby="recent-conversation-title">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-yellow-300 sm:px-5"
      >
        <span id="recent-conversation-title">{t("schemeAI", "recentConversation")}</span>
        {open ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </button>
      {open && (
        <div className="border-t border-gray-800 px-4 py-4 text-sm leading-6 sm:px-5">
          {messages.length === 0 ? (
            <p className="text-gray-500">{t("schemeAI", "noMessages")}</p>
          ) : messages.slice(-4).map((message) => (
            <div key={message._id || `${message.role}-${message.createdAt || message.content}`} className="mb-3 last:mb-0">
              <p className="text-yellow-300">{message.role === "assistant" ? t("schemeAI", "aiLabel") : t("schemeAI", "you")}</p>
              <p className="mt-1 text-gray-300">“{message.content}”</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

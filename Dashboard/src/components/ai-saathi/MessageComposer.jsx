import { Send } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function MessageComposer({ disabled, onSend }) {
  const { t } = useLanguage();
  const [value, setValue] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    const content = value.trim();
    if (!content || disabled) return;
    setValue("");
    await onSend(content, () => setValue(content));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" aria-label={t("schemeAI", "messageForm")}>
      <label htmlFor="scheme-ai-message" className="sr-only">{t("schemeAI", "messagePlaceholder")}</label>
      <input
        id="scheme-ai-message"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        placeholder={t("schemeAI", "messagePlaceholder")}
        className="min-h-12 flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 text-sm font-bold text-gray-950 transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {t("schemeAI", "send")}
      </button>
    </form>
  );
}

import { Mic, MicOff, PhoneOff, Settings } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function CallControls({ isMuted, onToggleMute, onLeave, onSettings }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center justify-center gap-3" aria-label={t("schemeAI", "callControls")}>
      <button
        type="button"
        onClick={onToggleMute}
        aria-label={isMuted ? t("schemeAI", "unmute") : t("schemeAI", "mute")}
        aria-pressed={isMuted}
        className={`inline-flex min-h-12 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-gray-950 ${isMuted ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-300" : "border-gray-700 bg-gray-900 text-gray-200 hover:border-yellow-400/40 hover:text-white"}`}
      >
        {isMuted ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
        {isMuted ? t("schemeAI", "muted") : t("schemeAI", "microphone")}
      </button>
      <button
        type="button"
        onClick={onLeave}
        aria-label={t("schemeAI", "leaveCall")}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        <PhoneOff className="h-5 w-5" aria-hidden="true" />
        {t("schemeAI", "leaveCall")}
      </button>
      <button
        type="button"
        onClick={onSettings}
        aria-label={t("schemeAI", "settings")}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-yellow-400/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-yellow-300 focus:ring-offset-2 focus:ring-offset-gray-950"
      >
        <Settings className="h-5 w-5" aria-hidden="true" />
        {t("schemeAI", "settings")}
      </button>
    </div>
  );
}

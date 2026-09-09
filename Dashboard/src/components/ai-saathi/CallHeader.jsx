import { Clock3, Radio } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function CallHeader({ duration = 0 }) {
  const { t } = useLanguage();

  return (
    <header className="flex flex-col gap-3 border-b border-gray-800 bg-gray-950/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/10 text-yellow-300">
          <Radio className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-extrabold tracking-[0.18em] text-white">AI SAATHI</p>
          <p className="text-xs text-gray-500">{t("schemeAI", "title")}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 text-yellow-300">
          <span className="h-2 w-2 rounded-full bg-yellow-400" aria-hidden="true" />
          {t("schemeAI", "previewMode")}
        </span>
        <span className="inline-flex items-center gap-1.5" aria-label={t("schemeAI", "duration")}>
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          {formatDuration(duration)}
        </span>
      </div>
    </header>
  );
}

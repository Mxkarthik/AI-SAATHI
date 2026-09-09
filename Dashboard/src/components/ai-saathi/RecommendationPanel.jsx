import { ExternalLink, ShieldAlert } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

export default function RecommendationPanel({ recommendation }) {
  const { t } = useLanguage();
  if (!recommendation) return null;

  const recommendations = recommendation.recommendations || [];
  const verification = recommendation.verificationRequired || [];

  return (
    <section className="rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-5" aria-labelledby="recommendation-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recommendation-title" className="text-sm font-semibold uppercase tracking-[0.14em] text-yellow-300">{t("schemeAI", "optionsTitle")}</h2>
        <span className="text-xs text-gray-500">{recommendation.policyVersion || ""}</span>
      </div>
      {recommendations.length > 0 ? (
        <div className="mt-4 space-y-4">
          {recommendations.map((item) => (
            <article key={item.schemeId} className="rounded-xl border border-gray-700 bg-gray-950/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white">#{item.rank} {item.schemeId}</h3>
                <span className="text-sm text-yellow-300">{t("schemeAI", "score")}: {item.score}</span>
              </div>
              <p className="mt-2 text-xs text-gray-400">{t("schemeAI", "eligibility")}: {item.eligibilityStatus}</p>
              {item.explanation?.whyRecommended?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-gray-300">
                  {item.explanation.whyRecommended.map((reason) => <li key={reason}>• {reason}</li>)}
                </ul>
              )}
              {item.verificationRequired?.length > 0 && (
                <p className="mt-3 text-xs text-yellow-200">{item.verificationRequired.join(" ")}</p>
              )}
              {item.sourceReferences?.length > 0 && (
                <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.sourceReferences.join(" | ")}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-400">{t("schemeAI", "noRankedOptions")}</p>
      )}
      {verification.length > 0 && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-200">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            {t("schemeAI", "verificationRequired")}
          </h3>
          <div className="mt-2 space-y-2 text-sm text-gray-400">
            {verification.map((item) => <p key={item.schemeId}>{item.schemeId}: {item.verificationRequired?.join(" ")}</p>)}
          </div>
        </div>
      )}
    </section>
  );
}

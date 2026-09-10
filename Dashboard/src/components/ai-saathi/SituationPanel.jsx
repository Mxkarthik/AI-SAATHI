import { Check, Circle } from "lucide-react";
import { useLanguage } from "../../i18n/LanguageContext";

function formatField(field, value) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function SituationPanel({ context, decisionContext, informationGap }) {
  const { t } = useLanguage();
  const user = decisionContext?.user || {};
  const farming = user.farming || {};
  const location = user.location || {};
  const financial = user.financial || {};
  const knownFields = context?.knownFields || {};
  const resolvedLocation = { state: location.state ?? knownFields.state, district: location.district ?? knownFields.district };
  const resolvedFarming = { ...farming, crops: farming.crops ?? knownFields.crops ?? (knownFields.crop ? [knownFields.crop] : undefined), landArea: farming.landArea ?? knownFields.landArea, landUnit: farming.landUnit ?? knownFields.landUnit };
  const resolvedFinancial = { ...financial, amount: financial.amount ?? knownFields.amount };
  const known = [
    ["State", resolvedLocation.state],
    ["District", resolvedLocation.district],
    ["Crop", resolvedFarming.crops],
    ["Land", resolvedFarming.landArea && resolvedFarming.landUnit ? `${resolvedFarming.landArea} ${resolvedFarming.landUnit}` : resolvedFarming.landArea],
    ["Equipment", user.assets?.equipment ?? knownFields.equipment],
    ["Livestock", user.assets?.livestock ?? knownFields.livestock],
    ["Amount", resolvedFinancial.amount],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0));
  const missing = informationGap?.missingFields || [];

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5" aria-labelledby="situation-title">
      <h2 id="situation-title" className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-300">{t("schemeAI", "yourSituation")}</h2>
      <div className="mt-4 space-y-2">
        {known.length ? known.map(([label, value]) => (
          <div key={label} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" aria-hidden="true" />
            <span><span className="text-gray-500">{label}:</span> {formatField(label, value)}</span>
          </div>
        )) : <p className="text-sm text-gray-500">{t("schemeAI", "noKnownInfo")}</p>}
      </div>
      {missing.length > 0 && (
        <div className="mt-5 border-t border-gray-800 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{t("schemeAI", "informationNeeded")}</h3>
          <div className="mt-3 space-y-2">
            {missing.map((field) => (
              <div key={field} className="flex items-center gap-2 text-sm text-gray-400">
                <Circle className="h-3.5 w-3.5 text-gray-600" aria-hidden="true" />
                {field}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

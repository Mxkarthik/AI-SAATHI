/**
 * LanguageConsentModal
 *
 * Shown once to users detected in Telangana or Andhra Pradesh.
 * Asks whether they want to continue in Telugu.
 *
 * Design rules (strict):
 *  - Uses ONLY the same design tokens already in the project:
 *    bg-gray-900, border-gray-800, text-white, yellow-400/orange-500 gradient,
 *    rounded-2xl, shadow-2xl — identical to AuthModal.
 *  - No new colours, no new font sizes, no new spacing beyond what exists.
 *  - Does NOT close on backdrop click or Escape — the user must pick an option.
 */

import { useEffect, useRef } from "react";
import { useLanguage } from "./LanguageContext";

export default function LanguageConsentModal() {
  const { acceptTelugu, rejectTelugu } = useLanguage();
  const yesRef = useRef(null);

  // Move focus into the modal when it mounts
  useEffect(() => {
    yesRef.current?.focus();
  }, []);

  return (
    /* Backdrop — same as AuthModal backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-consent-title"
    >
      {/* Modal card — mirrors AuthModal card exactly */}
      <div className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl outline-none">

        {/* Branding */}
        <div className="text-center mb-6">
          <p className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-1">
            AI SAATHI
          </p>
        </div>

        {/* Message */}
        <div className="text-center mb-8">
          <h2
            id="lang-consent-title"
            className="text-lg font-semibold text-white mb-3"
          >
            మీకు తెలుగులో కొనసాగాలనుకుంటున్నారా?
          </h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            Would you like to continue in Telugu?
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* YES — అవును */}
          <button
            ref={yesRef}
            onClick={acceptTelugu}
            className="flex-1 px-5 py-3 rounded-xl bg-yellow-400 text-gray-950 font-bold text-base hover:bg-yellow-300 active:scale-95 transition-all shadow"
          >
            అవును
          </button>

          {/* NO */}
          <button
            onClick={rejectTelugu}
            className="flex-1 px-5 py-3 rounded-xl bg-gray-800 text-gray-300 font-semibold text-base hover:bg-gray-700 hover:text-white active:scale-95 transition-all border border-gray-700"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}

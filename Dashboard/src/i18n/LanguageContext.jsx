/**
 * LanguageContext — centralised language state for AI Saathi.
 *
 * Responsibilities:
 *  1. On first visit: detect user's approximate region via IP geolocation.
 *  2. If the region is Telangana or Andhra Pradesh, expose a flag so the
 *     app can prompt the user to switch to Telugu.
 *  3. Store / restore the user's confirmed language preference in
 *     localStorage so the consent dialog never reappears.
 *  4. Provide a `t(section, key)` helper that returns the correct string
 *     for the active language.
 *
 * IMPORTANT: Language is NEVER changed automatically.  It changes only
 * when the user explicitly confirms their choice in the consent dialog.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import translations from "./translations";

// ── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "aisaathi_language";          // persisted language preference
const CONSENT_KEY = "aisaathi_consent_shown";     // whether the dialog has been answered

// State / region names that map to Telugu suggestion
const TELUGU_REGIONS = new Set([
  "telangana",
  "andhra pradesh",
  "andhra",
]);

// ── Context ──────────────────────────────────────────────────────────────────

const LanguageContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }) {
  // "en" | "te"
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "en";
  });

  // Whether to show the Telugu consent dialog
  const [showConsent, setShowConsent] = useState(false);

  // ── IP-based region detection ──────────────────────────────────
  useEffect(() => {
    // If the user has already answered the consent dialog, skip detection.
    const consentAnswered = localStorage.getItem(CONSENT_KEY);
    if (consentAnswered) return;

    // If there's already a saved language preference, skip detection too.
    const savedLang = localStorage.getItem(STORAGE_KEY);
    if (savedLang) return;

    detectRegion();
  }, []);

  async function detectRegion() {
    try {
      // ip-api.com is free for non-commercial use and returns JSON with
      // country/region information. No API key required.
      const res = await fetch("http://ip-api.com/json/?fields=status,regionName,country");
      if (!res.ok) return;

      const data = await res.json();

      if (data.status !== "success") return;

      const region = (data.regionName || "").toLowerCase().trim();

      // Show consent only for Telangana / Andhra Pradesh users
      if (TELUGU_REGIONS.has(region)) {
        setShowConsent(true);
      } else {
        // Not a Telugu region — record that we've resolved consent so we
        // don't run the geolocation fetch on every visit.
        localStorage.setItem(CONSENT_KEY, "no");
      }
    } catch {
      // Network failure — silently stay with English, no dialog.
    }
  }

  // ── Consent handlers ───────────────────────────────────────────

  /** User clicked "అవును" — switch to Telugu and persist */
  const acceptTelugu = useCallback(() => {
    setLanguage("te");
    localStorage.setItem(STORAGE_KEY, "te");
    localStorage.setItem(CONSENT_KEY, "yes");
    setShowConsent(false);
  }, []);

  /** User clicked "No" — stay in English and persist */
  const rejectTelugu = useCallback(() => {
    setLanguage("en");
    localStorage.setItem(STORAGE_KEY, "en");
    localStorage.setItem(CONSENT_KEY, "no");
    setShowConsent(false);
  }, []);

  // ── Translation helper ─────────────────────────────────────────

  /**
   * t(section, key)
   *
   * Returns the translation string for the current language.
   * Falls back to English if the key is missing in the active language.
   *
   * Examples:
   *   t("sidebar", "appName")           → "AI SAATHI" | "AI సాథి"
   *   t("sidebar.nav", "financialNews") → "Financial News" | "ఆర్థిక వార్తలు"
   *
   * Nested sections use dot notation:
   *   t("landing.features.news", "title")
   */
  const t = useCallback(
    (section, key) => {
      const langData = translations[language] || translations.en;
      const fallback = translations.en;

      // Walk dot-separated section path
      const walk = (obj, path) => {
        if (!obj) return undefined;
        return path.split(".").reduce((acc, part) => acc?.[part], obj);
      };

      const section_te = walk(langData, section);
      const val = section_te?.[key];

      if (val !== undefined && val !== null) return val;

      // Fallback to English
      const section_en = walk(fallback, section);
      return section_en?.[key] ?? key;
    },
    [language]
  );

  /**
   * tObj(section)
   *
   * Returns the entire translation object for a section.
   * Useful for array-type strings (e.g. wordOfTheDay.cards).
   * Falls back to English.
   */
  const tObj = useCallback(
    (section) => {
      const langData = translations[language] || translations.en;
      const fallback = translations.en;

      const walk = (obj, path) =>
        path.split(".").reduce((acc, part) => acc?.[part], obj);

      return walk(langData, section) ?? walk(fallback, section) ?? {};
    },
    [language]
  );

  // ── Exposed value ──────────────────────────────────────────────

  const value = useMemo(
    () => ({
      language,       // "en" | "te"
      showConsent,    // boolean — whether to render the consent modal
      acceptTelugu,
      rejectTelugu,
      t,
      tObj,
    }),
    [language, showConsent, acceptTelugu, rejectTelugu, t, tObj]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useLanguage()
 *
 * Returns { language, showConsent, acceptTelugu, rejectTelugu, t, tObj }
 * Must be used inside a <LanguageProvider>.
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside a <LanguageProvider>");
  }
  return ctx;
}

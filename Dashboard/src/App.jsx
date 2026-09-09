import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "./hooks/useAuth";

// Pages
import LandingPage from "./pages/LandingPage";
import FinancialNews from "./pages/FinancialNews";
import InvestmentAssistant from "./pages/InvestmentAssistant";
import BudgetAssistant from "./pages/BudgetAssistant";
import Community from "./pages/Community";
import LoanAssistant from "./pages/LoanAssistant";

// Layout
import Sidebar from "./components/Layouts/Sidebar";

// i18n
import { LanguageProvider, useLanguage } from "./i18n/LanguageContext";
import LanguageConsentModal from "./i18n/LanguageConsentModal";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  // ── Loading state: don't flash either the landing page or dashboard ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            AI SAATHI
          </span>
          <span className="text-sm text-gray-500 animate-pulse">{t("app", "loading")}</span>
        </div>
      </div>
    );
  }

  // ── Unauthenticated: show landing page (with auth modal CTA) ──
  if (!user) {
    return (
      <BrowserRouter>
        <ConsentOverlay />
        <LandingPage />
      </BrowserRouter>
    );
  }

  // ── Authenticated: show full dashboard ──
  return (
    <BrowserRouter>
      <ConsentOverlay />
      <div className="min-h-screen bg-gray-950 text-white flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-72 lg:ml-80">
          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 transition"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <span className="text-lg font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {t("app", "appName")}
            </span>

            <div className="w-10" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/"                       element={<FinancialNews />} />
              <Route path="/investment-assistant"   element={<InvestmentAssistant />} />
              <Route path="/budget-assistant"       element={<BudgetAssistant />} />
              <Route path="/community"              element={<Community />} />
              <Route path="/loan-assistant"         element={<LoanAssistant />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

/** Renders the consent modal only when the context says to show it. */
function ConsentOverlay() {
  const { showConsent } = useLanguage();
  return showConsent ? <LanguageConsentModal /> : null;
}

/** Wrap the whole app in the language provider so every component can use t(). */
export default function AppWithLanguage() {
  return (
    <LanguageProvider>
      <App />
    </LanguageProvider>
  );
}

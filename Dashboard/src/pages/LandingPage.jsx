import { useState } from "react";
import {
  Newspaper,
  Wallet,
  Banknote,
  TrendingUp,
  Users,
  Sprout,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import AuthModal from "../components/AuthModal";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * LandingPage — shown to unauthenticated users.
 * Preserves the AI Saathi brand and explains the product.
 * "Get Started" opens the AuthModal for Google sign-in.
 */
export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const { t } = useLanguage();

  const features = [
    {
      icon: Newspaper,
      title: t("landing.features.news", "title"),
      desc:  t("landing.features.news", "desc"),
    },
    {
      icon: Wallet,
      title: t("landing.features.budget", "title"),
      desc:  t("landing.features.budget", "desc"),
    },
    {
      icon: Banknote,
      title: t("landing.features.loan", "title"),
      desc:  t("landing.features.loan", "desc"),
    },
    {
      icon: TrendingUp,
      title: t("landing.features.investment", "title"),
      desc:  t("landing.features.investment", "desc"),
    },
    {
      icon: Users,
      title: t("landing.features.community", "title"),
      desc:  t("landing.features.community", "desc"),
    },
    {
      icon: BarChart3,
      title: t("landing.features.charts", "title"),
      desc:  t("landing.features.charts", "desc"),
    },
  ];

  const highlights = [
    { icon: Sprout,       text: t("landing.highlights", "rural") },
    { icon: ShieldCheck,  text: t("landing.highlights", "privacy") },
    { icon: BarChart3,    text: t("landing.highlights", "insights") },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-800/60">
        <span className="text-xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          {t("landing.nav", "appName")}
        </span>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-950 font-semibold text-sm hover:bg-yellow-300 active:scale-95 transition-all"
        >
          {t("landing.nav", "signIn")}
        </button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <span className="inline-block mb-4 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold tracking-wide uppercase">
          {t("landing", "badge")}
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {t("landing", "heroTitle1")}
          </span>
          <br />
          <span className="text-white">{t("landing", "heroTitle2")}</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-10 max-w-xl">
          {t("landing", "heroSubtitle")}
        </p>

        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 rounded-xl bg-yellow-400 text-gray-950 font-bold text-base hover:bg-yellow-300 active:scale-95 transition-all shadow-lg shadow-yellow-400/20"
        >
          {t("landing", "heroCTA")}
        </button>

        <p className="mt-4 text-xs text-gray-600">
          {t("landing", "heroNote")}
        </p>
      </section>

      {/* ── Highlights ──────────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row items-center justify-center gap-6 px-6 pb-16 max-w-4xl mx-auto">
        {highlights.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 bg-gray-900/60 border border-gray-800 rounded-xl px-5 py-3 text-sm text-gray-300"
          >
            <Icon className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            {text}
          </div>
        ))}
      </section>

      {/* ── Features grid ───────────────────────────────────── */}
      <section className="px-6 sm:px-10 pb-20 max-w-5xl mx-auto">
        <h2 className="text-center text-2xl font-bold text-white mb-10">
          {t("landing", "featuresHeading")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 hover:border-yellow-400/30 hover:bg-gray-900 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center mb-4 group-hover:bg-yellow-400/20 transition">
                <Icon className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────── */}
      <section className="border-t border-gray-800 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">
          {t("landing.ctaSection", "heading")}
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          {t("landing.ctaSection", "subheading")}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 rounded-xl bg-yellow-400 text-gray-950 font-bold hover:bg-yellow-300 active:scale-95 transition-all"
        >
          {t("landing.ctaSection", "button")}
        </button>
      </section>

      {/* Auth modal */}
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

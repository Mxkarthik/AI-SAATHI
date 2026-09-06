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

/**
 * LandingPage — shown to unauthenticated users.
 * Preserves the AI Saathi brand and explains the product.
 * "Get Started" opens the AuthModal for Google sign-in.
 */
export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);

  const features = [
    {
      icon: Newspaper,
      title: "Rural Finance News",
      desc: "Latest financial updates, crop prices, and government schemes curated for rural India.",
    },
    {
      icon: Wallet,
      title: "Budget Assistant",
      desc: "Plan your household and farm budget with personalised guidance.",
    },
    {
      icon: Banknote,
      title: "Loan Assistant",
      desc: "Understand loan options, eligibility, and repayment strategies in your language.",
    },
    {
      icon: TrendingUp,
      title: "Investment Assistant",
      desc: "Safe, simple investment advice suited for rural households.",
    },
    {
      icon: Users,
      title: "Community",
      desc: "Connect with other farmers and rural entrepreneurs to share insights.",
    },
    {
      icon: BarChart3,
      title: "Agriculture Price Charts",
      desc: "Track mandi prices and predict crop market trends.",
    },
  ];

  const highlights = [
    { icon: Sprout,       text: "Built for rural India — available in Telugu & English" },
    { icon: ShieldCheck,  text: "Your financial data stays private and secure" },
    { icon: BarChart3,    text: "AI-powered insights without financial jargon" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-800/60">
        <span className="text-xl font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          AI SAATHI
        </span>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2 rounded-lg bg-yellow-400 text-gray-950 font-semibold text-sm hover:bg-yellow-300 active:scale-95 transition-all"
        >
          Sign In
        </button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <span className="inline-block mb-4 px-3 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-xs font-semibold tracking-wide uppercase">
          Financial Intelligence for Rural India
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            AI Saathi
          </span>
          <br />
          <span className="text-white">Your Money. Your Future.</span>
        </h1>

        <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-10 max-w-xl">
          AI-powered financial guidance designed specifically for farmers,
          rural households, and small business owners in India — in Telugu
          and English.
        </p>

        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 rounded-xl bg-yellow-400 text-gray-950 font-bold text-base hover:bg-yellow-300 active:scale-95 transition-all shadow-lg shadow-yellow-400/20"
        >
          Get Started — It&apos;s Free
        </button>

        <p className="mt-4 text-xs text-gray-600">
          No credit card required · Sign in with Google
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
          Everything you need in one place
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
          Ready to take control of your finances?
        </h2>
        <p className="text-gray-400 text-sm mb-8">
          Join thousands of farmers and rural households already using AI Saathi.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 rounded-xl bg-yellow-400 text-gray-950 font-bold hover:bg-yellow-300 active:scale-95 transition-all"
        >
          Get Started — It&apos;s Free
        </button>
      </section>

      {/* Auth modal */}
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

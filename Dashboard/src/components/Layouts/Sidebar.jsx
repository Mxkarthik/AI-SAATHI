import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Newspaper,
  Wallet,
  Banknote,
  TrendingUp,
  Users,
  X,
  LogOut,
  ChevronUp,
  Bot,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../i18n/LanguageContext";

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const menuItems = [
    { name: "Financial News",       label: t("sidebar.nav", "financialNews"),       icon: Newspaper,    path: "/" },
    { name: "Budget Assistant",     label: t("sidebar.nav", "budgetAssistant"),     icon: Wallet,       path: "/budget-assistant" },
    { name: "Loan Assistant",       label: t("sidebar.nav", "loanAssistant"),       icon: Banknote,     path: "/loan-assistant" },
    { name: "Investment Assistant", label: t("sidebar.nav", "investmentAssistant"), icon: TrendingUp,   path: "/investment-assistant" },
    { name: "Community",            label: t("sidebar.nav", "community"),           icon: Users,        path: "/community" },
    { name: "Scheme AI",            label: t("sidebar.nav", "schemeAI"),            icon: Bot,          path: "/scheme-ai" },
  ];

  // Close account popover when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setAccountOpen(false);
    await logout();
  };

  // Derive initials for fallback avatar
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-30 md:hidden transition-opacity duration-200 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 sm:w-72 md:w-80 bg-gray-950 text-gray-300 flex flex-col border-r border-gray-800 transform transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6 text-2xl font-extrabold border-b border-gray-800">
          <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {t("sidebar", "appName")}
          </span>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-800"
            onClick={onClose}
            aria-label={t("sidebar.account", "ariaCloseMenu")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav menu — grows to fill available space */}
        <div className="flex flex-col gap-2 p-4 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.name} to={item.path}>
                <button
                  onClick={onClose}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-gray-800 text-yellow-400"
                      : "hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <Icon size={22} />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>

        {/* ── User account section (bottom) ───────────────── */}
        {user && (
          <div ref={accountRef} className="relative border-t border-gray-800 p-3">

            {/* Account popover — appears above the trigger */}
            {accountOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                {/* User info inside popover */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Log out button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-gray-800 hover:text-red-300 transition"
                >
                  <LogOut className="w-4 h-4 flex-shrink-0" />
                  {t("sidebar.account", "logout")}
                </button>
              </div>
            )}

            {/* Trigger button — always visible at the bottom */}
            <button
              onClick={() => setAccountOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition group"
              aria-haspopup="true"
              aria-expanded={accountOpen}
              aria-label={t("sidebar.account", "ariaAccountMenu")}
            >
              {/* Avatar */}
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {initials}
                </div>
              )}

              {/* Name + email */}
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate leading-tight">
                  {user.email}
                </p>
              </div>

              {/* Chevron */}
              <ChevronUp
                className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                  accountOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

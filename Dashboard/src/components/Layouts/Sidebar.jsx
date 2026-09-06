import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Home,
  Newspaper,
  Wallet,
  Banknote,
  TrendingUp,
  Users,
  X
} from "lucide-react";

export default function Sidebar({ isOpen = false, onClose = () => {} }) {

  const [active, setActive] = useState("Financial News");

  const menuItems = [
    { name: "Financial News", icon: Newspaper, path: "/" },
    { name: "Budget Assistant", icon: Wallet, path: "/budget-assistant" },
    { name: "Loan Assistant", icon: Banknote, path: "/loan-assistant" },
    { name: "Investment Assistant", icon: TrendingUp, path: "/investment-assistant" },
    { name: "Community", icon: Users, path: "/community" }
  ];

  return (
    <>
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
            AI SAATHI
          </span>
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-800"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <div className="flex flex-col gap-2 p-4">

          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link key={item.name} to={item.path}>
                <button
                  onClick={() => {
                    setActive(item.name);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200
                ${
                  active === item.name
                    ? "bg-gray-800 text-yellow-400"
                    : "hover:bg-gray-800 hover:text-white"
                }`}
                >
                  <Icon size={22} />
                  <span className="font-medium text-sm">{item.name}</span>
                </button>
              </Link>
            );
          })}

        </div>

      </div>
    </>
  );
}
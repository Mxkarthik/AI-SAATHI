import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Menu, MessageCircle, X, Send } from "lucide-react";

import Sidebar from "./components/Layouts/Sidebar";

import FinancialNews from "./pages/FinancialNews";
import Home from "./pages/Home";
import InvestmentAssistant from "./pages/InvestmentAssistant";
import BudgetAssistant from "./pages/BudgetAssistant";
import Community from "./pages/Community";
import LoanAssistant from "./pages/LoanAssistant";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile top header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 transition"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              AI SAATHI
            </span>
            <div className="w-10" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/financial-news" element={<FinancialNews />} />
              <Route path="/home" element={<Home />} />
              <Route path="/investment-assistant" element={<InvestmentAssistant />} />
              <Route path="/budget-assistant" element={<BudgetAssistant />} />
              <Route path="/community" element={<Community />} />
              <Route path="/loan-assistant" element={<LoanAssistant />} />
              <Route path="/" element={<Home />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* Floating Message Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Chat Panel */}
        {chatOpen && (
          <div className="w-72 sm:w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-black" />
                <span className="font-bold text-black text-sm">AI Saathi Support</span>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-full hover:bg-black/20 transition"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-3 min-h-[120px]">
              <div className="bg-gray-800 rounded-xl rounded-tl-none px-3 py-2 text-sm text-gray-200 max-w-[85%]">
                👋 Hi! How can I help you today?
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-800">
              <input
                type="text"
                placeholder="Type a message…"
                className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-gray-500 border border-gray-700 focus:border-yellow-400 transition"
              />
              <button className="p-2 bg-yellow-400 hover:bg-yellow-300 rounded-lg transition" aria-label="Send">
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg hover:scale-110 active:scale-95 transition-transform duration-200 flex items-center justify-center"
          aria-label="Open messages"
        >
          {chatOpen
            ? <X className="w-6 h-6 text-black" />
            : <MessageCircle className="w-6 h-6 text-black" />}
        </button>

      </div>

    </BrowserRouter>
  );
};

export default App;

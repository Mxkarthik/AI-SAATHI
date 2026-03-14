import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./components/Layouts/Sidebar";
import FinancialNews from "./pages/FinancialNews";
import InvestmentAssistant from "./pages/InvestmentAssistant";
import BudgetAssistant from "./pages/BudgetAssistant";
import Community from "./pages/Community";
import LoanAssistant from "./pages/LoanAssistant";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-72 lg:ml-80">

          {/* Mobile header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 transition"
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
              <Route path="/" element={<FinancialNews />} />
              <Route path="/investment-assistant" element={<InvestmentAssistant />} />
              <Route path="/budget-assistant" element={<BudgetAssistant />} />
              <Route path="/community" element={<Community />} />
              <Route path="/loan-assistant" element={<LoanAssistant />} />
            </Routes>
          </main>

        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
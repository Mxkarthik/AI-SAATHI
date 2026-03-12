import React from 'react'
import Sidebar from "./components/Layouts/Sidebar";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import FinancialNews from "./pages/FinancialNews";
import Home from "./pages/Home";
import InvestmentAssistant from "./pages/InvestmentAssistant";
import BudgetAssistant from "./pages/BudgetAssistant";
import Community from "./pages/Community";
import LoanAssistant from './pages/LoanAssistant';

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-950 text-white"> 
        <Sidebar />
          <div className="flex-1 p-6">
           <Routes>
              <Route path="/financial-news" element={<FinancialNews />} />
              <Route path="/home" element={<Home />} />
              <Route path="/investment-assistant" element={<InvestmentAssistant />} />
              <Route path="/budget-assistant" element={<BudgetAssistant />} />
              <Route path="/community" element={<Community />} />
              <Route path="/loan-assistant" element={<LoanAssistant />} />
              <Route path="/" element={<Home />} />
           </Routes>
          </div>
      </div>
    </BrowserRouter>
  );
};

export default App
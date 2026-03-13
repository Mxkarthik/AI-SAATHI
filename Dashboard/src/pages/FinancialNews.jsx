import React from "react";
import { Megaphone, Newspaper, KeyRound } from "lucide-react";
import TopFinancialUpdates from "./TopFinancialUpdates";
import WordOfTheDay from "../components/WordOfTheDay";
import AgriculturePriceCharts from "../components/AgriculturePriceCharts";
import ExpertFinancialInsights from "../components/ExpertFinancialInsights";

const FinancialNews = () => {
  return (
    <div className="w-full px-2 sm:px-4 md:px-8 py-6">

      {/* Main Heading */}
      <div className="flex justify-center items-center gap-3 text-center mb-8">
        <Megaphone className="text-yellow-400 w-6 h-6 md:w-8 md:h-8 flex-shrink-0" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide leading-tight">
          <span className="text-yellow-400">Rural India</span>{" "}
          <span className="text-white">Finance News</span>
        </h1>
      </div>

      {/* Section Headings Row */}
      {/* Vertical Stack Layout */}
      <div className="flex flex-col gap-10">

        {/* 1. Latest News (Sticky Top) */}
        <div className="sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-md py-4 -mx-2 sm:-mx-4 md:-mx-8 px-2 sm:px-4 md:px-8">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
            <h2 className="text-yellow-400 text-lg md:text-xl font-bold tracking-wide">
              Latest News
            </h2>
          </div>
          <TopFinancialUpdates />
        </div>

        {/* 2. Crop Price Trends & Predictions */}
        <div className="w-full">
          <AgriculturePriceCharts />
        </div>

        {/* 3. Word of the Day */}
        <div className="w-full border-t border-gray-800 pt-10">
          <WordOfTheDay />
        </div>

        {/* 4. Expert Financial Insights */}
        <div className="w-full border-t border-gray-800 pt-10">
          <ExpertFinancialInsights />
        </div>

      </div>

    </div>
  );
};

export default FinancialNews;
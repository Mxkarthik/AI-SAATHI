import React from "react";
import { Megaphone, Newspaper, KeyRound } from "lucide-react";
import TopFinancialUpdates from "./TopFinancialUpdates";
import WordOfTheDay from "../components/WordOfTheDay";

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4">
        {/* Latest News heading */}
        <div className="flex items-center gap-2">
          <Newspaper className="text-yellow-400 w-4 h-4 md:w-5 md:h-5" />
          <h2 className="text-yellow-400 text-sm md:text-lg font-semibold tracking-wide">
            Latest News
          </h2>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-start">

        {/* Left Column - News */}
        <div className="w-full md:w-2/3">
          <TopFinancialUpdates />
        </div>

        {/* Right Column - Word Cards */}
        <div className="w-full md:w-1/3 mt-6 md:mt-0">
          <WordOfTheDay />
        </div>

      </div>

    </div>
  );
};

export default FinancialNews;
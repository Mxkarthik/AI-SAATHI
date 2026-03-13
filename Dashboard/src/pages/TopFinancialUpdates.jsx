import React, { useEffect, useState } from "react";
import axios from "axios";

const TopFinancialUpdates = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await axios.get(
          "https://newsapi.org/v2/everything?q=rural%20india%20agriculture%20finance&sortBy=publishedAt&apiKey=305fa96e6517437198960603a6dba224"
        );
        setNews(res.data.articles.slice(0, 8));
      } catch (err) {
        console.error("Failed to fetch news:", err);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="w-full">
      <div className="w-full bg-gray-850 border border-gray-800 rounded-xl p-5 md:p-7 shadow-lg flex flex-col min-h-[22rem] max-h-[36rem]">

        {/* Scrollable news area */}
        <div className="flex-1 overflow-hidden relative">
          <div className="news-scroll space-y-5">
            {[...news, ...news].map((item, index) => {
              const date = new Date(item.publishedAt);
              return (
                <div key={index} className="border-b border-gray-800 pb-4 last:border-0">
                  <h4 className="text-yellow-400 font-semibold text-sm md:text-base leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-gray-300 text-xs md:text-sm mt-1 leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {date.toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TopFinancialUpdates;
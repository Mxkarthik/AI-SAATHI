import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLanguage } from "../i18n/LanguageContext";

const translationCache = new Map();

const TopFinancialUpdates = () => {
  const [news, setNews] = useState([]);
  const [displayNews, setDisplayNews] = useState([]);
  const { language } = useLanguage();

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await axios.get(
          "https://newsapi.org/v2/everything?q=rural%20india%20agriculture%20finance&sortBy=publishedAt&apiKey=305fa96e6517437198960603a6dba224"
        );
        const articles = res.data.articles.slice(0, 8);
        setNews(articles);
        setDisplayNews(articles);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      }
    };
    fetchNews();
  }, []);

  useEffect(() => {
    if (language === "en" || news.length === 0) {
      setDisplayNews(news);
      return;
    }

    const cacheKey = news
      .map((item) => `${item.title}\n${item.description || ""}`)
      .join("\n---\n");
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setDisplayNews(cached);
      return;
    }

    let active = true;
    axios
      .post("/api/news/translate", { articles: news })
      .then((res) => {
        const translated = Array.isArray(res.data?.articles)
          ? res.data.articles.map((item, index) => ({ ...news[index], ...item }))
          : news;
        translationCache.set(cacheKey, translated);
        if (active) setDisplayNews(translated);
      })
      .catch((err) => {
        console.error("Failed to translate news:", err);
        if (active) setDisplayNews(news);
      });

    return () => {
      active = false;
    };
  }, [language, news]);

  return (
    <div className="w-full">
      <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-5 md:p-7 shadow-lg flex flex-col min-h-[22rem] max-h-[36rem]">

        {/* Scrollable news area */}
        <div className="flex-1 overflow-hidden relative">
          <div className="news-scroll space-y-5">
            {[...displayNews, ...displayNews].map((item, index) => {
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
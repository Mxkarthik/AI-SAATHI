import React, { useState, useEffect } from "react";
import { KeyRound } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const WordOfTheDay = () => {
  const { tObj, t, language } = useLanguage();

  const [cards, setCards] = useState(() => tObj("wordOfTheDay.cards"));

  // Re-sync cards when the language changes
  useEffect(() => {
    setCards(tObj("wordOfTheDay.cards"));
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const [animating, setAnimating] = useState(false);

  const rotateCards = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      const updated = [...cards];
      const first = updated.shift();
      updated.push(first);
      setCards(updated);
      setAnimating(false);
    }, 400);
  };

  return (
    <div className="w-full flex flex-col items-center">

      {/* Section heading - Centered */}
      <div className="flex items-center justify-center gap-2 mb-10">
        <KeyRound className="text-yellow-400 w-5 h-5 md:w-6 md:h-6" />
        <h2 className="text-yellow-400 text-lg md:text-xl font-bold tracking-wide">
          {t("wordOfTheDay", "heading")}
        </h2>
      </div>

      {/* Card Stack - Constrained and Centered */}
      <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg h-[24rem]">
        {cards.map((card, index) => {
          const isFront = index === 0;
          return (
            <div
              key={index}
              onClick={rotateCards}
              className={`absolute left-0 right-0 w-full h-56 sm:h-60 bg-yellow-400 border-4 border-white rounded-2xl shadow-2xl p-6 cursor-pointer transition-all duration-500 hover:scale-[1.02]
                ${isFront && animating ? "translate-y-[-100px] opacity-0 rotate-[12deg]" : ""}`}
              style={{
                top: `${(cards.length - 1 - index) * 12}px`,
                transform: `rotate(${(index - cards.length / 2) * 1}deg)`,
                zIndex: cards.length - index
              }}
            >
              <div className="flex flex-col h-full justify-center">
                <h3 className="font-extrabold text-xl md:text-2xl text-black text-center mb-4 uppercase tracking-tighter">
                  {card.word}
                </h3>
                <p className="text-black text-sm md:text-base font-medium text-center leading-tight">
                  {card.desc}
                </p>
                {isFront && (
                  <p className="text-black/40 text-xs text-center mt-6 font-bold animate-pulse">
                    {t("wordOfTheDay", "tapToRotate")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default WordOfTheDay;
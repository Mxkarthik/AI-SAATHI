import React, { useState } from "react";
import { KeyRound } from "lucide-react";

const WordOfTheDay = () => {

  const [cards, setCards] = useState([
    {
      word: "Farmer Producer Organization (FPO)",
      desc: "FPOs are cooperative groups formed by farmers to collectively produce and market crops."
    },
    {
      word: "Subsidy",
      desc: "Financial assistance provided by the government to support farmers."
    },
    {
      word: "Crop Rotation",
      desc: "Growing different crops sequentially to maintain soil fertility."
    },
    {
      word: "Kisan Credit Card",
      desc: "Affordable credit scheme for farmers."
    },
    {
      word: "Minimum Support Price",
      desc: "Government guaranteed price for crops."
    }
  ]);

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
    <div className="w-full flex flex-col">

      {/* Section heading */}
      <div className="flex items-center gap-2 mb-8">
        <KeyRound className="text-yellow-400 w-4 h-4 md:w-5 md:h-5" />
        <h2 className="text-yellow-400 text-sm md:text-lg font-semibold tracking-wide">
          Words of the Day
        </h2>
      </div>

      {/* Card Stack */}
      <div className="relative w-full h-[30rem] sm:h-[35rem] md:h-[40rem]">
        {cards.map((card, index) => {
          const isFront = index === 0;
          return (
            <div
              key={index}
              onClick={rotateCards}
              className={`absolute w-full h-48 sm:h-52 md:h-56 bg-yellow-400 border-4 border-white rounded-xl shadow-xl p-5 cursor-pointer transition-all duration-500
                ${isFront && animating ? "translate-y-[-80px] rotate-[8deg]" : ""}`}
              style={{
                top: `${(cards.length - 1 - index) * 20}px`,
                transform: `rotate(${index * 1}deg)`,
                zIndex: cards.length - index
              }}
            >
              <h3 className="font-bold text-base md:text-lg text-black text-center">
                {card.word}
              </h3>
              <p className="text-black text-sm mt-3 text-center leading-relaxed">
                {card.desc}
              </p>
              {isFront && (
                <p className="text-black/60 text-xs text-center mt-4 italic">
                  Click to see next →
                </p>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default WordOfTheDay;
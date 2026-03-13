import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, PlayCircle, Youtube } from "lucide-react";

const videos = [
    {
        id: "IsB2gYqWH7E",
        title: "Rural Finance Schemes Explained | NABARD Updates",
        thumbnail: "https://img.youtube.com/vi/IsB2gYqWH7E/hqdefault.jpg",
        link: "https://www.youtube.com/watch?v=IsB2gYqWH7E",
        channel: "Rural Finance TV",
        date: "Oct 2024"
    },
    {
        id: "bPniECX7Gcc",
        title: "Telugu Farming Guide",
        thumbnail: "https://img.youtube.com/vi/bPniECX7Gcc/hqdefault.jpg",
        link: "https://www.youtube.com/watch?v=bPniECX7Gcc",
        channel: "Telugu Agri",
        date: "Oct 2024"
    },
    {
        id: "TpJDErZX_Ao",
        title: "Agri Input Subsidy Benefits for Farmers",
        thumbnail: "https://img.youtube.com/vi/TpJDErZX_Ao/hqdefault.jpg",
        link: "https://www.youtube.com/watch?v=TpJDErZX_Ao",
        channel: "Govt Schemes Telugu",
        date: "Sep 2024"
    },
    {
        id: "ghsbHRjWYM4",
        title: "Crop Insurance Claim Process Simplified",
        thumbnail: "https://img.youtube.com/vi/ghsbHRjWYM4/hqdefault.jpg",
        link: "https://www.youtube.com/watch?v=ghsbHRjWYM4",
        channel: "Insurance Guru",
        date: "Sep 2024"
    },
    {
        id: "3WJRIpL8FsU",
        title: "MSP Updates: What Farmers Need to Know",
        thumbnail: "https://img.youtube.com/vi/3WJRIpL8FsU/hqdefault.jpg",
        link: "https://www.youtube.com/watch?v=3WJRIpL8FsU",
        channel: "FarmNews Telugu",
        date: "Aug 2024"
    },
    {
        id: "BTjU_QXAWoY",
        title: "Kisan Credit Card Benefits & How to Apply",
        thumbnail: "https://img.youtube.com/vi/BTjU_QXAWoY/hqdefault.jpg",
        link: "https://www.youtube.com/watch?v=BTjU_QXAWoY",
        channel: "Banking Telugu",
        date: "Aug 2024"
    }
];

const ExpertFinancialInsights = () => {
    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === "left" ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
    };

    return (
        <div className="w-full mt-8">
            {/* Header with Arrows */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <Youtube className="text-red-600 w-6 h-6" />
                    <h2 className="text-yellow-400 text-lg md:text-xl font-bold tracking-wide">
                        Expert Financial Insights
                    </h2>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => scroll("left")}
                        className="p-2 rounded-full border border-gray-700 bg-gray-900/50 hover:bg-yellow-400/10 hover:border-yellow-400 transition-all text-gray-400 hover:text-yellow-400"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="p-2 rounded-full border border-gray-700 bg-gray-900/50 hover:bg-yellow-400/10 hover:border-yellow-400 transition-all text-gray-400 hover:text-yellow-400"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Horizontal Scroll Area */}
            <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth pb-4 px-1"
                style={{ scrollbarWidth: "none", "-ms-overflow-style": "none" }}
            >
                {videos.map((video) => (
                    <a
                        key={video.id}
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-64 md:w-80 group cursor-pointer"
                    >
                        <div className="relative aspect-video overflow-hidden rounded-xl border border-gray-800 bg-gray-900 group-hover:border-yellow-400/50 transition-all">
                            <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                <PlayCircle className="text-white w-12 h-12 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 drop-shadow-2xl" />
                            </div>
                            <div className="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                Telugu
                            </div>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-gray-100 font-semibold text-sm line-clamp-2 md:text-base group-hover:text-yellow-400 transition-colors">
                                {video.title}
                            </h3>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-gray-500 text-xs font-medium">
                                    {video.channel}
                                </span>
                                <span className="text-gray-500 text-[10px]">
                                    {video.date}
                                </span>
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
        </div>
    );
};

export default ExpertFinancialInsights;

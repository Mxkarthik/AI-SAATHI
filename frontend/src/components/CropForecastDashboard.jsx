import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart
} from 'recharts';

export default function CropForecastDashboard() {
  const [forecasts, setForecasts] = useState([]);
  const [horizon, setHorizon] = useState(30);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);

  useEffect(() => {
    fetchData();
  }, [horizon]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/crop-forecast?horizon=${horizon}`);
      setForecasts(res.data.data);
      setIsPersonalized(res.data.personalized);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Fetching verified mandi data...</div>;

  return (
    <div className="p-6 bg-[#0f172a] text-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Crop Price Intelligence</h1>
          <p className="text-xs text-gray-400">
            {isPersonalized ? "Personalized from Financial Profile" : "Starter Watchlist (Rainy Season / AP Mandis)"}
          </p>
        </div>
        <div className="flex bg-[#1e293b] rounded-lg p-1 border border-gray-700">
          {[30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setHorizon(days)}
              className={`px-3 py-1 text-xs rounded font-medium ${
                horizon === days ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {days === 30 ? "1M" : "3M"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {forecasts.map((item) => {
          const lastActual = item.historical[item.historical.length - 1]?.price;
          const lastPred = item.forecast[item.forecast.length - 1]?.predictedPrice;
          const pctChange = (((lastPred - lastActual) / lastActual) * 100).toFixed(1);

          // Merge historical and forecast for charting
          const chartData = [
            ...item.historical.map(h => ({ date: h.date.slice(5), actual: h.price })),
            ...item.forecast.map(f => ({
              date: f.date.slice(5),
              predicted: f.predictedPrice,
              range: [f.lowerBound, f.upperBound]
            }))
          ];

          return (
            <div key={item.crop} className="bg-[#1e293b] p-5 rounded-xl border border-gray-800 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-semibold text-yellow-400">{item.crop}</h2>
                  <span className="text-xs bg-gray-800 text-emerald-400 px-2 py-0.5 rounded border border-gray-700">
                    {item.market}, {item.region}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-800/80 mb-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Current</span>
                    <p className="text-sm font-semibold">₹{lastActual}/q</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">{horizon}D Forecast</span>
                    <p className="text-sm font-semibold text-emerald-400">₹{lastPred}/q</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Change</span>
                    <p className={`text-sm font-semibold ${pctChange >= 0 ? "text-green-400" : "text-rose-400"}`}>
                      {pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Area dataKey="range" stroke="none" fill="#3b82f6" fillOpacity={0.15} />
                    <Line type="monotone" dataKey="actual" stroke="#f59e0b" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeDasharray="3 3" dot={false} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-800">
                <span>Updated: {item.dataFreshness}</span>
                <span>Confidence: Moderate (MAE: ₹{item.metrics.mae})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
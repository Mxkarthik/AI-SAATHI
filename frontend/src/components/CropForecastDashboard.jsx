import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip
} from 'recharts';

const CROPS = ["Ragi", "Tomato", "Rice", "Wheat", "Chilli", "Cotton"];

export default function CropForecastDashboard() {
  const [horizon, setHorizon] = useState(30);
  const [loading, setLoading] = useState(true);
  const [cardsData, setCardsData] = useState([]);

  useEffect(() => {
    fetchIntelligence();
  }, [horizon]);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const requests = CROPS.map(crop =>
        axios.post('http://127.0.0.1:5001/predict', { crop, horizon })
      );
      const responses = await Promise.all(requests);
      setCardsData(responses.map(res => res.data));
    } catch (err) {
      console.error("API error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1e] text-slate-100 p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black tracking-wider text-amber-500">AI SAATHI</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
              LIVE AGMARKNET FEED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personalized Mandi Price Intelligence • Andhra Pradesh Hubs (Guntur, Kurnool, Chittoor)
          </p>
        </div>

        {/* Horizon Toggle */}
        <div className="flex bg-[#0f172a] rounded-lg p-1 border border-slate-700/80">
          {[
            { label: "1M", days: 30 },
            { label: "3M", days: 90 },
            { label: "6M", days: 180 }
          ].map((h) => (
            <button
              key={h.days}
              onClick={() => setHorizon(h.days)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                horizon === h.days
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-sm text-slate-400">
          Syncing mandi price vectors & evaluating LightGBM baseline...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cardsData.map((item) => {
            const lastActual = item.historical[item.historical.length - 1]?.price || 0;
            const finalPred = item.forecast[item.forecast.length - 1]?.predictedPrice || 0;
            const pctChange = (((finalPred - lastActual) / lastActual) * 100).toFixed(1);
            const peakVal = Math.max(...item.historical.map(h => h.price), ...item.forecast.map(f => f.predictedPrice));

            const chartData = [
              ...item.historical.map(h => ({ date: h.date.slice(5), actual: h.price })),
              ...item.forecast.map(f => ({
                date: f.date.slice(5),
                forecast: f.predictedPrice,
                band: [f.lowerBound, f.upperBound]
              }))
            ];

            return (
              <div
                key={item.crop}
                className="bg-[#0e1628] border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
              >
                {/* Card Title & Badges */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-amber-400">{item.crop}</h2>
                    <span className="text-[11px] text-slate-400">
                      Market: {item.market} ({item.region})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">
                      Peak: ₹{Math.round(peakVal).toLocaleString()}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Updated: {item.dataFreshness}
                    </p>
                  </div>
                </div>

                {/* Metric Summary Strip */}
                <div className="grid grid-cols-3 gap-2 bg-[#080d1a] p-3 rounded-xl border border-slate-800/80 mb-6">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Current Modal</span>
                    <p className="text-base font-bold text-white">₹{lastActual.toLocaleString()}/q</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{horizon}D Forecast</span>
                    <p className="text-base font-bold text-emerald-400">₹{finalPred.toLocaleString()}/q</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Expected Trend</span>
                    <p className={`text-base font-bold ${pctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pctChange >= 0 ? `+${pctChange}%` : `${pctChange}%`}
                    </p>
                  </div>
                </div>

                {/* Visual Chart Area */}
                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 10 }} minTickGap={20} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#070d1e', borderColor: '#1e293b', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '11px' }}
                      />
                      <Area dataKey="band" stroke="none" fill="#2563eb" fillOpacity={0.15} />
                      <Line type="monotone" dataKey="actual" stroke="#f59e0b" dot={false} strokeWidth={2.5} name="Actual Prices" />
                      <Line type="monotone" dataKey="forecast" stroke="#10b981" strokeDasharray="4 4" dot={{ r: 2 }} strokeWidth={2} name="Forecast" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                {/* Card Footer Info */}
                <div className="flex justify-between items-center text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Actual
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Model Forecast
                    </span>
                  </div>
                  <span className="text-emerald-400/90 font-medium">
                    Confidence: {item.metrics.confidence} (MAE: ₹{item.metrics.mae})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

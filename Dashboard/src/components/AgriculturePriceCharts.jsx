import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    ReferenceLine,
    Label,
} from 'recharts';

const cropData = {
    Ragi: [
        { date: 'Jan 22', price: 3300 },
        { date: 'Feb 22', price: 3400 },
        { date: 'Apr 22', price: 3500 },
        { date: 'Jun 22', price: 3500 },
        { date: 'Jul 22', price: 3400 },
        { date: 'Aug 22', price: 3100 },
        { date: 'Oct 22', price: 2300 },
        { date: 'Nov 22', price: 2150 },
        { date: 'Dec 22', price: 2800 },
        { date: 'Feb 23', price: 2700 },
        { date: 'Apr 23', price: 3000 },
        { date: 'Jun 23', price: 2800 },
        { date: 'Jul 23', price: 2800 },
        { date: 'Sep 23', price: 2800 },
        { date: 'Oct 23', price: 3100 },
        { date: 'Nov 23', price: 3150 },
        { date: 'Jan 24', price: 3300 },
        { date: 'Feb 24', predicted: 2950 },
        { date: 'Mar 24', predicted: 2950 },
        { date: 'Apr 24', predicted: 2950 },
    ],
    Tomato: [
        { date: 'Jan 22', price: 2000 },
        { date: 'Apr 22', price: 1800 },
        { date: 'Jun 22', price: 5500 },
        { date: 'Aug 22', price: 4200 },
        { date: 'Oct 22', price: 2200 },
        { date: 'Dec 22', price: 2500 },
        { date: 'Jan 23', price: 1500 },
        { date: 'Feb 23', price: 1100 },
        { date: 'Apr 23', price: 1200 },
        { date: 'Jun 23', price: 2200 },
        { date: 'Jul 23', price: 9000 },
        { date: 'Aug 23', price: 9500 },
        { date: 'Sep 23', price: 2200 },
        { date: 'Nov 23', price: 3200 },
        { date: 'Dec 23', price: 2800 },
        { date: 'Jan 24', price: 2500 },
        { date: 'Feb 24', predicted: 2500 },
        { date: 'Mar 24', predicted: 2500 },
        { date: 'Apr 24', predicted: 3200 },
        { date: 'Jun 24', predicted: 3900 },
    ],
    Rice: [
        { date: 'Jan 22', price: 2380 },
        { date: 'Apr 22', price: 2380 },
        { date: 'Jul 22', price: 2380 },
        { date: 'Aug 22', price: 1900 }, // Correction based on image
        { date: 'Sep 22', price: 2880 },
        { date: 'Oct 22', price: 3000 },
        { date: 'Nov 22', price: 3000 },
        { date: 'Jan 23', price: 2800 },
        { date: 'Apr 23', price: 2800 },
        { date: 'May 23', price: 3000 },
        { date: 'Jun 23', price: 3300 },
        { date: 'Jul 23', price: 3300 },
        { date: 'Sep 23', price: 3300 },
        { date: 'Jan 24', price: 3300 },
        { date: 'Feb 24', predicted: 2850 },
    ],
    Wheat: [
        { date: 'Jan 22', price: 2600 },
        { date: 'Apr 22', price: 2600 },
        { date: 'Jul 22', price: 2600 },
        { date: 'Oct 22', price: 2600 },
        { date: 'Nov 22', price: 2700 },
        { date: 'Jan 23', price: 2800 },
        { date: 'Feb 23', price: 3000 },
        { date: 'Apr 23', price: 3000 },
        { date: 'Jun 23', price: 2900 },
        { date: 'Jul 23', price: 3000 },
        { date: 'Jan 24', price: 3000 },
        { date: 'Feb 24', predicted: 2920 },
    ],
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#1a1a1a] border border-gray-700 p-2 rounded shadow-lg">
                <p className="text-gray-300 text-xs mb-1">{label}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
                        {entry.name}: ₹{entry.value.toLocaleString()}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const ChartCard = ({ title, data, peakValue, predictionType }) => {
    const peakPoint = data.reduce((prev, curr) => (curr.price > (prev.price || 0) ? curr : prev), {});

    return (
        <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl p-4 flex flex-col h-[300px] sm:h-[350px]">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-yellow-400 font-bold text-lg md:text-xl">{title}</h3>
                <div className="flex gap-1">
                    {['1M', '3M', '6M'].map((period) => (
                        <button
                            key={period}
                            className={`px-2 py-0.5 text-[10px] rounded border ${period === '3M' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-600 text-gray-400'
                                }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                        <XAxis
                            dataKey="date"
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            padding={{ left: 10, right: 10 }}
                        />
                        <YAxis
                            stroke="#555"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `₹${value.toLocaleString()}`}
                        />
                        <Tooltip content={<CustomTooltip />} />

                        {/* Legend replacement as per image */}
                        <ReferenceDot
                            x={data[data.length - 1].date}
                            y={data[data.length - 1].price || data[data.length - 1].predicted}
                            r={0}
                        >
                            <Label
                                value="Date"
                                position="bottom"
                                offset={-15}
                                fill="#999"
                                fontSize={12}
                            />
                        </ReferenceDot>

                        <Line
                            name="Actual Prices"
                            type="monotone"
                            dataKey="price"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            dot={{ fill: '#fbbf24', r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                        />
                        <Line
                            name={predictionType}
                            type="monotone"
                            dataKey="predicted"
                            stroke="#22c55e"
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={{ fill: '#22c55e', r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                        />

                        {/* Peak Label */}
                        {peakPoint.price && (
                            <ReferenceDot
                                x={peakPoint.date}
                                y={peakPoint.price}
                                r={4}
                                fill="#fbbf24"
                                stroke="none"
                            >
                                <Label
                                    value={`Peak: ₹${peakPoint.price.toLocaleString()}`}
                                    position="top"
                                    offset={10}
                                    fill="#fbbf24"
                                    fontSize={10}
                                    className="bg-black p-1 rounded border border-yellow-400"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #fbbf24' }}
                                />
                            </ReferenceDot>
                        )}

                        {/* Custom UI text for forecast if needed */}
                        {title === 'Rice' && (
                            <ReferenceLine x="Jan 24" stroke="none">
                                <Label
                                    value="Short-term forecast: 12.8% decrease"
                                    position="top"
                                    fill="#fff"
                                    fontSize={10}
                                    className="forecast-label"
                                />
                            </ReferenceLine>
                        )}
                        {title === 'Wheat' && (
                            <ReferenceLine x="Jan 24" stroke="none">
                                <Label
                                    value="Short-term forecast: 2.9% decrease"
                                    position="top"
                                    fill="#fff"
                                    fontSize={10}
                                    className="forecast-label"
                                />
                            </ReferenceLine>
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Manual Legend to match image */}
            <div className="flex flex-col gap-1 mt-2 ml-10">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-yellow-400 relative">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                    </div>
                    <span className="text-[10px] text-gray-400">Actual Prices</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-green-500 border-dashed relative">
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-[10px] text-gray-400">{predictionType}</span>
                </div>
            </div>

            <div className="flex justify-center mt-2">
                <span className="text-[10px] text-gray-400 font-semibold tracking-widest uppercase">Date</span>
            </div>
        </div>
    );
};

const AgriculturePriceCharts = () => {
    return (
        <div className="w-full">
            <div className="flex items-center gap-2 mb-6">
                <h2 className="text-yellow-400 text-lg md:text-xl font-bold tracking-wide">
                    Crop Price Trends & Predictions
                </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard
                    title="Ragi"
                    data={cropData.Ragi}
                    predictionType="6-Month Prediction"
                />
                <ChartCard
                    title="Tomato"
                    data={cropData.Tomato}
                    predictionType="6-Month Prediction"
                />
                <ChartCard
                    title="Rice"
                    data={cropData.Rice}
                    predictionType="1-Month Prediction"
                />
                <ChartCard
                    title="Wheat"
                    data={cropData.Wheat}
                    predictionType="1-Month Prediction"
                />
            </div>
        </div>
    );
};

export default AgriculturePriceCharts;

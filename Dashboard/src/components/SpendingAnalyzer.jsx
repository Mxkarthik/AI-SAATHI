/**
 * SpendingAnalyzer.jsx
 *
 * Advanced spending analysis panel for AI Saathi's Budget Assistant.
 * Shows:
 *  - Expense vs Earnings donut with percentage labels
 *  - Category breakdown table (amount + % share + mini bar)
 *  - Top-5 single expenses badge list
 *  - Day-of-week spending heatmap
 *  - Per-category monthly stacked trend line
 *  - Smart AI-style spending insights (rule-based, no extra API call)
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Award, Calendar, Tag, Zap,
} from "lucide-react";
import {
  getSummary,
  getExpenseBreakdown,
  getMonthlySummary,
  getTopExpenses,
  getCategoryTrend,
  getSpendingByDay,
} from "../utils/transactionApi";

// ── Palette ─────────────────────────────────────────────────────────────────
const PALETTE = [
  "#facc15", "#f97316", "#22c55e", "#38bdf8",
  "#a78bfa", "#fb7185", "#2dd4bf", "#eab308",
  "#60a5fa", "#f472b6",
];

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;
const pct = (part, total) =>
  total === 0 ? "0%" : `${((part / total) * 100).toFixed(1)}%`;

// ── Custom donut centre label ────────────────────────────────────────────────
const DonutCentreLabel = ({ viewBox, totalExpenses, totalEarnings }) => {
  const { cx, cy } = viewBox;
  const net = totalEarnings - totalExpenses;
  const isProfit = net >= 0;
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.6em" fontSize="11" fill="#9ca3af">
        {isProfit ? "Surplus" : "Deficit"}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize="14" fontWeight="bold" fill={isProfit ? "#22c55e" : "#f87171"}>
        {fmt(Math.abs(net))}
      </tspan>
    </text>
  );
};

// ── Insight engine (pure function, no LLM needed) ────────────────────────────
function buildInsights({ summary, breakdown, monthly, topExpenses, byDay }) {
  const insights = [];
  const { totalExpenses, totalEarnings } = summary;

  if (totalExpenses === 0) return [];

  // 1. Savings rate
  const savingsRate =
    totalEarnings > 0
      ? ((totalEarnings - totalExpenses) / totalEarnings) * 100
      : -100;
  if (savingsRate >= 20) {
    insights.push({
      icon: CheckCircle,
      color: "text-green-400",
      title: "Great savings rate!",
      body: `You're saving ${savingsRate.toFixed(1)}% of your income — above the recommended 20%.`,
    });
  } else if (savingsRate < 0) {
    insights.push({
      icon: AlertTriangle,
      color: "text-red-400",
      title: "Spending exceeds income",
      body: `You spent ${fmt(totalExpenses - totalEarnings)} more than you earned. Review your top categories.`,
    });
  } else {
    insights.push({
      icon: TrendingDown,
      color: "text-yellow-400",
      title: "Savings below 20%",
      body: `Current savings rate is ${savingsRate.toFixed(1)}%. Try trimming your highest category.`,
    });
  }

  // 2. Dominant expense category
  if (breakdown.length > 0) {
    const top = breakdown[0];
    const share = ((top.amount / totalExpenses) * 100).toFixed(1);
    insights.push({
      icon: Tag,
      color: "text-orange-400",
      title: `"${top.category}" is your biggest spend`,
      body: `${fmt(top.amount)} — ${share}% of total expenses. ${
        share > 40
          ? "This is unusually high; consider setting a budget cap."
          : "Keep monitoring this category."
      }`,
    });
  }

  // 3. Monthly trend (last 2 months)
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    const delta = last.expenses - prev.expenses;
    if (delta > 0) {
      insights.push({
        icon: TrendingUp,
        color: "text-red-400",
        title: "Expenses rose last month",
        body: `Up by ${fmt(delta)} vs ${prev.month}. The biggest driver is likely "${
          breakdown[0]?.category || "Other"
        }".`,
      });
    } else if (delta < 0) {
      insights.push({
        icon: TrendingDown,
        color: "text-green-400",
        title: "Expenses dropped last month",
        body: `Down by ${fmt(Math.abs(delta))} vs ${prev.month}. Keep it up!`,
      });
    }
  }

  // 4. Single biggest expense
  if (topExpenses.length > 0) {
    const big = topExpenses[0];
    const share = ((big.amount / totalExpenses) * 100).toFixed(1);
    if (share > 20) {
      insights.push({
        icon: Zap,
        color: "text-yellow-300",
        title: "One transaction dominates",
        body: `${fmt(big.amount)} on "${big.description || big.category}" is ${share}% of all expenses.`,
      });
    }
  }

  // 5. Peak spending day
  if (byDay.length > 0) {
    const peak = [...byDay].sort((a, b) => b.amount - a.amount)[0];
    if (peak.amount > 0) {
      insights.push({
        icon: Calendar,
        color: "text-blue-400",
        title: `${peak.label}s are your heaviest spend day`,
        body: `You spend ${fmt(peak.amount)} total on ${peak.label}s. Plan your budget around it.`,
      });
    }
  }

  // 6. Diversity score
  if (breakdown.length >= 4) {
    insights.push({
      icon: Award,
      color: "text-purple-400",
      title: "Spending is well-diversified",
      body: `Expenses spread across ${breakdown.length} categories — no single category above ${
        ((breakdown[0].amount / totalExpenses) * 100).toFixed(0)
      }%.`,
    });
  }

  return insights.slice(0, 5); // max 5 cards
}

// ── Main component ───────────────────────────────────────────────────────────
const SpendingAnalyzer = ({ refreshTrigger = 0 }) => {
  const [summary, setSummary] = useState({ totalExpenses: 0, totalEarnings: 0, netBalance: 0 });
  const [breakdown, setBreakdown] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [topExpenses, setTopExpenses] = useState([]);
  const [categoryTrend, setCategoryTrend] = useState([]);
  const [byDay, setByDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview | trend | heatmap | insights

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, brkRes, monRes, topRes, trendRes, dayRes] = await Promise.all([
        getSummary(),
        getExpenseBreakdown(),
        getMonthlySummary(),
        getTopExpenses(5),
        getCategoryTrend(),
        getSpendingByDay(),
      ]);
      setSummary({
        totalExpenses: sumRes.totalExpenses || 0,
        totalEarnings: sumRes.totalEarnings || 0,
        netBalance: sumRes.netBalance || 0,
      });
      setBreakdown(brkRes.breakdown || []);
      setMonthly(monRes.monthly || []);
      setTopExpenses(topRes.topExpenses || []);
      setCategoryTrend(trendRes.trend || []);
      setByDay(dayRes.byDay || []);
    } catch (err) {
      console.error("SpendingAnalyzer load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshTrigger]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const donutData = [
    { name: "Expenses", value: summary.totalExpenses },
    { name: "Earnings", value: summary.totalEarnings },
  ];

  // Build unique category list from trend data for the stacked line chart
  const categoryNames = [...new Set(categoryTrend.map((r) => r.category))];

  // Pivot categoryTrend into { month, Cat1: val, Cat2: val, ... }
  const pivotedTrend = (() => {
    const map = new Map();
    for (const row of categoryTrend) {
      if (!map.has(row.month)) map.set(row.month, { month: row.month });
      map.get(row.month)[row.category] = row.amount;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  })();

  // Peak day for heatmap highlight
  const maxDayAmount = Math.max(...byDay.map((d) => d.amount), 1);

  // AI insights
  const insights = buildInsights({ summary, breakdown, monthly, topExpenses, byDay });

  // ── Tab bar ──────────────────────────────────────────────────────────────
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "trend", label: "Trend" },
    { key: "heatmap", label: "Heatmap" },
    { key: "insights", label: "Insights" },
  ];

  if (loading) {
    return (
      <div className="border border-yellow-500 rounded-xl p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-yellow-400 animate-pulse">Loading spending analysis…</p>
      </div>
    );
  }

  const hasExpenses = summary.totalExpenses > 0;

  return (
    <div className="border border-yellow-500 rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-yellow-400 font-semibold text-base tracking-wide">
          💰 Spending Analyzer
        </h2>
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === t.key
                  ? "bg-yellow-400 text-black"
                  : "bg-[#07150f] text-yellow-400 border border-yellow-700 hover:border-yellow-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!hasExpenses && (
        <p className="text-gray-500 text-sm text-center py-8">
          No expenses recorded yet — add transactions to see your spending analysis.
        </p>
      )}

      {/* ── TAB: OVERVIEW ────────────────────────────────────────────────── */}
      {activeTab === "overview" && hasExpenses && (
        <div className="space-y-6">
          {/* Donut + legend */}
          <div className="flex flex-col items-center">
            <PieChart width={260} height={240}>
              <Pie
                data={donutData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={100}
                paddingAngle={3}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(1)}%`
                }
                labelLine={false}
              >
                <Cell fill="#f87171" />
                <Cell fill="#22c55e" />
              </Pie>
              <Tooltip
                formatter={(val) => fmt(val)}
                contentStyle={{ background: "#07150f", border: "1px solid #eab308", borderRadius: 8 }}
              />
              {/* Centre label via customized label */}
            </PieChart>
            <div className="flex gap-6 text-xs mt-1">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                Expenses {pct(summary.totalExpenses, summary.totalExpenses + summary.totalEarnings)}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" />
                Earnings {pct(summary.totalEarnings, summary.totalExpenses + summary.totalEarnings)}
              </span>
            </div>
          </div>

          {/* Category breakdown table */}
          <div>
            <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider mb-2">
              Expenses by Category
            </p>
            <div className="space-y-2">
              {breakdown.map((row, i) => {
                const share = summary.totalExpenses > 0
                  ? (row.amount / summary.totalExpenses) * 100
                  : 0;
                return (
                  <div key={row.category} className="space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                        />
                        {row.category}
                      </span>
                      <span className="text-gray-300 font-medium">
                        {fmt(row.amount)}
                        <span className="text-gray-500 ml-1.5">{share.toFixed(1)}%</span>
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full h-1.5 bg-[#0d2318] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: PALETTE[i % PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 single expenses */}
          {topExpenses.length > 0 && (
            <div>
              <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider mb-2">
                Top Single Expenses
              </p>
              <div className="space-y-1.5">
                {topExpenses.map((t, i) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between bg-[#07150f] rounded-lg px-3 py-2 border border-yellow-900"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full"
                        style={{ backgroundColor: PALETTE[i % PALETTE.length], color: "#000" }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-xs text-yellow-300 font-medium">
                          {t.description || t.category}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {t.category} &middot;{" "}
                          {new Date(t.date).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-yellow-400 font-semibold text-sm">
                      {fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: TREND ───────────────────────────────────────────────────── */}
      {activeTab === "trend" && (
        <div className="space-y-6">
          {/* Monthly expenses vs earnings */}
          <div>
            <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider mb-3">
              Monthly Expenses vs Earnings
            </p>
            {monthly.length < 2 ? (
              <p className="text-gray-500 text-xs text-center py-6">
                Add transactions across at least 2 months to see the trend.
              </p>
            ) : (
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <LineChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" stroke="#facc15" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#facc15" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => fmt(val)}
                      contentStyle={{ background: "#07150f", border: "1px solid #eab308", borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} name="Expenses" />
                    <Line type="monotone" dataKey="earnings" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Earnings" />
                    <Line type="monotone" dataKey="savings" stroke="#facc15" strokeWidth={2} dot={{ r: 3 }} name="Savings" strokeDasharray="4 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Per-category trend */}
          <div>
            <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider mb-3">
              Category-wise Monthly Spend
            </p>
            {pivotedTrend.length < 2 || categoryNames.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-4">
                Not enough category data yet.
              </p>
            ) : (
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={pivotedTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" stroke="#facc15" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#facc15" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => fmt(val)}
                      contentStyle={{ background: "#07150f", border: "1px solid #eab308", borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    {categoryNames.map((cat, i) => (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        stroke={PALETTE[i % PALETTE.length]}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Expense category bar chart */}
          {breakdown.length > 0 && (
            <div>
              <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider mb-3">
                Total Spend per Category
              </p>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={breakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                    <XAxis type="number" stroke="#facc15" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="category" stroke="#facc15" tick={{ fontSize: 10 }} width={68} />
                    <Tooltip
                      formatter={(val) => fmt(val)}
                      contentStyle={{ background: "#07150f", border: "1px solid #eab308", borderRadius: 8 }}
                    />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {breakdown.map((entry, i) => (
                        <Cell key={entry.category} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: HEATMAP ─────────────────────────────────────────────────── */}
      {activeTab === "heatmap" && (
        <div className="space-y-5">
          <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider">
            Spending by Day of Week
          </p>
          {byDay.every((d) => d.amount === 0) ? (
            <p className="text-gray-500 text-xs text-center py-6">
              No expense data yet for day-of-week analysis.
            </p>
          ) : (
            <>
              {/* Visual heatmap blocks */}
              <div className="grid grid-cols-7 gap-2">
                {byDay.map((d) => {
                  const intensity = d.amount / maxDayAmount;
                  const bg = intensity > 0.8
                    ? "#f97316"
                    : intensity > 0.5
                    ? "#eab308"
                    : intensity > 0.2
                    ? "#854d0e"
                    : "#1c3a2a";
                  return (
                    <div
                      key={d.day}
                      title={`${d.label}: ${fmt(d.amount)}`}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold cursor-default transition-transform hover:scale-110"
                        style={{ backgroundColor: bg, color: intensity > 0.2 ? "#000" : "#6b7280" }}
                      >
                        {d.label.slice(0, 2)}
                      </div>
                      <span className="text-[9px] text-gray-500 text-center leading-tight">
                        {d.amount > 0 ? `₹${(d.amount / 1000).toFixed(1)}k` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Bar version for precision */}
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="label" stroke="#facc15" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#facc15" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val) => fmt(val)}
                      contentStyle={{ background: "#07150f", border: "1px solid #eab308", borderRadius: 8 }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {byDay.map((d) => {
                        const intensity = d.amount / maxDayAmount;
                        const fill =
                          intensity > 0.8 ? "#f97316" : intensity > 0.5 ? "#eab308" : "#22c55e";
                        return <Cell key={d.day} fill={fill} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex gap-4 text-[10px] text-gray-400 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#f97316] inline-block" /> High spend</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#eab308] inline-block" /> Moderate</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#22c55e] inline-block" /> Low</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#1c3a2a] inline-block" /> No spend</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: INSIGHTS ────────────────────────────────────────────────── */}
      {activeTab === "insights" && (
        <div className="space-y-3">
          <p className="text-yellow-200 text-xs font-semibold uppercase tracking-wider">
            AI Spending Insights
          </p>
          {insights.length === 0 ? (
            <p className="text-gray-500 text-xs text-center py-6">
              Add more transactions to generate personalised insights.
            </p>
          ) : (
            insights.map((ins, i) => {
              const Icon = ins.icon;
              return (
                <div
                  key={i}
                  className="bg-[#07150f] border border-yellow-900 rounded-xl px-4 py-3 flex gap-3"
                >
                  <Icon size={18} className={`${ins.color} mt-0.5 shrink-0`} />
                  <div>
                    <p className={`text-sm font-semibold ${ins.color}`}>{ins.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              );
            })
          )}

          {/* Summary stats row */}
          {hasExpenses && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { label: "Total Spent", value: fmt(summary.totalExpenses), color: "text-red-400" },
                { label: "Total Earned", value: fmt(summary.totalEarnings), color: "text-green-400" },
                {
                  label: summary.netBalance >= 0 ? "Surplus" : "Deficit",
                  value: fmt(Math.abs(summary.netBalance)),
                  color: summary.netBalance >= 0 ? "text-green-400" : "text-red-400",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-[#07150f] border border-yellow-900 rounded-lg p-2 text-center"
                >
                  <p className="text-[10px] text-gray-500">{s.label}</p>
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpendingAnalyzer;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Mic, MicOff, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useLanguage } from "../i18n/LanguageContext";

import {
  getSummary,
  getTransactions,
  createTransactionFromVoice,
  deleteTransaction,
} from "../utils/transactionApi";

import SpendingAnalyzer from "../components/SpendingAnalyzer";

const BudgetAssistant = () => {
  const { t } = useLanguage();

  const [summary, setSummary] = useState({
    totalExpenses: 0,
    totalEarnings: 0,
    totalSavings: 0,
    netBalance: 0,
  });

  const [transactions, setTransactions] = useState([]);
  const [analyzerKey, setAnalyzerKey] = useState(0);

  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastHeard, setLastHeard] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const [showExpenseHistory, setShowExpenseHistory] = useState(false);
  const [showEarningHistory, setShowEarningHistory] = useState(false);

  const recognitionRef = useRef(null);

  const {
    totalExpenses,
    totalEarnings,
    totalSavings,
    netBalance,
  } = summary;

  // Load everything from MongoDB through the backend
  const loadAll = useCallback(async () => {
    try {
      const [summaryRes, txRes] = await Promise.all([
        getSummary(),
        getTransactions(),
      ]);

      setSummary({
        totalExpenses: summaryRes.totalExpenses || 0,
        totalEarnings: summaryRes.totalEarnings || 0,
        totalSavings: summaryRes.totalSavings || 0,
        netBalance: summaryRes.netBalance || 0,
      });

      setTransactions(txRes.transactions || []);

      // Refresh SpendingAnalyzer
      setAnalyzerKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to load budget data:", err);

      setStatus("error");
      setStatusMessage(
        "Couldn't load your data. Is the backend running?"
      );
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SpeechRecognition();

    rec.continuous = false;
    rec.interimResults = false;

    // Keep Telugu speech support from master branch
    rec.lang = "te-IN";

    rec.onresult = (event) => {
      const speechResult =
        event.results[0][0].transcript;

      setLastHeard(speechResult);
      handleTranscript(speechResult);
    };

    rec.onerror = () => {
      setRecording(false);
      setStatus("error");
      setStatusMessage(
        "Couldn't hear you clearly. Please try again."
      );
    };

    rec.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = rec;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send speech to backend instead of parsing only in frontend
  const handleTranscript = async (text) => {
    setStatus("processing");
    setStatusMessage("Processing transaction...");

    try {
      const res = await createTransactionFromVoice(text);

      setStatus("success");
      setStatusMessage(
        res.message || "Transaction saved successfully"
      );

      await loadAll();
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        err.message || "Couldn't save that transaction."
      );
    }
  };

  const recordTransaction = () => {
    if (!speechSupported) {
      setStatus("error");
      setStatusMessage(
        "Speech recognition isn't supported in this browser."
      );
      return;
    }

    if (recognitionRef.current && !recording) {
      setStatus("listening");
      setStatusMessage("Listening...");
      setLastHeard("");
      setRecording(true);

      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && recording) {
      recognitionRef.current.stop();
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
      await loadAll();
    } catch (err) {
      setStatus("error");
      setStatusMessage(
        err.message || "Couldn't delete that transaction."
      );
    }
  };

  const expenseHistory = transactions.filter(
    (t) => t.type === "expense"
  );

  const earningHistory = transactions.filter(
    (t) => t.type === "earning"
  );

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const typeLabel = {
    expense: "Expense",
    earning: "Earning",
    saving: "Saving",
  };

  // Pie chart data from backend values
  const chartData = [
    {
      name: t("budgetAssistant", "expensesLegend"),
      value: totalExpenses,
    },
    {
      name: t("budgetAssistant", "earningsLegend"),
      value: totalEarnings,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-yellow-400 p-6">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* LEFT PANEL */}
        <div className="lg:col-span-2 space-y-6">

          {/* TOP PANEL */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 shadow-lg">

            <div className="grid grid-cols-4 gap-6 items-center">

              {/* RECORD BUTTON */}
              <div className="flex flex-col items-center">
                <p className="text-sm mb-2">
                  {t(
                    "budgetAssistant",
                    "recordTransaction"
                  )}
                </p>

                <button
                  onClick={
                    recording
                      ? stopRecording
                      : recordTransaction
                  }
                  className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
                >
                  {recording ? (
                    <MicOff size={22} />
                  ) : (
                    <Mic size={22} />
                  )}
                </button>

                {status !== "idle" && statusMessage && (
                  <p
                    className={`text-xs mt-2 text-center max-w-[10rem] ${
                      status === "error"
                        ? "text-red-400"
                        : "text-yellow-200"
                    }`}
                  >
                    {statusMessage}
                  </p>
                )}

                {lastHeard && (
                  <p className="text-[11px] mt-1 text-gray-400 italic text-center max-w-[10rem]">
                    "{lastHeard}"
                  </p>
                )}

                {!speechSupported && (
                  <p className="text-[11px] mt-1 text-red-400 text-center max-w-[10rem]">
                    Speech recognition isn't supported in this
                    browser.
                  </p>
                )}
              </div>

              {/* EXPENSE */}
              <div className="text-center">
                <p className="font-semibold">
                  {t("budgetAssistant", "expenses")}
                </p>

                <p className="text-sm mt-2">
                  {t(
                    "budgetAssistant",
                    "totalExpenditure"
                  )}
                </p>

                <p className="font-bold">
                  ₹ {totalExpenses.toLocaleString("en-IN")}
                </p>
              </div>

              {/* EARNINGS */}
              <div className="text-center">
                <p className="font-semibold">
                  {t("budgetAssistant", "earnings")}
                </p>

                <p className="text-sm mt-2">
                  {t(
                    "budgetAssistant",
                    "totalEarnings"
                  )}
                </p>

                <p className="font-bold">
                  ₹ {totalEarnings.toLocaleString("en-IN")}
                </p>
              </div>

              {/* NET */}
              <div className="text-center">
                <p className="font-semibold">
                  {t("budgetAssistant", "net")}
                </p>

                <p className="text-sm mt-2">
                  {t("budgetAssistant", "profitLoss")}
                </p>

                <p className="font-bold">
                  ₹ {netBalance.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {totalSavings > 0 && (
              <p className="text-xs text-center mt-4 text-yellow-200">
                Savings set aside: ₹{" "}
                {totalSavings.toLocaleString("en-IN")}
              </p>
            )}
          </div>

          {/* TRANSACTION LOG */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 min-h-40 max-h-96 overflow-y-auto">

            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-10">
                {t(
                  "budgetAssistant",
                  "noTransactions"
                )}
              </p>
            ) : (
              <div className="space-y-2">

                {transactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center justify-between border-b border-yellow-900 pb-2 last:border-0"
                  >
                    <div>
                      <p className="text-yellow-400 font-medium">
                        {typeLabel[transaction.type]} · ₹
                        {Number(
                          transaction.amount
                        ).toLocaleString("en-IN")}
                      </p>

                      <p className="text-xs text-gray-400">
                        {formatDate(transaction.date)}{" "}
                        &middot; {transaction.category}

                        {transaction.description
                          ? ` · ${transaction.description}`
                          : ""}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        handleDelete(transaction._id)
                      }
                      className="text-gray-500 hover:text-red-400 p-1"
                      title="Delete transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

              </div>
            )}
          </div>

          {/* PIE CHART */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 flex flex-col items-center">

            <p className="mb-4 text-center">
              {t(
                "budgetAssistant",
                "financeOverview"
              )}
            </p>

            <PieChart width={260} height={260}>
              <Pie
                data={chartData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={4}
              >
                <Cell fill="#ff4d4d" />
                <Cell fill="#00e676" />
              </Pie>

              <Tooltip />
            </PieChart>

            <div className="flex gap-6 mt-4 text-sm">

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />

                <span>
                  {t(
                    "budgetAssistant",
                    "expensesLegend"
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full" />

                <span>
                  {t(
                    "budgetAssistant",
                    "earningsLegend"
                  )}
                </span>
              </div>

            </div>
          </div>

          {/* SPENDING ANALYZER */}
          <SpendingAnalyzer
            refreshTrigger={analyzerKey}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="space-y-6">

          {/* EXPENSE HISTORY */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6">

            <div className="flex flex-col items-center">
              <p className="mb-4">
                {t(
                  "budgetAssistant",
                  "expenseHistory"
                )}
              </p>

              <button
                onClick={() =>
                  setShowExpenseHistory(
                    (v) => !v
                  )
                }
                className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
              >
                <Pencil size={20} />
              </button>
            </div>

            {showExpenseHistory && (
              <div className="mt-4 max-h-56 overflow-y-auto space-y-3 text-sm">

                {expenseHistory.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    No expenses recorded yet
                  </p>
                ) : (
                  expenseHistory.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="border-t border-yellow-900 pt-2"
                    >
                      <p className="text-gray-400 text-xs">
                        You: "
                        {transaction.sourceText ||
                          `${transaction.description} ${transaction.amount}`}
                        "
                      </p>

                      <p className="text-yellow-400">
                        Expense added: ₹
                        {Number(
                          transaction.amount
                        ).toLocaleString("en-IN")}{" "}
                        · {transaction.category}
                      </p>
                    </div>
                  ))
                )}

              </div>
            )}
          </div>

          {/* EARNING HISTORY */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6">

            <div className="flex flex-col items-center">
              <p className="mb-4">
                {t(
                  "budgetAssistant",
                  "earningHistory"
                )}
              </p>

              <button
                onClick={() =>
                  setShowEarningHistory(
                    (v) => !v
                  )
                }
                className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
              >
                <Pencil size={20} />
              </button>
            </div>

            {showEarningHistory && (
              <div className="mt-4 max-h-56 overflow-y-auto space-y-3 text-sm">

                {earningHistory.length === 0 ? (
                  <p className="text-gray-500 text-center">
                    No earnings recorded yet
                  </p>
                ) : (
                  earningHistory.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="border-t border-yellow-900 pt-2"
                    >
                      <p className="text-gray-400 text-xs">
                        You: "
                        {transaction.sourceText ||
                          `${transaction.description} ${transaction.amount}`}
                        "
                      </p>

                      <p className="text-yellow-400">
                        Earning added: ₹
                        {Number(
                          transaction.amount
                        ).toLocaleString("en-IN")}{" "}
                        · {transaction.category}
                      </p>
                    </div>
                  ))
                )}

              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default BudgetAssistant;
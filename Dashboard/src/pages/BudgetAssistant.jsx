import React, { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Mic, MicOff, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import { useLanguage } from "../i18n/LanguageContext";
import { useAuth } from "../hooks/useAuth";
import {
  getSummary,
  getTransactions,
  createTransactionFromVoice,
  deleteTransaction,
} from "../utils/transactionApi";
import SpendingAnalyzer from "../components/SpendingAnalyzer";

// ── Language config (guide panel only) ────────────────────────────────────
const LANGUAGES = [
  { code: "en-IN", label: "English", flag: "🇬🇧" },
  { code: "te-IN", label: "తెలుగు",  flag: "🇮🇳" },
  { code: "hi-IN", label: "हिंदी",   flag: "🇮🇳" },
];

// ── Voice example phrases ──────────────────────────────────────────────────
const VOICE_EXAMPLES = {
  "en-IN": {
    sections: [
      { title: "💸 Expenses", color: "text-red-400", examples: [
        "I spent 2 lakh on land", "Bought a car for 8 lakh",
        "Paid 500 for electricity bill", "Spent 1000 on food",
        "Paid 10000 for school fees", "Spent 50000 on house renovation",
      ]},
      { title: "💰 Earnings", color: "text-green-400", examples: [
        "I earned 4 lakh salary", "Received 20000 income",
        "Got 50000 from business", "Earned 10000 commission",
      ]},
      { title: "🏦 Savings", color: "text-blue-400", examples: [
        "I saved 5000", "Put aside 10000", "Set aside 2 lakh in FD",
      ]},
    ],
  },
  "te-IN": {
    sections: [
      { title: "💸 ఖర్చులు", color: "text-red-400", examples: [
        "నేను 2 లక్షలు భూమికి ఖర్చు చేసాను",
        "500 రూపాయలు తిండికి ఖర్చు చేసాను",
        "1000 రూపాయలు కరెంట్ బిల్లు చెల్లించాను",
        "8 లక్షలకు కారు కొన్నాను",
      ]},
      { title: "💰 సంపాదన", color: "text-green-400", examples: [
        "నేను 4 లక్షలు జీతం అందుకున్నాను",
        "20000 రూపాయలు వచ్చింది",
        "వ్యాపారం నుండి 50000 వచ్చాయి",
      ]},
      { title: "🏦 పొదుపు", color: "text-blue-400", examples: [
        "5000 రూపాయలు దాచుకున్నాను",
        "10000 పొదుపు చేసాను",
      ]},
    ],
  },
  "hi-IN": {
    sections: [
      { title: "💸 खर्च", color: "text-red-400", examples: [
        "मैंने 2 लाख जमीन पर खर्च किया",
        "500 रुपये खाने पर खर्च किए",
        "1000 रुपये बिजली बिल भरा",
        "8 लाख में कार खरीदी",
      ]},
      { title: "💰 कमाई", color: "text-green-400", examples: [
        "मुझे 4 लाख तनख्वाह मिली",
        "20000 रुपये आमदनी हुई",
        "व्यापार से 50000 मिले",
      ]},
      { title: "🏦 बचत", color: "text-blue-400", examples: [
        "5000 रुपये बचाए", "10000 जमा किए",
      ]},
    ],
  },
};

// ── Component ──────────────────────────────────────────────────────────────
const BudgetAssistant = () => {
  const { t }    = useLanguage();
  const { user } = useAuth();

  const [summary, setSummary] = useState({
    totalExpenses: 0, totalEarnings: 0, totalSavings: 0, netBalance: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [analyzerKey, setAnalyzerKey]   = useState(0);

  const [recording, setRecording]         = useState(false);
  const [status, setStatus]               = useState("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lastHeard, setLastHeard]         = useState("");

  const [manualText, setManualText] = useState("");
  const [guideTab, setGuideTab]     = useState("en-IN");
  const [showGuide, setShowGuide]   = useState(false);

  const [showExpenseHistory, setShowExpenseHistory] = useState(false);
  const [showEarningHistory, setShowEarningHistory] = useState(false);

  // Web Speech API ref
  const recognitionRef = useRef(null);

  const { totalExpenses, totalEarnings, totalSavings, netBalance } = summary;

  // ── Load data from MongoDB ─────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [s, tx] = await Promise.all([getSummary(), getTransactions()]);
      setSummary({
        totalExpenses: s.totalExpenses || 0,
        totalEarnings: s.totalEarnings || 0,
        totalSavings:  s.totalSavings  || 0,
        netBalance:    s.netBalance    || 0,
      });
      setTransactions(tx.transactions || []);
      setAnalyzerKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setStatusMessage("Couldn't load data. Is the backend running?");
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Handle transcript (voice or text) ─────────────────────────────────
  const handleTranscript = useCallback(async (text) => {
    if (!text?.trim()) return;
    setStatus("processing");
    setStatusMessage(`Processing: "${text}"`);
    try {
      const res = await createTransactionFromVoice(text);
      setStatus("success");
      setStatusMessage(res.message || "Transaction saved ✓");
      await loadAll();
    } catch (err) {
      setStatus("error");
      setStatusMessage(err.message || "Couldn't save that transaction.");
    }
  }, [loadAll]);

  // ── Web Speech API: start / stop ───────────────────────────────────────
  const startRecording = () => {
    if (recording) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("error");
      setStatusMessage("Voice input not supported in this browser. Use the text box.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous      = false;
    recognition.interimResults  = true;
    recognition.lang            = "en-IN"; // browser picks up multilingual input naturally

    recognition.onstart = () => {
      setRecording(true);
      setStatus("listening");
      setStatusMessage("🎙️ Listening… speak in any language");
      setLastHeard("");
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setLastHeard(transcript);
      setStatus("processing");
      setStatusMessage(`Heard: "${transcript}"`);
    };

    recognition.onerror = (event) => {
      setRecording(false);
      setStatus("error");
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        setStatusMessage("Microphone blocked — allow mic access in browser settings.");
      } else {
        setStatusMessage("Mic error. Use the text box instead.");
      }
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      setRecording(false);
      const finalText = recognitionRef.current?._lastTranscript;
      if (finalText?.trim()) {
        handleTranscript(finalText.trim());
      } else {
        setStatus("error");
        setStatusMessage("Nothing detected. Please try again or use the text box.");
      }
    };

    // Store last transcript so onend can access it
    const originalOnResult = recognition.onresult;
    recognition.onresult = (event) => {
      originalOnResult(event);
      recognition._lastTranscript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
    setStatus("idle");
    setStatusMessage("");
  };

  // ── Manual text submit ─────────────────────────────────────────────────
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const text = manualText.trim();
    if (!text) return;
    setManualText("");
    await handleTranscript(text);
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try { await deleteTransaction(id); await loadAll(); }
    catch (err) { setStatus("error"); setStatusMessage(err.message || "Couldn't delete."); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const expenseHistory = transactions.filter((tx) => tx.type === "expense");
  const earningHistory = transactions.filter((tx) => tx.type === "earning");
  const formatDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const typeLabel  = { expense: "Expense", earning: "Earning", saving: "Saving" };
  const chartData  = [
    { name: "Expenses", value: totalExpenses },
    { name: "Earnings", value: totalEarnings },
  ];
  const statusColor =
    status === "error"     ? "text-red-400"
    : status === "success" ? "text-green-400"
    : ["listening","processing","connecting"].includes(status) ? "text-blue-300 animate-pulse"
    : "text-yellow-200";

  const activeGuide = VOICE_EXAMPLES[guideTab];

  return (
    <div className="min-h-screen bg-black text-yellow-400 p-6">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── LEFT ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* RECORD PANEL */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 shadow-lg space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-semibold">
                {t("budgetAssistant", "recordTransaction")}
              </p>
              <span className="flex items-center gap-1.5 bg-green-900/40 border border-green-700 text-green-300 text-[10px] px-2.5 py-1 rounded-full font-medium">
                🎙️ Voice · Auto Language Detection
              </span>
            </div>

            {/* Supported languages */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-500">Understands:</span>
              {LANGUAGES.map((l) => (
                <span key={l.code} className="text-[10px] bg-yellow-400/10 border border-yellow-800 text-yellow-300 px-2 py-0.5 rounded-full">
                  {l.flag} {l.label}
                </span>
              ))}
              <span className="text-[10px] text-gray-600">+ any Indian language</span>
            </div>

            {/* Mic + summary stats */}
            <div className="grid grid-cols-4 gap-4 items-center">

              {/* MIC BUTTON */}
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl text-black ${
                    recording
                      ? "bg-red-500 hover:bg-red-400 animate-pulse scale-110"
                      : "bg-yellow-400 hover:bg-yellow-300"
                  }`}
                >
                  {recording ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                <p className="text-[10px] text-gray-500 text-center">
                  {recording ? "Tap to stop" : "Tap & speak"}
                </p>
                {status !== "idle" && statusMessage && (
                  <p className={`text-[10px] text-center max-w-[9rem] leading-tight ${statusColor}`}>
                    {statusMessage}
                  </p>
                )}
                {lastHeard && !recording && (
                  <p className="text-[9px] text-gray-500 italic text-center max-w-[9rem] truncate">
                    "{lastHeard}"
                  </p>
                )}
              </div>

              {/* EXPENSES */}
              <div className="text-center">
                <p className="font-semibold text-sm">{t("budgetAssistant", "expenses")}</p>
                <p className="text-xs mt-1 text-gray-400">{t("budgetAssistant", "totalExpenditure")}</p>
                <p className="font-bold text-red-400 mt-1">₹ {totalExpenses.toLocaleString("en-IN")}</p>
              </div>

              {/* EARNINGS */}
              <div className="text-center">
                <p className="font-semibold text-sm">{t("budgetAssistant", "earnings")}</p>
                <p className="text-xs mt-1 text-gray-400">{t("budgetAssistant", "totalEarnings")}</p>
                <p className="font-bold text-green-400 mt-1">₹ {totalEarnings.toLocaleString("en-IN")}</p>
              </div>

              {/* NET */}
              <div className="text-center">
                <p className="font-semibold text-sm">{t("budgetAssistant", "net")}</p>
                <p className="text-xs mt-1 text-gray-400">{t("budgetAssistant", "profitLoss")}</p>
                <p className={`font-bold mt-1 ${netBalance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ₹ {netBalance.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {totalSavings > 0 && (
              <p className="text-xs text-center text-yellow-200">
                Savings set aside: ₹ {totalSavings.toLocaleString("en-IN")}
              </p>
            )}

            {/* Text input fallback */}
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder='Type: "I spent 2 lakh on land" / "500 రూపాయలు తిండికి" / "500 खाने पर खर्च"'
                className="flex-1 bg-[#0d2318] border border-yellow-700 rounded-lg px-3 py-2 text-sm text-yellow-300 placeholder-gray-600 focus:outline-none focus:border-yellow-400"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-400 text-black rounded-lg text-sm font-bold hover:bg-yellow-300 flex items-center gap-1 shrink-0"
              >
                <Send size={14} /> Add
              </button>
            </form>

            {/* Voice guide toggle */}
            <button
              onClick={() => setShowGuide((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-yellow-800 hover:border-yellow-500 transition-colors text-xs text-yellow-400"
            >
              <span>📢 What to say — voice examples for all languages</span>
              {showGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Voice guide panel */}
            {showGuide && (
              <div className="bg-[#0a1f14] border border-yellow-900 rounded-xl p-4 space-y-4">
                <div className="flex gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setGuideTab(lang.code)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        guideTab === lang.code
                          ? "bg-yellow-400 text-black border-yellow-400"
                          : "text-yellow-400 border-yellow-700 hover:border-yellow-400"
                      }`}
                    >
                      {lang.flag} {lang.label}
                    </button>
                  ))}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {activeGuide.sections.map((section) => (
                    <div key={section.title} className="space-y-2">
                      <p className={`text-xs font-bold ${section.color}`}>{section.title}</p>
                      <div className="space-y-1.5">
                        {section.examples.map((ex) => (
                          <div
                            key={ex}
                            onClick={() => setManualText(ex)}
                            className="bg-[#071510] border border-yellow-900 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-300 leading-snug cursor-pointer hover:border-yellow-500 hover:text-yellow-200 hover:bg-[#0d2318] transition-all"
                          >
                            🗣 {ex}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 text-center">
                  💡 Click any phrase to fill the text box → hit Add. Or say it into the mic.
                </p>
              </div>
            )}
          </div>

          {/* TRANSACTION LOG */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 min-h-40 max-h-96 overflow-y-auto">
            {transactions.length === 0 ? (
              <p className="text-gray-400 text-center py-10">
                {t("budgetAssistant", "noTransactions")}
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx._id} className="flex items-center justify-between border-b border-yellow-900 pb-2 last:border-0">
                    <div>
                      <p className="text-yellow-400 font-medium">
                        {typeLabel[tx.type]} · ₹{Number(tx.amount).toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(tx.date)} &middot; {tx.category}
                        {tx.description ? ` · ${tx.description}` : ""}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(tx._id)} className="text-gray-500 hover:text-red-400 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PIE CHART */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6 flex flex-col items-center">
            <p className="mb-4 text-center">{t("budgetAssistant", "financeOverview")}</p>
            <PieChart width={260} height={260}>
              <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4}>
                <Cell fill="#ff4d4d" />
                <Cell fill="#00e676" />
              </Pie>
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
            </PieChart>
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span>{t("budgetAssistant", "expensesLegend")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <span>{t("budgetAssistant", "earningsLegend")}</span>
              </div>
            </div>
          </div>

          {/* SPENDING ANALYZER */}
          <SpendingAnalyzer refreshTrigger={analyzerKey} />
        </div>

        {/* ── RIGHT ────────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* EXPENSE HISTORY */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6">
            <div className="flex flex-col items-center">
              <p className="mb-4">{t("budgetAssistant", "expenseHistory")}</p>
              <button
                onClick={() => setShowExpenseHistory((v) => !v)}
                className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
              >
                <Pencil size={20} />
              </button>
            </div>
            {showExpenseHistory && (
              <div className="mt-4 max-h-56 overflow-y-auto space-y-3 text-sm">
                {expenseHistory.length === 0 ? (
                  <p className="text-gray-500 text-center">No expenses recorded yet</p>
                ) : (
                  expenseHistory.map((tx) => (
                    <div key={tx._id} className="border-t border-yellow-900 pt-2">
                      <p className="text-gray-400 text-xs">You: "{tx.sourceText || `${tx.description} ${tx.amount}`}"</p>
                      <p className="text-yellow-400">Expense: ₹{Number(tx.amount).toLocaleString("en-IN")} · {tx.category}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* EARNING HISTORY */}
          <div className="border border-yellow-500 bg-[#07150f] rounded-xl p-6">
            <div className="flex flex-col items-center">
              <p className="mb-4">{t("budgetAssistant", "earningHistory")}</p>
              <button
                onClick={() => setShowEarningHistory((v) => !v)}
                className="w-14 h-14 bg-yellow-400 text-black rounded-full flex items-center justify-center hover:bg-yellow-300"
              >
                <Pencil size={20} />
              </button>
            </div>
            {showEarningHistory && (
              <div className="mt-4 max-h-56 overflow-y-auto space-y-3 text-sm">
                {earningHistory.length === 0 ? (
                  <p className="text-gray-500 text-center">No earnings recorded yet</p>
                ) : (
                  earningHistory.map((tx) => (
                    <div key={tx._id} className="border-t border-yellow-900 pt-2">
                      <p className="text-gray-400 text-xs">You: "{tx.sourceText || `${tx.description} ${tx.amount}`}"</p>
                      <p className="text-yellow-400">Earning: ₹{Number(tx.amount).toLocaleString("en-IN")} · {tx.category}</p>
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

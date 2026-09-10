import React, { useState, useEffect, useRef, useCallback } from "react";
import { Building2, Landmark, Mic, MicOff, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import andhraBank from "../assets/andhrabank.png";
import { useLanguage } from "../i18n/LanguageContext";
import {
  getBanks,
  checkEligibility,
  applyForLoan,
  getApplications,
  updateApplicationStatus,
} from "../utils/loanApi";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n).toLocaleString("en-IN");
const fmtCurrency = (n) => `₹${fmt(n)}`;

const BANK_ICONS = {
  ANDB: (
    <img src={andhraBank} alt="Andhra Bank" className="w-10 h-10 object-contain" />
  ),
  BOB: <Building2 size={36} className="text-yellow-400" />,
  PNB: <Landmark size={36} className="text-yellow-400" />,
};

const STATUS_META = {
  calculated:   { label: "Calculated",    color: "bg-yellow-900/40 text-yellow-300  border-yellow-700" },
  sent_to_bank: { label: "Sent to Bank",  color: "bg-blue-900/40   text-blue-300    border-blue-700"   },
  approved:     { label: "Approved",      color: "bg-green-900/40  text-green-300   border-green-700"  },
  rejected:     { label: "Rejected",      color: "bg-red-900/40    text-red-300     border-red-700"    },
};

const CATEGORY_COLORS = {
  "Crop Loan":      "text-green-400",
  "Equipment Loan": "text-blue-400",
  "Land Loan":      "text-orange-400",
  "Gold Loan":      "text-yellow-300",
};

// ── Component ──────────────────────────────────────────────────────────────────
const LoanAssistant = () => {
  const { t } = useLanguage();

  // ── Remote data ──────────────────────────────────────────────────────────────
  const [banks, setBanks]               = useState([]);
  const [applications, setApplications] = useState([]);
  const [loadError, setLoadError]       = useState("");

  // ── Selection state ──────────────────────────────────────────────────────────
  const [selectedBank,   setSelectedBank]   = useState(null); // bankCode string
  const [selectedScheme, setSelectedScheme] = useState(null); // scheme object

  // ── Loan inputs ──────────────────────────────────────────────────────────────
  const [amount,  setAmount]  = useState("");
  const [tenure,  setTenure]  = useState("");

  // ── Live eligibility preview ──────────────────────────────────────────────────
  const [preview,        setPreview]        = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError,   setPreviewError]   = useState("");
  const debounceRef = useRef(null);

  // ── Submitted application result ──────────────────────────────────────────────
  const [result,         setResult]         = useState(null);
  const [lastAppId,      setLastAppId]      = useState(null);
  const [submitting,     setSubmitting]     = useState(false);
  const [submitError,    setSubmitError]    = useState("");

  // ── Mic / query ───────────────────────────────────────────────────────────────
  const [query,        setQuery]        = useState("");
  const [recording,    setRecording]    = useState(false);
  const recognitionRef = useRef(null);

  // ── UI toggles ────────────────────────────────────────────────────────────────
  const [showStatus, setShowStatus] = useState(false);

  // ── Load banks + applications on mount ───────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [banksData, appsData] = await Promise.all([getBanks(), getApplications()]);
      setBanks(banksData.banks || []);
      setApplications(appsData.applications || []);
    } catch (err) {
      setLoadError(err.message || "Failed to load loan data.");
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── When scheme/amount/tenure changes, debounce a live eligibility preview ───
  useEffect(() => {
    if (!selectedScheme || !amount || !tenure) {
      setPreview(null);
      setPreviewError("");
      return;
    }

    const parsedAmount = Number(amount);
    const parsedTenure = Number(tenure);
    if (!parsedAmount || !parsedTenure) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError("");
      try {
        const data = await checkEligibility(selectedScheme._id, parsedAmount, parsedTenure);
        setPreview(data.result);
      } catch (err) {
        setPreview(null);
        setPreviewError(err.message);
      } finally {
        setPreviewLoading(false);
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [selectedScheme, amount, tenure]);

  // ── Handle bank card click ────────────────────────────────────────────────────
  const handleBankSelect = (bankCode) => {
    if (selectedBank === bankCode) {
      setSelectedBank(null);
      setSelectedScheme(null);
      setAmount("");
      setTenure("");
      setPreview(null);
    } else {
      setSelectedBank(bankCode);
      setSelectedScheme(null);
      setAmount("");
      setTenure("");
      setPreview(null);
    }
    setResult(null);
    setSubmitError("");
  };

  // ── Handle scheme selection ───────────────────────────────────────────────────
  const handleSchemeSelect = (scheme) => {
    setSelectedScheme(scheme);
    setAmount(String(scheme.minAmount));
    setTenure(String(scheme.minTenureMonths));
    setPreview(null);
    setPreviewError("");
    setResult(null);
    setSubmitError("");
  };

  // ── Submit (persist application) ─────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedScheme || !amount || !tenure) return;
    setSubmitting(true);
    setSubmitError("");
    setResult(null);
    try {
      const data = await applyForLoan(selectedScheme._id, Number(amount), Number(tenure));
      setResult(data.result);
      setLastAppId(data.application._id);
      await loadAll(); // refresh applications list
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── WhatsApp button ───────────────────────────────────────────────────────────
  const sendToWhatsApp = async () => {
    if (!result) return;

    const eligText = result.eligible
      ? `✅ ELIGIBLE\nApproved Amount: ${fmtCurrency(result.requestedAmount)}`
      : `❌ Not eligible at ${fmtCurrency(result.requestedAmount)}\nMax Eligible: ${fmtCurrency(result.maxEligibleAmount)}`;

    const message = `
AI-SAATHI Loan Application

Bank: ${result.bankName}
Scheme: ${result.schemeName}
Requested Amount: ${fmtCurrency(result.requestedAmount)}
Tenure: ${result.tenureMonths} months
Interest Rate: ${result.interestRatePercent}% p.a.
EMI: ${fmtCurrency(result.emi)}/month
Monthly Income: ${fmtCurrency(result.monthlyIncomeUsed)}
Disposable Income: ${fmtCurrency(result.disposableIncomeUsed)}
${eligText}
    `.trim();

    // Update application status to sent_to_bank
    if (lastAppId) {
      try {
        await updateApplicationStatus(lastAppId, "sent_to_bank");
        await loadAll();
      } catch {
        // Non-blocking — still open WhatsApp even if status update fails
      }
    }

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // ── Mic ───────────────────────────────────────────────────────────────────────
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e) => setQuery(e.results[0][0].transcript);
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  // ── Derived helpers ───────────────────────────────────────────────────────────
  const activeBankData = banks.find((b) => b.bankCode === selectedBank);

  const renderPreviewOrResult = () => {
    const data = result || preview;
    const isResult = !!result;

    if (!selectedScheme) return null;

    if (previewLoading) {
      return (
        <p className="text-blue-300 text-xs animate-pulse mt-2">Calculating…</p>
      );
    }

    if (previewError) {
      return (
        <div className={`mt-3 rounded-lg border p-3 text-sm ${previewError.includes("Budget Assistant") ? "border-yellow-700 bg-yellow-900/20 text-yellow-300" : "border-red-700 bg-red-900/20 text-red-300"}`}>
          {previewError}
          {previewError.includes("Budget Assistant") && (
            <p className="mt-1 text-xs text-gray-400">Go to Budget Assistant → record some income and expenses → come back here.</p>
          )}
        </div>
      );
    }

    if (!data) return null;

    return (
      <div className={`mt-3 rounded-xl border p-4 space-y-2 text-sm ${isResult ? "border-yellow-500 bg-[#07150f]" : "border-yellow-800 bg-[#071510]"}`}>
        {isResult && <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Application Result</p>}

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-gray-400">Bank</span>
          <span className="text-yellow-300 font-medium">{data.bankName}</span>
          <span className="text-gray-400">Scheme</span>
          <span className="text-yellow-300">{data.schemeName}</span>
          <span className="text-gray-400">Requested</span>
          <span className="text-white">{fmtCurrency(data.requestedAmount)}</span>
          <span className="text-gray-400">Tenure</span>
          <span className="text-white">{data.tenureMonths} months</span>
          <span className="text-gray-400">Rate</span>
          <span className="text-white">{data.interestRatePercent}% p.a.</span>
          <span className="text-gray-400">EMI / month</span>
          <span className="text-white font-semibold">{fmtCurrency(data.emi)}</span>
          <span className="text-gray-400">Avg Income</span>
          <span className="text-green-400">{fmtCurrency(data.monthlyIncomeUsed)}</span>
          <span className="text-gray-400">Avg Expenses</span>
          <span className="text-red-400">{fmtCurrency(data.monthlyExpensesUsed)}</span>
          <span className="text-gray-400">Disposable</span>
          <span className="text-yellow-300">{fmtCurrency(data.disposableIncomeUsed)}</span>
        </div>

        {/* Eligibility verdict */}
        <div className={`mt-2 rounded-lg px-3 py-2 flex items-start gap-2 ${data.eligible ? "bg-green-900/30 border border-green-700" : "bg-red-900/30 border border-red-700"}`}>
          {data.eligible
            ? <CheckCircle size={16} className="text-green-400 mt-0.5 shrink-0" />
            : <XCircle    size={16} className="text-red-400   mt-0.5 shrink-0" />}
          <div>
            {data.eligible ? (
              <p className="text-green-300 font-medium text-sm">Eligible ✓</p>
            ) : (
              <>
                <p className="text-red-300 font-medium text-sm">Not eligible at {fmtCurrency(data.requestedAmount)}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Max you can get on this scheme / tenure:{" "}
                  <span className="text-yellow-300 font-semibold">{fmtCurrency(data.maxEligibleAmount)}</span>
                </p>
              </>
            )}
          </div>
        </div>

        {/* WhatsApp button — only on persisted result */}
        {isResult && (
          <button
            onClick={sendToWhatsApp}
            className="mt-2 w-full bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
          >
            <Send size={15} /> Send to Bank on WhatsApp
          </button>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-yellow-400 p-6">
      {loadError && (
        <div className="mb-4 border border-red-700 bg-red-900/20 rounded-lg px-4 py-2 text-red-300 text-sm">
          {loadError}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── LEFT COLUMN ────────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* BANK SELECTOR CARDS */}
          <div className="border border-yellow-500 rounded-xl p-6 bg-[#07150f]">
            <h2 className="text-xl font-semibold mb-4">{t("loanAssistant", "selectBank")}</h2>

            {/* 3 bank cards */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {banks.length === 0
                ? ["ANDB", "BOB", "PNB"].map((code) => (
                    <div key={code} className="border border-yellow-800 rounded-lg p-5 flex flex-col items-center animate-pulse">
                      <div className="w-10 h-10 bg-yellow-900/30 rounded-full" />
                      <div className="w-20 h-3 bg-yellow-900/30 rounded mt-3" />
                    </div>
                  ))
                : banks.map((bank) => (
                    <button
                      key={bank.bankCode}
                      onClick={() => handleBankSelect(bank.bankCode)}
                      className={`border rounded-lg p-5 flex flex-col items-center transition-all ${
                        selectedBank === bank.bankCode
                          ? "border-yellow-400 bg-yellow-400/10 scale-105 shadow-lg shadow-yellow-900/30"
                          : "border-yellow-700 hover:border-yellow-400 hover:bg-yellow-400/5"
                      }`}
                    >
                      {BANK_ICONS[bank.bankCode] || <Building2 size={36} className="text-yellow-400" />}
                      <p className="mt-2 text-xs text-center leading-tight">{bank.bankName}</p>
                    </button>
                  ))}
            </div>

            {/* Scheme list — expands when a bank is selected */}
            {activeBankData && (
              <div className="space-y-2 mt-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {activeBankData.bankName} — Select a Scheme
                </p>
                {activeBankData.schemes.map((scheme) => (
                  <button
                    key={scheme._id}
                    onClick={() => handleSchemeSelect(scheme)}
                    className={`w-full text-left rounded-lg border px-4 py-3 transition-all ${
                      selectedScheme?._id === scheme._id
                        ? "border-yellow-400 bg-yellow-400/10"
                        : "border-yellow-800 hover:border-yellow-500 hover:bg-yellow-400/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-yellow-300">{scheme.schemeName}</p>
                        <p className={`text-xs mt-0.5 ${CATEGORY_COLORS[scheme.category] || "text-gray-400"}`}>
                          {scheme.category}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">{scheme.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-yellow-400 font-semibold">{scheme.interestRatePercent}% p.a.</p>
                        <p className="text-[10px] text-gray-500">
                          {fmtCurrency(scheme.minAmount)} – {fmtCurrency(scheme.maxAmount)}
                        </p>
                        <p className="text-[10px] text-gray-600">
                          {scheme.minTenureMonths}–{scheme.maxTenureMonths} mo
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Amount + Tenure inputs */}
            {selectedScheme && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Loan Amount (₹)
                    <span className="ml-1 text-gray-600">
                      {fmtCurrency(selectedScheme.minAmount)} – {fmtCurrency(selectedScheme.maxAmount)}
                    </span>
                  </label>
                  <input
                    type="number"
                    value={amount}
                    min={selectedScheme.minAmount}
                    max={selectedScheme.maxAmount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black border border-yellow-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Tenure (months)
                    <span className="ml-1 text-gray-600">
                      {selectedScheme.minTenureMonths}–{selectedScheme.maxTenureMonths}
                    </span>
                  </label>
                  <input
                    type="number"
                    value={tenure}
                    min={selectedScheme.minTenureMonths}
                    max={selectedScheme.maxTenureMonths}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full bg-black border border-yellow-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            {selectedScheme && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !amount || !tenure}
                  className="flex-1 bg-yellow-400 text-black px-5 py-2 rounded-lg font-semibold hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Checking…" : t("loanAssistant", "submitQuery")}
                </button>
              </div>
            )}

            {submitError && (
              <div className={`mt-3 rounded-lg border p-3 text-sm ${submitError.includes("Budget Assistant") ? "border-yellow-700 bg-yellow-900/20 text-yellow-300" : "border-red-700 bg-red-900/20 text-red-300"}`}>
                {submitError}
                {submitError.includes("Budget Assistant") && (
                  <p className="mt-1 text-xs text-gray-400">Go to Budget Assistant → record income and expenses → return here.</p>
                )}
              </div>
            )}
          </div>

          {/* VOICE / TEXT QUERY (cosmetic — unchanged from original) */}
          <div className="border border-yellow-500 rounded-xl p-4 bg-[#07150f] space-y-3">
            <p className="text-sm text-gray-400">Ask about loans (voice or text)</p>
            <input
              type="text"
              placeholder={t("loanAssistant", "askPlaceholder")}
              className="bg-black border border-yellow-700 text-white rounded-lg px-3 py-2 w-full text-sm focus:outline-none focus:border-yellow-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 text-sm ${
                recording ? "bg-red-600 text-white" : "bg-yellow-800/60 text-yellow-300 hover:bg-yellow-700/60"
              }`}
            >
              {recording ? <MicOff size={16} /> : <Mic size={16} />}
              {recording ? "Stop" : t("loanAssistant", "startRecording")}
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN ───────────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* CHAT HISTORY */}
          <div className="border border-yellow-500 rounded-xl p-4 bg-[#07150f]">
            <h3 className="font-semibold mb-3 text-sm">{t("loanAssistant", "chatHistory")}</h3>
            <div className="bg-black border border-yellow-800 rounded-lg p-3 text-sm min-h-[44px]">
              {query
                ? <span className="text-yellow-200">{query}</span>
                : <span className="text-gray-500">{t("loanAssistant", "noConversation")}</span>}
            </div>
          </div>

          {/* LOAN APPLICATION RESULT / LIVE PREVIEW */}
          <div className="border border-yellow-500 rounded-xl p-5 bg-[#07150f]">
            <h3 className="font-semibold mb-1 text-sm">Loan Application Result</h3>
            {!selectedScheme && !result && (
              <p className="text-gray-500 text-sm mt-2">
                Select a bank → a scheme → enter amount and tenure to see results.
              </p>
            )}
            {renderPreviewOrResult()}
          </div>

          {/* LOAN STATUS HISTORY */}
          <div className="border border-yellow-500 rounded-xl p-5 bg-[#07150f]">
            <button
              onClick={() => setShowStatus((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold"
            >
              <span>Loan Status History ({applications.length})</span>
              {showStatus ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showStatus && (
              <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
                {applications.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No applications yet.
                  </p>
                ) : (
                  applications.map((app) => {
                    const meta = STATUS_META[app.status] || STATUS_META.calculated;
                    return (
                      <div
                        key={app._id}
                        className="border border-yellow-900 rounded-lg px-4 py-3 space-y-1.5 bg-[#071510]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-yellow-300 text-sm font-medium">{app.schemeName}</p>
                            <p className="text-xs text-gray-500">{app.bankName}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${meta.color}`}>
                            {meta.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs text-gray-400">
                          <span>Amount</span>
                          <span className="text-white">{fmtCurrency(app.requestedAmount)}</span>
                          <span>EMI</span>
                          <span className="text-white">{fmtCurrency(app.emi)}/mo</span>
                          <span>Eligible</span>
                          <span className={app.eligible ? "text-green-400" : "text-red-400"}>
                            {app.eligible ? "Yes" : `No — max ${fmtCurrency(app.maxEligibleAmount)}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-600">
                          {new Date(app.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoanAssistant;

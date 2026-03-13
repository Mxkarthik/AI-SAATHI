import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Menu, MessageCircle, X, Send, Mic, MicOff } from "lucide-react";

import Sidebar from "./components/Layouts/Sidebar";
import FinancialNews from "./pages/FinancialNews";
import InvestmentAssistant from "./pages/InvestmentAssistant";
import BudgetAssistant from "./pages/BudgetAssistant";
import Community from "./pages/Community";
import LoanAssistant from "./pages/LoanAssistant";
import { generateAISaathiResponse } from "./utils/AI_SaathiLogic";

// ── Chat Message component ────────────────────────────────────────────────────
const ChatMessage = ({ msg }) => (
  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
    <div
      className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] leading-relaxed ${msg.role === "user"
          ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-black rounded-br-none font-medium"
          : "bg-gray-800 text-gray-200 rounded-bl-none"
        }`}
    >
      {msg.text}
    </div>
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    { id: 1, role: "assistant", text: "👋 నమస्ते! Hello! I'm AI Saathi — your multilingual financial assistant. Ask me anything in English, Telugu, Hindi, Tamil, or Kannada!" },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, chatOpen]);

  // ── Voice Input Setup ───────────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN"; // Supports Indian English and accents

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      // Auto-send after voice input
      handleSendMessage(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  // ── Send Message ────────────────────────────────────────────────────────────
  const handleSendMessage = (overrideText) => {
    const text = (overrideText ?? inputText).trim();
    if (!text) return;

    // Add user message
    const userMsg = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsTyping(true);

    // Simulate a brief thinking delay for realism
    setTimeout(() => {
      const { response } = generateAISaathiResponse(text);
      const aiMsg = { id: Date.now() + 1, role: "assistant", text: response };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoice = () => {
    if (!recognitionRef.current) {
      alert("Voice recognition is not supported in your browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.abort();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-950 text-white flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-72 lg:ml-80">
          {/* Mobile top header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 transition"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-extrabold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              AI SAATHI
            </span>
            <div className="w-10" />
          </header>

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<FinancialNews />} />
              <Route path="/investment-assistant" element={<InvestmentAssistant />} />
              <Route path="/budget-assistant" element={<BudgetAssistant />} />
              <Route path="/community" element={<Community />} />
              <Route path="/loan-assistant" element={<LoanAssistant />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* ── Floating Chat UI ─────────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

        {/* Chat Panel */}
        {chatOpen && (
          <div
            className="w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "520px" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-black" />
                <div>
                  <p className="font-bold text-black text-sm leading-tight">AI Saathi</p>
                  <p className="text-black/70 text-xs">Multilingual Financial Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="p-1 rounded-full hover:bg-black/20 transition"
                aria-label="Close chat"
              >
                <X className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} msg={msg} />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input row */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-800 shrink-0">
              {/* Voice button */}
              <button
                onClick={toggleVoice}
                title={isListening ? "Stop listening" : "Speak your message"}
                className={`p-2 rounded-lg transition shrink-0 ${isListening
                    ? "bg-red-500 hover:bg-red-400 animate-pulse"
                    : "bg-gray-700 hover:bg-gray-600"
                  }`}
                aria-label={isListening ? "Stop voice input" : "Start voice input"}
              >
                {isListening ? (
                  <MicOff className="w-4 h-4 text-white" />
                ) : (
                  <Mic className="w-4 h-4 text-yellow-400" />
                )}
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "🎙️ Listening..." : "Type or speak…"}
                className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-2 outline-none placeholder-gray-500 border border-gray-700 focus:border-yellow-400 transition"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="p-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition shrink-0"
                aria-label="Send"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={() => setChatOpen((prev) => !prev)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg hover:scale-110 active:scale-95 transition-transform duration-200 flex items-center justify-center"
          aria-label="Open AI Saathi chat"
        >
          {chatOpen ? (
            <X className="w-6 h-6 text-black" />
          ) : (
            <MessageCircle className="w-6 h-6 text-black" />
          )}
        </button>
      </div>
    </BrowserRouter>
  );
};

export default App;

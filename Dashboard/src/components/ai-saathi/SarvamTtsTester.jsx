import { Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n/LanguageContext";
import { synthesizeSpeech } from "../../services/voiceTtsApi";

const TEST_PHRASES = [
  { id: "english", languageCode: "en-IN", text: "Hello, I am AI Saathi." },
  { id: "telugu", languageCode: "te-IN", text: "నమస్కారం! నేను AI సాథి." },
];

function base64ToBlob(base64, mimeType) {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export default function SarvamTtsTester() {
  const { t } = useLanguage();
  const audioRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => () => audioRef.current?.pause(), []);

  const playPhrase = async (phrase) => {
    if (status === "generating" || status === "playing") return;
    setError("");
    setStatus("generating");
    try {
      const result = await synthesizeSpeech(phrase.text, phrase.languageCode);
      const audio = new Audio(URL.createObjectURL(base64ToBlob(result.audio, result.mimeType || "audio/wav")));
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audio.src);
        setStatus("finished");
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        setStatus("error");
        setError(t("schemeAI", "ttsPlaybackError"));
      };
      setStatus("playing");
      await audio.play();
    } catch (playbackError) {
      setStatus("error");
      setError(playbackError.message);
    }
  };

  const statusLabel = status === "generating"
    ? t("schemeAI", "ttsGenerating")
    : status === "playing"
      ? t("schemeAI", "ttsPlaying")
      : status === "finished"
        ? t("schemeAI", "ttsFinished")
        : "";

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4" aria-labelledby="sarvam-tts-title">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-yellow-400" aria-hidden="true" />
        <h2 id="sarvam-tts-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">{t("schemeAI", "ttsTestTitle")}</h2>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {TEST_PHRASES.map((phrase) => (
          <button
            key={phrase.id}
            type="button"
            onClick={() => playPhrase(phrase)}
            disabled={status === "generating" || status === "playing"}
            className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:border-yellow-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phrase.id === "english" ? "English TTS" : "Telugu TTS"}
          </button>
        ))}
      </div>
      <p className="mt-3 min-h-5 text-xs text-yellow-300" aria-live="polite">{statusLabel || error}</p>
    </section>
  );
}

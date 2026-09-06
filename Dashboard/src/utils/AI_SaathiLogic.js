/**
 * AI SAATHI - Core Language Logic
 * Handles language detection, romanized script transliteration,
 * and multilingual response generation.
 */

// ── Language Detection ────────────────────────────────────────────────────────

/**
 * Detects the script/language of a given text.
 * Returns: 'telugu' | 'hindi' | 'tamil' | 'kannada' | 'english' | 'unknown'
 */
export function detectNativeScript(text) {
    // Telugu Unicode block: 0C00–0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) return "telugu";
    // Hindi/Devanagari Unicode block: 0900–097F
    if (/[\u0900-\u097F]/.test(text)) return "hindi";
    // Tamil Unicode block: 0B80–0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) return "tamil";
    // Kannada Unicode block: 0C80–0CFF
    if (/[\u0C80-\u0CFF]/.test(text)) return "kannada";
    return null;
}

/**
 * Heuristically detect if romanized text is likely a specific Indian language.
 * Returns: 'telugu' | 'hindi' | 'tamil' | 'kannada' | 'english'
 */
function detectRomanizedLanguage(text) {
    const lower = text.toLowerCase();

    // Telugu-specific common words and patterns
    const teluguWords = [
        "nenu", "naku", "meeru", "mee", "idi", "adi", "ela", "emiti", "cheppandi",
        "undi", "unnaru", "cheyandi", "ayyindi", "padindi", "vachindi", "pothundi",
        "okka", "anni", "chala", "peru", "na", "maa", "mee", "veelu", "kaadu",
        "avunu", "ledu", "ikkada", "akkada", "eppudu", "enduku", "cheppandi",
        "meeru", "emi", "ekkadiki", "ento", "cheyali", "cheyalenu",
    ];

    // Hindi-specific common words
    const hindiWords = [
        "main", "mujhe", "mera", "meri", "aap", "hum", "hai", "hain", "tha", "thi",
        "kya", "kaisa", "kaise", "kahan", "kyun", "nahin", "nahi", "bahut", "accha",
        "theek", "namaste", "dhanyavad", "shukriya", "bhai", "didi", "ho", "hona",
        "karna", "chahiye", "chahie", "bolna", "dekho", "suno", "lao", "jao",
        "aao", "raho", "kar", "karo", "mere", "tera", "tumhara", "unka",
    ];

    // Tamil-specific common words
    const tamilWords = [
        "naan", "enakku", "ungalukku", "avan", "aval", "enna", "epdi", "enga",
        "eppo", "yen", "illai", "irukku", "vanakkam", "nandri", "nadakkuthu",
        "varuvom", "ponga", "sollunga", "parunga", "theivu", "romba", "konjam",
    ];

    // Kannada-specific common words
    const kannadaWords = [
        "naanu", "nimage", "avanu", "avalu", "enu", "hege", "yaavaga", "elli",
        "yake", "illa", "ide", "namaskara", "dhanyavada", "bartheeni", "hogi",
        "banni", "hogbedi", "kelsa", "maadbeku", "tumba", "swalpa",
    ];

    const score = { telugu: 0, hindi: 0, tamil: 0, kannada: 0 };
    const words = lower.split(/\s+/);

    words.forEach((word) => {
        if (teluguWords.some((tw) => word === tw || word.startsWith(tw))) score.telugu++;
        if (hindiWords.some((hw) => word === hw || word.startsWith(hw))) score.hindi++;
        if (tamilWords.some((tw) => word === tw || word.startsWith(tw))) score.tamil++;
        if (kannadaWords.some((kw) => word === kw || word.startsWith(kw))) score.kannada++;
    });

    const maxScore = Math.max(...Object.values(score));
    if (maxScore === 0) return "english";

    return Object.keys(score).find((k) => score[k] === maxScore) || "english";
}

// ── Main Language Detector ────────────────────────────────────────────────────

/**
 * Returns the detected language of the input.
 * First checks for native Unicode scripts, then heuristically detects romanized.
 */
export function detectLanguage(text) {
    const nativeScript = detectNativeScript(text);
    if (nativeScript) return nativeScript;
    return detectRomanizedLanguage(text);
}

// ── Response Templates ────────────────────────────────────────────────────────

const responses = {
    english: {
        greeting: [
            "Hello! 👋 How can I help you today?",
            "Hi there! I'm AI Saathi. How can I assist you?",
            "Greetings! What can I do for you?",
        ],
        howAreYou: [
            "I'm doing great, thank you for asking! How can I help you?",
            "I'm functioning perfectly! What do you need help with?",
        ],
        thanks: [
            "You're welcome! Is there anything else I can help you with?",
            "Happy to help! Let me know if you need anything else.",
        ],
        financialTip: [
            "💡 Tip: Start saving at least 20% of your income every month. Small savings today lead to big returns tomorrow!",
            "💰 Consider investing in mutual funds via SIP (Systematic Investment Plan) for long-term wealth creation.",
        ],
        default: [
            "I'm here to help with your financial queries, savings tips, and more. What would you like to know?",
            "I didn't quite understand that. Could you please rephrase your question?",
        ],
    },
    telugu: {
        greeting: [
            "నమస్కారం! 👋 నేను AI సాథి. మీకు ఎలా సహాయం చేయగలను?",
            "హలో! AI సాథికి స్వాగతం. మీకు ఎంత సహాయం చేయనా?",
        ],
        howAreYou: [
            "నేను బాగున్నాను, ధన్యవాదాలు! మీకు ఎలా సహాయం చేయగలను?",
            "నేను చాలా బాగున్నాను! మీకు ఏమి అవసరం?",
        ],
        thanks: [
            "మీకు సంతోషంగా సహాయం చేసాను! మరింత సహాయం అవసరమా?",
            "ధన్యవాదాలు! మీకు మరేమైనా అవసరమైతే చెప్పండి.",
        ],
        financialTip: [
            "💡 చిట్కా: ప్రతి నెలా మీ ఆదాయంలో కనీసం 20% పొదుపు చేయండి. చిన్న పొదుపులు పెద్ద లాభాలకు దారి తీస్తాయి!",
            "💰 దీర్ఘకాలిక సంపద కోసం SIP ద్వారా మ్యూచువల్ ఫండ్స్‌లో పెట్టుబడి పెట్టడాన్ని పరిగణించండి.",
        ],
        default: [
            "నేను మీ ఆర్థిక సందేహాలు, పొదుపు చిట్కాలు మరియు మరిన్నింటిలో సహాయం చేస్తాను. మీకు ఏమి తెలుసుకోవాలి?",
            "నాకు అర్థం కాలేదు. దయచేసి మీ ప్రశ్నను మళ్ళీ అడగండి.",
        ],
    },
    hindi: {
        greeting: [
            "नमस्ते! 👋 मैं AI साथी हूँ। मैं आपकी कैसे मदद कर सकता हूँ?",
            "हेलो! AI साथी में आपका स्वागत है। बताइए, क्या मदद चाहिए?",
        ],
        howAreYou: [
            "मैं बिल्कुल ठीक हूँ, शुक्रिया! आपकी कैसे सहायता करूँ?",
            "मैं बहुत अच्छा हूँ! आपको किसमें मदद चाहिए?",
        ],
        thanks: [
            "आपका स्वागत है! क्या मैं और कुछ मदद कर सकता हूँ?",
            "खुशी हुई मदद करके! और कुछ जरूरत हो तो बताइए।",
        ],
        financialTip: [
            "💡 सुझाव: हर महीने अपनी आमदनी का कम से कम 20% बचाएं। छोटी बचत से बड़ा लाभ होता है!",
            "💰 दीर्घकालिक संपत्ति के लिए SIP के माध्यम से म्यूचुअल फंड में निवेश करें।",
        ],
        default: [
            "मैं आपकी वित्तीय सवालों, बचत टिप्स और अधिक में मदद करने के लिए यहाँ हूँ। आप क्या जानना चाहते हैं?",
            "मुझे समझ नहीं आया। कृपया अपना सवाल दोबारा पूछें।",
        ],
    },
    tamil: {
        greeting: [
            "வணக்கம்! 👋 நான் AI சாத்தி. உங்களுக்கு எப்படி உதவலாம்?",
            "ஹலோ! AI சாத்திக்கு வரவேற்கிறோம். என்ன உதவி வேண்டும்?",
        ],
        howAreYou: [
            "நான் நலமாக இருக்கிறேன், நன்றி! உங்களுக்கு எப்படி உதவலாம்?",
            "நான் மிகவும் நலமாக இருக்கிறேன்! உங்களுக்கு என்ன தேவை?",
        ],
        thanks: [
            "மகிழ்ச்சியுடன் உதவினேன்! வேறு ஏதாவது தேவையா?",
            "நன்றி! வேறு எதாவது தேவைப்பட்டால் சொல்லுங்கள்.",
        ],
        financialTip: [
            "💡 குறிப்பு: ஒவ்வொரு மாதமும் உங்கள் வருமானத்தில் குறைந்தது 20% சேமிக்கவும்.",
            "💰 நீண்டகால செல்வத்திற்கு SIP மூலம் மியூச்சுவல் ஃபண்டில் முதலீடு செய்யுங்கள்.",
        ],
        default: [
            "நான் உங்கள் நிதி கேள்விகள், சேமிப்பு குறிப்புகள் மற்றும் பலவற்றில் உதவுவேன். என்ன தெரிந்துகொள்ள விரும்புகிறீர்கள்?",
            "புரியவில்லை. தயவுசெய்து மீண்டும் கேளுங்கள்.",
        ],
    },
    kannada: {
        greeting: [
            "ನಮಸ್ಕಾರ! 👋 ನಾನು AI ಸಾಥಿ. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
            "ಹಲೋ! AI ಸಾಥಿಗೆ ಸ್ವಾಗತ. ನಿಮಗೆ ಏನು ಬೇಕು?",
        ],
        howAreYou: [
            "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ, ಧನ್ಯವಾದ! ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
            "ನಾನು ತುಂಬಾ ಚೆನ್ನಾಗಿದ್ದೇನೆ! ನಿಮಗೆ ಏನು ಬೇಕು?",
        ],
        thanks: [
            "ಸಂತೋಷದಿಂದ ಸಹಾಯ ಮಾಡಿದೆ! ಇನ್ನೂ ಏಕೆ ಬೇಕೇ?",
            "ಧನ್ಯವಾದ! ಇನ್ನಷ್ಟು ಬೇಕಾದರೆ ತಿಳಿಸಿ.",
        ],
        financialTip: [
            "💡 ಸಲಹೆ: ಪ್ರತಿ ತಿಂಗಳು ನಿಮ್ಮ ಆದಾಯದ ಕನಿಷ್ಠ 20% ಉಳಿತಾಯ ಮಾಡಿ.",
            "💰 ದೀರ್ಘಕಾಲ ಸಂಪತ್ತಿಗೆ SIP ಮೂಲಕ ಮ್ಯೂಚುವಲ್ ಫಂಡ್‌ನಲ್ಲಿ ಹೂಡಿಕೆ ಮಾಡಿ.",
        ],
        default: [
            "ನಾನು ನಿಮ್ಮ ಆರ್ಥಿಕ ಪ್ರಶ್ನೆಗಳು, ಉಳಿತಾಯ ಸಲಹೆಗಳು ಮತ್ತು ಹೆಚ್ಚಿನದಕ್ಕೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.",
            "ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಕೇಳಿ.",
        ],
    },
};

// ── Intent Classifier ─────────────────────────────────────────────────────────

function classifyIntent(text) {
    const lower = text.toLowerCase();

    const greetingPatterns = [
        "hello", "hi", "hey", "namaste", "vanakkam", "namaskara", "namaskar",
        "good morning", "good evening", "good afternoon", "howdy",
        "helo", "hii", "ssup", "sup",
        // Telugu romanized
        "namaskaram", "bagunara", "ela unnaru",
        // Hindi romanized
        "salaam", "jai hind",
    ];

    const howAreYouPatterns = [
        "how are you", "how r u", "how are u", "kaisa hai", "kaisi ho",
        "kaise ho", "kaise hain", "baagunnara", "ela unnaru", "howdy",
        "eppadi irukkeenga", "eppadi irukeenga", "hegiddeera", "hegiddira",
    ];

    const thanksPatterns = [
        "thank", "thanks", "dhanyavad", "dhanyavaad", "shukriya", "nandri",
        "dhanyavadalu", "dhanyavaadagalu", "thank you", "tyvm", "ty",
    ];

    const financialPatterns = [
        "invest", "save", "saving", "budget", "loan", "interest", "mutual fund",
        "sip", "stock", "share", "bank", "money", "finance", "tips", "advice",
        "paisa", "paise", "income", "expense", "tax", "emi", "credit", "debit",
        // Telugu
        "paniki", "dabbu", "account",
        // Hindi
        "nivesh", "bachat", "udhar",
    ];

    if (greetingPatterns.some((p) => lower.includes(p))) return "greeting";
    if (howAreYouPatterns.some((p) => lower.includes(p))) return "howAreYou";
    if (thanksPatterns.some((p) => lower.includes(p))) return "thanks";
    if (financialPatterns.some((p) => lower.includes(p))) return "financialTip";

    return "default";
}

// ── Random Pick ───────────────────────────────────────────────────────────────

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main Response Generator ───────────────────────────────────────────────────

/**
 * Main function: given a user message, detects language and intent,
 * then returns an appropriate response in the correct language and script.
 *
 * @param {string} userMessage - The raw text from the user (may be romanized)
 * @returns {{ response: string, language: string }}
 */
export function generateAISaathiResponse(userMessage) {
    if (!userMessage || userMessage.trim() === "") {
        return {
            response: "Please type or say something so I can help you! 😊",
            language: "english",
        };
    }

    const language = detectLanguage(userMessage.trim());
    const intent = classifyIntent(userMessage.trim());

    const langResponses = responses[language] || responses.english;
    const responseText = pickRandom(langResponses[intent] || langResponses.default);

    return { response: responseText, language };
}

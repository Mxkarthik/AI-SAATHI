/**
 * transactionParser.js
 *
 * Turns a natural-language sentence (typed or spoken) into a structured
 * transaction: { type, amount, category, description, sourceText, date }.
 *
 * Kept dependency-free and rule-based on purpose so it can later be swapped
 * for an LLM-based parser without touching the rest of the app — callers
 * only depend on parseTransactionText().
 */

// ---------------------------------------------------------------------------
// Word-number support ("five hundred", "two thousand") — best-effort only.
// ---------------------------------------------------------------------------
const SMALL_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90,
};
const MULTIPLIERS = {
  hundred: 100, thousand: 1000,
  lakh: 100000, lac: 100000, lakhs: 100000,
  // Telugu
  "లక్ష": 100000, "లక్షలు": 100000,
  "వేల": 1000, "వేలు": 1000,
  "కోటి": 10000000,
  // Hindi
  "लाख": 100000, "लाखों": 100000,
  "हज़ार": 1000, "हजार": 1000,
  "करोड़": 10000000, "करोड": 10000000,
  crore: 10000000,
};

function wordsToNumber(text) {
  const tokens = text
    .toLowerCase()
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const token of tokens) {
    if (token in SMALL_NUMBERS) {
      current += SMALL_NUMBERS[token];
      matchedAny = true;
    } else if (token in TENS) {
      current += TENS[token];
      matchedAny = true;
    } else if (token in MULTIPLIERS) {
      const mult = MULTIPLIERS[token];
      current = (current === 0 ? 1 : current) * mult;
      if (mult >= 1000) {
        total += current;
        current = 0;
      }
      matchedAny = true;
    } else if (token === "and") {
      // skip filler
    }
  }

  if (!matchedAny) return null;
  return total + current;
}

// ---------------------------------------------------------------------------
// Amount extraction
// ---------------------------------------------------------------------------
function extractAmount(text) {
  // Build a regex that matches any multiplier word (English + Telugu + Hindi)
  const multiplierPattern = Object.keys(MULTIPLIERS)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  // "5 lakh", "2 లక్షలు", "3 लाख" etc.
  const scaleRegex = new RegExp(
    `(\\d+(?:\\.\\d+)?)\\s*(${multiplierPattern})\\b`,
    "u"
  );
  const scaleMatch = text.match(scaleRegex);
  if (scaleMatch) {
    const base = parseFloat(scaleMatch[1]);
    const multiplier = MULTIPLIERS[scaleMatch[2]];
    if (!isNaN(base) && multiplier) return base * multiplier;
  }

  // Plain digits: 250, 15,000, 1500.50, ₹350, Rs.500
  const digitMatch = text.match(/\d[\d,]*(?:\.\d+)?/);
  if (digitMatch) {
    const cleaned = digitMatch[0].replace(/,/g, "");
    const value = parseFloat(cleaned);
    if (!isNaN(value) && value > 0) return value;
  }

  // Spoken English numbers: "five hundred", "two thousand"
  const wordValue = wordsToNumber(text);
  if (wordValue && wordValue > 0) return wordValue;

  return null;
}

// ---------------------------------------------------------------------------
// Type detection
// ---------------------------------------------------------------------------
const SAVING_WORDS = [
  "saved", "savings", "save", "put aside", "keep aside", "set aside",
  "దాచాను", "దాచుకున్నాను", "జమ చేసాను",
  "बचाया", "बचत",
];

const EARNING_WORDS = [
  // English
  "earned", "earning", "earnings", "earn",
  "income", "received", "receive", "got", "get",
  "credited", "credit",
  "salary", "salaries", "wages", "wage",
  "pay", "payment", "paycheck", "stipend",
  "profit", "revenue", "commission",
  "came in", "got paid", "been paid",
  // Telugu
  "sampadhana", "సంపాదన", "వచ్చింది", "వచ్చాయి",
  "సంపాదించాను", "సంపాదించాలి", "జీతం", "జీతమ్",
  "అందుకున్నాను", "వేతనం",
  // Hindi
  "कमाया", "कमाई", "मिला", "मिली", "मिले",
  "तनख्वाह", "वेतन", "आमदनी", "प्राप्त",
];

const EXPENSE_WORDS = [
  // English
  "spent", "spend", "spending",
  "paid", "pay", "paying",
  "expense", "expenses", "expenditure",
  "cost", "costs",
  "bought", "buy", "buying", "buyed",
  "purchase", "purchased", "purchasing",
  "invested", "invest", "investing",
  "deposited", "deposit",
  "given", "gave", "give",
  "lost", "lent",
  "used", "used for",
  "taken", "took",
  // Telugu
  "kharche", "karchu", "ఖర్చు", "ఖర్చుచేసాను",
  "కొన్నాను", "కొన్నాం", "కొనుగోలు",
  "చెల్లించాను", "చెల్లించాం",
  "వెచ్చించాను", "పెట్టాను",
  // Hindi
  "खर्च", "खर्चा", "खर्चे",
  "खरीदा", "खरीदी", "ख़रीदा",
  "दिया", "दिए", "दी",
  "भुगतान",
];

function detectType(lowerText) {
  if (SAVING_WORDS.some((w) => lowerText.includes(w))) return "saving";
  if (EARNING_WORDS.some((w) => lowerText.includes(w))) return "earning";
  if (EXPENSE_WORDS.some((w) => lowerText.includes(w))) return "expense";
  return null;
}

// ---------------------------------------------------------------------------
// Category detection
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS = [
  { label: "Food", keywords: ["food", "groceries", "grocery", "vegetables", "vegetable", "fruits", "fruit", "restaurant", "lunch", "dinner", "breakfast", "snacks", "snack", "meal", "eating", "hotel", "sweets", "bakery", "juice", "milk", "egg", "eggs", "rice", "dal", "bread", "masala",
    // Telugu
    "అన్నం", "తిండి", "కూరగాయలు", "పండ్లు", "హోటల్",
    // Hindi
    "खाना", "खाने", "सब्जी", "फल", "दूध", "चावल",
  ]},
  { label: "Transport", keywords: ["transport", "bus", "train", "auto", "taxi", "fuel", "petrol", "diesel", "cab", "bike", "vehicle", "scooter", "travel", "uber", "ola", "flight", "ticket", "parking", "toll",
    "బస్సు", "రైలు", "పెట్రోల్", "డీజిల్",
    "बस", "ट्रेन", "पेट्रोल", "डीजल", "टैक्सी",
  ]},
  { label: "Education", keywords: ["college", "school", "books", "book", "fees", "fee", "course", "tuition", "exam", "coaching", "university", "degree", "study", "studies", "stationery", "notebook", "pen",
    "చదువు", "స్కూల్", "కాలేజ్", "ఫీజు", "పుస్తకాలు",
    "पढ़ाई", "स्कूल", "कॉलेज", "फीस", "किताब",
  ]},
  { label: "Medical", keywords: ["medicine", "medicines", "doctor", "hospital", "medical", "pharmacy", "clinic", "health", "surgery", "treatment", "test", "lab", "injection", "ambulance", "nursing",
    "వైద్యం", "డాక్టర్", "ఆసుపత్రి", "మందులు",
    "दवाई", "दवा", "डॉक्टर", "अस्पताल", "इलाज",
  ]},
  { label: "Shopping", keywords: ["clothes", "clothing", "shoes", "shopping", "shirt", "pant", "saree", "kurta", "dress", "jeans", "jacket", "bag", "watch", "jewellery", "jewelry", "gold", "silver", "mobile", "phone", "laptop", "electronics", "gadget", "appliance",
    "బట్టలు", "చీర", "బంగారం", "మొబైల్",
    "कपड़े", "साड़ी", "सोना", "मोबाइल", "फोन",
  ]},
  { label: "Bills", keywords: ["electricity", "water bill", "internet", "mobile bill", "recharge", "bill", "bills", "wifi", "broadband", "subscription", "ott", "netflix", "amazon prime", "insurance", "emi", "loan emi", "credit card",
    "కరెంట్ బిల్లు", "విద్యుత్", "రీచార్జ్",
    "बिजली", "बिल", "रिचार्ज", "बीमा",
  ]},
  { label: "Housing", keywords: ["rent", "house rent", "maintenance", "society", "flat rent", "pg", "hostel", "accommodation",
    "అద్దె", "ఇల్లు అద్దె",
    "किराया", "मकान",
  ]},
  { label: "Land & Property", keywords: ["land", "property", "plot", "site", "acre", "gunta", "cents", "registration", "stamp duty", "house purchase", "flat purchase", "apartment", "villa", "bungalow", "real estate", "ground", "agriculture land", "farm land",
    "భూమి", "స్థలం", "జమీన్", "ఆస్తి",
    "जमीन", "प्लॉट", "संपत्ति", "भूमि", "जायदाद",
  ]},
  { label: "Home", keywords: ["house", "home", "furniture", "sofa", "bed", "table", "chair", "almirah", "cupboard", "fridge", "tv", "washing machine", "construction", "renovation", "painting", "repair", "tiles", "cement", "brick", "rod", "iron", "wood", "plumber", "electrician", "labour",
    "ఇల్లు", "ఫర్నీచర్", "నిర్మాణం",
    "घर", "फर्नीचर", "निर्माण", "मरम्मत",
  ]},
  { label: "Vehicle", keywords: ["car", "bike purchase", "two wheeler", "four wheeler", "vehicle purchase", "car purchase", "bike buy", "car buy", "auto purchase", "truck", "tractor purchase",
    "కారు", "బైక్", "వాహనం",
    "कार", "बाइक", "वाहन", "ट्रक",
  ]},
  { label: "Farming", keywords: ["seeds", "seed", "fertilizer", "fertilizers", "farm", "farming", "tractor", "pesticide", "irrigation", "crop", "harvest", "field", "agriculture", "cattle", "cow", "buffalo", "goat", "poultry",
    "విత్తనాలు", "ఎరువు", "వ్యవసాయం", "పంట", "రైతు",
    "बीज", "खाद", "खेती", "फसल", "किसान", "ट्रैक्टर",
  ]},
  { label: "Salary", keywords: ["salary", "wages", "wage", "stipend", "paycheck",
    "జీతం", "వేతనం",
    "तनख्वाह", "वेतन",
  ]},
  { label: "Business", keywords: ["business", "investment", "stock", "shares", "mutual fund", "fd", "fixed deposit", "startup", "shop", "store", "office", "raw material", "inventory", "goods", "trade", "export", "import",
    "వ్యాపారం", "దుకాణం",
    "व्यापार", "दुकान", "निवेश",
  ]},
  { label: "Events", keywords: ["wedding", "marriage", "function", "ceremony", "birthday", "party", "celebration", "festival", "diwali", "eid", "christmas", "puja", "pooja", "engagement", "reception",
    "పెళ్లి", "వేడుక", "పుట్టినరోజు", "పూజ",
    "शादी", "विवाह", "जन्मदिन", "पूजा", "त्योहार",
  ]},
  { label: "Charity", keywords: ["donation", "donate", "charity", "temple", "church", "mosque", "trust", "ngo", "help", "giving",
    "దాన్", "దేవాలయం", "మసీదు",
    "दान", "मंदिर", "मस्जिद", "चर्च",
  ]},
  { label: "Savings", keywords: ["savings", "saving", "piggy bank", "chit fund", "recurring deposit", "rd", "ppf", "provident fund",
    "దాచుకున్నాను", "పొదుపు",
    "बचत", "जमा",
  ]},
];

const FLAT_CATEGORY_KEYWORDS = CATEGORY_KEYWORDS.flatMap((entry) =>
  entry.keywords.map((keyword) => ({ label: entry.label, keyword }))
).sort((a, b) => b.keyword.length - a.keyword.length); // longest match wins

function detectCategory(lowerText) {
  for (const { label, keyword } of FLAT_CATEGORY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return { category: label, matchedKeyword: keyword };
    }
  }
  return { category: "Other", matchedKeyword: null };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * @param {string} rawText
 * @returns {{ success: true, data: object } | { success: false, message: string }}
 */
function parseTransactionText(rawText) {
  const sourceText = (rawText || "").trim();

  if (!sourceText) {
    return { success: false, message: "I didn't catch anything. Please try again." };
  }

  const lowerText = sourceText.toLowerCase();

  const amount = extractAmount(lowerText);
  if (!amount) {
    return { success: false, message: "Please tell me the amount." };
  }

  const type = detectType(lowerText);
  if (!type) {
    return {
      success: false,
      message:
        "I couldn't tell if that was an expense, earning, or saving. Please say something like 'I spent 200 on food' or 'I earned 5000 salary'.",
    };
  }

  const { category, matchedKeyword } = detectCategory(lowerText);

  let description;
  if (type === "saving") {
    description = matchedKeyword && matchedKeyword !== "saving" && matchedKeyword !== "savings"
      ? matchedKeyword
      : "Personal saving";
  } else if (matchedKeyword) {
    // Use the matched keyword as description but capitalise it nicely
    description = matchedKeyword.charAt(0).toUpperCase() + matchedKeyword.slice(1);
  } else {
    description = category === "Other" ? "Other" : category;
  }

  return {
    success: true,
    data: {
      type,
      amount,
      category,
      description,
      sourceText,
      date: new Date(),
    },
  };
}

module.exports = { parseTransactionText };
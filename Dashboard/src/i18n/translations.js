/**
 * Centralized translation strings for AI Saathi.
 *
 * Structure: translations[languageCode][componentKey][stringKey]
 *
 * Rules:
 * - Only static UI text lives here.
 * - Do NOT add user-entered content, API responses, or dynamic data.
 * - To add a new language: add a new top-level key and mirror all
 *   existing string keys.
 */

const translations = {
  en: {
    // ── Sidebar ────────────────────────────────────────────────────
    sidebar: {
      appName: "AI SAATHI",
      nav: {
        financialNews: "Financial News",
        budgetAssistant: "Budget Assistant",
        loanAssistant: "Loan Assistant",
        investmentAssistant: "Investment Assistant",
        community: "Community",
        schemeAI: "Scheme AI",
      },
      account: {
        logout: "Log out",
        ariaCloseMenu: "Close menu",
        ariaAccountMenu: "Account menu",
      },
    },

    // ── LandingPage ───────────────────────────────────────────────
    landing: {
      nav: {
        appName: "AI SAATHI",
        signIn: "Sign In",
      },
      badge: "Financial Intelligence for Rural India",
      heroTitle1: "AI Saathi",
      heroTitle2: "Your Money. Your Future.",
      heroSubtitle:
        "AI-powered financial guidance designed specifically for farmers, rural households, and small business owners in India — in Telugu and English.",
      heroCTA: "Get Started — It's Free",
      heroNote: "No credit card required · Sign in with Google",
      highlights: {
        rural: "Built for rural India — available in Telugu & English",
        privacy: "Your financial data stays private and secure",
        insights: "AI-powered insights without financial jargon",
      },
      featuresHeading: "Everything you need in one place",
      features: {
        news: {
          title: "Rural Finance News",
          desc: "Latest financial updates, crop prices, and government schemes curated for rural India.",
        },
        budget: {
          title: "Budget Assistant",
          desc: "Plan your household and farm budget with personalised guidance.",
        },
        loan: {
          title: "Loan Assistant",
          desc: "Understand loan options, eligibility, and repayment strategies in your language.",
        },
        investment: {
          title: "Investment Assistant",
          desc: "Safe, simple investment advice suited for rural households.",
        },
        community: {
          title: "Community",
          desc: "Connect with other farmers and rural entrepreneurs to share insights.",
        },
        charts: {
          title: "Agriculture Price Charts",
          desc: "Track mandi prices and predict crop market trends.",
        },
      },
      ctaSection: {
        heading: "Ready to take control of your finances?",
        subheading:
          "Join thousands of farmers and rural households already using AI Saathi.",
        button: "Get Started — It's Free",
      },
    },

    // ── AuthModal ─────────────────────────────────────────────────
    authModal: {
      appName: "AI SAATHI",
      heading: "Welcome back",
      subheading: "Sign in to access your personalised financial dashboard",
      googleButton: "Continue with Google",
      terms: "By continuing, you agree to AI Saathi's terms of use. Your data stays private.",
      ariaClose: "Close sign-in dialog",
    },

    // ── FinancialNews ─────────────────────────────────────────────
    financialNews: {
      pageHeading: "Finance News",
      pageHeadingHighlight: "Rural India",
      latestNews: "Latest News",
    },

    // ── Scheme AI ────────────────────────────────────────────────
    schemeAI: {
      eyebrow: "AI-guided support",
      title: "Scheme AI",
      subtitle: "Your Personal Financial Guide",
      description: "Talk to AI Saathi to understand government schemes, financial support and your available options.",
      welcome: "Welcome",
      languageLabel: "Supported languages",
      ready: "Ready",
      previewTitle: "Your financial guide is ready",
      microphone: "Microphone",
      microphoneReady: "Ready",
      microphoneNote: "Your microphone will only be connected when the call experience is available.",
      callPrompt: "When you are ready, join a guided conversation with AI Saathi.",
      status: "Ready to help",
      privacy: "Private by design",
      privacyNote: "Your consultation will be designed around clear, understandable guidance.",
      benefitSpeak: "Speak naturally",
      benefitUnderstand: "Understand schemes",
      benefitLanguage: "Guidance in your language",
      joinCall: "Join Call",
      comingSoon: "Coming in the next phase",
      starting: "Starting...",
      conversationCreateError: "We could not start the conversation. Please try again.",
      genericError: "Something went wrong. Please try again.",
      liveCall: "Scheme AI live call",
      aiParticipant: "AI Saathi participant",
      userParticipant: "User participant",
      previewMode: "Text mode",
      duration: "Call duration",
      callConnected: "Connected",
      callReady: "Ready",
      callListening: "Listening",
      callThinking: "Thinking",
      callSpeaking: "Speaking",
      callError: "Something went wrong",
      currentMessage: "Tell me what financial help you need.",
      waitingForMessage: "Send a message to begin.",
      currentQuestion: "Current question",
      readyMessage: "Your options are ready to review.",
      noMessages: "No messages yet.",
      aiLabel: "AI Saathi",
      recentConversation: "Recent conversation",
      callControls: "Call controls",
      unmute: "Unmute microphone",
      mute: "Mute microphone",
      muted: "Muted",
      startVoice: "Start voice",
      connectingVoice: "Connecting...",
      listening: "Listening...",
      transcribing: "Transcribing...",
      stopRecording: "Stop recording",
      ttsTestTitle: "Sarvam voice test",
      ttsGenerating: "Generating voice...",
      ttsPlaying: "Playing...",
      ttsFinished: "Finished.",
      ttsPlaybackError: "Audio playback failed. Please try again.",
      leaveCall: "Leave call",
      settings: "Settings",
      settingsComingSoon: "Settings will be available in a later phase.",
      localPreview: "Backend text mode. No microphone or live voice connection is active.",
      messageForm: "Send a message to AI Saathi",
      messagePlaceholder: "Type your message...",
      send: "Send",
      retryBySending: "You can send the message again.",
      yourSituation: "Your situation",
      noKnownInfo: "No information collected yet.",
      informationNeeded: "Information needed",
      optionsTitle: "Your options",
      score: "Score",
      eligibility: "Eligibility",
      noRankedOptions: "No ranked options are available yet.",
      understandingOptions: "Understanding your options...",
      verificationRequired: "Verification required",
      you: "You",
    },

    // ── AgriculturePriceCharts ────────────────────────────────────
    agricultureCharts: {
      heading: "Crop Price Trends & Predictions",
      actualPrices: "Actual Prices",
      date: "Date",
      sixMonthPrediction: "6-Month Prediction",
      oneMonthPrediction: "1-Month Prediction",
      peakPrefix: "Peak:",
      riceForecast: "Short-term forecast: 12.8% decrease",
      wheatForecast: "Short-term forecast: 2.9% decrease",
    },

    // ── WordOfTheDay ──────────────────────────────────────────────
    wordOfTheDay: {
      heading: "Words of the Day",
      tapToRotate: "TAP TO ROTATE →",
      cards: [
        {
          word: "Farmer Producer Organization (FPO)",
          desc: "FPOs are cooperative groups formed by farmers to collectively produce and market crops.",
        },
        {
          word: "Subsidy",
          desc: "Financial assistance provided by the government to support farmers.",
        },
        {
          word: "Crop Rotation",
          desc: "Growing different crops sequentially to maintain soil fertility.",
        },
        {
          word: "Kisan Credit Card",
          desc: "Affordable credit scheme for farmers.",
        },
        {
          word: "Minimum Support Price",
          desc: "Government guaranteed price for crops.",
        },
      ],
    },

    // ── ExpertFinancialInsights ───────────────────────────────────
    expertInsights: {
      heading: "Expert Financial Insights",
      teluguBadge: "Telugu",
      videos: [
        { title: "Rural Finance Schemes Explained | NABARD Updates", channel: "Rural Finance TV" },
        { title: "Telugu Farming Guide",                              channel: "Telugu Agri" },
        { title: "Agri Input Subsidy Benefits for Farmers",          channel: "Govt Schemes Telugu" },
        { title: "Crop Insurance Claim Process Simplified",          channel: "Insurance Guru" },
        { title: "MSP Updates: What Farmers Need to Know",           channel: "FarmNews Telugu" },
        { title: "Kisan Credit Card Benefits & How to Apply",        channel: "Banking Telugu" },
      ],
    },

    // ── BudgetAssistant ───────────────────────────────────────────
    budgetAssistant: {
      recordTransaction: "Record Transaction",
      listening: "Listening...",
      expenses: "Expenses",
      totalExpenditure: "Total Expenditure:",
      earnings: "Earnings",
      totalEarnings: "Total Earnings:",
      net: "Net",
      profitLoss: "Profit/Loss:",
      noTransactions: "Transaction records will appear here",
      financeOverview: "Finance Overview",
      expensesLegend: "Expenses",
      earningsLegend: "Earnings",
      expenseHistory: "Expense Chat History",
      earningHistory: "Earnings Chat History",
    },

    // ── LoanAssistant ─────────────────────────────────────────────
    loanAssistant: {
      selectBank: "Select Your Bank",
      askPlaceholder: "Ask about loan...",
      submitQuery: "Submit Query",
      startRecording: "Start Recording",
      chatHistory: "Chat History",
      noConversation: "No conversation yet",
      loanResult: "Loan Application Result",
      speakOrType: "Speak or type a query to see results.",
      sendToWhatsApp: "Send to Bank on WhatsApp",
      loanType: "Loan Type:",
      monthlyIncome: "Monthly Income:",
      suggestedBank: "Suggested Bank:",
      eligibleAmount: "Eligible Loan Amount:",
      // Bank names shown as static labels in the bank selector grid
      andhraBank: "Andhra Bank",
      bankOfBaroda: "Bank of Baroda",
      punjabNationalBank: "Punjab National Bank",
      // Static result values shown when a loan query is submitted
      loanTypeValue: "Agriculture Tractor Loan",
      monthlyIncomeValue: "₹7000",
      suggestedBankValue: "Andhra Bank",
      eligibleAmountValue: "₹2L - ₹4L",
    },

    // ── InvestmentAssistant ───────────────────────────────────────
    investmentAssistant: {
      pageHeading: "Micro Investment & Government Scheme Recommendations",
      microInvestment: "Micro Investment Suggestions",
      riskLevel: "Risk Level",
      lowRisk: "Low Risk",
      lowRiskDesc: "Safe & Steady",
      mediumRisk: "Medium Risk",
      mediumRiskDesc: "Balanced Growth",
      highRisk: "High Risk",
      highRiskDesc: "Maximum Returns",
      investmentIncome: "Investment Income (INR)",
      incomePlaceholder: "Enter your monthly income",
      investmentPeriod: "Investment Period (years)",
      periodPlaceholder: "Enter investment duration",
      startRecording: "🎤 Start Recording",
      savePreferences: "Save Preferences",
      getRecommendations: "Get Investment Recommendations",
      govSchemes: "Government Scheme Recommendations",
      stopRecording: "⏹ Stop Recording",
      getSchemes: "Get Scheme Recommendation",
      userLabel: "🎤 User:",
      aiLabel: "🤖 AI SAATHI:",
    },

    // ── App (global shell) ────────────────────────────────────────
    app: {
      loading: "Loading…",
      appName: "AI SAATHI",
    },

    // ── Community (EN) ────────────────────────────────────────────
    community: {
      heading: "AI SAATHI COMMUNITY",
      subheading: "Ask questions, share knowledge, help farmers grow",
      placeholder: "What's your agriculture or finance question?",
      postButton: "Post Question",
      replyPlaceholder: "Write a reply...",
      noReplies: "No replies yet. Be the first to reply! 👆",
      // Predefined/static feed — questions and replies
      feed: [
        {
          id: 1,
          text: "Which crop gives better profit in summer?",
          replies: [
            { id: 1, author: "Expert Agri", text: "Maize or cotton usually give good returns. Check local market rates." },
            { id: 2, author: "Suresh Patil", text: "Turmeric is also profitable if you have irrigation." },
          ],
        },
        {
          id: 2,
          text: "How to apply for Kisan Credit Card loan?",
          replies: [
            { id: 3, author: "Bank Advisor", text: "Visit nearest bank branch with Aadhaar, land records, and photo. Online portal also available." },
          ],
        },
        {
          id: 3,
          text: "Best fertilizer for paddy crops?",
          replies: [
            { id: 4, author: "Agri Expert", text: "NPK 10-26-26 at transplanting stage. Use organic manure too." },
            { id: 5, author: "Lakshmi K",   text: "Vermi compost works wonders for soil health." },
            { id: 6, author: "Ramesh Ji",   text: "Avoid excess urea - follow soil test." },
          ],
        },
        {
          id: 4,
          text: "How to start organic farming?",
          replies: [
            { id: 7, author: "Organic Guru", text: "Get certified from APEDA, start small with compost and neem pesticides." },
          ],
        },
        {
          id: 5,
          text: "Is drip irrigation worth the investment?",
          replies: [
            { id: 8, author: "Irrigation Pro", text: "Yes, subsidy up to 70%. ROI in 2 years for vegetables." },
            { id: 9, author: "Farmer Group", text: "Great for water scarce areas." },
          ],
        },
        {
          id: 6,
          text: "Which crops need less water?",
          replies: [
            { id: 10, author: "Water Expert", text: "Millets (jowar, bajra), pulses (arhar), oilseeds." },
            { id: 11, author: "Govind",       text: "Groundnut is also low water." },
            { id: 12, author: "NGO Agri",     text: "Promote millets for climate resilience." },
          ],
        },
        {
          id: 7,
          text: "How to control pests in cotton?",
          replies: [
            { id: 13, author: "Pest Control", text: "Neem oil spray + pheromone traps. Avoid broad spectrum chemicals." },
          ],
        },
        {
          id: 8,
          text: "How to get government agriculture subsidies?",
          replies: [
            { id: 14, author: "Gov Scheme",      text: "PM Kisan portal or local agri office. Need Aadhaar + bank details." },
            { id: 15, author: "Village Sarpanch", text: "DBT schemes are transparent now." },
          ],
        },
        {
          id: 9,
          text: "Where can I check daily vegetable market prices?",
          replies: [
            { id: 16, author: "Market Link", text: "Agmarknet portal or state mandi apps." },
          ],
        },
        {
          id: 10,
          text: "Best crop rotation for soil fertility?",
          replies: [
            { id: 17, author: "Soil Scientist",     text: "Rice - Pulses - Oilseeds rotation maintains fertility." },
            { id: 18, author: "Experienced Farmer", text: "Include green manure crops like dhaincha." },
          ],
        },
      ],
    },
  },

  // ════════════════════════════════════════════════════════════════
  // TELUGU
  // ════════════════════════════════════════════════════════════════
  te: {
    // ── Sidebar ────────────────────────────────────────────────────
    sidebar: {
      appName: "AI సాథి",
      nav: {
        financialNews: "ఆర్థిక వార్తలు",
        budgetAssistant: "బడ్జెట్ సహాయకుడు",
        loanAssistant: "రుణ సహాయకుడు",
        investmentAssistant: "పెట్టుబడి సహాయకుడు",
        community: "సమాజం",
        schemeAI: "స్కీమ్ AI",
      },
      account: {
        logout: "లాగ్ అవుట్",
        ariaCloseMenu: "మెనూ మూసివేయండి",
        ariaAccountMenu: "ఖాతా మెనూ",
      },
    },

    // ── LandingPage ───────────────────────────────────────────────
    landing: {
      nav: {
        appName: "AI సాథి",
        signIn: "సైన్ ఇన్",
      },
      badge: "గ్రామీణ భారతదేశం కోసం ఆర్థిక మేధస్సు",
      heroTitle1: "AI సాథి",
      heroTitle2: "మీ డబ్బు. మీ భవిష్యత్తు.",
      heroSubtitle:
        "రైతులు, గ్రామీణ కుటుంబాలు మరియు చిన్న వ్యాపారదారుల కోసం ప్రత్యేకంగా రూపొందించిన AI ఆర్థిక మార్గదర్శకత్వం — తెలుగు మరియు ఇంగ్లీష్‌లో.",
      heroCTA: "ప్రారంభించండి — ఉచితం",
      heroNote: "క్రెడిట్ కార్డు అవసరం లేదు · Google తో సైన్ ఇన్ చేయండి",
      highlights: {
        rural: "గ్రామీణ భారతదేశం కోసం నిర్మించబడింది — తెలుగు & ఇంగ్లీష్‌లో అందుబాటులో ఉంది",
        privacy: "మీ ఆర్థిక డేటా ప్రైవేట్ మరియు సురక్షితంగా ఉంటుంది",
        insights: "ఆర్థిక పరిభాష లేకుండా AI-ఆధారిత అంతర్దృష్టులు",
      },
      featuresHeading: "అన్నీ ఒకే చోట",
      features: {
        news: {
          title: "గ్రామీణ ఆర్థిక వార్తలు",
          desc: "గ్రామీణ భారతదేశం కోసం సేకరించిన తాజా ఆర్థిక నవీకరణలు, పంట ధరలు మరియు ప్రభుత్వ పథకాలు.",
        },
        budget: {
          title: "బడ్జెట్ సహాయకుడు",
          desc: "వ్యక్తిగత మార్గదర్శకత్వంతో మీ గృహ మరియు పొలం బడ్జెట్‌ను ప్లాన్ చేయండి.",
        },
        loan: {
          title: "రుణ సహాయకుడు",
          desc: "మీ భాషలో రుణ ఎంపికలు, అర్హత మరియు తిరిగి చెల్లింపు వ్యూహాలను అర్థం చేసుకోండి.",
        },
        investment: {
          title: "పెట్టుబడి సహాయకుడు",
          desc: "గ్రామీణ కుటుంబాలకు అనుకూలమైన సురక్షితమైన, సరళమైన పెట్టుబడి సలహా.",
        },
        community: {
          title: "సమాజం",
          desc: "అంతర్దృష్టులు పంచుకోవడానికి ఇతర రైతులు మరియు గ్రామీణ వ్యాపారదారులతో కనెక్ట్ అవ్వండి.",
        },
        charts: {
          title: "వ్యవసాయ ధర చార్టులు",
          desc: "మండి ధరలను ట్రాక్ చేయండి మరియు పంట మార్కెట్ ట్రెండ్‌లను అంచనా వేయండి.",
        },
      },
      ctaSection: {
        heading: "మీ ఆర్థిక వ్యవహారాలపై నియంత్రణ తీసుకోవడానికి సిద్ధంగా ఉన్నారా?",
        subheading:
          "ఇప్పటికే AI సాథిని ఉపయోగిస్తున్న వేలాది రైతులు మరియు గ్రామీణ కుటుంబాలతో చేరండి.",
        button: "ప్రారంభించండి — ఉచితం",
      },
    },

    // ── AuthModal ─────────────────────────────────────────────────
    authModal: {
      appName: "AI సాథి",
      heading: "తిరిగి స్వాగతం",
      subheading: "మీ వ్యక్తిగత ఆర్థిక డాష్‌బోర్డ్ యాక్సెస్ చేయడానికి సైన్ ఇన్ చేయండి",
      googleButton: "Google తో కొనసాగండి",
      terms: "కొనసాగడం ద్వారా, మీరు AI సాథి వినియోగ నిబంధనలకు అంగీకరిస్తున్నారు. మీ డేటా ప్రైవేట్‌గా ఉంటుంది.",
      ariaClose: "సైన్-ఇన్ డైలాగ్ మూసివేయండి",
    },

    // ── FinancialNews ─────────────────────────────────────────────
    financialNews: {
      pageHeading: "ఆర్థిక వార్తలు",
      pageHeadingHighlight: "గ్రామీణ భారతదేశం",
      latestNews: "తాజా వార్తలు",
    },

    // ── Scheme AI ────────────────────────────────────────────────
    schemeAI: {
      eyebrow: "AI మార్గదర్శక సహాయం",
      title: "స్కీమ్ AI",
      subtitle: "మీ వ్యక్తిగత ఆర్థిక మార్గదర్శి",
      description: "ప్రభుత్వ పథకాలు, ఆర్థిక సహాయం మరియు మీకు అందుబాటులో ఉన్న ఎంపికలను అర్థం చేసుకోవడానికి AI సాథితో మాట్లాడండి.",
      welcome: "స్వాగతం",
      languageLabel: "మద్దతు ఉన్న భాషలు",
      ready: "సిద్ధంగా ఉంది",
      previewTitle: "మీ ఆర్థిక మార్గదర్శి సిద్ధంగా ఉన్నారు",
      microphone: "మైక్రోఫోన్",
      microphoneReady: "సిద్ధంగా ఉంది",
      microphoneNote: "కాల్ అనుభవం అందుబాటులోకి వచ్చినప్పుడు మాత్రమే మీ మైక్రోఫోన్ కనెక్ట్ అవుతుంది.",
      callPrompt: "మీరు సిద్ధంగా ఉన్నప్పుడు AI సాథితో మార్గదర్శక సంభాషణలో చేరండి.",
      status: "సహాయం చేయడానికి సిద్ధంగా ఉంది",
      privacy: "ప్రైవేట్‌గా రూపొందించబడింది",
      privacyNote: "మీ సంప్రదింపులు స్పష్టమైన మరియు సులభమైన మార్గదర్శకత్వం కోసం రూపొందించబడతాయి.",
      benefitSpeak: "సహజంగా మాట్లాడండి",
      benefitUnderstand: "పథకాలను అర్థం చేసుకోండి",
      benefitLanguage: "మీ భాషలో మార్గదర్శకత్వం",
      joinCall: "కాల్‌లో చేరండి",
      comingSoon: "తదుపరి దశలో అందుబాటులోకి వస్తుంది",
      starting: "ప్రారంభమవుతోంది...",
      conversationCreateError: "సంభాషణను ప్రారంభించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.",
      genericError: "ఏదో తప్పు జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.",
      liveCall: "స్కీమ్ AI లైవ్ కాల్",
      aiParticipant: "AI సాథి పాల్గొనేవారు",
      userParticipant: "వినియోగదారు పాల్గొనేవారు",
      previewMode: "టెక్స్ట్ మోడ్",
      duration: "కాల్ సమయం",
      callConnected: "కనెక్ట్ అయింది",
      callReady: "సిద్ధంగా ఉంది",
      callListening: "వింటున్నాను",
      callThinking: "ఆలోచిస్తున్నాను",
      callSpeaking: "మాట్లాడుతున్నాను",
      callError: "ఏదో తప్పు జరిగింది",
      currentMessage: "మీకు ఎలాంటి ఆర్థిక సహాయం కావాలి?",
      waitingForMessage: "ప్రారంభించడానికి ఒక సందేశం పంపండి.",
      currentQuestion: "ప్రస్తుత ప్రశ్న",
      readyMessage: "మీ ఎంపికలను పరిశీలించడానికి సిద్ధంగా ఉన్నాయి.",
      noMessages: "ఇంకా సందేశాలు లేవు.",
      aiLabel: "AI సాథి",
      recentConversation: "ఇటీవలి సంభాషణ",
      callControls: "కాల్ నియంత్రణలు",
      unmute: "మైక్రోఫోన్ ఆన్ చేయండి",
      mute: "మైక్రోఫోన్ మ్యూట్ చేయండి",
      muted: "మ్యూట్ చేయబడింది",
      startVoice: "వాయిస్ ప్రారంభించండి",
      connectingVoice: "కనెక్ట్ అవుతోంది...",
      listening: "వింటున్నాను...",
      transcribing: "ట్రాన్స్‌క్రైబ్ చేస్తోంది...",
      stopRecording: "రికార్డింగ్ ఆపండి",
      ttsTestTitle: "సర్వమ్ వాయిస్ పరీక్ష",
      ttsGenerating: "వాయిస్ రూపొందిస్తోంది...",
      ttsPlaying: "ప్లే అవుతోంది...",
      ttsFinished: "పూర్తయింది.",
      ttsPlaybackError: "ఆడియో ప్లేబ్యాక్ విఫలమైంది. మళ్లీ ప్రయత్నించండి.",
      leaveCall: "కాల్ నుండి బయటకు వెళ్లండి",
      settings: "సెట్టింగ్స్",
      settingsComingSoon: "సెట్టింగ్స్ తరువాతి దశలో అందుబాటులో ఉంటాయి.",
      localPreview: "బ్యాక్‌ఎండ్ టెక్స్ట్ మోడ్. మైక్రోఫోన్ లేదా లైవ్ వాయిస్ కనెక్షన్ యాక్టివ్‌గా లేదు.",
      messageForm: "AI సాథికి సందేశం పంపండి",
      messagePlaceholder: "మీ సందేశాన్ని టైప్ చేయండి...",
      send: "పంపండి",
      retryBySending: "మీరు సందేశాన్ని మళ్లీ పంపవచ్చు.",
      yourSituation: "మీ పరిస్థితి",
      noKnownInfo: "ఇంకా సమాచారం సేకరించలేదు.",
      informationNeeded: "అవసరమైన సమాచారం",
      optionsTitle: "మీ ఎంపికలు",
      score: "స్కోర్",
      eligibility: "అర్హత",
      noRankedOptions: "ఇంకా ర్యాంక్ చేసిన ఎంపికలు లేవు.",
      understandingOptions: "మీ ఎంపికలను అర్థం చేసుకుంటున్నాము...",
      verificationRequired: "ధృవీకరణ అవసరం",
      you: "మీరు",
    },

    // ── AgriculturePriceCharts ────────────────────────────────────
    agricultureCharts: {
      heading: "పంట ధర ట్రెండ్‌లు & అంచనాలు",
      actualPrices: "వాస్తవ ధరలు",
      date: "తేదీ",
      sixMonthPrediction: "6-నెలల అంచనా",
      oneMonthPrediction: "1-నెల అంచనా",
      peakPrefix: "గరిష్ట:",
      riceForecast: "స్వల్పకాలిక అంచనా: 12.8% తగ్గుదల",
      wheatForecast: "స్వల్పకాలిక అంచనా: 2.9% తగ్గుదల",
    },

    // ── WordOfTheDay ──────────────────────────────────────────────
    wordOfTheDay: {
      heading: "నేటి పదాలు",
      tapToRotate: "తాకండి →",
      cards: [
        {
          word: "రైతు ఉత్పత్తిదారుల సంస్థ (FPO)",
          desc: "FPOలు రైతులు సమిష్టిగా పంటలను ఉత్పత్తి చేసి మార్కెట్ చేయడానికి ఏర్పాటు చేసిన సహకార సమూహాలు.",
        },
        {
          word: "సబ్సిడీ",
          desc: "రైతులను ఆదుకోవడానికి ప్రభుత్వం అందించే ఆర్థిక సహాయం.",
        },
        {
          word: "పంట మార్పిడి",
          desc: "నేల సారవంతత నిలబెట్టుకోవడానికి వరుసగా వేర్వేరు పంటలు పండించడం.",
        },
        {
          word: "కిసాన్ క్రెడిట్ కార్డ్",
          desc: "రైతులకు చౌకగా అందించే రుణ పథకం.",
        },
        {
          word: "కనీస మద్దతు ధర",
          desc: "పంటలకు ప్రభుత్వం హామీ ఇచ్చిన ధర.",
        },
      ],
    },

    // ── ExpertFinancialInsights ───────────────────────────────────
    expertInsights: {
      heading: "నిపుణుల ఆర్థిక అంతర్దృష్టులు",
      teluguBadge: "తెలుగు",
      videos: [
        { title: "గ్రామీణ ఆర్థిక పథకాలు వివరించబడ్డాయి | NABARD నవీకరణలు", channel: "Rural Finance TV" },
        { title: "తెలుగు వ్యవసాయ మార్గదర్శి",                               channel: "Telugu Agri" },
        { title: "రైతులకు వ్యవసాయ ఇన్‌పుట్ సబ్సిడీ ప్రయోజనాలు",           channel: "Govt Schemes Telugu" },
        { title: "పంట బీమా క్లెయిమ్ ప్రక్రియ సరళీకృతం",                    channel: "Insurance Guru" },
        { title: "MSP నవీకరణలు: రైతులు తెలుసుకోవలసినవి",                   channel: "FarmNews Telugu" },
        { title: "కిసాన్ క్రెడిట్ కార్డ్ ప్రయోజనాలు & దరఖాస్తు ఎలా చేయాలి", channel: "Banking Telugu" },
      ],
    },

    // ── BudgetAssistant ───────────────────────────────────────────
    budgetAssistant: {
      recordTransaction: "లావాదేవీ నమోదు చేయండి",
      listening: "వింటోంది...",
      expenses: "ఖర్చులు",
      totalExpenditure: "మొత్తం వ్యయం:",
      earnings: "ఆదాయం",
      totalEarnings: "మొత్తం ఆదాయం:",
      net: "నికర",
      profitLoss: "లాభం/నష్టం:",
      noTransactions: "లావాదేవీ రికార్డులు ఇక్కడ కనిపిస్తాయి",
      financeOverview: "ఆర్థిక అవలోకనం",
      expensesLegend: "ఖర్చులు",
      earningsLegend: "ఆదాయం",
      expenseHistory: "ఖర్చు చాట్ చరిత్ర",
      earningHistory: "ఆదాయం చాట్ చరిత్ర",
    },

    // ── LoanAssistant ─────────────────────────────────────────────
    loanAssistant: {
      selectBank: "మీ బ్యాంక్‌ను ఎంచుకోండి",
      askPlaceholder: "రుణం గురించి అడగండి...",
      submitQuery: "ప్రశ్న సమర్పించండి",
      startRecording: "రికార్డింగ్ ప్రారంభించండి",
      chatHistory: "చాట్ చరిత్ర",
      noConversation: "ఇంకా సంభాషణ లేదు",
      loanResult: "రుణ దరఖాస్తు ఫలితం",
      speakOrType: "ఫలితాలు చూడటానికి మాట్లాడండి లేదా టైప్ చేయండి.",
      sendToWhatsApp: "WhatsApp లో బ్యాంక్‌కు పంపండి",
      loanType: "రుణ రకం:",
      monthlyIncome: "నెలవారీ ఆదాయం:",
      suggestedBank: "సూచించిన బ్యాంక్:",
      eligibleAmount: "అర్హత రుణ మొత్తం:",
      andhraBank: "ఆంధ్రా బ్యాంక్",
      bankOfBaroda: "బ్యాంక్ ఆఫ్ బరోడా",
      punjabNationalBank: "పంజాబ్ నేషనల్ బ్యాంక్",
      loanTypeValue: "వ్యవసాయ ట్రాక్టర్ రుణం",
      monthlyIncomeValue: "₹7000",
      suggestedBankValue: "ఆంధ్రా బ్యాంక్",
      eligibleAmountValue: "₹2L - ₹4L",
    },

    // ── InvestmentAssistant ───────────────────────────────────────
    investmentAssistant: {
      pageHeading: "మైక్రో పెట్టుబడి & ప్రభుత్వ పథక సిఫారసులు",
      microInvestment: "మైక్రో పెట్టుబడి సూచనలు",
      riskLevel: "రిస్క్ స్థాయి",
      lowRisk: "తక్కువ రిస్క్",
      lowRiskDesc: "సురక్షితం & స్థిరం",
      mediumRisk: "మధ్యస్థ రిస్క్",
      mediumRiskDesc: "సమతుల్య వృద్ధి",
      highRisk: "అధిక రిస్క్",
      highRiskDesc: "గరిష్ట రాబడులు",
      investmentIncome: "పెట్టుబడి ఆదాయం (INR)",
      incomePlaceholder: "మీ నెలవారీ ఆదాయాన్ని నమోదు చేయండి",
      investmentPeriod: "పెట్టుబడి కాలం (సంవత్సరాలు)",
      periodPlaceholder: "పెట్టుబడి వ్యవధిని నమోదు చేయండి",
      startRecording: "🎤 రికార్డింగ్ ప్రారంభించండి",
      savePreferences: "ప్రాధాన్యతలు సేవ్ చేయండి",
      getRecommendations: "పెట్టుబడి సిఫారసులు పొందండి",
      govSchemes: "ప్రభుత్వ పథక సిఫారసులు",
      stopRecording: "⏹ రికార్డింగ్ ఆపండి",
      getSchemes: "పథక సిఫారసు పొందండి",
      userLabel: "🎤 వినియోగదారు:",
      aiLabel: "🤖 AI సాథి:",
    },

    // ── App (global shell) ────────────────────────────────────────
    app: {
      loading: "లోడవుతోంది…",
      appName: "AI సాథి",
    },

    // ── Community (TE) ────────────────────────────────────────────
    community: {
      heading: "AI సాథి సమాజం",
      subheading: "ప్రశ్నలు అడగండి, జ్ఞానం పంచుకోండి, రైతులు అభివృద్ధి చెందడానికి సహాయం చేయండి",
      placeholder: "మీ వ్యవసాయ లేదా ఆర్థిక ప్రశ్న ఏమిటి?",
      postButton: "ప్రశ్న పోస్ట్ చేయండి",
      replyPlaceholder: "సమాధానం రాయండి...",
      noReplies: "ఇంకా సమాధానాలు లేవు. మొదటిగా సమాధానం ఇవ్వండి! 👆",
      // Predefined/static feed — questions and replies
      feed: [
        {
          id: 1,
          text: "వేసవిలో ఏ పంట ఎక్కువ లాభం ఇస్తుంది?",
          replies: [
            { id: 1, author: "Expert Agri", text: "మొక్కజొన్న లేదా పత్తి సాధారణంగా మంచి ఆదాయం ఇస్తాయి. స్థానిక మార్కెట్ రేట్లు తనిఖీ చేయండి." },
            { id: 2, author: "Suresh Patil", text: "నీటిపారుదల ఉంటే పసుపు కూడా లాభదాయకం." },
          ],
        },
        {
          id: 2,
          text: "కిసాన్ క్రెడిట్ కార్డ్ రుణానికి ఎలా దరఖాస్తు చేయాలి?",
          replies: [
            { id: 3, author: "Bank Advisor", text: "ఆధార్, భూమి పత్రాలు మరియు ఫోటోతో సమీప బ్యాంక్ శాఖకు వెళ్ళండి. ఆన్‌లైన్ పోర్టల్ కూడా అందుబాటులో ఉంది." },
          ],
        },
        {
          id: 3,
          text: "వరి పంటలకు ఉత్తమ ఎరువు ఏది?",
          replies: [
            { id: 4, author: "Agri Expert", text: "నాటు దశలో NPK 10-26-26 వాడండి. సేంద్రీయ ఎరువు కూడా వాడండి." },
            { id: 5, author: "Lakshmi K",   text: "వర్మీ కంపోస్ట్ నేల ఆరోగ్యానికి అద్భుతంగా పని చేస్తుంది." },
            { id: 6, author: "Ramesh Ji",   text: "అధిక యూరియా వాడకం మానండి - మట్టి పరీక్ష అనుసరించండి." },
          ],
        },
        {
          id: 4,
          text: "సేంద్రీయ వ్యవసాయం ఎలా ప్రారంభించాలి?",
          replies: [
            { id: 7, author: "Organic Guru", text: "APEDA నుండి సర్టిఫికేట్ పొందండి, కంపోస్ట్ మరియు వేప పురుగుమందులతో చిన్నగా ప్రారంభించండి." },
          ],
        },
        {
          id: 5,
          text: "డ్రిప్ ఇరిగేషన్ పెట్టుబడికి విలువైనదా?",
          replies: [
            { id: 8, author: "Irrigation Pro", text: "అవును, 70% వరకు సబ్సిడీ ఉంది. కూరగాయలకు 2 సంవత్సరాల్లో ROI వస్తుంది." },
            { id: 9, author: "Farmer Group", text: "నీటి కొరత ఉన్న ప్రాంతాలకు చాలా అనువైనది." },
          ],
        },
        {
          id: 6,
          text: "తక్కువ నీరు అవసరమైన పంటలు ఏవి?",
          replies: [
            { id: 10, author: "Water Expert", text: "చిరుధాన్యాలు (జొన్న, సజ్జ), పప్పుధాన్యాలు (అరహర్), నూనె గింజలు." },
            { id: 11, author: "Govind",       text: "వేరుశెనగ కూడా తక్కువ నీటి పంట." },
            { id: 12, author: "NGO Agri",     text: "వాతావరణ స్థితిస్థాపకత కోసం చిరుధాన్యాలను ప్రోత్సహించండి." },
          ],
        },
        {
          id: 7,
          text: "పత్తిలో చీడలను ఎలా నియంత్రించాలి?",
          replies: [
            { id: 13, author: "Pest Control", text: "వేప నూనె స్ప్రే + ఫెరోమోన్ ట్రాప్‌లు వాడండి. విస్తృత స్పెక్ట్రం రసాయనాలు మానండి." },
          ],
        },
        {
          id: 8,
          text: "ప్రభుత్వ వ్యవసాయ సబ్సిడీలు ఎలా పొందాలి?",
          replies: [
            { id: 14, author: "Gov Scheme",      text: "PM కిసాన్ పోర్టల్ లేదా స్థానిక వ్యవసాయ కార్యాలయం. ఆధార్ + బ్యాంక్ వివరాలు అవసరం." },
            { id: 15, author: "Village Sarpanch", text: "DBT పథకాలు ఇప్పుడు పారదర్శకంగా ఉన్నాయి." },
          ],
        },
        {
          id: 9,
          text: "రోజువారీ కూరగాయల మార్కెట్ ధరలు ఎక్కడ చూడవచ్చు?",
          replies: [
            { id: 16, author: "Market Link", text: "Agmarknet పోర్టల్ లేదా రాష్ట్ర మండి యాప్‌లు." },
          ],
        },
        {
          id: 10,
          text: "నేల సారవంతత కోసం ఉత్తమ పంట మార్పిడి ఏది?",
          replies: [
            { id: 17, author: "Soil Scientist",     text: "వరి - పప్పుధాన్యాలు - నూనె గింజలు మార్పిడి సారవంతత నిలబెడుతుంది." },
            { id: 18, author: "Experienced Farmer", text: "ధైంచా వంటి పచ్చిరొట్ట పంటలు చేర్చండి." },
          ],
        },
      ],
    },
  },
};

export default translations;

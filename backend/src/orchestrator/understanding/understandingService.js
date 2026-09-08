const understandMessage = async (message) => {
  if (!message || typeof message !== "string") {
    throw new Error("Message must be a non-empty string");
  }

  const language = detectLanguage(message);

  return {
    language,
    intent: "general_financial_guidance",
    entities: {}
  };
};

const detectLanguage = (message) => {
  // Telugu Unicode range: 0C00–0C7F
  const teluguCharacters = message.match(/[\u0C00-\u0C7F]/g);

  if (teluguCharacters && teluguCharacters.length > 0) {
    return "te";
  }

  return "en";
};

module.exports = {
  understandMessage,
  detectLanguage
};
const { GoogleGenAI } = require("@google/genai");

let client = null;
const translationCache = new Map();
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function getClient() {
  if (client) return client;

  const apiKey = process.env.GEMINI_API_KEY_2;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_2 is not configured.");
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

function cacheKey(article) {
  return `${article.title}\n${article.description || ""}`;
}

async function translateNews(articles) {
  const requested = articles.map((article, index) => ({
    id: index,
    title: article.title,
    summary: article.description || "",
  }));

  const uncached = requested.filter((article) => !translationCache.has(cacheKey(article)));
  if (uncached.length === 0) {
    return requested.map((article) => translationCache.get(cacheKey(article)));
  }

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: `Translate these English financial news items into natural, clear Telugu. Preserve important financial and economic information, and keep each summary concise. Return JSON only as an array with the same ids and keys: id, title, summary.\n\n${JSON.stringify(uncached)}`,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text ?? response?.text;
  if (!rawText) throw new Error("Gemini returned an empty news translation.");

  const translated = JSON.parse(rawText);
  if (!Array.isArray(translated)) throw new Error("Gemini returned an invalid news translation.");

  translated.forEach((article) => {
    const original = uncached[article.id];
    if (!original || typeof article.title !== "string" || typeof article.summary !== "string") return;

    translationCache.set(cacheKey(original), {
      title: article.title,
      description: article.summary,
    });
  });

  return requested.map((article) => translationCache.get(cacheKey(article)) || {
    title: article.title,
    description: article.summary,
  });
}

module.exports = { translateNews };
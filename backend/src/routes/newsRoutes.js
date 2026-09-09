const express = require("express");
const { translateNews } = require("../services/newsTranslationService");

const router = express.Router();

router.post("/translate", async (req, res) => {
  const articles = req.body?.articles;

  if (!Array.isArray(articles) || articles.length > 8) {
    return res.status(400).json({ error: "articles must be an array of up to 8 items." });
  }

  const validArticles = articles.filter(
    (article) => article && typeof article.title === "string" && article.title.trim()
  );

  try {
    const translated = await translateNews(validArticles);
    return res.json({ articles: translated });
  } catch (error) {
    console.error("Failed to translate news:", error.message);
    return res.status(502).json({ error: "News translation is currently unavailable." });
  }
});

module.exports = router;
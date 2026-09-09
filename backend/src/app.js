const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("./auth/passport"); // configures passport strategies (side-effect)

const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authRoutes = require("./auth/authRoutes");
const newsRoutes = require("./routes/newsRoutes");

const app = express();

app.use(
  cors({
    origin:
      process.env.DASHBOARD_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Session middleware — must come before passport
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.json({
    message: "AI Saathi backend is running",
  });
});

// Auth routes (Google OAuth)
app.use("/auth", authRoutes);

// API routes
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/conversations", conversationRoutes);
app.use(
  "/api/conversations/:conversationId/messages",
  messageRoutes
);
app.use("/api/transactions", transactionRoutes);
app.use("/api/news", newsRoutes);

module.exports = app;
const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "AI Saathi backend is running",
  });
});


app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
module.exports = app;
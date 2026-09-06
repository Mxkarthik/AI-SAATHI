require("dotenv").config();

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);



const userRoutes = require("./routes/userRoutes");

const app = require("./app");
const connectDatabase = require("./config/database");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDatabase();

  app.listen(PORT, () => {
    console.log(`AI Saathi backend running on http://localhost:${PORT}`);
  });
};

startServer();
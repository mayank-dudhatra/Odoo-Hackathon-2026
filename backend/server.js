require("dotenv").config();

const express = require("express");
const { pool } = require("./db/pool");
const { initSchema } = require("./db/initSchema");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "PeoplePay360 backend is running!" });
});

app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS db_time");
    res.json({
      status: "ok",
      database: "connected",
      dbTime: result.rows[0].db_time,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: error.message,
    });
  }
});

async function startServer() {
  try {
    await pool.query("SELECT 1");
    await initSchema();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
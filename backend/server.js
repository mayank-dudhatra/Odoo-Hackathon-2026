require("dotenv").config();

const { pool } = require("./db/pool");
const { initSchema } = require("./db/initSchema");
const { createApp } = require("./src/app");

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await pool.query("SELECT 1");
    await initSchema();
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
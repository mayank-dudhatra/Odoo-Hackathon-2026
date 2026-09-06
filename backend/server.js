require("dotenv").config();

const { pool } = require("./db/pool");
const { initSchema } = require("./db/initSchema");
const { createApp } = require("./src/app");

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Pre-warm connection pool so incoming requests do not wait on cold TLS handshakes
    await Promise.all([
      pool.query("SELECT 1"),
      pool.query("SELECT 1"),
      pool.query("SELECT 1"),
    ]);
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
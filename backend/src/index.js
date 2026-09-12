require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const voteRoutes = require("./routes/votes");
const courtroomRoutes = require("./routes/courtroom");
const taskRoutes = require("./routes/tasks");
const { scanAndAdvance } = require("./services/stateMachine");
const { UPLOAD_DIR } = require("./services/storage");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "karmate-backend" }));

app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/reports", voteRoutes); // adds POST /api/reports/:id/votes
app.use("/api/reports", courtroomRoutes); // adds /:id/enter, /:id/chat
app.use("/api/tasks", taskRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error", message: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Karmate backend listening on http://localhost:${PORT}`);
  console.log(`Demo clock: ${process.env.DEMO_FAST_CLOCK !== "false" ? "FAST (minutes, not days)" : "REAL (days, per spec)"}`);
});

// Background job driving the report state machine (section 2). Also runs
// synchronously on relevant GET requests, so this timer just keeps things
// fresh even with no traffic.
setInterval(() => {
  try {
    scanAndAdvance();
  } catch (err) {
    console.error("[stateMachine] scan failed:", err);
  }
}, 10 * 1000);

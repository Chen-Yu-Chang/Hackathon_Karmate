const express = require("express");
const repo = require("../repo");
const { requireAuth } = require("../middleware/auth");
const { REVENGE_TYPES, DURATIONS_MS, COURT_ENTRY_FEE } = require("../constants");
const { scanAndAdvance } = require("../services/stateMachine");
const { payout } = require("../services/payments");
const { suggestRevenge } = require("../services/aiSuggestion");

const router = express.Router();

// GET /api/tasks  (4.3 Event Page: 任務大廳列表 — all reports in `revenging`,
// plus their existing revenge_tasks rows)
router.get("/", (req, res) => {
  scanAndAdvance();
  const reportList = repo.reports.listByStatuses(["revenging", "in_progress"]);
  const withTasks = reportList.map((r) => ({ ...r, revengeTasks: repo.tasks.listByReport(r.id) }));
  res.json(withTasks);
});

// GET /api/tasks/:reportId/suggest  (the "✨ Ask Gemini" box next to the
// revenge-method picker on the Event page — one AI-pitched idea per call,
// generated fresh from the report's description)
router.get("/:reportId/suggest", requireAuth, async (req, res) => {
  const report = repo.reports.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: "not_found" });
  if (!["revenging", "in_progress"].includes(report.status)) {
    return res.status(409).json({ error: "not_open_for_acceptance", status: report.status });
  }

  const suggestion = await suggestRevenge(report);
  res.json({ suggestion });
});

// POST /api/tasks/:reportId/accept  ("Accept Task" button)
// body: { revengeType, customDetails? }
router.post("/:reportId/accept", requireAuth, (req, res) => {
  const { revengeType, customDetails } = req.body || {};
  if (!REVENGE_TYPES.includes(revengeType)) {
    return res.status(400).json({ error: `revengeType must be one of ${REVENGE_TYPES.join(", ")}` });
  }

  const report = repo.reports.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: "not_found" });
  if (report.status !== "revenging") {
    return res.status(409).json({ error: "not_open_for_acceptance", status: report.status });
  }

  const { yes: yesVotes } = repo.votes.tally(report.id);
  // Reward pool = entry fees collected from the winning side (design choice,
  // documented in README — swap in whatever payout formula you prefer).
  const rewardAmount = Math.max(yesVotes, 1) * COURT_ENTRY_FEE;
  const deadline = new Date(Date.now() + DURATIONS_MS.REVENGE_WINDOW).toISOString();

  const acceptTxn = repo.raw.transaction(() => {
    const task = repo.tasks.create({
      reportId: report.id,
      hunterId: req.user.id,
      revengeType,
      customDetails: revengeType === "custom" ? customDetails : null,
      deadline,
      rewardAmount,
    });
    repo.reports.setStatus(report.id, "in_progress");
    return task;
  });

  const task = acceptTxn();
  res.status(201).json(task);
});

// POST /api/tasks/:taskId/submit  (modify1 §3: the hunter marks their own
// task done, before an admin confirms it)
router.post("/:taskId/submit", requireAuth, (req, res) => {
  const task = repo.tasks.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: "not_found" });
  if (task.hunterId !== req.user.id) {
    return res.status(403).json({ error: "not_your_task" });
  }
  if (task.status !== "in_progress") {
    return res.status(409).json({ error: "task_not_in_progress", status: task.status });
  }

  const updated = repo.tasks.setStatus(task.id, "pending_review");
  res.json(updated);
});

// POST /api/tasks/:taskId/complete  (admin/檢核機制確認 -> 發放獎勵金)
// Only reachable once the hunter has submitted (pending_review).
router.post("/:taskId/complete", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "admin_only" });
  }

  const task = repo.tasks.findById(req.params.taskId);
  if (!task) return res.status(404).json({ error: "not_found" });
  if (task.status !== "pending_review") {
    return res.status(409).json({ error: "task_not_pending_review", status: task.status });
  }

  const result = await payout(task.hunterId, task.rewardAmount, "revenge_task_completed");

  const completeTxn = repo.raw.transaction(() => {
    const updatedTask = repo.tasks.setStatus(task.id, "completed");
    repo.reports.setStatus(task.reportId, "completed");
    return updatedTask;
  });
  const updatedTask = completeTxn();

  res.json({ task: updatedTask, payout: result });
});

module.exports = router;

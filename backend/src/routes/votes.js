const express = require("express");
const repo = require("../repo");
const { requireAuth } = require("../middleware/auth");
const { scanAndAdvance } = require("../services/stateMachine");
const { checkAccess } = require("../services/courtroom");

const router = express.Router();

// POST /api/reports/:id/votes  (modify1 §4: voting inside the courtroom is
// free — the $0.5 fee is a one-time entry charge, see routes/courtroom.js)
// body: { voteChoice: boolean }  true = 支持復仇 (revenge), false = 反對
router.post("/:id/votes", requireAuth, async (req, res) => {
  scanAndAdvance();
  const { voteChoice } = req.body;
  if (typeof voteChoice !== "boolean") {
    return res.status(400).json({ error: "voteChoice must be boolean" });
  }

  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });
  if (report.status !== "court") {
    return res.status(409).json({ error: "not_open_for_voting", status: report.status });
  }
  if (report.courtEndsAt && new Date() > new Date(report.courtEndsAt)) {
    return res.status(409).json({ error: "voting_closed" });
  }

  const { seat, entered } = checkAccess(report, req.user.id);
  if (seat === "reporter" || seat === "business") {
    return res.status(403).json({ error: "parties_cannot_vote" });
  }
  if (!entered) {
    return res.status(402).json({ error: "must_enter_courtroom_first" });
  }

  const existing = repo.votes.findByReportAndVoter(report.id, req.user.id);
  if (existing) return res.status(409).json({ error: "already_voted" });

  const vote = repo.votes.create({
    reportId: report.id,
    voterId: req.user.id,
    amountPaid: 0,
    voteChoice,
  });

  const tally = repo.votes.tally(report.id);

  res.status(201).json({ vote, tally });
});

module.exports = router;

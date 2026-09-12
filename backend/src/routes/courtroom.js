// modify1 §4: pay-once-to-enter, then free voting + live chat.
const express = require("express");
const repo = require("../repo");
const { requireAuth } = require("../middleware/auth");
const { ensureEntry, checkAccess } = require("../services/courtroom");
const { synthesizeMessage } = require("../services/tts");
const { MESSAGE_KINDS } = require("../constants");

const router = express.Router();

// POST /api/reports/:id/enter — pay $0.5 to enter (free + automatic for
// the reporter and the appealing business).
router.post("/:id/enter", requireAuth, async (req, res) => {
  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });

  const { seat: existingSeat } = checkAccess(report, req.user.id);
  const isParty = existingSeat === "reporter" || existingSeat === "business";
  if (!isParty && report.status !== "court") {
    return res.status(409).json({ error: "room_not_open", status: report.status });
  }

  try {
    const result = await ensureEntry(report, req.user.id);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === "payment_failed") return res.status(402).json({ error: "payment_failed" });
    throw err;
  }
});

// GET /api/reports/:id/chat — chat + emoji history, visible to entrants only.
router.get("/:id/chat", requireAuth, (req, res) => {
  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });

  const { entered } = checkAccess(report, req.user.id);
  if (!entered) return res.status(403).json({ error: "not_entered" });

  res.json(repo.courtMessages.listByReport(report.id));
});

// POST /api/reports/:id/chat — { kind: 'text'|'emoji', content }
// text is reporter/business only; audience may only send emoji.
router.post("/:id/chat", requireAuth, (req, res) => {
  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });

  const { kind, content } = req.body || {};
  if (!MESSAGE_KINDS.includes(kind)) {
    return res.status(400).json({ error: `kind must be one of ${MESSAGE_KINDS.join(", ")}` });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "content is required" });
  }

  const { seat, entered } = checkAccess(report, req.user.id);
  if (!entered) return res.status(403).json({ error: "not_entered" });
  if (kind === "text" && seat === "audience") {
    return res.status(403).json({ error: "audience_can_only_send_emoji" });
  }

  const maxLen = kind === "text" ? 500 : 8;
  const message = repo.courtMessages.create({
    reportId: report.id,
    userId: req.user.id,
    seat,
    kind,
    content: content.trim().slice(0, maxLen),
  });

  res.status(201).json({ ...message, username: req.user.username });
});

// GET /api/reports/:id/messages/:messageId/speech — narrate one text chat
// message via ElevenLabs (returns raw audio/mpeg bytes). Only entrants can
// fetch it, same as the chat history itself. If ELEVENLABS_API_KEY isn't
// set, responds 501 { error: "tts_not_configured" } so the frontend
// narrator falls back to the browser's own speech synthesis instead of
// erroring out — see components/CourtNarrator.js.
router.get("/:id/messages/:messageId/speech", requireAuth, async (req, res) => {
  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });

  const { entered } = checkAccess(report, req.user.id);
  if (!entered) return res.status(403).json({ error: "not_entered" });

  const message = repo.courtMessages.findById(req.params.messageId);
  if (!message || message.reportId !== report.id) {
    return res.status(404).json({ error: "not_found" });
  }
  if (message.kind !== "text") {
    return res.status(400).json({ error: "only_text_messages_can_be_narrated" });
  }

  try {
    const { buffer, contentType } = await synthesizeMessage(message);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=3600");
    return res.send(buffer);
  } catch (err) {
    if (err.code === "not_configured") {
      return res.status(501).json({ error: "tts_not_configured" });
    }
    console.error("[tts] ElevenLabs call failed, no audio for this message:", err.message);
    return res.status(502).json({ error: "tts_failed" });
  }
});

module.exports = router;

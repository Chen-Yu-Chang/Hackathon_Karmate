const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const repo = require("../repo");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");
const { verifyMedia } = require("../services/aiVerification");
const { notifyBusiness } = require("../services/notifications");
const { UPLOAD_DIR, buildPublicUrl } = require("../services/storage");
const { scanAndAdvance } = require("../services/stateMachine");
const { checkAccess } = require("../services/courtroom");
const { generateAiTitle } = require("../services/aiTitle");
const { TARGET_TYPES, CHOICES, DURATIONS_MS } = require("../constants");

const router = express.Router();

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function withExtras(report, viewerId) {
  return {
    ...report,
    courtVotes: repo.votes.tally(report.id),
    revengeTasks: repo.tasks.listByReport(report.id),
    myAccess: viewerId ? checkAccess(report, viewerId) : { seat: null, entered: false },
  };
}

// GET /api/reports  (general listing, optional ?status=)
router.get("/", optionalAuth, (req, res) => {
  scanAndAdvance();
  const { status } = req.query;
  const list = repo.reports.list({ status }).map((r) => withExtras(r, req.user?.id));
  res.json(list);
});

// GET /api/reports/:id
router.get("/:id", optionalAuth, (req, res) => {
  scanAndAdvance();
  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });
  res.json(withExtras(report, req.user?.id));
});

// POST /api/reports  (4.1 Upload Page backend logic)
// multipart/form-data: media (files[]), targetType, targetName, targetContact,
// description, choice
router.post("/", requireAuth, upload.array("media", 6), async (req, res) => {
  // modify1 §2: business accounts respond to reports, they don't file them.
  if (req.user.role === "business") {
    return res.status(403).json({ error: "business_accounts_cannot_file_reports" });
  }

  const { targetType, targetName, targetContact, description, choice } = req.body;

  if (!TARGET_TYPES.includes(targetType)) {
    return res.status(400).json({ error: `targetType must be one of ${TARGET_TYPES.join(", ")}` });
  }
  if (!CHOICES.includes(choice)) {
    return res.status(400).json({ error: `choice must be one of ${CHOICES.join(", ")}` });
  }
  if (!targetName || !targetContact || !description) {
    return res.status(400).json({ error: "targetName, targetContact and description are required" });
  }

  const mediaUrls = (req.files || []).map((f) => buildPublicUrl(f.filename));

  // Backend logic: call AI image verification API before persisting.
  const verification = await verifyMedia(mediaUrls);

  const appealDeadline = new Date(Date.now() + DURATIONS_MS.APPEAL_WINDOW).toISOString();

  // Generate the clickable headline from the description right away — this
  // is what calls Gemini (falls back to a local template if GEMINI_API_KEY
  // is unset or the call fails), so it's ready as soon as the report exists
  // instead of waiting for a business to appeal it into court.
  const aiTitle = await generateAiTitle({ targetName, description, choice });

  const report = repo.reports.create({
    userId: req.user.id,
    targetType,
    targetName,
    targetContact,
    description,
    mediaUrls,
    isAiVerified: verification.isAiVerified,
    choice,
    appealDeadline,
    aiTitle,
  });

  // Notify the reported business + start the 3-day appeal countdown.
  await notifyBusiness(report);

  res.status(201).json({ report: withExtras(report, req.user.id), verification });
});

// POST /api/reports/:id/appeal  (business appeals within the window -> court)
// modify1 §1: only business accounts can act as the appellant — this is
// also how the Court Room later knows which logged-in user is "the
// business owner being reported" (reports.appealed_by_user_id).
router.post("/:id/appeal", requireAuth, requireRole("business"), async (req, res) => {
  const report = repo.reports.findById(req.params.id);
  if (!report) return res.status(404).json({ error: "not_found" });
  if (report.status !== "pending") {
    return res.status(409).json({ error: "report_not_appealable", status: report.status });
  }
  if (report.appealDeadline && new Date() > new Date(report.appealDeadline)) {
    return res.status(409).json({ error: "appeal_window_closed" });
  }

  const courtEndsAt = new Date(Date.now() + DURATIONS_MS.COURT_WINDOW).toISOString();
  // The headline was already generated when the report was filed; only
  // backfill it here for older rows that predate that (e.g. seeded data
  // that skips this route entirely).
  const aiTitle = report.aiTitle || (await generateAiTitle(report));

  const updated = repo.reports.appeal(report.id, { courtEndsAt, aiTitle, appealedByUserId: req.user.id });
  res.json(withExtras(updated, req.user.id));
});

module.exports = router;

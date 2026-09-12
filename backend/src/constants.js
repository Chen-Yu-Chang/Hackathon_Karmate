// Enum-like value sets from TDD section 3. SQLite has no native ENUM
// type, so we validate against these lists in application code instead.

const TARGET_TYPES = ["hotel_enterprise", "hotel_individual", "driver"];
const CHOICES = ["cash_back", "revenge"];
const REPORT_STATUSES = [
  "pending",
  "court",
  "revenging",
  "in_progress",
  "completed",
  "rejected",
];
const REVENGE_TYPES = [
  "fake_tv_interview",
  "russian_doll",
  "paintball",
  "driver_cancel",
  "custom",
];
// modify1 §3: pending_review sits between in_progress and completed — the
// hunter marks their own work done, then an admin confirms + pays out.
const TASK_STATUSES = ["open", "in_progress", "pending_review", "completed"];
const ROLES = ["normal", "business", "hunter", "admin"];

// modify1 §4: who's in a courtroom. reporter/business are the two parties
// in the case (auto-entered, can send text chat); everyone else is a
// paying audience member (emoji-only).
const COURT_SEATS = ["reporter", "business", "audience"];
const MESSAGE_KINDS = ["text", "emoji"];

// Demo clock: when DEMO_FAST_CLOCK=true, the 3-day/24h/7-day windows from
// the TDD are compressed to minutes so the state machine can be watched
// transitioning live in the UI. Set to false (or unset) to use the real
// spec durations.
const FAST = process.env.DEMO_FAST_CLOCK !== "false";

const DURATIONS_MS = FAST
  ? {
      APPEAL_WINDOW: 5 * 60 * 1000, // 3 min stands in for 3 days
      COURT_WINDOW: 60 * 60 * 1000, // 1 min stands in for 24h
      REVENGE_WINDOW: 10 * 60 * 1000, // 5 min stands in for 7 days
    }
  : {
      APPEAL_WINDOW: 3 * 24 * 60 * 60 * 1000,
      COURT_WINDOW: 24 * 60 * 60 * 1000,
      REVENGE_WINDOW: 7 * 24 * 60 * 60 * 1000,
    };

const COURT_ENTRY_FEE = 0.5;

module.exports = {
  TARGET_TYPES,
  CHOICES,
  REPORT_STATUSES,
  REVENGE_TYPES,
  TASK_STATUSES,
  ROLES,
  COURT_SEATS,
  MESSAGE_KINDS,
  DURATIONS_MS,
  COURT_ENTRY_FEE,
};

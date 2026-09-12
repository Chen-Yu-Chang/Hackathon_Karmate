// Court Room access rules (modify1 §4).
//
// Every case has two "parties": the reporter (who filed it) and the
// business (whoever appealed it — recorded on reports.appealed_by_user_id
// at appeal time). Everyone else is paying "audience".
//
// Parties are auto-entered for free and may send text chat + emoji.
// Audience must pay the one-time $0.5 entry fee (court_entries) before
// they can see the chat history or vote; once in, they may only send
// emoji, never text.

const repo = require("../repo");
const { chargeCourtEntryFee } = require("./payments");
const { COURT_ENTRY_FEE } = require("../constants");

function partySeat(report, userId) {
  if (!userId) return null;
  if (report.userId === userId) return "reporter";
  if (report.appealedByUserId && report.appealedByUserId === userId) return "business";
  return null;
}

// Returns { seat, entered } for a user against a report, without creating
// anything — safe to call to just check status.
function checkAccess(report, userId) {
  const party = partySeat(report, userId);
  if (party) return { seat: party, entered: true };
  const entry = repo.courtEntries.findByReportAndUser(report.id, userId);
  if (entry) return { seat: "audience", entered: true };
  return { seat: null, entered: false };
}

// Ensures the user has an entry, charging the audience fee if needed.
// Idempotent — safe to call even if already entered. Parties (reporter /
// business) never need a stored entry row — their seat is derived
// directly from the report — so this is a no-op charge-wise for them.
async function ensureEntry(report, userId) {
  const party = partySeat(report, userId);
  if (party) return { seat: party, entry: null, charged: false };

  const existing = repo.courtEntries.findByReportAndUser(report.id, userId);
  if (existing) return { seat: "audience", entry: existing, charged: false };

  const charge = await chargeCourtEntryFee(userId, COURT_ENTRY_FEE);
  if (!charge.success) {
    const err = new Error("payment_failed");
    err.code = "payment_failed";
    throw err;
  }
  const entry = repo.courtEntries.create({
    reportId: report.id,
    userId,
    seat: "audience",
    amountPaid: COURT_ENTRY_FEE,
  });
  return { seat: "audience", entry, charge, charged: true };
}

module.exports = { partySeat, checkAccess, ensureEntry };

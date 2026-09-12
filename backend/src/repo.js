// Thin data-access layer over better-sqlite3 (synchronous). Centralizing
// the SQL here keeps route handlers readable and keeps row<->JSON shaping
// (booleans, JSON-array columns, camelCase) in one place.
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

function toReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    targetType: row.target_type,
    targetName: row.target_name,
    targetContact: row.target_contact,
    description: row.description,
    mediaUrls: JSON.parse(row.media_urls || "[]"),
    isAiVerified: !!row.is_ai_verified,
    choice: row.choice,
    status: row.status,
    aiTitle: row.ai_title,
    appealDeadline: row.appeal_deadline,
    courtEndsAt: row.court_ends_at,
    appealedByUserId: row.appealed_by_user_id,
    createdAt: row.created_at,
  };
}

function toEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    seat: row.seat,
    amountPaid: row.amount_paid,
    createdAt: row.created_at,
  };
}

function toMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    seat: row.seat,
    kind: row.kind,
    content: row.content,
    createdAt: row.created_at,
  };
}

function toVote(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportId: row.report_id,
    voterId: row.voter_id,
    amountPaid: row.amount_paid,
    voteChoice: !!row.vote_choice,
    createdAt: row.created_at,
  };
}

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    reportId: row.report_id,
    hunterId: row.hunter_id,
    revengeType: row.revenge_type,
    customDetails: row.custom_details,
    status: row.status,
    deadline: row.deadline,
    rewardAmount: row.reward_amount,
    createdAt: row.created_at,
  };
}

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    ssnEnc: row.ssn_enc,
    bankAccountEnc: row.bank_account_enc,
    role: row.role,
    createdAt: row.created_at,
  };
}

// ---- users ----
const users = {
  create({ username, email, passwordHash, role, ssnEnc, bankAccountEnc }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, role, ssn_enc, bank_account_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, username, email, passwordHash, role || "normal", ssnEnc || null, bankAccountEnc || null);
    return users.findById(id);
  },
  findById(id) {
    return toUser(db.prepare("SELECT * FROM users WHERE id = ?").get(id));
  },
  findByUsername(username) {
    return toUser(db.prepare("SELECT * FROM users WHERE username = ?").get(username));
  },
  findByUsernameOrEmail(username, email) {
    return toUser(
      db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(username, email)
    );
  },
};

// ---- reports ----
const reports = {
  create({ userId, targetType, targetName, targetContact, description, mediaUrls, isAiVerified, choice, appealDeadline, aiTitle }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO reports (id, user_id, target_type, target_name, target_contact, description, media_urls, is_ai_verified, choice, status, appeal_deadline, ai_title)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).run(
      id,
      userId,
      targetType,
      targetName,
      targetContact,
      description,
      JSON.stringify(mediaUrls || []),
      isAiVerified ? 1 : 0,
      choice,
      appealDeadline,
      aiTitle || null
    );
    return reports.findById(id);
  },
  findById(id) {
    return toReport(db.prepare("SELECT * FROM reports WHERE id = ?").get(id));
  },
  list({ status } = {}) {
    const rows = status
      ? db.prepare("SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC").all(status)
      : db.prepare("SELECT * FROM reports ORDER BY created_at DESC").all();
    return rows.map(toReport);
  },
  listByStatuses(statuses) {
    const placeholders = statuses.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT * FROM reports WHERE status IN (${placeholders}) ORDER BY created_at DESC`)
      .all(...statuses);
    return rows.map(toReport);
  },
  setStatus(id, status) {
    db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, id);
    return reports.findById(id);
  },
  appeal(id, { courtEndsAt, aiTitle, appealedByUserId }) {
    db.prepare(
      "UPDATE reports SET status = 'court', court_ends_at = ?, ai_title = ?, appealed_by_user_id = ? WHERE id = ?"
    ).run(courtEndsAt, aiTitle, appealedByUserId, id);
    return reports.findById(id);
  },
  expiredPending(nowIso) {
    return db
      .prepare("SELECT * FROM reports WHERE status = 'pending' AND appeal_deadline <= ?")
      .all(nowIso)
      .map(toReport);
  },
  expiredCourt(nowIso) {
    return db
      .prepare("SELECT * FROM reports WHERE status = 'court' AND court_ends_at <= ?")
      .all(nowIso)
      .map(toReport);
  },
};

// ---- court_votes ----
const votes = {
  create({ reportId, voterId, amountPaid, voteChoice }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO court_votes (id, report_id, voter_id, amount_paid, vote_choice) VALUES (?, ?, ?, ?, ?)`
    ).run(id, reportId, voterId, amountPaid, voteChoice ? 1 : 0);
    return toVote(db.prepare("SELECT * FROM court_votes WHERE id = ?").get(id));
  },
  findByReportAndVoter(reportId, voterId) {
    return toVote(
      db
        .prepare("SELECT * FROM court_votes WHERE report_id = ? AND voter_id = ?")
        .get(reportId, voterId)
    );
  },
  listByReport(reportId) {
    return db
      .prepare("SELECT * FROM court_votes WHERE report_id = ?")
      .all(reportId)
      .map(toVote);
  },
  tally(reportId) {
    const rows = votes.listByReport(reportId);
    const yes = rows.filter((v) => v.voteChoice).length;
    const no = rows.filter((v) => !v.voteChoice).length;
    return { yes, no };
  },
};

// ---- court_entries (modify1 §4: pay-once-to-enter) ----
const courtEntries = {
  create({ reportId, userId, seat, amountPaid }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO court_entries (id, report_id, user_id, seat, amount_paid) VALUES (?, ?, ?, ?, ?)`
    ).run(id, reportId, userId, seat, amountPaid || 0);
    return toEntry(db.prepare("SELECT * FROM court_entries WHERE id = ?").get(id));
  },
  findByReportAndUser(reportId, userId) {
    return toEntry(
      db.prepare("SELECT * FROM court_entries WHERE report_id = ? AND user_id = ?").get(reportId, userId)
    );
  },
  countByReport(reportId) {
    return db.prepare("SELECT COUNT(*) as n FROM court_entries WHERE report_id = ?").get(reportId).n;
  },
};

// ---- court_messages (modify1 §4: live chat + emoji, visible to entrants) ----
const courtMessages = {
  create({ reportId, userId, seat, kind, content }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO court_messages (id, report_id, user_id, seat, kind, content) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, reportId, userId, seat, kind, content);
    return toMessage(db.prepare("SELECT * FROM court_messages WHERE id = ?").get(id));
  },
  findById(id) {
    return toMessage(db.prepare("SELECT * FROM court_messages WHERE id = ?").get(id));
  },
  listByReport(reportId) {
    return db
      .prepare(
        `SELECT m.*, u.username as username FROM court_messages m
         JOIN users u ON u.id = m.user_id
         WHERE m.report_id = ? ORDER BY m.created_at ASC`
      )
      .all(reportId)
      .map((row) => ({ ...toMessage(row), username: row.username }));
  },
};

// ---- revenge_tasks ----
const tasks = {
  create({ reportId, hunterId, revengeType, customDetails, deadline, rewardAmount }) {
    const id = uuidv4();
    db.prepare(
      `INSERT INTO revenge_tasks (id, report_id, hunter_id, revenge_type, custom_details, status, deadline, reward_amount)
       VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?)`
    ).run(id, reportId, hunterId, revengeType, customDetails || null, deadline, rewardAmount);
    return toTask(db.prepare("SELECT * FROM revenge_tasks WHERE id = ?").get(id));
  },
  findById(id) {
    return toTask(db.prepare("SELECT * FROM revenge_tasks WHERE id = ?").get(id));
  },
  listByReport(reportId) {
    return db.prepare("SELECT * FROM revenge_tasks WHERE report_id = ?").all(reportId).map(toTask);
  },
  setStatus(id, status) {
    db.prepare("UPDATE revenge_tasks SET status = ? WHERE id = ?").run(status, id);
    return tasks.findById(id);
  },
  overdueInProgress(nowIso) {
    return db
      .prepare("SELECT * FROM revenge_tasks WHERE status = 'in_progress' AND deadline <= ?")
      .all(nowIso)
      .map(toTask);
  },
};

module.exports = { users, reports, votes, tasks, courtEntries, courtMessages, raw: db };

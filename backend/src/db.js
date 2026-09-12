const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const DB_PATH =
  process.env.DATABASE_FILE || path.join(__dirname, "..", "data", "karmate.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
db.exec(schema);

// Lightweight migration for databases created before modify1: adds the
// column powering the Court Room's reporter/business seat lookup.
// CREATE TABLE IF NOT EXISTS (above) can't retrofit an existing table.
const reportsColumns = db.prepare("PRAGMA table_info(reports)").all().map((c) => c.name);
if (!reportsColumns.includes("appealed_by_user_id")) {
  db.exec("ALTER TABLE reports ADD COLUMN appealed_by_user_id TEXT REFERENCES users(id)");
}

module.exports = db;

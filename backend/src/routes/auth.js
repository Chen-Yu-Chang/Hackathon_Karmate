const express = require("express");
const bcrypt = require("bcryptjs");
const repo = require("../repo");
const { sign, requireAuth } = require("../middleware/auth");
const { encryptField } = require("../services/crypto");
const { ROLES } = require("../constants");

const router = express.Router();

// POST /api/auth/register
// body: { username, email, password, role?, ssn?, bankAccount? }
router.post("/register", async (req, res) => {
  const { username, email, password, role, ssn, bankAccount } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }
  if (role && !ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${ROLES.join(", ")}` });
  }
  const existing = repo.users.findByUsernameOrEmail(username, email);
  if (existing) return res.status(409).json({ error: "username_or_email_taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = repo.users.create({
    username,
    email,
    passwordHash,
    role: role || "normal",
    ssnEnc: encryptField(ssn),
    bankAccountEnc: encryptField(bankAccount),
  });
  const token = sign(user);
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = repo.users.findByUsername(username);
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await bcrypt.compare(password || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });
  const token = sign(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  const user = repo.users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "not_found" });
  res.json({ id: user.id, username: user.username, email: user.email, role: user.role });
});

module.exports = router;

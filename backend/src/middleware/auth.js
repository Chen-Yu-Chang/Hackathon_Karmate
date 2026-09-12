const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function sign(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "missing_token" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

// Doesn't reject if no token — just attaches req.user when present.
// Useful for endpoints that are readable anonymously but behave
// differently for a logged-in voter/hunter.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET);
    } catch (err) {
      /* ignore invalid token for optional auth */
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "missing_token" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden", requiredRoles: roles });
    }
    next();
  };
}

module.exports = { sign, requireAuth, optionalAuth, requireRole };

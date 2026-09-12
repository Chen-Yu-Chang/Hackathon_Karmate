// Field-level AES-256-GCM encryption for sensitive columns (SSN, bank
// account), per TDD section 5: "必須使用 AES-256 進行欄位級加密".
const crypto = require("crypto");

const KEY = Buffer.from(
  process.env.FIELD_ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd",
  "hex"
);

function encryptField(plaintext) {
  if (plaintext == null || plaintext === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plaintext), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // pack iv + authTag + ciphertext as base64 for storage in a single column
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

function decryptField(packed) {
  if (!packed) return null;
  const buf = Buffer.from(packed, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// One-way hash used where we only ever need to compare, never recover
// (e.g. an "ssn_hash" style uniqueness/anti-fraud check).
function hashField(plaintext) {
  if (!plaintext) return null;
  return crypto.createHash("sha256").update(String(plaintext)).digest("hex");
}

module.exports = { encryptField, decryptField, hashField };

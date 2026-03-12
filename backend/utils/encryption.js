/**
 * AES-256-GCM encryption using Node's native crypto module.
 *
 * Improvements over the previous CryptoJS implementation:
 *  - Authenticated encryption (GCM) — detects tampering automatically
 *  - Random IV per message — same plaintext → different ciphertext every time
 *  - Native crypto is significantly faster than CryptoJS (no JS overhead)
 *  - Key derived via scrypt — safe regardless of secret string length
 *
 * Wire format (all hex, colon-separated): iv:authTag:ciphertext
 * Backwards compat: legacy CryptoJS base64 entries are detected and re-decrypted.
 */
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = "daydream-journal-v2";

let _cachedKey = null;
const getDerivedKey = () => {
  if (_cachedKey) return _cachedKey;
  const secret = process.env.JOURNAL_ENCRYPTION_KEY;
  if (!secret) throw new Error("JOURNAL_ENCRYPTION_KEY env variable is required");
  _cachedKey = crypto.scryptSync(secret, SALT, KEY_LENGTH);
  return _cachedKey;
};

const encrypt = (text) => {
  if (!text) return "";
  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

const decrypt = (encryptedText) => {
  if (!encryptedText) return "";

  // Detect legacy CryptoJS format (base64, no colons)
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    try {
      const CryptoJS = require("crypto-js");
      const legacyKey = process.env.JOURNAL_ENCRYPTION_KEY || "fallback_key_change_in_production!";
      const bytes = CryptoJS.AES.decrypt(encryptedText, legacyKey);
      return bytes.toString(CryptoJS.enc.Utf8) || "";
    } catch {
      return "";
    }
  }

  try {
    const key = getDerivedKey();
    const [ivHex, authTagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    return decipher.update(Buffer.from(dataHex, "hex")).toString("utf8") + decipher.final("utf8");
  } catch (error) {
    console.error("Decryption error:", error.message);
    return "";
  }
};

module.exports = { encrypt, decrypt };

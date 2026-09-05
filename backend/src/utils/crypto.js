const crypto = require("crypto");

function generateRandomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

module.exports = { generateRandomToken, hashToken };

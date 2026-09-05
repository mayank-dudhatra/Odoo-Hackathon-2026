const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { generateRandomToken } = require("./crypto");

function signAccessToken(payload) {
  return jwt.sign(payload, env.accessTokenSecret, {
    expiresIn: env.accessTokenTtl,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.accessTokenSecret);
}

function generateRefreshToken() {
  // Opaque refresh token to avoid exposing session structure.
  return generateRandomToken(64);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
};

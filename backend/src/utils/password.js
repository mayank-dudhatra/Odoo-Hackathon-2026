const bcrypt = require("bcryptjs");
const { env } = require("../config/env");

const crypto = require("crypto");

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, env.bcryptRounds);
}

async function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

function generateTemporaryPassword(length = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

module.exports = { hashPassword, verifyPassword, generateTemporaryPassword };

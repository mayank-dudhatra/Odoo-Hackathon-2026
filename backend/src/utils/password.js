const bcrypt = require("bcryptjs");
const { env } = require("../config/env");

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, env.bcryptRounds);
}

async function verifyPassword(plainTextPassword, passwordHash) {
  return bcrypt.compare(plainTextPassword, passwordHash);
}

module.exports = { hashPassword, verifyPassword };

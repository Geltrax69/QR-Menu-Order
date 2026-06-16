"use strict";
const crypto = require("crypto");

/* Password hashing with scrypt (built-in, no external deps). */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(test, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function newToken() {
  return crypto.randomBytes(24).toString("hex");
}

/* A short, readable temporary password e.g. "amber-fox-3920". */
const WORDS = [
  "amber", "fox", "river", "spice", "ember", "mint", "saffron", "basil",
  "mango", "coral", "olive", "honey", "clove", "pepper", "lotus", "cedar",
];
function readablePassword() {
  const w = () => WORDS[crypto.randomInt(WORDS.length)];
  return `${w()}-${w()}-${100 + crypto.randomInt(900)}`;
}

/* URL-safe slug from a restaurant name. */
function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "restaurant";
}

module.exports = { hashPassword, verifyPassword, newToken, readablePassword, slugify };

"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { hashPassword, slugify } = require("./auth");
const seed = require("./seed");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let db;

function load() {
  if (db) return db;
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } else {
    db = firstRunSeed();
    save();
  }
  return db;
}

function save() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function id(prefix) {
  return prefix + "_" + crypto.randomBytes(6).toString("hex");
}

/* Build the very first database: one admin + the demo restaurant/owner. */
function firstRunSeed() {
  const adminPass = hashPassword("admin123");
  const ownerPass = hashPassword("owner123");

  const restaurantId = id("rest");
  const ownerId = id("ownr");

  const fresh = {
    admins: [
      {
        id: id("adm"),
        email: "admin@restaurantos.app",
        salt: adminPass.salt,
        hash: adminPass.hash,
        createdAt: Date.now(),
      },
    ],
    owners: [
      {
        id: ownerId,
        email: "owner@tandoori.app",
        salt: ownerPass.salt,
        hash: ownerPass.hash,
        restaurantId,
        createdAt: Date.now(),
        // tempPassword kept only so the admin can re-show it; cleared on first owner login.
        tempPassword: "owner123",
      },
    ],
    restaurants: [
      {
        id: restaurantId,
        slug: "tandoori-tales",
        ownerId,
        name: seed.SEED_RESTAURANT.name,
        handle: seed.SEED_RESTAURANT.handle,
        bio: seed.SEED_RESTAURANT.bio,
        logo: seed.SEED_RESTAURANT.logo,
        tables: seed.SEED_RESTAURANT.tables,
        promo: seed.SEED_RESTAURANT.promo,
        categories: seed.SEED_CATEGORIES.map((c) => ({ ...c })),
        menu: seed.SEED_MENU.map((m) => ({ ...m })),
        createdAt: Date.now(),
      },
    ],
    sessions: {},
  };
  return fresh;
}

/* ---- lookups ---- */
const findAdminByEmail = (email) =>
  load().admins.find((a) => a.email.toLowerCase() === String(email).toLowerCase());
const findOwnerByEmail = (email) =>
  load().owners.find((o) => o.email.toLowerCase() === String(email).toLowerCase());
const findOwnerById = (oid) => load().owners.find((o) => o.id === oid);
const findRestaurantBySlug = (slug) => load().restaurants.find((r) => r.slug === slug);
const findRestaurantById = (rid) => load().restaurants.find((r) => r.id === rid);
const findRestaurantByOwner = (oid) => load().restaurants.find((r) => r.ownerId === oid);

/* Ensure a slug is unique by suffixing -2, -3, … */
function uniqueSlug(name) {
  const base = slugify(name);
  let s = base;
  let n = 2;
  while (findRestaurantBySlug(s)) s = `${base}-${n++}`;
  return s;
}

module.exports = {
  load, save, id,
  findAdminByEmail, findOwnerByEmail, findOwnerById,
  findRestaurantBySlug, findRestaurantById, findRestaurantByOwner,
  uniqueSlug,
};

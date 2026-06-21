"use strict";
/* ===========================================================
   RestaurantOS server
   - Admin panel  : create restaurant-owner accounts
   - Owner panel  : manage restaurant, categories, menu, tables
   - Customer site: /r/:slug  (the Instagram-themed ordering UI)
   JSON file store + scrypt auth. Single dependency: express.
   =========================================================== */
const express = require("express");
const path = require("path");
const os = require("os");
const db = require("./server/db");
const { hashPassword, verifyPassword, newToken, readablePassword } = require("./server/auth");

const app = express();
const PORT = process.env.PORT || 4173;
const ROOT = __dirname;

app.use(express.json({ limit: "1mb" }));

/* ---------------- cookies & sessions ---------------- */
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function createSession(role, userId) {
  const token = newToken();
  const data = db.load();
  data.sessions[token] = { role, userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 };
  db.save();
  return token;
}
function sessionFrom(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const data = db.load();
  const s = data.sessions[token];
  if (!s) return null;
  if (s.exp < Date.now()) {
    delete data.sessions[token];
    db.save();
    return null;
  }
  return { token, ...s };
}
function setSessionCookie(res, token) {
  res.cookie("sid", token, { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30 });
}
function requireAdmin(req, res, next) {
  const s = sessionFrom(req);
  if (!s || s.role !== "admin") return res.status(401).json({ error: "Not signed in as admin" });
  req.session = s;
  next();
}
function requireOwner(req, res, next) {
  const s = sessionFrom(req);
  if (!s || s.role !== "owner") return res.status(401).json({ error: "Not signed in as owner" });
  req.owner = db.findOwnerById(s.userId);
  req.restaurant = db.findRestaurantByOwner(s.userId);
  if (!req.owner || !req.restaurant) return res.status(401).json({ error: "Account not found" });
  next();
}

/* ---------------- normalizers ---------------- */
function cleanItem(input, prev = {}) {
  const av = ["available", "limited", "out"].includes(input.availability)
    ? input.availability
    : prev.availability || "available";
  return {
    id: prev.id || db.id("item"),
    name: String(input.name || prev.name || "Untitled").slice(0, 80),
    cat: String(input.cat || prev.cat || ""),
    price: Math.max(0, Math.round(Number(input.price) || prev.price || 0)),
    prep: Math.max(0, Math.round(Number(input.prep) || prev.prep || 10)),
    veg: input.veg === undefined ? (prev.veg ?? true) : !!input.veg,
    spicy: input.spicy === undefined ? (prev.spicy ?? false) : !!input.spicy,
    availability: av,
    badges: Array.isArray(input.badges)
      ? input.badges.filter((b) => typeof b === "string").slice(0, 3)
      : prev.badges || [],
    image: String(input.image || prev.image || "").slice(0, 600),
    desc: String(input.desc || prev.desc || "").slice(0, 400),
    rating: prev.rating || 4.5,
    likes: prev.likes || Math.floor(100 + Math.random() * 900),
    pairs: Array.isArray(input.pairs) ? input.pairs : prev.pairs || [],
  };
}
function publicRestaurant(r) {
  return {
    slug: r.slug,
    name: r.name,
    handle: r.handle,
    bio: r.bio,
    logo: r.logo,
    tables: r.tables,
    promo: r.promo || null,
    categories: r.categories,
    menu: r.menu,
  };
}

/* =========================================================
   AUTH
   ========================================================= */
app.post("/api/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const admin = db.findAdminByEmail(email);
  if (admin && verifyPassword(password, admin.salt, admin.hash)) {
    setSessionCookie(res, createSession("admin", admin.id));
    return res.json({ role: "admin", redirect: "/admin" });
  }
  const owner = db.findOwnerByEmail(email);
  if (owner && verifyPassword(password, owner.salt, owner.hash)) {
    // first successful login clears the admin-visible temp password
    if (owner.tempPassword) {
      owner.tempPassword = null;
      db.save();
    }
    setSessionCookie(res, createSession("owner", owner.id));
    return res.json({ role: "owner", redirect: "/owner" });
  }
  return res.status(401).json({ error: "Wrong email or password" });
});

app.post("/api/logout", (req, res) => {
  const s = sessionFrom(req);
  if (s) {
    delete db.load().sessions[s.token];
    db.save();
  }
  res.clearCookie("sid");
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const s = sessionFrom(req);
  if (!s) return res.json({ role: null });
  if (s.role === "owner") {
    const r = db.findRestaurantByOwner(s.userId);
    return res.json({ role: "owner", slug: r && r.slug });
  }
  res.json({ role: s.role });
});

/* =========================================================
   ADMIN
   ========================================================= */
app.get("/api/admin/owners", requireAdmin, (req, res) => {
  const data = db.load();
  const owners = data.owners.map((o) => {
    const r = db.findRestaurantByOwner(o.id) || {};
    return {
      id: o.id,
      email: o.email,
      createdAt: o.createdAt,
      tempPassword: o.tempPassword || null,
      restaurant: { name: r.name, slug: r.slug, tables: r.tables, items: (r.menu || []).length },
    };
  });
  res.json({ owners });
});

app.post("/api/admin/owners", requireAdmin, (req, res) => {
  const { restaurantName, ownerEmail } = req.body || {};
  if (!restaurantName || !ownerEmail)
    return res.status(400).json({ error: "Restaurant name and owner email are required" });
  if (db.findOwnerByEmail(ownerEmail) || db.findAdminByEmail(ownerEmail))
    return res.status(409).json({ error: "That email is already in use" });

  const data = db.load();
  const password = readablePassword();
  const ph = hashPassword(password);
  const ownerId = db.id("ownr");
  const restaurantId = db.id("rest");
  const slug = db.uniqueSlug(restaurantName);

  data.owners.push({
    id: ownerId,
    email: String(ownerEmail).trim(),
    salt: ph.salt,
    hash: ph.hash,
    restaurantId,
    createdAt: Date.now(),
    tempPassword: password,
  });
  data.restaurants.push({
    id: restaurantId,
    slug,
    ownerId,
    name: String(restaurantName).trim(),
    handle: slug.replace(/-/g, ""),
    bio: "Freshly added on RestaurantOS",
    logo: `https://picsum.photos/seed/${slug}/200/200`,
    tables: 10,
    promo: null,
    categories: [],
    menu: [],
    createdAt: Date.now(),
  });
  db.save();

  res.json({
    ok: true,
    owner: { email: ownerEmail, password, slug, path: "/r/" + slug, restaurantName },
  });
});

app.post("/api/admin/owners/:id/reset-password", requireAdmin, (req, res) => {
  const owner = db.findOwnerById(req.params.id);
  if (!owner) return res.status(404).json({ error: "Owner not found" });
  const password = readablePassword();
  const ph = hashPassword(password);
  owner.salt = ph.salt;
  owner.hash = ph.hash;
  owner.tempPassword = password;
  db.save();
  res.json({ ok: true, password });
});

app.delete("/api/admin/owners/:id", requireAdmin, (req, res) => {
  const data = db.load();
  const owner = db.findOwnerById(req.params.id);
  if (!owner) return res.status(404).json({ error: "Owner not found" });
  data.owners = data.owners.filter((o) => o.id !== owner.id);
  data.restaurants = data.restaurants.filter((r) => r.ownerId !== owner.id);
  db.save();
  res.json({ ok: true });
});

/* =========================================================
   OWNER
   ========================================================= */
app.get("/api/owner/restaurant", requireOwner, (req, res) => {
  res.json({ restaurant: req.restaurant, email: req.owner.email });
});

app.put("/api/owner/restaurant", requireOwner, (req, res) => {
  const r = req.restaurant;
  const b = req.body || {};
  if (b.name !== undefined) r.name = String(b.name).slice(0, 80);
  if (b.handle !== undefined) r.handle = String(b.handle).replace(/[^a-z0-9._]/gi, "").slice(0, 30);
  if (b.bio !== undefined) r.bio = String(b.bio).slice(0, 160);
  if (b.logo !== undefined) r.logo = String(b.logo).slice(0, 600);
  if (b.tables !== undefined) r.tables = Math.max(1, Math.min(500, Math.round(Number(b.tables) || 1)));
  if (b.promo !== undefined) {
    r.promo = b.promo
      ? {
          tag: String(b.promo.tag || "").slice(0, 40),
          title: String(b.promo.title || "").slice(0, 120),
          image: String(b.promo.image || "").slice(0, 600),
        }
      : null;
  }
  db.save();
  res.json({ ok: true, restaurant: r });
});

/* categories */
app.post("/api/owner/categories", requireOwner, (req, res) => {
  const label = String((req.body || {}).label || "").trim();
  if (!label) return res.status(400).json({ error: "Category name required" });
  const r = req.restaurant;
  let base = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "cat";
  let cid = base, n = 2;
  while (r.categories.some((c) => c.id === cid)) cid = `${base}-${n++}`;
  r.categories.push({ id: cid, label });
  db.save();
  res.json({ ok: true, category: { id: cid, label } });
});

app.put("/api/owner/categories/:id", requireOwner, (req, res) => {
  const c = req.restaurant.categories.find((c) => c.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Category not found" });
  c.label = String((req.body || {}).label || c.label).slice(0, 40);
  db.save();
  res.json({ ok: true, category: c });
});

app.delete("/api/owner/categories/:id", requireOwner, (req, res) => {
  const r = req.restaurant;
  r.categories = r.categories.filter((c) => c.id !== req.params.id);
  // detach items in that category
  r.menu.forEach((m) => { if (m.cat === req.params.id) m.cat = ""; });
  db.save();
  res.json({ ok: true });
});

/* menu */
app.post("/api/owner/menu", requireOwner, (req, res) => {
  const item = cleanItem(req.body || {});
  req.restaurant.menu.push(item);
  db.save();
  res.json({ ok: true, item });
});

app.put("/api/owner/menu/:id", requireOwner, (req, res) => {
  const idx = req.restaurant.menu.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Item not found" });
  req.restaurant.menu[idx] = cleanItem(req.body || {}, req.restaurant.menu[idx]);
  db.save();
  res.json({ ok: true, item: req.restaurant.menu[idx] });
});

app.delete("/api/owner/menu/:id", requireOwner, (req, res) => {
  req.restaurant.menu = req.restaurant.menu.filter((m) => m.id !== req.params.id);
  db.save();
  res.json({ ok: true });
});

/* =========================================================
   PUBLIC (customer site data)
   ========================================================= */
app.get("/api/r/:slug", (req, res) => {
  const r = db.findRestaurantBySlug(req.params.slug);
  if (!r) return res.status(404).json({ error: "Restaurant not found" });
  res.json(publicRestaurant(r));
});

/* list restaurants for the landing page */
app.get("/api/restaurants", (req, res) => {
  res.json({
    restaurants: db.load().restaurants.map((r) => ({
      name: r.name, slug: r.slug, logo: r.logo, items: (r.menu || []).length,
    })),
  });
});

/* =========================================================
   STATIC + PAGES
   ========================================================= */
app.use("/assets", express.static(path.join(ROOT, "assets")));
app.use("/admin", express.static(path.join(ROOT, "admin")));
app.use("/owner", express.static(path.join(ROOT, "owner")));
app.get("/admin", (req, res) => res.sendFile(path.join(ROOT, "admin", "index.html")));
app.get("/owner", (req, res) => res.sendFile(path.join(ROOT, "owner", "index.html")));
app.get("/r/:slug", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.get("/", (req, res) => res.sendFile(path.join(ROOT, "landing.html")));

/* Pick the machine's first non-internal IPv4 (the LAN IP a phone/simulator
   on the same Wi-Fi can reach). Returns null if offline. */
function lanIP() {
  const ifaces = os.networkInterfaces();
  // Prefer common Wi-Fi/Ethernet interfaces, then fall back to any.
  const order = ["en0", "en1", "eth0", "wlan0"];
  const pick = (name) =>
    (ifaces[name] || []).find((a) => a.family === "IPv4" && !a.internal);
  for (const name of order) {
    const a = pick(name);
    if (a) return a.address;
  }
  for (const name of Object.keys(ifaces)) {
    const a = pick(name);
    if (a) return a.address;
  }
  return null;
}

app.listen(PORT, () => {
  db.load(); // trigger first-run seed
  const ip = lanIP();
  console.log(`\n  RestaurantOS running`);
  console.log(`  Local    → http://localhost:${PORT}`);
  if (ip) console.log(`  Network  → http://${ip}:${PORT}   (open this on your phone / simulator)`);
  console.log("");
  console.log(`  Admin    : /admin   (admin@restaurantos.app / admin123)`);
  console.log(`  Owner    : /owner   (owner@tandoori.app / owner123)`);
  console.log(`  Customer : /r/tandoori-tales   (add ?t=12 for a table)\n`);
});

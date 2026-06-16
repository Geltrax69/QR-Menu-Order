# RestaurantOS — Instagram-themed QR ordering platform

A connected, multi-tenant restaurant ordering platform built from [PRD.md](PRD.md):

- **Admin panel** → create restaurant-owner accounts (returns email + password + customer URL)
- **Owner panel** → manage restaurant name, logo, bio, **number of tables**, categories, and a full **menu** (images, descriptions, prices, veg/spicy, availability, badges)
- **Customer site** → the Instagram-style ordering experience, served per-restaurant at `/r/:slug`, driven live by what owners publish

All three roles share one backend (Node + Express) with a JSON file store and scrypt-hashed
passwords + cookie sessions. **One `npm install`, no external database.**

## Run it

```bash
npm install        # installs express (first time only)
npm start          # → http://localhost:4173
```

The first run seeds the database and prints all logins.

| Role | URL | Login |
|------|-----|-------|
| Landing | `http://localhost:4173/` | — |
| Admin | `http://localhost:4173/admin` | `admin@restaurantos.app` / `admin123` |
| Owner (demo) | `http://localhost:4173/owner` | `owner@tandoori.app` / `owner123` |
| Customer | `http://localhost:4173/r/tandoori-tales` | no login (QR session) |

A table's QR code points at `/r/<slug>?t=<tableNumber>` (e.g. `/r/tandoori-tales?t=12`).

## The connected flow

```
Admin creates owner ─▶ gets email + password + /r/<slug> URL
        │
        ▼
Owner logs in ─▶ sets name/logo/bio/tables, adds categories, adds menu items (image/desc/price/…)
        │
        ▼  (saved to data/db.json)
Customer opens /r/<slug>?t=12 ─▶ live Instagram-style menu, cart, checkout, tracking
```

Verified end-to-end: creating an owner in the admin panel, logging in as that owner,
adding a category + dish, and seeing it appear instantly on that restaurant's customer site.

## Project structure

```
server.js                 Express app — auth, admin, owner, public API, page routing
server/
  ├── auth.js             scrypt hashing, session tokens, slug + password helpers
  ├── db.js               JSON file store + first-run seeding
  └── seed.js             demo restaurant (Tandoori Tales) + menu
data/db.json              the database (auto-created; delete it to reset everything)

index.html                customer site shell (served at /r/:slug)
landing.html              entry page linking admin / owner / live restaurants
admin/  index.html, admin.js     admin panel
owner/  index.html, owner.js     owner panel
assets/
  ├── css/app.css         customer Instagram theme
  ├── css/panel.css       admin + owner panel theme
  └── js/data.js, app.js  customer app (data-driven via /api/r/:slug)
```

## API surface

```
POST   /api/login                      email + password → admin or owner session
POST   /api/logout
GET    /api/me

GET    /api/admin/owners               (admin) list owners
POST   /api/admin/owners               (admin) create owner → {email,password,slug,url}
POST   /api/admin/owners/:id/reset-password
DELETE /api/admin/owners/:id

GET    /api/owner/restaurant           (owner) my restaurant
PUT    /api/owner/restaurant           (owner) name, logo, bio, tables, promo
POST   /api/owner/categories  · PUT/:id · DELETE/:id
POST   /api/owner/menu        · PUT/:id · DELETE/:id

GET    /api/r/:slug                     (public) restaurant + menu for the customer site
GET    /api/restaurants                 (public) list for the landing page
```

## Customer features (from the PRD)

Stories, post-style menu feed, like/save, **− qty + steppers**, search + filters, smart
availability (available / limited / sold-out), upsell + cross-sell, promo banner, Razorpay-style
checkout, live order tracking, call-waiter, loyalty, post-payment engagement. Mobile-first;
the bottom tab bar stays pinned; entrance motion respects `prefers-reduced-motion`.

## Notes & next steps

- Images are added as **URLs** (with a live preview in the owner panel). File uploads can be
  added later with `multer`.
- The Razorpay checkout is a front-end simulation — wire `processPayment()` to a real Razorpay
  order + server-side signature verification for production.
- To reset to a clean demo, stop the server and delete `data/db.json`.
- Passwords are scrypt-hashed; sessions are httpOnly cookies. For public deployment, serve over
  HTTPS and move sessions/data to a real database.

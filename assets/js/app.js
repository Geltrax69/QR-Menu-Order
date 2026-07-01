/* ===========================================================
   RestaurantOS — Instagram-themed QR ordering website
   Vanilla JS. Mobile-first. No build step.
   =========================================================== */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const img = (seed, w = 800, h = 1000) => `https://picsum.photos/seed/${seed}/${w}/${h}`;
// Real dish photos (TheMealDB, stable URLs) matched by keyword in the name.
const MEAL = (id) => `https://www.themealdb.com/images/media/meals/${id}.jpg`;
const FOOD_BY_KW = [
  [/naan|bread|fries|paratha|roti|samosa|pakora|wrap/i, null], // no stock match -> keyword photo
  [/pizza|margherita|calzone/i, MEAL("x0lk931587671540")],
  [/burger|sandwich|slider/i, MEAL("lgmnff1763789847")],
  [/biryani|pulao|fried rice|rice|pilaf/i, MEAL("xrttsx1487339558")],
  [/paneer|tikka|tandoori/i, MEAL("xxpqsy1511452222")],
  [/brownie|cake|dessert|chocolate|jamun|kheer|halwa|ice ?cream|pudding/i, MEAL("yypvst1511386427")],
  [/soda|lassi|cooler|juice|drink|shake|mojito|lemonade|coffee|tea|beverage|mocktail/i, MEAL("0sd7ac1764787957")],
  [/chicken|curry|masala|korma|makhani|gravy|\bdal\b|mutton|lamb|fish/i, MEAL("sstssx1487349585")],
];
// Stable per-name lock so a dish keeps the same fallback photo across re-renders.
const foodLock = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100000; };
const foodImg = (name, w = 800, h = 1000) => {
  const tags = String(name || "food").replace(/[^a-z0-9 ]/gi, "").trim().split(/\s+/).slice(0, 3).join(",") || "food";
  return `https://loremflickr.com/${w}/${h}/${encodeURIComponent(tags)},food?lock=${foodLock(name)}`;
};
// Menu image: honor a real owner URL; else a keyword-matched dish photo; else a keyword search.
const mediaUrl = (m, w = 800, h = 1000) => {
  const url = m && m.image;
  if (url && !url.includes("picsum.photos")) return url;
  const name = (m && m.name) || "";
  for (const [re, photo] of FOOD_BY_KW) if (re.test(name)) return photo || foodImg(name, w, h);
  return foodImg(name, w, h);
};
const inr = (n) => "₹" + n.toLocaleString("en-IN");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- State ---------------- */
const state = {
  tab: "home",
  cat: "all",
  liked: new Set(["chicken-biryani", "brownie"]),
  saved: new Set(),
  cart: {}, // id -> qty
  search: "",
  filters: new Set(),
  order: null, // active order stage index
  orderSummary: "", // snapshot of items at payment time
};

const cartCount = () => Object.values(state.cart).reduce((a, b) => a + b, 0);
const cartSubtotal = () =>
  Object.entries(state.cart).reduce((sum, [id, q]) => sum + helper(id).price * q, 0);

/* ---------------- Badges ---------------- */
function refreshBadges() {
  const n = cartCount();
  ["cartBadgeTab"].forEach((id) => {
    const el = $("#" + id);
    if (!el) return;
    el.textContent = n;
    el.classList.toggle("show", n > 0);
  });
}

/* ---------------- Toast ---------------- */
let toastTimer;
function toast(msg, icon = "ph-check-circle") {
  const t = $("#toast");
  $("#toast .ph").className = "ph " + icon;
  $("#toastMsg").textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------------- Badge labels ---------------- */
const BADGE = {
  bestseller: { txt: "Bestseller", cls: "grad" },
  chef: { txt: "Chef's Pick", cls: "" },
  popular: { txt: "Popular", cls: "" },
  recommended: { txt: "Recommended", cls: "" },
};

/* =========================================================
   HOME FEED
   ========================================================= */
function renderHome() {
  const banner = BANNERS[0];
  const bannerHtml = banner
    ? `
    <div class="banner reveal" data-tab="search">
      <img src="${banner.image && !banner.image.includes("picsum.photos") ? banner.image : mediaUrl({ name: banner.title }, 800, 400)}" alt="" loading="lazy"/>
      <div class="banner-body">
        <span class="banner-tag">${banner.tag}</span>
        <div class="banner-title">${banner.title}</div>
      </div>
    </div>`
    : "";

  const items = MENU.filter((m) => state.cat === "all" || m.cat === state.cat);
  const feed = items.map(postCard).join("");

  $("#view-home").innerHTML = `
    ${bannerHtml}
    <div class="feed">${feed || emptyState("ph-cooking-pot", "Nothing here yet", "Try another category.")}</div>
  `;
  animateReveal("#view-home");
  renderCatBar();
}

/* Category chips now live in a fixed bar above the bottom nav (home only). */
function renderCatBar() {
  $("#catBar").innerHTML = CATEGORIES.map(
    (c) => `<button class="chip ${c.id === state.cat ? "active" : ""}" data-cat="${c.id}">${c.label}</button>`
  ).join("");
}

/* The add-to-cart control. Before adding it's a single "Add" pill;
   once in the bag it becomes a clear − qty + stepper so the count is
   visible and adjustable (no more silent increments on re-tap). */
function addControl(m) {
  if (m.availability === "out")
    return `<button class="act-add" disabled aria-label="Sold out"><i class="ph ph-prohibit"></i>Sold out</button>`;
  const q = state.cart[m.id] || 0;
  if (q === 0)
    return `<button class="act-add" data-add="${m.id}" aria-label="Add ${m.name} to bag" title="Add to bag"><i class="ph ph-plus"></i>Add</button>`;
  return `<span class="act-stepper" data-stepper="${m.id}">
      <button data-dec="${m.id}" aria-label="Remove one ${m.name}" title="Remove one"><i class="ph ph-minus"></i></button>
      <span aria-live="polite">${q}</span>
      <button data-inc="${m.id}" aria-label="Add one more ${m.name}" title="Add one more"><i class="ph ph-plus"></i></button>
    </span>`;
}

/* Full-width variant for the item-detail sheet. */
function detailControl(m) {
  if (m.availability === "out")
    return `<button class="btn-primary" disabled style="background:#cfcfd6;box-shadow:none"><i class="ph ph-prohibit"></i> Sold out</button>`;
  const q = state.cart[m.id] || 0;
  if (q === 0)
    return `<button class="btn-primary" data-add="${m.id}"><i class="ph ph-plus"></i><span>Add to bag · ${inr(m.price)}</span></button>`;
  return `<div class="detail-stepper">
      <button data-dec="${m.id}" aria-label="Remove one"><i class="ph ph-minus"></i></button>
      <div class="detail-stepper-mid"><b>${q}</b> in bag<span>${inr(m.price * q)}</span></div>
      <button data-inc="${m.id}" aria-label="Add one more"><i class="ph ph-plus"></i></button>
    </div>`;
}

/* Compact control for upsell / "pairs well with" cards. */
function upsellControl(m) {
  const q = state.cart[m.id] || 0;
  if (q === 0)
    return `<button class="upsell-add" data-add="${m.id}"><i class="ph ph-plus"></i> ${inr(m.price)}</button>`;
  return `<span class="upsell-step" data-stepper="${m.id}">
      <button data-dec="${m.id}" aria-label="Remove one"><i class="ph ph-minus"></i></button>
      <b>${q}</b>
      <button data-inc="${m.id}" aria-label="Add one more"><i class="ph ph-plus"></i></button>
    </span>`;
}

/* Re-render only the add controls for one item, wherever they appear
   (feed slot, detail sheet, upsell cards) — no full view re-render. */
function refreshAddControl(id) {
  document
    .querySelectorAll(`.add-slot[data-slot="${id}"]`)
    .forEach((s) => (s.innerHTML = addControl(helper(id))));
  document
    .querySelectorAll(`.upsell-slot[data-uslot="${id}"]`)
    .forEach((s) => (s.innerHTML = upsellControl(helper(id))));
  const d = document.querySelector(`[data-detailslot="${id}"]`);
  if (d) d.innerHTML = detailControl(helper(id));
}

function postCard(m) {
  const liked = state.liked.has(m.id);
  const saved = state.saved.has(m.id);
  const out = m.availability === "out";
  const limited = m.availability === "limited";

  const badges = (m.badges || [])
    .slice(0, 2)
    .map((b) => `<span class="tagpill ${BADGE[b]?.cls || ""}">${BADGE[b]?.txt || b}</span>`)
    .join("");

  return `
  <article class="post reveal" data-item="${m.id}">
    <div class="post-head">
      <span class="post-ava" style="background-image:url('${mediaUrl(m, 120, 120)}')"></span>
      <div class="post-meta">
        <div class="post-name">${m.name} <span class="veg-dot ${m.veg ? "" : "nonveg"}"></span></div>
        <div class="post-sub">${RESTAURANT.handle} · ${m.prep} min</div>
      </div>
      <button class="icon-btn" data-open="${m.id}" aria-label="Details"><i class="ph ph-dots-three"></i></button>
    </div>

    <div class="post-media" data-media="${m.id}">
      <img src="${mediaUrl(m, 800, 1000)}" alt="${m.name}" loading="lazy"/>
      <div class="media-badge">${badges}${m.spicy ? `<span class="tagpill hot">Spicy</span>` : ""}</div>
      <div class="media-price">${inr(m.price)}</div>
      ${limited ? `<div class="limited-flag"><i class="ph ph-fire"></i> Only a few left</div>` : ""}
      ${out ? `<div class="media-stock"><span>Sold out</span></div>` : ""}
    </div>

    <div class="post-actions">
      <button class="act ${liked ? "liked" : ""}" data-like="${m.id}" aria-label="Favourite this dish" title="Favourite this dish">
        <i class="ph ph-heart"></i><i class="ph-fill ph-heart"></i>
      </button>
      <button class="act" data-open="${m.id}" aria-label="View details" title="View details & what it pairs with">
        <i class="ph ph-chat-circle"></i>
      </button>
      <button class="act" data-share="${m.id}" aria-label="Share dish" title="Copy a link to this dish">
        <i class="ph ph-paper-plane-tilt"></i>
      </button>
      <span class="act-spacer"></span>
      <button class="act ${saved ? "saved" : ""}" data-save="${m.id}" aria-label="Save for later" title="Save for later">
        <i class="ph ph-bookmark-simple"></i><i class="ph-fill ph-bookmark-simple"></i>
      </button>
      <span class="add-slot" data-slot="${m.id}">${addControl(m)}</span>
    </div>

    <div class="post-info">
      <div class="post-likes">${(m.likes + (liked ? 1 : 0)).toLocaleString("en-IN")} likes</div>
      <div class="post-caption">
        <b>${m.name}</b> <span class="muted">${m.desc}</span>
      </div>
      <div class="post-caption" style="margin-top:5px">
        <span class="post-rating"><i class="ph-fill ph-star" style="color:#fa7e1e"></i> ${m.rating}</span>
        <span class="muted"> · ${m.prep} min prep · ${catLabel(m.cat)}</span>
      </div>
    </div>
  </article>`;
}

const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

/* =========================================================
   SEARCH / EXPLORE
   ========================================================= */
const FILTERS = [
  { id: "veg", label: "Veg", icon: "ph-leaf" },
  { id: "nonveg", label: "Non-veg", icon: "ph-drumstick" },
  { id: "spicy", label: "Spicy", icon: "ph-fire" },
  { id: "popular", label: "Popular", icon: "ph-trend-up" },
  { id: "recommended", label: "Recommended", icon: "ph-sparkle" },
];

function filteredItems() {
  const q = state.search.trim().toLowerCase();
  return MENU.filter((m) => {
    if (q && !(`${m.name} ${m.desc} ${catLabel(m.cat)}`.toLowerCase().includes(q))) return false;
    for (const f of state.filters) {
      if (f === "veg" && !m.veg) return false;
      if (f === "nonveg" && m.veg) return false;
      if (f === "spicy" && !m.spicy) return false;
      if (f === "popular" && !m.badges.includes("popular") && !m.badges.includes("bestseller")) return false;
      if (f === "recommended" && !m.badges.includes("recommended") && !m.badges.includes("chef")) return false;
    }
    return true;
  });
}

function renderSearch() {
  const filters = FILTERS.map(
    (f) => `<button class="filter ${state.filters.has(f.id) ? "on" : ""}" data-filter="${f.id}">
      <i class="ph ${f.icon}"></i>${f.label}</button>`
  ).join("");

  const items = filteredItems();
  const cells = items
    .map((m, i) => {
      const tall = i % 5 === 0;
      return `
      <button class="gcell ${tall ? "tall" : ""}" data-open="${m.id}">
        <img src="${mediaUrl(m, 600, tall ? 1200 : 600)}" alt="${m.name}" loading="lazy"/>
        <span class="gcell-veg veg-dot ${m.veg ? "" : "nonveg"}"></span>
        <span class="gcell-info">
          <span class="gcell-name">${m.name}</span>
          <span class="gcell-price">${inr(m.price)} · ${m.rating}★</span>
        </span>
      </button>`;
    })
    .join("");

  $("#view-search").innerHTML = `
    <div class="page-pad" style="padding-bottom:8px">
      <div class="h-title">Explore</div>
      <div class="h-sub">${MENU.length} dishes · search by name, ingredient or craving</div>
    </div>
    <div class="searchbar">
      <i class="ph ph-magnifying-glass"></i>
      <input id="searchInput" placeholder="Search dishes…" value="${state.search}" />
      ${state.search ? `<button data-action="clear-search"><i class="ph ph-x-circle" style="font-size:20px;color:#999"></i></button>` : ""}
    </div>
    <div class="filter-row">${filters}</div>
    ${items.length ? `<div class="grid">${cells}</div>` : emptyState("ph-magnifying-glass", "No matches", "Try a different word or clear filters.")}
    <div style="height:20px"></div>
  `;

  const input = $("#searchInput");
  if (input) {
    input.addEventListener("input", (e) => {
      state.search = e.target.value;
      const items = filteredItems();
      const grid = $("#view-search .grid") || document.createElement("div");
      // light re-render of just results
      renderSearch();
      const ni = $("#searchInput");
      ni.focus();
      ni.setSelectionRange(ni.value.length, ni.value.length);
    });
  }
}

/* =========================================================
   CART
   ========================================================= */
function renderCart() {
  const ids = Object.keys(state.cart).filter((id) => state.cart[id] > 0);

  if (!ids.length) {
    $("#view-cart").innerHTML = `
      <div class="page-pad"><div class="h-title">Your Bag</div></div>
      ${emptyState("ph-bag", "Your bag is empty", "Browse the menu and tap Add to start an order.")}
      <div class="page-pad" style="text-align:center">
        <button class="btn-ghost" data-tab="home" style="max-width:240px;margin:0 auto"><i class="ph ph-fork-knife"></i> Browse menu</button>
      </div>`;
    $("#checkoutBar").hidden = true;
    return;
  }

  const rows = ids.map((id) => {
    const m = helper(id);
    const q = state.cart[id];
    return `
    <div class="cart-item" data-item="${id}">
      <img class="cart-thumb" src="${mediaUrl(m, 200, 200)}" alt="${m.name}"/>
      <div class="cart-mid">
        <div class="cart-name">${m.name} <span class="veg-dot ${m.veg ? "" : "nonveg"}" style="display:inline-grid;vertical-align:middle"></span></div>
        <div class="cart-price">${inr(m.price)} · ${m.prep} min</div>
      </div>
      <div class="qty">
        <button data-dec="${id}"><i class="ph ph-minus"></i></button>
        <span>${q}</span>
        <button data-inc="${id}"><i class="ph ph-plus"></i></button>
      </div>
    </div>`;
  }).join("");

  // Upsell — items not in cart, prioritising pairings of what's in cart
  const pairIds = new Set();
  ids.forEach((id) => helper(id).pairs?.forEach((p) => pairIds.add(p)));
  let upsellItems = [...pairIds].map(helper).filter((m) => m && !state.cart[m.id]);
  if (upsellItems.length < 3) {
    MENU.filter((m) => !state.cart[m.id] && !pairIds.has(m.id))
      .sort((a, b) => b.likes - a.likes)
      .forEach((m) => upsellItems.length < 4 && upsellItems.push(m));
  }
  const upsell = upsellItems.slice(0, 6).map((m) => `
    <div class="upsell-card" data-open="${m.id}">
      <img src="${mediaUrl(m, 300, 200)}" alt="${m.name}"/>
      <div class="upsell-b">
        <div class="upsell-name">${m.name}</div>
        <span class="upsell-slot" data-uslot="${m.id}">${upsellControl(m)}</span>
      </div>
    </div>`).join("");

  const subtotal = cartSubtotal();
  const tax = Math.round(subtotal * 0.05);
  const discount = subtotal >= 600 ? 50 : 0;
  const total = subtotal + tax - discount;

  $("#view-cart").innerHTML = `
    <div class="page-pad" style="padding-bottom:6px">
      <div class="h-title">Your Bag</div>
      <div class="h-sub">${RESTAURANT.table} · ${cartCount()} item${cartCount() > 1 ? "s" : ""}</div>
    </div>
    ${rows}

    <div class="upsell">
      <div class="section-h"><i class="ph ph-sparkle" style="color:#d62976"></i> Goes great with your order</div>
      <div class="upsell-row">${upsell}</div>
    </div>

    <div class="bill">
      <div class="bill-row"><span>Subtotal</span><span>${inr(subtotal)}</span></div>
      <div class="bill-row"><span>Taxes & charges (5%)</span><span>${inr(tax)}</span></div>
      ${discount ? `<div class="bill-row"><span>Loyalty discount</span><span class="free">− ${inr(discount)}</span></div>` : ""}
      <div class="bill-row total"><span>To pay</span><span>${inr(total)}</span></div>
      <div class="h-sub" style="margin-top:6px">You'll earn <b style="color:#962fbf">${Math.floor(total / 10)} points</b> on this order.</div>
    </div>
    <div style="height:8px"></div>
  `;

  $("#checkoutBar").hidden = false;
  $("#checkoutBar").innerHTML = `
    <button class="btn-primary" data-action="checkout">
      <span>Pay ${inr(total)}</span>
      <i class="ph ph-arrow-right"></i>
    </button>`;
}

/* =========================================================
   ORDERS / LIVE TRACKING
   ========================================================= */
function renderOrders() {
  if (state.order === null) {
    $("#view-orders").innerHTML = `
      <div class="page-pad"><div class="h-title">Orders</div></div>
      ${emptyState("ph-receipt", "No active orders", "Once you pay, track your food live right here.")}
    `;
    return;
  }

  const idx = state.order;
  const eta = Math.max(0, (ORDER_STAGES.length - 1 - idx) * 5 + 2);
  const steps = ORDER_STAGES.map((s, i) => {
    const cls = i < idx ? "done" : i === idx ? "done current" : "pending";
    const time = i <= idx ? "Just now" : "Pending";
    return `
    <div class="step ${cls}">
      <div class="step-ic"><i class="ph ${i <= idx ? s.icon : "ph-circle"}"></i></div>
      <div class="step-tx">
        <div class="step-label">${s.label}</div>
        <div class="step-time">${time}</div>
      </div>
    </div>`;
  }).join("");

  const orderItems = state.orderSummary || "Your order";

  $("#view-orders").innerHTML = `
    <div class="page-pad" style="padding-bottom:0"><div class="h-title">Live Order</div></div>
    <div class="track-card">
      <div class="track-head">
        <div>
          <div style="font-weight:800">Order #1245</div>
          <div class="track-eta">${RESTAURANT.table}</div>
        </div>
        <div style="text-align:right">
          <div class="track-eta">Ready in</div>
          <div class="track-eta"><b>${eta} min</b></div>
        </div>
      </div>
      <div class="stepper">${steps}</div>
    </div>
    <div class="page-pad" style="padding-top:0">
      <div class="section-h">In this order</div>
      <div class="h-sub" style="line-height:1.6">${orderItems}</div>
      <div style="height:14px"></div>
      <button class="btn-ghost" data-action="assist"><i class="ph ph-hand-waving"></i> Call waiter</button>
    </div>
  `;
  animateReveal("#view-orders");
}

/* advance the order through the kitchen pipeline */
let orderTimer;
function startOrderProgress() {
  clearInterval(orderTimer);
  state.order = 0;
  orderTimer = setInterval(() => {
    if (state.order < ORDER_STAGES.length - 1) {
      state.order++;
      if (state.tab === "orders") renderOrders();
      const stage = ORDER_STAGES[state.order];
      toast(stage.label, stage.icon);
    } else {
      clearInterval(orderTimer);
    }
  }, 6000);
}

/* =========================================================
   PROFILE / LOYALTY
   ========================================================= */
function renderProfile() {
  const points = 340;
  const target = 500;
  const pct = Math.min(100, (points / target) * 100);
  const savedItems = [...state.saved].map(helper).filter(Boolean);

  const rewards = [
    { ic: "ph-ice-cream", t: "Free dessert", s: "100 pts", ready: true },
    { ic: "ph-tag", t: "₹250 off", s: "500 pts", ready: false },
    { ic: "ph-coffee", t: "Free drink", s: "5 visits", ready: true },
  ];

  const links = [
    { ic: "ph-bookmark-simple", l: `Saved dishes (${savedItems.length})`, tab: "search" },
    { ic: "ph-clock-counter-clockwise", l: "Order history", tab: "orders" },
    { ic: "ph-translate", l: "Language · English" },
    { ic: "ph-star", l: "Rate your visit" },
    { ic: "ph-info", l: "About Tandoori Tales" },
  ];

  $("#view-profile").innerHTML = `
    <div class="profile-head reveal">
      <div class="profile-ava"><span style="background-image:url('${img("guestava", 200, 200)}')"></span></div>
      <div class="h-title" style="font-size:21px">Guest at Table 12</div>
      <div class="h-sub">No account needed · ${RESTAURANT.handle}</div>
    </div>

    <div class="loyalty reveal">
      <div class="track-eta" style="color:rgba(255,255,255,.7);position:relative;z-index:1">Loyalty points</div>
      <div class="loyalty-pts">${points} <span style="font-size:16px;font-weight:600;opacity:.7">pts</span></div>
      <div class="loyalty-bar"><span style="width:${pct}%"></span></div>
      <div class="track-eta" style="color:rgba(255,255,255,.75);position:relative;z-index:1">${target - points} pts to your ₹250 reward</div>
    </div>

    <div class="page-pad" style="padding-bottom:6px"><div class="section-h">Your rewards</div></div>
    <div class="reward-row">
      ${rewards.map((r) => `
        <div class="reward-card reveal">
          <div class="reward-ic"><i class="ph ${r.ic}"></i></div>
          <div style="font-weight:700;font-size:14px">${r.t}</div>
          <div class="h-sub" style="margin-top:2px">${r.s}</div>
          <div style="margin-top:8px;font-size:12px;font-weight:700;color:${r.ready ? "#16a34a" : "#999"}">
            ${r.ready ? "Ready to redeem" : "Keep going"}
          </div>
        </div>`).join("")}
    </div>

    <div class="menu-list">
      ${links.map((l) => `
        <button class="menu-link" ${l.tab ? `data-tab="${l.tab}"` : ""}>
          <i class="ph ${l.ic}"></i><span class="lbl">${l.l}</span><i class="ph ph-caret-right"></i>
        </button>`).join("")}
    </div>
    <div style="height:24px"></div>
  `;
  animateReveal("#view-profile");
}

/* =========================================================
   DETAIL SHEET
   ========================================================= */
function openDetail(id) {
  const m = helper(id);
  if (!m) return;
  const pairs = (m.pairs || []).map(helper).filter(Boolean);

  $("#sheetBody").innerHTML = `
    <div class="detail-hero"><img src="${mediaUrl(m, 900, 700)}" alt="${m.name}"/></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <div>
        <div class="detail-title">${m.name} <span class="veg-dot ${m.veg ? "" : "nonveg"}" style="display:inline-grid;vertical-align:middle"></span></div>
        <div class="detail-meta">
          <span><i class="ph-fill ph-star" style="color:#fa7e1e"></i> ${m.rating}</span>
          <span><i class="ph ph-clock"></i> ${m.prep} min</span>
          <span><i class="ph ph-heart"></i> ${m.likes.toLocaleString("en-IN")}</span>
          ${m.spicy ? `<span><i class="ph ph-fire" style="color:#dc2626"></i> Spicy</span>` : ""}
        </div>
      </div>
      <div class="media-price" style="position:static;box-shadow:none;background:#f5f5f7">${inr(m.price)}</div>
    </div>
    <p class="detail-desc">${m.desc}</p>

    ${pairs.length ? `
      <div class="section-h" style="margin-top:20px"><i class="ph ph-sparkle" style="color:#d62976"></i> Pairs well with</div>
      <div class="upsell-row">
        ${pairs.map((p) => `
          <div class="upsell-card" data-open="${p.id}">
            <img src="${mediaUrl(p, 300, 200)}" alt="${p.name}"/>
            <div class="upsell-b">
              <div class="upsell-name">${p.name}</div>
              <span class="upsell-slot" data-uslot="${p.id}">${upsellControl(p)}</span>
            </div>
          </div>`).join("")}
      </div>` : ""}

    <div style="height:18px"></div>
    <div data-detailslot="${m.id}">${detailControl(m)}</div>
  `;
  openSheet();
}

/* =========================================================
   ASSIST SHEET (call waiter)
   ========================================================= */
function openAssist() {
  $("#sheetBody").innerHTML = `
    <div class="detail-title">Need something?</div>
    <div class="h-sub">${RESTAURANT.table} · we'll notify your waiter instantly</div>
    <div class="assist-grid">
      ${ASSIST.map((a) => `
        <button class="assist-cell" data-assist="${a.label}">
          <i class="ph ${a.icon}"></i><span>${a.label}</span>
        </button>`).join("")}
    </div>
  `;
  openSheet();
}

/* =========================================================
   CHECKOUT SHEET (Razorpay-style mock)
   ========================================================= */
function openCheckout() {
  const subtotal = cartSubtotal();
  const tax = Math.round(subtotal * 0.05);
  const discount = subtotal >= 600 ? 50 : 0;
  const total = subtotal + tax - discount;

  const methods = [
    { id: "upi", l: "UPI", s: "GPay · PhonePe · Paytm", ic: "ph-qr-code" },
    { id: "card", l: "Card", s: "Credit / Debit", ic: "ph-credit-card" },
    { id: "wallet", l: "Wallets", s: "Paytm · Amazon Pay", ic: "ph-wallet" },
    { id: "netbanking", l: "Net Banking", s: "All major banks", ic: "ph-bank" },
  ];

  $("#sheetBody").innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span class="brand-mark" style="width:30px;height:30px"><i class="ph ph-shield-check"></i></span>
      <div>
        <div class="detail-title" style="font-size:19px">Secure checkout</div>
        <div class="h-sub">Powered by Razorpay · ${RESTAURANT.table}</div>
      </div>
    </div>
    <div class="bill" style="padding-left:0;padding-right:0">
      <div class="bill-row"><span>Subtotal</span><span>${inr(subtotal)}</span></div>
      <div class="bill-row"><span>Taxes (5%)</span><span>${inr(tax)}</span></div>
      ${discount ? `<div class="bill-row"><span>Loyalty discount</span><span class="free">− ${inr(discount)}</span></div>` : ""}
      <div class="bill-row total"><span>To pay</span><span>${inr(total)}</span></div>
    </div>
    <div class="section-h" style="margin-top:8px">Payment method</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
      ${methods.map((mth, i) => `
        <button class="menu-link" data-pay="${mth.id}" style="border:1px solid var(--line);border-radius:16px;padding:14px;${i === 0 ? "background:var(--ig-grad-soft)" : ""}">
          <i class="ph ${mth.ic}"></i>
          <span class="lbl">${mth.l}<div class="h-sub" style="font-weight:500">${mth.s}</div></span>
          <i class="ph ph-caret-right"></i>
        </button>`).join("")}
    </div>
    <div class="h-sub" style="text-align:center;margin-bottom:8px"><i class="ph ph-lock-simple"></i> HTTPS · server-verified signature · no duplicate charges</div>
  `;
  openSheet();
}

function processPayment(method) {
  const total = cartSubtotal() + Math.round(cartSubtotal() * 0.05) - (cartSubtotal() >= 600 ? 50 : 0);
  $("#sheetBody").innerHTML = `
    <div style="text-align:center;padding:30px 10px">
      <div class="profile-ava" style="width:74px;height:74px;margin-bottom:18px">
        <span style="display:grid;place-items:center;background:#fff"><i class="ph ph-spinner ph-spin" style="font-size:34px;color:#d62976"></i></span>
      </div>
      <div class="detail-title" style="font-size:20px">Confirming payment…</div>
      <div class="h-sub">Verifying signature with ${method.toUpperCase()}</div>
    </div>`;
  setTimeout(() => paymentSuccess(total), 1700);
}

function paymentSuccess(total) {
  const pts = Math.floor(total / 10);
  $("#sheetBody").innerHTML = `
    <div style="text-align:center;padding:24px 10px">
      <div class="profile-ava" style="width:84px;height:84px;margin-bottom:16px">
        <span style="display:grid;place-items:center;background:#fff"><i class="ph-fill ph-check-circle" style="font-size:48px;color:#16a34a"></i></span>
      </div>
      <div class="detail-title">Order confirmed</div>
      <div class="h-sub" style="margin-top:4px">Paid ${inr(total)} · sent to the kitchen</div>
      <div class="loyalty" style="margin:20px 0;text-align:left">
        <div class="track-eta" style="color:rgba(255,255,255,.7);position:relative;z-index:1">You just earned</div>
        <div class="loyalty-pts" style="font-size:30px">+${pts} <span style="font-size:15px;opacity:.7">points</span></div>
      </div>
      <button class="btn-primary" data-action="track"><i class="ph ph-receipt"></i> Track my order</button>
      <div style="height:10px"></div>
      <div class="h-sub"><i class="ph ph-instagram-logo"></i> Loved it? Follow ${RESTAURANT.handle} for 10% off next visit</div>
    </div>`;
  // snapshot the order before clearing, then start the kitchen pipeline
  state.orderSummary = Object.entries(state.cart)
    .map(([id, q]) => `${q}× ${helper(id).name}`)
    .join(", ");
  startOrderProgress();
  state.cart = {};
  refreshBadges();
  renderCart();
}

/* =========================================================
   SHEET helpers
   ========================================================= */
function openSheet() {
  $("#scrim").classList.add("open");
  $("#sheet").classList.add("open");
}
function closeSheet() {
  $("#scrim").classList.remove("open");
  $("#sheet").classList.remove("open");
}

/* =========================================================
   EMPTY STATE
   ========================================================= */
function emptyState(icon, title, sub) {
  return `<div class="empty"><i class="ph ${icon}"></i><h3>${title}</h3><p>${sub}</p></div>`;
}

/* =========================================================
   TABS
   ========================================================= */
const RENDERERS = {
  home: renderHome,
  search: renderSearch,
  cart: renderCart,
  orders: renderOrders,
  profile: renderProfile,
};

function switchTab(tab) {
  if (!RENDERERS[tab]) return;
  state.tab = tab;
  $$(".view").forEach((v) => (v.hidden = v.id !== "view-" + tab));
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  // profile now lives in the top bar — reflect its active state there
  $("#topProfileBtn").classList.toggle("active", tab === "profile");
  $("#checkoutBar").hidden = tab !== "cart";
  // category bar floats above the nav, on the home tab only
  $("#catBar").hidden = tab !== "home";
  $("#scroll").classList.toggle("has-catbar", tab === "home");
  RENDERERS[tab]();
  $("#scroll").scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

/* =========================================================
   LIKE / SAVE / CART mutations
   ========================================================= */
function toggleLike(id, fromDblTap, x, y) {
  const wasLiked = state.liked.has(id);
  if (fromDblTap && wasLiked) {
    heartBurst(x, y);
    return;
  }
  wasLiked ? state.liked.delete(id) : state.liked.add(id);
  if (!wasLiked && x != null) heartBurst(x, y);
  // update just this post in-place
  const post = $(`.post[data-item="${id}"]`);
  if (post) {
    const btn = post.querySelector("[data-like]");
    btn.classList.toggle("liked", state.liked.has(id));
    const likesEl = post.querySelector(".post-likes");
    const m = helper(id);
    likesEl.textContent = (m.likes + (state.liked.has(id) ? 1 : 0)).toLocaleString("en-IN") + " likes";
  }
  if (!fromDblTap)
    toast(
      state.liked.has(id) ? "Added to favourites" : "Removed from favourites",
      state.liked.has(id) ? "ph-heart" : "ph-heart-break"
    );
}

function toggleSave(id) {
  state.saved.has(id) ? state.saved.delete(id) : state.saved.add(id);
  const btn = $(`[data-save="${id}"]`);
  if (btn) btn.classList.toggle("saved", state.saved.has(id));
  toast(state.saved.has(id) ? "Saved to your list" : "Removed from saved", state.saved.has(id) ? "ph-bookmark-simple" : "ph-x");
}

function addToCart(id, qty = 1) {
  const m = helper(id);
  if (!m || m.availability === "out") return;
  state.cart[id] = (state.cart[id] || 0) + qty;
  refreshBadges();
  toast(`${m.name} added · ${inr(cartSubtotal())} in bag`, "ph-bag");
  bumpCart();
  refreshAddControl(id); // Add pill -> stepper, in feed and detail sheet
  if (state.tab === "cart") renderCart();
}

function changeQty(id, delta) {
  state.cart[id] = (state.cart[id] || 0) + delta;
  const removed = state.cart[id] <= 0;
  if (removed) delete state.cart[id];
  refreshBadges();
  if (delta > 0) bumpCart();
  if (state.tab === "cart") {
    renderCart(); // cart screen has its own rows + bill to recompute
  } else {
    refreshAddControl(id); // feed / detail sheet stepper updates in place
  }
  if (removed) toast(`${helper(id).name} removed from bag`, "ph-x");
}

function bumpCart() {
  if (reduceMotion) return;
  // Pure CSS pop — no inline transform residue, so the badge's hidden
  // state (CSS scale 0 when not `.show`) is never left stuck visible.
  ["cartBadgeTab"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains("show")) return;
    el.classList.remove("pop");
    void el.offsetWidth; // restart the animation
    el.classList.add("pop");
    // strip the class once done so the resting badge carries no animation
    setTimeout(() => el.classList.remove("pop"), 450);
  });
}

/* =========================================================
   HEART BURST (double-tap like)
   ========================================================= */
function heartBurst(x, y) {
  if (reduceMotion) return;
  const h = document.createElement("i");
  h.className = "ph-fill ph-heart heart-burst";
  h.style.left = x + "px";
  h.style.top = y + "px";
  $("#app").appendChild(h);
  gsap.timeline({ onComplete: () => h.remove() })
    .to(h, { scale: 1.1, opacity: 0.95, duration: 0.28, ease: "back.out(2.5)" })
    .to(h, { scale: 1, opacity: 0, y: "-=30", duration: 0.5, delay: 0.25, ease: "power1.in" });
}

/* =========================================================
   ENTRANCE STAGGER
   CSS keyframe (.reveal) handles the fade-up; JS only assigns
   a small stagger delay so a freshly rendered view cascades in.
   Always ends visible — no scroll-gating fragility.
   ========================================================= */
function animateReveal(scope) {
  if (reduceMotion) return;
  $$(scope + " .reveal").forEach((el, i) => {
    el.style.animationDelay = Math.min(i * 0.05, 0.35) + "s";
  });
}

/* =========================================================
   EVENT DELEGATION
   ========================================================= */
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-tab],[data-cat],[data-add],[data-like],[data-save],[data-share],[data-open],[data-inc],[data-dec],[data-filter],[data-action],[data-assist],[data-story],[data-pay]");
  if (!t) return;

  const d = t.dataset;

  if (d.tab) return switchTab(d.tab);
  if (d.cat) { state.cat = d.cat; return renderHome(); }
  if (d.add) { e.stopPropagation(); return addToCart(d.add); }
  if (d.like) return toggleLike(d.like);
  if (d.save) return toggleSave(d.save);
  if (d.share) return toast(`Link to ${helper(d.share).name} copied`, "ph-paper-plane-tilt");
  if (d.open) { e.stopPropagation(); return openDetail(d.open); }
  if (d.inc) return changeQty(d.inc, 1);
  if (d.dec) return changeQty(d.dec, -1);
  if (d.filter) {
    state.filters.has(d.filter) ? state.filters.delete(d.filter) : state.filters.add(d.filter);
    return renderSearch();
  }
  if (d.story) { state.cat = mapStoryToCat(d.story); switchTab("home"); return; }
  if (d.assist) { closeSheet(); return toast(`Sent: "${d.assist}" — waiter notified for Table 12`, "ph-hand-waving"); }
  if (d.pay) return processPayment(d.pay);

  switch (d.action) {
    case "assist": return openAssist();
    case "orders": return switchTab("orders");
    case "checkout": return openCheckout();
    case "track": closeSheet(); return switchTab("orders");
    case "clear-search": state.search = ""; return renderSearch();
  }
});

function mapStoryToCat(id) {
  // Story ids mirror category ids; promo/specials/chef fall back to "all".
  return CATEGORIES.some((c) => c.id === id) ? id : "all";
}

/* scrim closes sheet */
$("#scrim").addEventListener("click", closeSheet);

/* double-tap to like on post media */
let lastTap = 0;
document.addEventListener("click", (e) => {
  const media = e.target.closest("[data-media]");
  if (!media) return;
  const now = Date.now();
  if (now - lastTap < 320) {
    const rect = $("#app").getBoundingClientRect();
    toggleLike(media.dataset.media, true, e.clientX - rect.left, e.clientY - rect.top);
    state.liked.add(media.dataset.media);
    const post = media.closest(".post");
    post.querySelector("[data-like]").classList.add("liked");
    const m = helper(media.dataset.media);
    post.querySelector(".post-likes").textContent = (m.likes + 1).toLocaleString("en-IN") + " likes";
  }
  lastTap = now;
});

/* =========================================================
   BOOT
   ========================================================= */
function currentSlug() {
  const m = location.pathname.match(/^\/r\/([^/]+)/);
  if (m) return decodeURIComponent(m[1]);
  return new URLSearchParams(location.search).get("r");
}

function applyBrand() {
  const t = $("#brandTitle");
  if (t) {
    const h = RESTAURANT.handle || "menu";
    t.innerHTML = h.replace(/(.{0,8})(.*)/, (_, a, b) => `${a}<b style="font-weight:800">${b}</b>`);
  }
  document.title = `${RESTAURANT.name} · Scan. Order. Pay.`;
}

(async function boot() {
  const slug = currentSlug();
  if (slug) {
    const table = new URLSearchParams(location.search).get("t");
    const ok = await loadRestaurant(slug, table);
    if (!ok) {
      document.body.innerHTML =
        `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:440px;margin:80px auto;text-align:center;padding:24px">
           <div style="font-size:54px">🍽️</div>
           <h2 style="margin:12px 0 6px">Restaurant not found</h2>
           <p style="color:#6b6b73">The link “/r/${slug}” doesn’t match any restaurant. Check the URL from your QR code.</p>
         </div>`;
      return;
    }
  }
  applyBrand();
  $("#topAva").style.backgroundImage = `url('${img("guestava", 120, 120)}')`;
  refreshBadges();
  $("#catBar").hidden = false;
  $("#scroll").classList.add("has-catbar");
  renderHome();
})();

/* Owner panel — manage restaurant profile, categories and menu. */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const api = async (url, opts = {}) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
};
const toast = (m) => { const t = $("#toast"); t.textContent = m; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const show = (view) => { $("#loginView").hidden = view !== "login"; $("#dashView").hidden = view !== "dash"; };

let R = null; // current restaurant

/* ---- boot ---- */
(async function () {
  try {
    const me = await api("/api/me");
    if (me.role === "owner") { await loadRestaurant(); show("dash"); }
    else show("login");
  } catch { show("login"); }
})();

/* ---- login ---- */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginErr").textContent = "";
  try {
    const r = await api("/api/login", { method: "POST", body: { email: $("#email").value, password: $("#password").value } });
    if (r.role !== "owner") { $("#loginErr").textContent = "That account is not a restaurant owner."; return; }
    await loadRestaurant(); show("dash");
  } catch (err) { $("#loginErr").textContent = err.message; }
});
$("#logoutBtn").addEventListener("click", async () => { await api("/api/logout", { method: "POST" }); show("login"); });

/* ---- load + render ---- */
async function loadRestaurant() {
  const { restaurant } = await api("/api/owner/restaurant");
  R = restaurant;
  renderProfile();
  renderCategories();
  renderMenu();
}

function renderProfile() {
  $("#navName").textContent = R.name;
  const url = location.origin + "/r/" + R.slug;
  $("#urlSub").innerHTML = `Your customer URL: <a href="${url}" target="_blank">${url}</a> · table QR links use <code>?t=NUMBER</code>`;
  $("#viewSite").href = url;
  $("#rName").value = R.name;
  $("#rHandle").value = R.handle || "";
  $("#rBio").value = R.bio || "";
  $("#rLogo").value = R.logo || "";
  $("#rTables").value = R.tables || 1;
  $("#logoPreview").src = R.logo || "";
  $("#pTag").value = R.promo?.tag || "";
  $("#pTitle").value = R.promo?.title || "";
  $("#pImage").value = R.promo?.image || "";
}
$("#rLogo").addEventListener("input", (e) => ($("#logoPreview").src = e.target.value));

$("#saveProfile").addEventListener("click", async () => {
  $("#profileErr").textContent = "";
  const promoTitle = $("#pTitle").value.trim();
  try {
    const body = {
      name: $("#rName").value, handle: $("#rHandle").value, bio: $("#rBio").value,
      logo: $("#rLogo").value, tables: $("#rTables").value,
      promo: promoTitle ? { tag: $("#pTag").value, title: promoTitle, image: $("#pImage").value } : null,
    };
    const { restaurant } = await api("/api/owner/restaurant", { method: "PUT", body });
    R = restaurant; renderProfile();
    toast("Profile saved");
  } catch (err) { $("#profileErr").textContent = err.message; }
});

/* ---- categories ---- */
function renderCategories() {
  const list = $("#catList");
  if (!R.categories.length) { list.innerHTML = `<span style="color:var(--muted);font-size:13px">No categories yet — add one to group your menu.</span>`; return; }
  list.innerHTML = R.categories.map((c) => `
    <span class="pill-toggle"><button class="on" style="cursor:default">${esc(c.label)}
      <i class="ph ph-pencil-simple" data-editcat="${c.id}" style="margin-left:6px;cursor:pointer" title="Rename"></i>
      <i class="ph ph-x" data-delcat="${c.id}" style="margin-left:4px;cursor:pointer" title="Delete"></i>
    </button></span>`).join("");
}
$("#addCat").addEventListener("click", async () => {
  const label = $("#catInput").value.trim();
  if (!label) return;
  await api("/api/owner/categories", { method: "POST", body: { label } });
  $("#catInput").value = "";
  await loadRestaurant();
  toast("Category added");
});
$("#catInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#addCat").click(); } });

/* ---- menu ---- */
function renderMenu() {
  $("#itemCount").textContent = R.menu.length + (R.menu.length === 1 ? " item" : " items");
  const grid = $("#menuGrid");
  if (!R.menu.length) { grid.innerHTML = `<div class="empty-box" style="grid-column:1/-1"><i class="ph ph-bowl-food"></i><p>No dishes yet — add your first item.</p></div>`; return; }
  grid.innerHTML = R.menu.map((m) => {
    const cat = R.categories.find((c) => c.id === m.cat);
    return `
    <div class="item-card" data-edit="${m.id}" style="cursor:pointer">
      <img class="thumb" src="${esc(m.image)}" alt="${esc(m.name)}" onerror="this.style.opacity=.25"/>
      <div class="body">
        <div class="t"><span class="veg ${m.veg ? "" : "no"}"></span> ${esc(m.name)}</div>
        <div class="d">${esc(m.desc || "")}</div>
        <div class="foot">
          <span class="price">${inr(m.price)}</span>
          <span class="chip-stock ${m.availability}">${m.availability === "out" ? "Out" : m.availability}</span>
        </div>
        <div style="margin-top:6px;font-size:11.5px;color:var(--muted)">${cat ? esc(cat.label) : "Uncategorised"} · ${m.prep} min</div>
      </div>
    </div>`;
  }).join("");
}

/* ---- item modal ---- */
const scrim = $("#itemScrim");
function openItem(item) {
  $("#modalTitle").textContent = item ? "Edit menu item" : "Add menu item";
  $("#deleteItem").hidden = !item;
  $("#itemErr").textContent = "";
  $("#iId").value = item?.id || "";
  $("#iName").value = item?.name || "";
  $("#iDesc").value = item?.desc || "";
  $("#iPrice").value = item?.price ?? "";
  $("#iPrep").value = item?.prep ?? 10;
  $("#iImage").value = item?.image || "";
  $("#iPreview").src = item?.image || "";
  $("#iVeg").checked = item ? !!item.veg : true;
  $("#iSpicy").checked = item ? !!item.spicy : false;
  // category options
  $("#iCat").innerHTML = R.categories.length
    ? R.categories.map((c) => `<option value="${c.id}">${esc(c.label)}</option>`).join("")
    : `<option value="">(add a category first)</option>`;
  if (item?.cat) $("#iCat").value = item.cat;
  // availability
  $$("#iAvail button").forEach((b) => b.classList.toggle("on", b.dataset.av === (item?.availability || "available")));
  // badges
  const badges = item?.badges || [];
  $$("#iBadges button").forEach((b) => b.classList.toggle("on", badges.includes(b.dataset.badge)));
  scrim.classList.add("open");
}
function closeItem() { scrim.classList.remove("open"); }

$("#addItem").addEventListener("click", () => {
  if (!R.categories.length) { toast("Add a category first"); return; }
  openItem(null);
});
$("#modalClose").addEventListener("click", closeItem);
$("#cancelItem").addEventListener("click", closeItem);
scrim.addEventListener("click", (e) => { if (e.target === scrim) closeItem(); });
$("#iImage").addEventListener("input", (e) => ($("#iPreview").src = e.target.value));

$("#iAvail").addEventListener("click", (e) => {
  const b = e.target.closest("[data-av]"); if (!b) return;
  $$("#iAvail button").forEach((x) => x.classList.remove("on")); b.classList.add("on");
});
$("#iBadges").addEventListener("click", (e) => {
  const b = e.target.closest("[data-badge]"); if (!b) return;
  b.classList.toggle("on");
});

$("#saveItem").addEventListener("click", async () => {
  $("#itemErr").textContent = "";
  const name = $("#iName").value.trim();
  if (!name) { $("#itemErr").textContent = "Dish name is required."; return; }
  const body = {
    name,
    desc: $("#iDesc").value,
    cat: $("#iCat").value,
    price: $("#iPrice").value,
    prep: $("#iPrep").value,
    image: $("#iImage").value,
    veg: $("#iVeg").checked,
    spicy: $("#iSpicy").checked,
    availability: $("#iAvail .on")?.dataset.av || "available",
    badges: $$("#iBadges button.on").map((b) => b.dataset.badge),
  };
  const id = $("#iId").value;
  try {
    if (id) await api("/api/owner/menu/" + id, { method: "PUT", body });
    else await api("/api/owner/menu", { method: "POST", body });
    closeItem();
    await loadRestaurant();
    toast(id ? "Item updated" : "Item added");
  } catch (err) { $("#itemErr").textContent = err.message; }
});

$("#deleteItem").addEventListener("click", async () => {
  const id = $("#iId").value;
  if (!id || !confirm("Delete this item?")) return;
  await api("/api/owner/menu/" + id, { method: "DELETE" });
  closeItem(); await loadRestaurant(); toast("Item deleted");
});

/* ---- delegated: edit item / edit-delete category ---- */
document.addEventListener("click", async (e) => {
  const editCard = e.target.closest("[data-edit]");
  if (editCard && !e.target.closest("[data-editcat],[data-delcat]")) {
    const item = R.menu.find((m) => m.id === editCard.dataset.edit);
    if (item) openItem(item);
    return;
  }
  const delCat = e.target.closest("[data-delcat]");
  if (delCat) {
    if (!confirm("Delete this category? Items in it become uncategorised.")) return;
    await api("/api/owner/categories/" + delCat.dataset.delcat, { method: "DELETE" });
    await loadRestaurant(); toast("Category deleted");
    return;
  }
  const editCat = e.target.closest("[data-editcat]");
  if (editCat) {
    const c = R.categories.find((c) => c.id === editCat.dataset.editcat);
    const label = prompt("Rename category", c?.label || "");
    if (label && label.trim()) {
      await api("/api/owner/categories/" + editCat.dataset.editcat, { method: "PUT", body: { label: label.trim() } });
      await loadRestaurant(); toast("Category renamed");
    }
  }
});

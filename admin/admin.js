/* Admin panel — create & manage restaurant owners. */
const $ = (s) => document.querySelector(s);
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
const toast = (msg) => {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fullUrl = (path) => location.origin + path;

function show(view) {
  $("#loginView").hidden = view !== "login";
  $("#dashView").hidden = view !== "dash";
}

/* ---- boot ---- */
(async function () {
  try {
    const me = await api("/api/me");
    if (me.role === "admin") { show("dash"); loadOwners(); }
    else show("login");
  } catch { show("login"); }
})();

/* ---- login ---- */
$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#loginErr").textContent = "";
  try {
    const r = await api("/api/login", { method: "POST", body: { email: $("#email").value, password: $("#password").value } });
    if (r.role !== "admin") { $("#loginErr").textContent = "That account is not an admin."; return; }
    show("dash"); loadOwners();
  } catch (err) { $("#loginErr").textContent = err.message; }
});

$("#logoutBtn").addEventListener("click", async () => {
  await api("/api/logout", { method: "POST" });
  show("login");
});

/* ---- create owner ---- */
$("#createForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("#createErr").textContent = "";
  try {
    const r = await api("/api/admin/owners", {
      method: "POST",
      body: { restaurantName: $("#restaurantName").value, ownerEmail: $("#ownerEmail").value },
    });
    renderCredentials(r.owner);
    $("#createForm").reset();
    loadOwners();
    toast("Owner account created");
  } catch (err) { $("#createErr").textContent = err.message; }
});

function renderCredentials(o) {
  const url = fullUrl(o.path);
  $("#credBox").innerHTML = `
    <div class="cred">
      <h4><i class="ph ph-check-circle"></i> Account ready for ${esc(o.restaurantName)} — share these with the owner</h4>
      <div class="kv"><span class="k">Login email</span><span class="v">${esc(o.email)}</span><button class="copy" data-copy="${esc(o.email)}">Copy</button></div>
      <div class="kv"><span class="k">Password</span><span class="v">${esc(o.password)}</span><button class="copy" data-copy="${esc(o.password)}">Copy</button></div>
      <div class="kv"><span class="k">Customer URL</span><span class="v" style="font-size:12px">${esc(url)}</span><button class="copy" data-copy="${esc(url)}">Copy</button></div>
      <div class="kv"><span class="k">Owner login</span><span class="v" style="font-size:12px">${esc(location.origin)}/owner</span><button class="copy" data-copy="${esc(location.origin)}/owner">Copy</button></div>
    </div>`;
}

/* ---- owners list ---- */
async function loadOwners() {
  const { owners } = await api("/api/admin/owners");
  $("#ownerCount").textContent = owners.length + (owners.length === 1 ? " owner" : " owners");
  const list = $("#ownerList");
  if (!owners.length) { list.innerHTML = `<div class="empty-box"><i class="ph ph-users-three"></i><p>No owners yet — create one above.</p></div>`; return; }
  list.innerHTML = owners.map((o) => {
    const url = fullUrl("/r/" + o.restaurant.slug);
    return `
    <div class="owner-row">
      <div class="meta">
        <div class="name">${esc(o.restaurant.name || "—")}</div>
        <div class="sub">${esc(o.email)} · ${o.restaurant.items} dishes · ${o.restaurant.tables} tables · /r/${esc(o.restaurant.slug)}</div>
        ${o.tempPassword ? `<div class="sub" style="color:var(--ig-4)">Temp password: <b>${esc(o.tempPassword)}</b> (until first login)</div>` : ""}
      </div>
      <div class="actions">
        <a class="btn btn-sm" href="${url}" target="_blank" title="Open customer site"><i class="ph ph-arrow-square-out"></i></a>
        <button class="btn btn-sm" data-copyurl="${esc(url)}" title="Copy URL"><i class="ph ph-link"></i></button>
        <button class="btn btn-sm" data-reset="${o.id}" title="Reset password"><i class="ph ph-key"></i></button>
        <button class="btn btn-sm btn-danger" data-del="${o.id}" data-name="${esc(o.restaurant.name)}" title="Delete"><i class="ph ph-trash"></i></button>
      </div>
    </div>`;
  }).join("");
}

/* ---- delegated actions ---- */
document.addEventListener("click", async (e) => {
  const c = e.target.closest("[data-copy],[data-copyurl],[data-reset],[data-del]");
  if (!c) return;
  if (c.dataset.copy || c.dataset.copyurl) {
    await navigator.clipboard.writeText(c.dataset.copy || c.dataset.copyurl);
    toast("Copied to clipboard");
    return;
  }
  if (c.dataset.reset) {
    if (!confirm("Generate a new password for this owner?")) return;
    const r = await api(`/api/admin/owners/${c.dataset.reset}/reset-password`, { method: "POST" });
    await navigator.clipboard.writeText(r.password).catch(() => {});
    toast("New password: " + r.password + " (copied)");
    loadOwners();
    return;
  }
  if (c.dataset.del) {
    if (!confirm(`Delete "${c.dataset.name}" and its owner account? This cannot be undone.`)) return;
    await api(`/api/admin/owners/${c.dataset.del}`, { method: "DELETE" });
    toast("Owner deleted");
    loadOwners();
  }
});

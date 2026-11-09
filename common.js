"use strict";
(function () {
const CFG = window.BRAMBO_CONFIG || {}, KEY = (CFG.apiKey || "").trim(), IMG = "https://image.tmdb.org/t/p";
const B = window.B = {};
const $ = B.$ = (s, r = document) => r.querySelector(s);
B.hasKey = !!KEY;
B.el = (t, a = {}, ...k) => { const e = document.createElement(t); for (const [n, v] of Object.entries(a)) { if (v == null || v === false) continue; if (n === "class") e.className = v; else if (n.startsWith("on")) e.addEventListener(n.slice(2), v); else e.setAttribute(n, v); } e.append(...k.filter(x => x != null)); return e; };
const h = B.el;
B.img = (p, s = "w342") => `${IMG}/${s}${p}`;
B.shuffle = l => { const c = l.slice(); for (let i = c.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [c[i], c[j]] = [c[j], c[i]]; } return c; };
B.iso = d => d.toISOString().slice(0, 10);
B.daysFrom = n => { const d = new Date(); d.setDate(d.getDate() + n); return d; };
const cache = new Map();
B.tmdb = (path, params = {}) => {
  if (!KEY) return Promise.reject(new Error("TMDB key missing"));
  const u = new URL("https://api.themoviedb.org/3" + path); u.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const hd = { Accept: "application/json" };
  if (CFG.apiType === "read-token") hd.Authorization = "Bearer " + KEY; else u.searchParams.set("api_key", KEY);
  const k = u.toString();
  if (!cache.has(k)) cache.set(k, fetch(u, { headers: hd }).then(r => { if (!r.ok) { cache.delete(k); throw new Error(r.status); } return r.json(); }).catch(e => { cache.delete(k); throw e; }));
  return cache.get(k);
};

const U = "brambo.users", S = "brambo.session", T = "brambo.token";
const all = () => { try { return JSON.parse(localStorage.getItem(U)) || {}; } catch { return {}; } };
B.users = all;
B.token = () => { // returns the stored JWT, or null if missing/expired
  const t = localStorage.getItem(T); if (!t) return null;
  try { const p = JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); if (p.exp && p.exp * 1000 < Date.now()) return null; } catch { return null; }
  return t;
};
B.me = () => (B.token() && all()[localStorage.getItem(S)]) || null;
B.update = fn => { const a = all(), id = localStorage.getItem(S), u = a[id]; fn(u); a[id] = u; try { localStorage.setItem(U, JSON.stringify(a)); } catch { B.toast("Storage is full. Remove an image and retry."); } dispatchEvent(new Event("brambo")); return u; };
B.guard = () => { if (!B.me()) { localStorage.removeItem(S); localStorage.removeItem(T); location.replace("auth.html?mode=login"); throw new Error("redirect"); } };
B.logout = () => { localStorage.removeItem(S); localStorage.removeItem(T); location.href = "auth.html?mode=login"; };
/* POST JSON to the Brambo API. Throws Error(message) with the server's message when it rejects the request. */
B.api = async (path, body) => {
  let r; try { r = await fetch((CFG.apiBase || "") + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
  catch { throw new Error("Cannot reach the Brambo server. Start it with `npm start` in the server folder."); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || "Request failed (" + r.status + ").");
  return data;
};
/* Called after a successful signup/login: remember the token and make sure this user has a local activity record. */
B.startSession = ({ token, user }) => {
  const a = all(), old = a[user.id];
  a[user.id] = { profile: { bio: "", avatar: "", banner: "" }, progress: {}, later: [], favs: [], reviews: [], ...old, id: user.id, username: user.username, email: user.email };
  localStorage.setItem(U, JSON.stringify(a)); localStorage.setItem(T, token); localStorage.setItem(S, user.id);
};
B.stats = u => { let eps = 0, mins = 0, seasons = 0; Object.values(u.progress).forEach(p => p.seasons.forEach(s => { const w = p.w[s.n] || 0; eps += w; mins += w * p.runtime; if (w >= s.eps) seasons++; })); return { eps, mins, seasons, shows: Object.values(u.progress).filter(p => Object.values(p.w).some(x => x > 0)) }; };
B.fmtTime = m => { const hr = Math.floor(m / 60); return hr >= 24 ? `${Math.floor(hr / 24)}d ${hr % 24}h` : `${hr}h ${m % 60}m`; };
B.next = p => { for (const s of p.seasons) if ((p.w[s.n] || 0) < s.eps) return { s: s.n, e: (p.w[s.n] || 0) + 1 }; return null; };
B.pct = p => { const t = p.seasons.reduce((a, s) => a + s.eps, 0), w = p.seasons.reduce((a, s) => a + Math.min(p.w[s.n] || 0, s.eps), 0); return t ? w / t * 100 : 0; };
/* ---- ui ---- */
B.toast = m => { let t = $("#toast") || document.body.appendChild(h("div", { id: "toast", class: "toast", role: "status" })); t.textContent = m; t.classList.add("on"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2600); };
B.avatar = (u, cls = "") => u.profile.avatar ? h("img", { class: "avatar " + cls, src: u.profile.avatar, alt: "" }) : h("span", { class: "avatar " + cls }, u.username[0].toUpperCase());
B.card = (s, o = {}) => {
  const b = h("button", { type: "button", class: "poster-card", onclick: () => B.openShow(s.id) },
    h("span", { class: "poster-frame" }, h("img", { src: B.img(s.poster_path), alt: "", loading: "lazy" }), o.rank ? h("span", { class: "rank" }, o.rank) : null),
    h("span", { class: "poster-title" }, s.name));
  if (o.pct != null) b.append(h("span", { class: "poster-progress" }, h("span", { style: `width:${o.pct}%` })));
  (o.meta || []).forEach(m => b.append(h("span", { class: "poster-rating" }, m)));
  return h("li", {}, b);
};
B.carousel = items => { const t = h("ul", { class: "poster-grid" }, ...items); const go = d => t.scrollBy({ left: d * 600, behavior: "smooth" });
  return h("div", { class: "poster-carousel" }, h("button", { type: "button", class: "carousel-arrow carousel-prev", "aria-label": "Scroll left", onclick: () => go(-1) }, "‹"), t, h("button", { type: "button", class: "carousel-arrow carousel-next", "aria-label": "Scroll right", onclick: () => go(1) }, "›")); };
B.row = (id, title, sub, body) => h("section", { class: "series-row", "data-row": id }, h("header", { class: "row-head" }, h("h2", { class: "row-title" }, title), h("p", { class: "row-sub" }, sub)), body);
B.empty = (msg, href, label) => h("div", { class: "row-status" }, h("p", {}, msg), href ? h("a", { class: "btn btn-ghost btn-compact", href }, label) : null);
/* Live title filter. Hides poster cards (and rows with no matches) inside `scope` as the user types.
   Works with cards that load later (MutationObserver) so it can sit on top of async TMDB rows. */
B.filterBar = (scope, placeholder = "Filter series by title") => {
  const input = h("input", { type: "search", class: "filter-input", placeholder, "aria-label": placeholder, autocomplete: "off" });
  const none = h("p", { class: "row-status", hidden: "" }, "No series match your filter.");
  let raf = 0;
  const apply = () => {
    const q = input.value.trim().toLowerCase(); let shown = 0;
    scope.querySelectorAll(".poster-card").forEach(c => { const hit = !q || (c.querySelector(".poster-title") || c).textContent.toLowerCase().includes(q); c.parentElement.hidden = !hit; if (hit) shown++; });
    scope.querySelectorAll(".series-row").forEach(r => { r.hidden = !!q && ![...r.querySelectorAll(".poster-card")].some(c => !c.parentElement.hidden); });
    none.hidden = !(q && shown === 0);
  };
  input.addEventListener("input", apply);
  new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(apply); }).observe(scope, { childList: true, subtree: true });
  return h("div", { class: "filter-bar" }, input, none);
};
B.header = active => {
  const u = B.me(), nav = [["home", "home.html", "Home"], ["reviews", "reviews.html", "Reviews"], ["editors", "editors.html", "Editor's choice"]];
  const results = h("ul", { class: "search-pop", hidden: "" }), input = h("input", { type: "search", placeholder: "Search series", "aria-label": "Search series", autocomplete: "off" });
  let t; input.addEventListener("input", () => { clearTimeout(t); const q = input.value.trim(); if (q.length < 2) { results.hidden = true; return; }
    t = setTimeout(async () => { try { const r = (await B.tmdb("/search/tv", { query: q })).results.filter(x => x.poster_path).slice(0, 6); results.replaceChildren(...(r.length ? r.map(x => h("li", {}, h("button", { type: "button", onclick: () => { results.hidden = true; input.value = ""; B.openShow(x.id); } }, h("img", { src: B.img(x.poster_path, "w92"), alt: "" }), h("span", {}, x.name, h("small", {}, (x.first_air_date || "").slice(0, 4)))))) : [h("li", { class: "none" }, "No series found")])); results.hidden = false; } catch { results.replaceChildren(h("li", { class: "none" }, "Search needs a valid TMDB key")); results.hidden = false; } }, 300); });
  document.addEventListener("click", e => { if (!e.target.closest(".nav-search")) results.hidden = true; });
  const menu = h("div", { class: "user-menu", hidden: "" }, h("a", { href: "profile.html" }, "Profile"), h("button", { type: "button", onclick: B.logout }, "Log out"));
  const av = h("button", { type: "button", class: "avatar-btn", "aria-label": "Account menu", "aria-expanded": "false", onclick: e => { e.stopPropagation(); menu.hidden = !menu.hidden; av.setAttribute("aria-expanded", String(!menu.hidden)); } }, B.avatar(u));
  document.addEventListener("click", () => { menu.hidden = true; });
  const toggle = h("button", { type: "button", class: "menu-toggle", "aria-expanded": "false", "aria-label": "Toggle navigation menu", onclick: () => { const o = site.classList.toggle("is-open"); toggle.setAttribute("aria-expanded", o); } }, h("span", { class: "menu-bars" }));
  const site = h("div", { class: "site-menu" }, h("nav", { class: "site-nav" }, h("ul", { class: "nav-list" }, ...nav.map(n => h("li", {}, h("a", { href: n[1], ...(n[0] === active ? { "aria-current": "true" } : {}) }, n[2]))))), h("div", { class: "nav-search" }, input, results), h("div", { class: "nav-user" }, av, menu));
  const hd = h("header", { class: "site-header" + (active === "home" ? "" : " is-scrolled"), id: "site-header" }, h("div", { class: "wrap header-inner" }, h("a", { href: "home.html", class: "brand", "aria-label": "Brambo home" }, h("span", { class: "brand-word" }, "BRAMBO")), toggle, site));
  document.body.prepend(hd);
  addEventListener("scroll", () => hd.classList.toggle("is-scrolled", active !== "home" || scrollY > 40), { passive: true });
};
B.openShow = async id => {
  const d = $("#sd") || document.body.appendChild(h("dialog", { id: "sd", class: "dialog sd" }));
  d.onclick = e => { if (e.target === d) d.close(); };
  d.replaceChildren(h("p", { class: "dialog-message pad" }, "Loading…")); if (!d.open) d.showModal();
  let t; try { t = await B.tmdb("/tv/" + id); } catch { d.replaceChildren(h("p", { class: "dialog-message pad" }, "Could not load this series. Check the TMDB key.")); return; }
  const snap = { id: t.id, name: t.name, poster_path: t.poster_path, backdrop_path: t.backdrop_path };
  const seasons = t.seasons.filter(s => s.season_number > 0 && s.episode_count > 0).map(s => ({ n: s.season_number, eps: s.episode_count }));
  const runtime = (t.episode_run_time || [])[0] || 45;
  const draw = () => {
    const u = B.me(), p = u.progress[id], later = u.later.some(x => x.id === id), fav = u.favs.some(x => x.id === id), nx = p ? B.next(p) : seasons.length ? { s: seasons[0].n, e: 1 } : null, mine = u.reviews.find(r => r.id === id);
    const rate = h("select", { "aria-label": "Rating" }, ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => h("option", { value: n }, n + " / 10"))), txt = h("textarea", { rows: 3, maxlength: 500, placeholder: "What did you think?", "aria-label": "Review" });
    d.replaceChildren(h("div", { class: "sd-body" },
      h("button", { type: "button", class: "dialog-close", "aria-label": "Close", onclick: () => d.close() }, "✕"),
      h("div", { class: "sd-top" }, t.poster_path ? h("img", { src: B.img(t.poster_path), alt: "" }) : null, h("div", {}, h("h2", { class: "dialog-title" }, t.name), h("p", { class: "sd-meta" }, [(t.first_air_date || "").slice(0, 4), t.number_of_seasons + " seasons", t.vote_average ? "★ " + t.vote_average.toFixed(1) : "", t.genres.slice(0, 2).map(g => g.name).join(", ")].filter(Boolean).join("  |  ")), h("p", { class: "dialog-message" }, t.overview || "No overview available."))),
      h("div", { class: "sd-actions" },
        h("button", { type: "button", class: "btn btn-primary btn-compact", disabled: nx ? null : "", onclick: () => B.update(u => { const q = u.progress[id] || (u.progress[id] = { show: snap, seasons, runtime, w: {} }); const n = B.next(q); if (n) q.w[n.s] = (q.w[n.s] || 0) + 1; q.at = Date.now(); u.later = u.later.filter(x => x.id !== id); }) }, nx ? (p ? `Log S${nx.s} E${nx.e}` : "Start watching") : "Completed"),
        h("button", { type: "button", class: "btn btn-ghost btn-compact", "aria-pressed": later, onclick: () => B.update(u => { u.later = later ? u.later.filter(x => x.id !== id) : [snap, ...u.later]; }) }, later ? "Remove from watch later" : "Watch later"),
        h("button", { type: "button", class: "btn btn-ghost btn-compact", "aria-pressed": fav, onclick: () => B.update(u => { u.favs = fav ? u.favs.filter(x => x.id !== id) : [snap, ...u.favs]; }) }, fav ? "Remove favourite" : "Add favourite")),
      p ? h("p", { class: "sd-meta" }, `Progress: ${Math.round(B.pct(p))}% of ${seasons.length} seasons`) : null,
      h("div", { class: "sd-review" }, h("h3", {}, mine ? "Your review" : "Write a review"), mine ? h("p", { class: "dialog-message" }, `★ ${mine.rating}/10. ${mine.text}`) : h("div", { class: "field-row" }, rate, txt, h("button", { type: "button", class: "btn btn-primary btn-compact", onclick: () => { if (!txt.value.trim()) { B.toast("Write a few words first."); return; } B.update(u => u.reviews.unshift({ ...snap, rating: +rate.value, text: txt.value.trim(), at: Date.now() })); } }, "Post review")))));
  };
  draw(); B._redraw = draw;
};
addEventListener("brambo", () => { const d = $("#sd"); if (d && d.open && B._redraw) B._redraw(); });

})();

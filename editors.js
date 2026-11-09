"use strict";
B.guard(); B.header("editors");
const h = B.el, root = B.$("#root");
const GENRES = { "Action & Adventure": 10759, Animation: 16, Comedy: 35, Crime: 80, Documentary: 99, Drama: 18, Family: 10751, Mystery: 9648, "Sci-Fi & Fantasy": 10765, "War & Politics": 10768 };
const COUNTRIES = { "United States": "US", "United Kingdom": "GB", India: "IN", "South Korea": "KR", Japan: "JP", France: "FR", Germany: "DE", Spain: "ES", Canada: "CA", Australia: "AU", Turkey: "TR", Brazil: "BR" };
const COLL = { "Top 10": "top10", "Newly released": "new", "Critically acclaimed": "acclaimed", "Fan favourites": "fans" };
const group = (name, legend, map) => h("fieldset", {}, h("legend", {}, legend), h("div", { class: "checks" }, ...Object.entries(map).map(([k, v]) => h("label", {}, h("input", { type: "checkbox", name, value: v }), k))));
const pop = h("form", { class: "pop", hidden: "" }, group("c", "Collections", COLL), group("g", "Genres", GENRES), group("n", "Countries", COUNTRIES),
  h("div", { class: "pop-actions" }, h("button", { type: "button", class: "btn btn-ghost btn-compact", onclick: () => { pop.reset(); run(); } }, "Clear"), h("button", { type: "submit", class: "btn btn-primary btn-compact" }, "Apply")));
const btn = h("button", { type: "button", class: "btn btn-ghost btn-compact", "aria-expanded": "false", onclick: e => { e.stopPropagation(); pop.hidden = !pop.hidden; btn.setAttribute("aria-expanded", String(!pop.hidden)); } }, "Sort by");
pop.onclick = e => e.stopPropagation(); document.addEventListener("click", () => { pop.hidden = true; });
addEventListener("keydown", e => { if (e.key === "Escape") pop.hidden = true; });
const out = h("div"), count = h("p", { class: "page-sub" });
root.append(h("div", { class: "bar" }, h("div", {}, h("h1", { class: "page-title" }, "Editor's choice"), count), h("div", { class: "sortby" }, btn, pop)), out);
out.before(B.filterBar(out, "Filter these results by title"));
pop.onsubmit = e => { e.preventDefault(); pop.hidden = true; run(); };
async function run() {
  const f = n => [...pop.querySelectorAll(`[name=${n}]:checked`)].map(i => i.value), c = f("c"), g = f("g"), n = f("n");
  const p = { sort_by: "vote_average.desc", "vote_count.gte": 1000, without_genres: "10763,10767" };
  if (c.includes("new")) { p["first_air_date.gte"] = B.iso(B.daysFrom(-180)); p["first_air_date.lte"] = B.iso(new Date()); p["vote_count.gte"] = 25; }
  if (c.includes("acclaimed")) p["vote_average.gte"] = 8.2;
  if (c.includes("fans")) { p.sort_by = "popularity.desc"; p["vote_count.gte"] = 300; }
  if (g.length) p.with_genres = g.join("|");
  if (n.length) p.with_origin_country = n.join("|");
  out.replaceChildren(h("p", { class: "row-status" }, "Loading…"));
  try {
    const r = (await Promise.all([1, 2].map(page => B.tmdb("/discover/tv", { ...p, page })))).flatMap(x => x.results).filter(s => s.poster_path);
    const list = c.includes("top10") ? r.slice(0, 10) : r.slice(0, 30);
    count.textContent = `${list.length} series` + (c.length + g.length + n.length ? " match your filters" : " rated highest by viewers");
    out.replaceChildren(list.length ? h("ul", { class: "poster-grid" }, ...list.map((s, i) => B.card(s, { rank: c.includes("top10") ? i + 1 : null, meta: ["★ " + s.vote_average.toFixed(1)] }))) : B.empty("No series match those filters. Clear a filter and retry."));
  } catch { out.replaceChildren(B.empty("Could not load from TMDB. Check the API key in config.js.")); }
}
run();

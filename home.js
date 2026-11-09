"use strict";
B.guard(); B.header("home");
const u0 = B.me(), h = B.el, rows = B.$("#rows");
B.$("#hello").textContent = `WELCOME BACK, ${u0.username.toUpperCase()}.`;
rows.prepend(B.filterBar(rows, "Filter your rows by series title"));
const mount = {};
const section = (id, t, s) => { const body = h("div"); rows.append(B.row(id, t, s, body)); mount[id] = body; };
section("soon", "Coming soon", "Series premiering in the next six months");
section("continue", "Continue watching", "Your next episode is one click away");
section("later", "Watch later", "Series you saved for later");
section("friends", "Friends' recents", "What your friends watched lately");
function local() {
  const u = B.me();
  const cw = Object.values(u.progress).filter(p => B.next(p) && Object.values(p.w).some(x => x > 0)).sort((a, b) => b.at - a.at);
  mount.continue.replaceChildren(cw.length ? B.carousel(cw.map(p => { const n = B.next(p); return B.card(p.show, { pct: B.pct(p), meta: [`Next: S${n.s} E${n.e}`] }); })) : B.empty("Nothing in progress yet. Open any series and tap Start watching."));
  mount.later.replaceChildren(u.later.length ? B.carousel(u.later.map(s => B.card(s))) : B.empty("Your watch later list is empty. Save a series from Coming soon or search."));
}
local(); addEventListener("brambo", local);
const FRIENDS = ["Maya", "Arjun", "Lena", "Diego", "Priya"];
(async () => {
  if (!B.hasKey) { [mount.soon, mount.friends].forEach(m => m.replaceChildren(B.empty("TMDB key required. Set apiKey in config.js."))); return; }
  try {
    const [soon, ...pop] = await Promise.all([
      B.tmdb("/discover/tv", { "first_air_date.gte": B.iso(B.daysFrom(1)), "first_air_date.lte": B.iso(B.daysFrom(180)), sort_by: "popularity.desc", without_genres: "10763,10767" }),
      B.tmdb("/tv/popular", { page: 1 }), B.tmdb("/tv/popular", { page: 2 })]);
    const up = soon.results.filter(s => s.poster_path).slice(0, 18);
    mount.soon.replaceChildren(up.length ? B.carousel(up.map(s => B.card(s, { meta: ["Premieres " + new Date(s.first_air_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })] }))) : B.empty("No upcoming premieres found."));
    const pool = B.shuffle(pop.flatMap(p => p.results).filter(s => s.poster_path && s.backdrop_path));
    const hero = B.$("#hero-image"); let i = 0;
    const next = () => { const s = pool[i++ % pool.length]; hero.classList.remove("is-ready"); hero.onload = () => hero.classList.add("is-ready"); hero.src = B.img(s.backdrop_path, "w1280"); };
    next(); setInterval(next, 10000);
    let r = [...(u0.id + new Date().toDateString())].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); const rnd = () => (r = (r * 1664525 + 1013904223) >>> 0) / 4294967296;
    const fr = FRIENDS.flatMap((f, k) => Array.from({ length: 3 }, (_, j) => ({ f, s: pool[(k * 3 + j + 5) % pool.length], ep: 1 + (rnd() * 6 | 0), ago: 1 + (rnd() * 47 | 0) }))).sort((a, b) => a.ago - b.ago);
    mount.friends.replaceChildren(B.carousel(fr.map(x => B.card(x.s, { meta: [`${x.f} watched S1 E${x.ep}`, x.ago < 24 ? `${x.ago}h ago` : "Yesterday"] }))));
  } catch (e) { mount.soon.replaceChildren(B.empty("Could not load from TMDB. Check the API key.")); mount.friends.replaceChildren(B.empty("Could not load from TMDB.")); }
})();

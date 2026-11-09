"use strict";
B.guard(); B.header("reviews");
const h = B.el, root = B.$("#root");
const card = r => { const t = h("p", { class: "t" }, r.text), more = h("button", { type: "button", class: "more", onclick: () => { t.classList.toggle("open"); more.textContent = t.classList.contains("open") ? "Show less" : "Read more"; } }, "Read more");
  return h("article", { class: "rv" }, r.poster_path ? h("img", { src: B.img(r.poster_path, "w154"), alt: "" }) : null, h("div", {}, h("h3", {}, r.name), h("p", { class: "by" }, `${r.by}${r.rating ? "  |  ★ " + r.rating + "/10" : ""}`), t, r.text.length > 240 ? more : null)); };
const mine = h("div", { class: "rv-list" }), comm = h("div", { class: "rv-list" });
const drawMine = () => { const u = B.me(); mine.replaceChildren(...(u.reviews.length ? u.reviews.map(r => card({ ...r, by: "You" })) : [B.empty("You have not reviewed anything yet.")])); };
root.append(h("h1", { class: "page-title" }, "Reviews"), h("p", { class: "page-sub" }, "Write your own and read what the community says."),
  h("div", { class: "composer" }, h("h2", {}, "Write a review"), h("p", { class: "page-sub" }, "Search a series in the top bar, open it and post your review there. It appears below and on your profile.")),
  h("h2", { class: "row-title" }, "Your reviews"), mine, h("h2", { class: "row-title", style: "margin-top:56px" }, "Community reviews"), comm);
drawMine(); addEventListener("brambo", drawMine);
(async () => {
  if (!B.hasKey) { comm.replaceChildren(B.empty("TMDB key required. Set apiKey in config.js.")); return; }
  try {
    const shows = (await B.tmdb("/tv/top_rated")).results.slice(0, 20);
    const res = await Promise.allSettled(shows.map(s => B.tmdb(`/tv/${s.id}/reviews`).then(r => r.results.slice(0, 1).map(x => ({ ...s, by: x.author, rating: x.author_details && x.author_details.rating, text: x.content, at: x.created_at })))));
    const list = res.flatMap(r => r.status === "fulfilled" ? r.value : []).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
    comm.replaceChildren(...(list.length ? list.map(card) : [B.empty("No community reviews available right now.")]));
  } catch { comm.replaceChildren(B.empty("Could not load reviews from TMDB.")); }
})();

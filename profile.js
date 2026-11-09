"use strict";
B.guard(); B.header("profile");
const h = B.el, root = B.$("#root");
const shrink = (file, w, hgt) => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement("canvas"); c.width = w; c.height = hgt; const x = c.getContext("2d"), k = Math.max(w / i.width, hgt / i.height); x.drawImage(i, (w - i.width * k) / 2, (hgt - i.height * k) / 2, i.width * k, i.height * k); res(c.toDataURL("image/jpeg", .82)); }; i.src = URL.createObjectURL(file); });
function edit() {
  const u = B.me(), bio = h("textarea", { rows: 3, maxlength: 160 }), a = h("input", { type: "file", accept: "image/*" }), b = h("input", { type: "file", accept: "image/*" }); bio.value = u.profile.bio;
  const d = h("dialog", { class: "dialog", onclick: e => { if (e.target === d) { d.close(); d.remove(); } } }, h("form", { class: "dialog-panel", onsubmit: async e => { e.preventDefault(); const av = a.files[0] && await shrink(a.files[0], 256, 256), bn = b.files[0] && await shrink(b.files[0], 1200, 400); d.close(); d.remove(); B.update(x => { x.profile.bio = bio.value.trim(); if (av) x.profile.avatar = av; if (bn) x.profile.banner = bn; }); } },
    h("h2", { class: "dialog-title" }, "Edit profile"), h("div", { class: "field-row", style: "margin-top:16px" }, h("label", {}, "Profile picture", a), h("label", {}, "Banner", b), h("label", {}, "Bio", bio), h("button", { class: "btn btn-primary btn-compact", type: "submit" }, "Save changes"))));
  document.body.append(d); d.showModal();
}
function draw() {
  const u = B.me(), st = B.stats(u), stat = (v, l) => h("div", { class: "stat" }, h("b", {}, String(v)), h("span", {}, l));
  const grid = (list, f) => list.length ? h("ul", { class: "poster-grid" }, ...list.map(f)) : B.empty("Nothing here yet.");
  root.replaceChildren(
    h("div", { class: "banner", style: u.profile.banner ? `background-image:url(${u.profile.banner})` : "" }),
    h("div", { class: "pf-head" }, B.avatar(u, "xl"), h("div", { class: "info" }, h("h1", {}, u.username), h("p", {}, u.profile.bio || "Add a short bio so friends know your taste.")), h("button", { class: "btn btn-ghost btn-compact", type: "button", onclick: edit }, "Edit profile")),
    h("div", { class: "stats" }, stat(B.fmtTime(st.mins), "Total time spent"), stat(st.seasons, "Seasons completed"), stat(st.eps, "Episodes watched")),
    h("div", { class: "stats small" }, stat(st.shows.length, "Shows watched"), stat(u.favs.length, "Favourites"), stat(u.reviews.length, "Reviews")),
    h("section", { class: "pf-sec" }, h("h2", { class: "row-title" }, "Shows watched"), h("div", { style: "margin-top:24px" }, grid(st.shows, p => B.card(p.show, { pct: B.pct(p), meta: [Math.round(B.pct(p)) + "% watched"] })))),
    h("section", { class: "pf-sec" }, h("h2", { class: "row-title" }, "Favourites"), h("div", { style: "margin-top:24px" }, grid(u.favs, s => B.card(s)))),
    h("section", { class: "pf-sec" }, h("h2", { class: "row-title" }, "Reviews"), h("div", { class: "rv-list" }, ...(u.reviews.length ? u.reviews.map(r => h("article", { class: "rv" }, r.poster_path ? h("img", { src: B.img(r.poster_path, "w154"), alt: "" }) : null, h("div", {}, h("h3", {}, r.name), h("p", { class: "by" }, `★ ${r.rating}/10`), h("p", { class: "t open" }, r.text), h("button", { class: "more", type: "button", onclick: () => B.update(x => { x.reviews = x.reviews.filter(y => y.at !== r.at); }) }, "Delete")))) : [B.empty("No reviews yet.", "reviews.html", "Go to reviews")]))));
}
draw(); addEventListener("brambo", () => { if (!document.querySelector("#sd[open]")) draw(); });

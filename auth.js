"use strict";
const h = B.el, form = B.$("#form");
if (B.me()) location.replace("home.html"); // already logged in
const FIELDS = {
  login: [["id", "Username or email", "text", "username"], ["pw", "Password", "password", "current-password"]],
  signup: [["user", "Username", "text", "username"], ["email", "Email", "email", "email"], ["pw", "Password", "password", "new-password"], ["pw2", "Confirm password", "password", "new-password"]]
};
let mode = new URLSearchParams(location.search).get("mode") === "login" ? "login" : "signup";
function render() {
  document.title = (mode === "login" ? "Log in" : "Sign up") + " | BRAMBO";
  ["login", "signup"].forEach(m => { const t = B.$("#t-" + m); t.setAttribute("aria-selected", m === mode); t.onclick = () => { mode = m; history.replaceState(null, "", "?mode=" + m); render(); }; });
  const err = h("p", { class: "err", role: "alert" });
  form.replaceChildren(...FIELDS[mode].map(([n, l, t, a]) => h("label", { class: "field" }, h("span", {}, l), h("input", { name: n, type: t, autocomplete: a, required: "" }))), err,
    h("button", { class: "btn btn-primary btn-large", type: "submit" }, mode === "login" ? "Log in" : "Create account"));
  form.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form)), btn = form.querySelector("button[type=submit]"), fail = m => { err.textContent = m; };
    err.textContent = "";
    let path, body;
    if (mode === "login") {
      if (!v.id.trim() || !v.pw) return fail("Enter your username or email and password.");
      path = "/api/login"; body = { identifier: v.id.trim(), password: v.pw };
    } else {
      const name = v.user.trim(), mail = v.email.trim().toLowerCase();
      if (!/^[A-Za-z0-9_.]{3,20}$/.test(name)) return fail("Username must be 3-20 letters, numbers, dots or underscores.");
      if (!/^\S+@\S+\.\S+$/.test(mail)) return fail("Enter a valid email address.");
      if (v.pw.length < 8) return fail("Password must be at least 8 characters.");
      if (v.pw !== v.pw2) return fail("Passwords do not match.");
      path = "/api/signup"; body = { username: name, email: mail, password: v.pw };
    }
    btn.disabled = true; const label = btn.textContent; btn.textContent = "Please wait…";
    try { B.startSession(await B.api(path, body)); location.href = "home.html"; }
    catch (x) { fail(x.message); btn.disabled = false; btn.textContent = label; }
  };
}
render();
/* Poster wall: uniform columns, shuffled posters, one constant speed (px/s), alternating direction */
const SPEED = 30, GAP = 14, wall = B.$("#wall");
function build(posters) {
  const n = innerWidth > 1200 ? 8 : innerWidth > 800 ? 6 : innerWidth > 520 ? 4 : 3, cw = (innerWidth - GAP * (n - 1)) / n, ch = cw * 1.5, per = Math.ceil(innerHeight / (ch + GAP)) + 2, pool = B.shuffle(posters);
  wall.replaceChildren(...Array.from({ length: n }, (_, i) => {
    const half = () => h("div", { class: "half" }, ...Array.from({ length: per }, (_, j) => h("img", { src: B.img(pool[(j * n + i) % pool.length], cw > 200 ? "w342" : "w185"), alt: "", onload: e => e.target.classList.add("in") })));
    return h("div", { class: "col" }, h("div", { class: "track" + (i % 2 ? " rev" : ""), style: `animation-duration:${(ch + GAP) * per / SPEED}s` }, half(), half()));
  }));
}
(async () => {
  if (!B.hasKey) { console.warn("Set apiKey in config.js to enable the poster wall."); return; }
  try {
    const pages = await Promise.all([1, 2, 3, 4, 5, 6].map(p => B.tmdb("/tv/popular", { page: p })));
    const posters = [...new Set(pages.flatMap(p => p.results).map(r => r.poster_path).filter(Boolean))];
    if (posters.length < 60) return; build(posters); let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => build(posters), 300); });
  } catch (e) { console.warn("Poster wall unavailable:", e.message); }
})();

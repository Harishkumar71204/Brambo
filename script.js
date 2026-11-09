"use strict";

if (window.B && B.me()) location.replace("home.html");

const TMDB_API_KEY = (window.BRAMBO_CONFIG && window.BRAMBO_CONFIG.apiKey) || ""; // set in config.js
const TMDB_API_TYPE = (window.BRAMBO_CONFIG && window.BRAMBO_CONFIG.apiType) || "v3";
const TMDB_REGION = "IN";
const TMDB_LANGUAGE = "en-US";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const NETFLIX_PROVIDER_ID = 8;
const HBO_NETWORK_IDS = "49|3186";
const NOISE_GENRES = "10763,10767";
const GRID_STEP = 12;
const REQUEST_TIMEOUT_MS = 12000;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const isoDate = (date) => date.toISOString().slice(0, 10);
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isConfigured() {
  return typeof TMDB_API_KEY === "string" && TMDB_API_KEY.trim() !== "";
}

class TmdbError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "TmdbError";
    this.status = status;
  }
}

const inflight = new Map();

function tmdbRequest(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set("language", TMDB_LANGUAGE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });

  const cacheKey = url.toString();
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const headers = { Accept: "application/json" };
  if (TMDB_API_TYPE === "read-token") {
    headers.Authorization = `Bearer ${TMDB_API_KEY}`;
  } else {
    url.searchParams.set("api_key", TMDB_API_KEY);
  }

  const promise = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(url, { headers, signal: controller.signal });
    } catch (error) {
      throw new TmdbError("Network error or timeout", 0);
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new TmdbError(`TMDB responded with ${response.status}`, response.status);
    return response.json();
  })();

  inflight.set(cacheKey, promise);
  const cleanup = () => inflight.delete(cacheKey);
  promise.then(cleanup, cleanup);
  return promise;
}

function discoverTv(params = {}) {
  return tmdbRequest("/discover/tv", {
    sort_by: "popularity.desc",
    include_adult: "false",
    ...params,
  });
}

const streamingFilters = () => ({
  watch_region: TMDB_REGION,
  with_watch_monetization_types: "flatrate",
  without_genres: NOISE_GENRES,
});


const ROWS = [
  {
    id: "popular",
    limit: 12,
    fetch: () => discoverTv({ ...streamingFilters(), "vote_count.gte": 50 }),
  },
  {
    id: "new",
    limit: 12,
    fetch: () => discoverTv({
      ...streamingFilters(),
      "first_air_date.gte": isoDate(daysAgo(180)),
      "first_air_date.lte": isoDate(new Date()),
    }),
  },
  {
    id: "netflix",
    limit: 12,
    fetch: () => discoverTv({ ...streamingFilters(), with_watch_providers: NETFLIX_PROVIDER_ID }),
  },
  {
    id: "hbo",
    limit: 12,
    fetch: () => discoverTv({ with_networks: HBO_NETWORK_IDS, without_genres: NOISE_GENRES, "vote_count.gte": 50 }),
  },
  {
    id: "more",
    limit: 24,
    dedupe: true,
    fetch: async () => {
      const start = randomInt(1, 6);
      const pages = await Promise.all([start, start + 1].map((page) =>
        discoverTv({ ...streamingFilters(), "vote_count.gte": 200, page })
      ));
      return { results: pages.flatMap((page) => page.results || []) };
    },
  },
];

const shownIds = new Set();
let authFailed = false;


let topRatedAllSeries = [];
let topRatedPageIndex = 0;

const FEATURE_TAGLINES = [
  "ALL IN ONE PLACE",
  "ONE SEARCH",
  "ONE WATCHLIST",
  "CRITICALLY ACCLAIMED",
  "HIGHEST RATED",
  "MUST WATCH SERIES"
];

async function loadTopRatedFeatureBlock() {
  const container = $('[data-row="top-rated-feature"] [data-row-body]');
  if (!container) return;

  container.setAttribute("aria-busy", "true");
  container.innerHTML = `
    <div class="feature-slider-wrapper skeleton">
      <div class="feature-cards-grid">
        <div class="feature-card"><div class="skeleton-box" style="width:120px;height:160px;margin-bottom:16px;"></div><div class="skeleton-line"></div></div>
        <div class="feature-card"><div class="skeleton-box" style="width:120px;height:160px;margin-bottom:16px;"></div><div class="skeleton-line"></div></div>
        <div class="feature-card"><div class="skeleton-box" style="width:120px;height:160px;margin-bottom:16px;"></div><div class="skeleton-line"></div></div>
      </div>
    </div>
  `;

  try {
    const randomPage = randomInt(1, 4);
    const data = await discoverTv({
      without_genres: NOISE_GENRES,
      sort_by: "vote_average.desc",
      "vote_count.gte": 1000,
      page: randomPage,
    });

    const results = shuffle(data.results || []).filter(item => item.poster_path && item.name && item.overview);
    topRatedAllSeries = results.slice(0, 6);

    if (topRatedAllSeries.length < 6) {
      const page2 = await discoverTv({
        without_genres: NOISE_GENRES,
        sort_by: "vote_average.desc",
        "vote_count.gte": 800,
        page: randomPage + 1,
      });
      const additional = shuffle(page2.results || []).filter(item => item.poster_path && item.name && item.overview);
      topRatedAllSeries = [...topRatedAllSeries, ...additional].slice(0, 6);
    }

    renderTopRatedPage(0);
  } catch (err) {
    console.error("Top rated load error:", err);
    container.innerHTML = `<p class="row-status">Unable to load Top Rated series.</p>`;
  }
}

function renderTopRatedPage(pageIndex) {
  const container = $('[data-row="top-rated-feature"] [data-row-body]');
  if (!container || !topRatedAllSeries.length) return;

  topRatedPageIndex = pageIndex;
  const startIndex = pageIndex * 3;
  const currentThree = topRatedAllSeries.slice(startIndex, startIndex + 3);

  const wrapper = document.createElement("div");
  wrapper.className = "feature-slider-wrapper";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "feature-nav-arrow feature-nav-prev";
  prevBtn.innerHTML = "‹";
  prevBtn.setAttribute("aria-label", "Previous 3 series");
  prevBtn.addEventListener("click", () => {
    const nextIdx = topRatedPageIndex === 0 ? 1 : 0;
    renderTopRatedPage(nextIdx);
  });

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "feature-nav-arrow feature-nav-next";
  nextBtn.innerHTML = "›";
  nextBtn.setAttribute("aria-label", "Next 3 series");
  nextBtn.addEventListener("click", () => {
    const nextIdx = topRatedPageIndex === 0 ? 1 : 0;
    renderTopRatedPage(nextIdx);
  });

  const grid = document.createElement("div");
  grid.className = "feature-cards-grid";

  currentThree.forEach((show, idx) => {
    const globalIdx = startIndex + idx;
    const card = document.createElement("div");
    card.className = "feature-card";

    const posterWrapper = document.createElement("div");
    posterWrapper.className = "feature-poster-wrapper";

    const frame = document.createElement("div");
    frame.className = "feature-poster-frame";

    const img = document.createElement("img");
    img.className = "feature-poster-img";
    img.alt = show.name;
    img.src = `${TMDB_IMAGE_BASE}/w342${show.poster_path}`;

    frame.appendChild(img);
    posterWrapper.appendChild(frame);

    const score = show.vote_average ? show.vote_average.toFixed(1) : "8.5";
    const pill = document.createElement("div");
    pill.className = "feature-badge-pill";
    pill.innerHTML = `★ ${score}`;
    posterWrapper.appendChild(pill);

    const tagline = document.createElement("div");
    tagline.className = "feature-tagline-caps";
    tagline.textContent = FEATURE_TAGLINES[globalIdx % FEATURE_TAGLINES.length];

    const title = document.createElement("h3");
    title.className = "feature-show-title";
    title.textContent = show.name;

    const overview = document.createElement("p");
    overview.className = "feature-show-overview";
    overview.textContent = show.overview || "Top rated television series available to discover.";

    card.append(posterWrapper, tagline, title, overview);
    grid.appendChild(card);
  });

  wrapper.append(prevBtn, grid, nextBtn);
  container.setAttribute("aria-busy", "false");
  container.replaceChildren(wrapper);
}


const heroImage = $("#hero-image");
const heroCredit = $("#hero-credit");
const heroCreditName = $("#hero-credit-name");
let heroStarted = false;
let heroBackdropPool = [];
let currentHeroPath = "";
let heroRotationTimer = null;
let heroRequestId = 0;

function heroSize() {
  const pixels = window.innerWidth * (window.devicePixelRatio || 1);
  return pixels > 1280 ? "original" : "w1280";
}

function showNextHeroBackdrop() {
  if (!heroBackdropPool.length) return;
  const candidates = heroBackdropPool.filter((item) => item.backdrop_path !== currentHeroPath);
  if (!candidates.length) return;

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const requestId = ++heroRequestId;
  heroImage.classList.remove("is-ready");
  heroImage.onload = () => {
    if (requestId !== heroRequestId) return;
    currentHeroPath = pick.backdrop_path;
    heroImage.classList.add("is-ready");
    heroCreditName.textContent = pick.name;
    heroCredit.hidden = false;
  };
  heroImage.alt = `Backdrop from ${pick.name}`;
  heroImage.src = `${TMDB_IMAGE_BASE}/${heroSize()}${pick.backdrop_path}`;
}

async function loadUniqueHeroBackdrop() {
  if (!isConfigured() || heroStarted) return;
  heroStarted = true;
  try {
    const pageNumbers = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const pages = await Promise.all(pageNumbers.map((page) => tmdbRequest("/tv/popular", { page })));
    const seenPaths = new Set();
    heroBackdropPool = pages.flatMap((page) => page.results || []).filter((item) => {
      if (!item || !item.id || !item.name || !item.backdrop_path || seenPaths.has(item.backdrop_path)) return false;
      seenPaths.add(item.backdrop_path);
      return true;
    });

    if (!heroBackdropPool.length) return;
    showNextHeroBackdrop();
    if (heroRotationTimer) clearInterval(heroRotationTimer);
    heroRotationTimer = setInterval(showNextHeroBackdrop, 10000);
  } catch (error) {
    console.warn("Could not load hero backdrops:", error);
  }
}


function createPosterCard(show) {
  const item = document.createElement("li");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "poster-card";
  button.dataset.showName = show.name;
  button.setAttribute("aria-haspopup", "dialog");

  const frame = document.createElement("span");
  frame.className = "poster-frame";

  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.src = `${TMDB_IMAGE_BASE}/w342${show.poster_path}`;
  img.addEventListener("error", () => item.remove(), { once: true });
  frame.appendChild(img);

  const title = document.createElement("span");
  title.className = "poster-title";
  title.textContent = show.name;

  button.append(frame, title);

  if (show.vote_count > 0 && show.vote_average > 0) {
    const score = show.vote_average.toFixed(1);
    const rating = document.createElement("span");
    rating.className = "poster-rating";
    rating.innerHTML = `<span aria-hidden="true"><span class="star">★</span> ${score}</span>`;
    button.appendChild(rating);
  }

  item.appendChild(button);
  return item;
}

function createSkeletonGrid(count = GRID_STEP) {
  const grid = document.createElement("ul");
  grid.className = "poster-grid skeleton";
  grid.setAttribute("aria-hidden", "true");
  for (let i = 0; i < count; i++) {
    const item = document.createElement("li");
    const frame = document.createElement("div");
    frame.className = "poster-frame";
    const lineA = document.createElement("div");
    lineA.className = "skeleton-line";
    const lineB = document.createElement("div");
    lineB.className = "skeleton-line";
    item.append(frame, lineA, lineB);
    grid.appendChild(item);
  }
  return grid;
}

function rowBody(rowId) {
  return $(`.series-row[data-row="${rowId}"] [data-row-body]`);
}

function showSkeleton(rowId) {
  const body = rowBody(rowId);
  if (body) {
    body.setAttribute("aria-busy", "true");
    body.replaceChildren(createSkeletonGrid());
  }
}

function showMessage(rowId, message) {
  const body = rowBody(rowId);
  if (!body) return;
  body.setAttribute("aria-busy", "false");

  const box = document.createElement("div");
  box.className = "row-status";
  box.innerHTML = `<p>${message}</p>`;
  body.replaceChildren(box);
}

function renderPosters(rowId, shows) {
  const body = rowBody(rowId);
  if (!body) return;
  body.setAttribute("aria-busy", "false");

  const carousel = document.createElement("div");
  carousel.className = "poster-carousel";

  const track = document.createElement("ul");
  track.className = "poster-grid";
  shows.forEach((show) => track.appendChild(createPosterCard(show)));

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "carousel-arrow carousel-prev";
  previous.textContent = "‹";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "carousel-arrow carousel-next";
  next.textContent = "›";

  previous.addEventListener("click", () => {
    track.scrollBy({ left: -600, behavior: "smooth" });
  });
  next.addEventListener("click", () => {
    track.scrollBy({ left: 600, behavior: "smooth" });
  });

  carousel.append(previous, track, next);
  body.replaceChildren(carousel);
}

function selectShows(results, def) {
  const seen = new Set();
  const usable = (results || []).filter((show) => {
    if (!show || !show.poster_path || !show.name || seen.has(show.id)) return false;
    if (def.dedupe && shownIds.has(show.id)) return false;
    seen.add(show.id);
    return true;
  });
  const shuffled = shuffle(usable);
  return shuffled.slice(0, def.limit);
}

async function loadRow(def) {
  try {
    const data = await def.fetch();
    const shows = selectShows(data.results || [], def);
    if (!shows.length) {
      showMessage(def.id, "No series returned.");
      return;
    }
    shows.forEach((show) => shownIds.add(show.id));
    renderPosters(def.id, shows);
  } catch (err) {
    if (err.status === 401) authFailed = true;
    showMessage(def.id, "Could not load row. Check API key.");
  }
}

function showSetupNotice(kind) {
  const notice = $("#setup-notice");
  const title = $("#setup-title");
  const message = $("#setup-message");
  title.textContent = "";
  message.textContent = "";

  if (kind === "missing") {
    title.textContent = "TMDB API Key Required";
    message.innerHTML = "Please open <code>config.js</code> and set <code>apiKey</code> to your TMDB API key to fetch live series, top-rated features, and backdrops.";
  } else {
    title.textContent = "Invalid TMDB API Key";
    message.innerHTML = "The provided API key was rejected by TMDB (401 Unauthorized). Please verify <code>apiKey</code> in <code>config.js</code>.";
  }

  notice.hidden = false;
  $("#discover").classList.add("is-blocked");
}

async function initSeries() {
  if (!isConfigured()) {
    showSetupNotice("missing");
    return;
  }

  ROWS.forEach((def) => showSkeleton(def.id));
  loadUniqueHeroBackdrop();
  loadTopRatedFeatureBlock();

  for (const def of ROWS) {
    await loadRow(def);
  }

  if (authFailed) {
    showSetupNotice("invalid");
  }
}

/* Modal Dialog */
const dialog = $("#auth-dialog");
const dialogTitle = $("#dialog-title");
const dialogMessage = $("#dialog-message");

function openDialog(title, message) {
  dialogTitle.textContent = title;
  dialogMessage.textContent = message;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog() {
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

document.addEventListener("click", (event) => {
  const card = event.target.closest(".poster-card");
  if (card) {
    openDialog(card.dataset.showName, "Tracking feature coming soon! Live data is active.");
    return;
  }
  if (event.target.closest("[data-close]") || event.target === dialog) {
    closeDialog();
  }
});

/* Navigation Menu */
const menuToggle = $("#menu-toggle");
const siteMenu = $("#site-menu");
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const open = siteMenu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(open));
  });
}

const yearNode = $("#year");
if (yearNode) yearNode.textContent = String(new Date().getFullYear());

initSeries();


document.addEventListener("click", (event) => {
  const t = event.target.closest("a, button, .poster-card, .feature-card");
  if (!t) return;
  if (t.closest(".menu-toggle, .carousel-arrow, .feature-nav-arrow, .skip-link, .nav-list, .footer-col a[href^='#']:not([data-open-dialog]), .brand, .dialog")) return;
  if (t.matches("a[href^='http']")) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const mode = t.dataset.openDialog === "login" ? "login" : "signup";
  location.href = `auth.html?mode=${mode}`;
}, true);


"use strict";


if (window.B && B.me()) {
  location.replace("home.html");
}

const API_KEY = window.BRAMBO_CONFIG?.apiKey || "";
const API_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p/w342";


const $ = (selector) => document.querySelector(selector);


async function getSeries(endpoint) {
  const response = await fetch(
    `${API_URL}${endpoint}?api_key=${API_KEY}`
  );

  if (!response.ok) {
    throw new Error("Unable to fetch series");
  }

  const data = await response.json();
  return data.results || [];
}


function createPoster(show) {
  const item = document.createElement("li");
  item.className = "poster-item";

  const card = document.createElement("div");
  card.className = "poster-card";

  const image = document.createElement("img");
  image.src = IMAGE_URL + show.poster_path;
  image.alt = show.name;
  image.loading = "lazy";

  const name = document.createElement("span");
  name.className = "poster-title";
  name.textContent = show.name;

  const rating = document.createElement("span");
  rating.className = "poster-rating";
  rating.textContent = `★ ${show.vote_average.toFixed(1)}`;

  card.append(image, name, rating);
  item.appendChild(card);

  return item;
}


async function displaySeries(rowName, endpoint) {
  const container = $(
    `[data-row="${rowName}"] [data-row-body]`
  );

  if (!container) return;

  try {
    const shows = await getSeries(endpoint);

    const grid = document.createElement("ul");
    grid.className = "poster-grid";

    shows
      .filter(show => show.poster_path)
      .slice(0, 12)
      .forEach(show => {
        grid.appendChild(createPoster(show));
      });

    container.replaceChildren(grid);

  } catch (error) {
    console.error(error);
    container.textContent = "Unable to load series.";
  }
}


async function displayHero() {
  const image = $("#hero-image");

  if (!image) return;

  try {
    const shows = await getSeries("/tv/popular");

    const featured = shows.find(show => show.backdrop_path);

    if (featured) {
      image.src =
        `https://image.tmdb.org/t/p/w1280${featured.backdrop_path}`;

      image.alt = featured.name;

      const credit = $("#hero-credit-name");

      if (credit) {
        credit.textContent = featured.name;
      }

      if ($("#hero-credit")) {
        $("#hero-credit").hidden = false;
      }
    }

  } catch (error) {
    console.error(error);
  }
}


const menuToggle = $("#menu-toggle");
const siteMenu = $("#site-menu");

if (menuToggle && siteMenu) {
  menuToggle.addEventListener("click", () => {
    siteMenu.classList.toggle("is-open");
  });
}


if ($("#year")) {
  $("#year").textContent = new Date().getFullYear();
}


async function loadPage() {
  if (!API_KEY) {
    console.error("Please add your TMDB API key in config.js");
    return;
  }

  await Promise.all([
    displaySeries("popular", "/tv/popular"),
    displaySeries("new", "/tv/airing_today"),
    displaySeries("netflix", "/discover/tv?with_watch_providers=8&watch_region=IN"),
    displaySeries("hbo", "/tv/top_rated"),
    displaySeries("more", "/tv/on_the_air"),
    displayHero()
  ]);
}

loadPage();

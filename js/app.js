'use strict';

/* Fears of Love: static game logic (no build step, works on GitHub Pages).
   Data: data/movies.json (titles), data/scenes.json (cards), data/posters.json (TMDB poster paths).
   Long distance rooms: the link carries the room id and the deck settings, so every player builds the
   same shuffled deck; only "which card are we on" travels between players (peer to peer, see connectRoom). */

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const TRYSTERO_URL = 'https://cdn.jsdelivr.net/npm/trystero@0.26.0/+esm';
const APP_ID = 'fearsoflove-tomblackroad';
const $ = (sel) => document.querySelector(sel);

const TYPE_LABEL = { movie: 'Film', tv: 'Series', book: 'Book' };
const TYPES = ['movie', 'tv', 'book'];
const DEPTHS = [[1, 'Light'], [2, 'Personal'], [3, 'Deep']];

// Menu genres -> the genre words used in data/movies.json
const GENRES = [
  ['romance', 'Romance', ['Romance', 'Rom-com', 'Romantasy']],
  ['comedy', 'Comedy', ['Comedy', 'Rom-com', 'Sitcom']],
  ['drama', 'Drama', ['Drama', 'Literary']],
  ['scifi', 'Sci-fi', ['Sci-fi', 'Dystopian']],
  ['fantasy', 'Fantasy', ['Fantasy', 'Romantasy']],
  ['thriller', 'Thriller & crime', ['Thriller', 'Crime', 'Mystery']],
  ['horror', 'Horror', ['Horror', 'Gothic']],
  ['adventure', 'Action & adventure', ['Adventure', 'Action', 'War', 'Western']],
  ['animation', 'Animation', ['Animation', 'Anime']],
  ['history', 'Period & history', ['Period', 'Historical', 'Biography']],
  ['music', 'Musicals', ['Musical', 'Music']],
  ['classic', 'Classics', ['Classic']],
  ['teen', 'Teen & YA', ['Young adult', 'Teen', 'Coming-of-age']],
];
const GENRE_KEYS = GENRES.map((g) => g[0]);

const PRESETS = [
  ['Everything', { types: TYPES, genres: GENRE_KEYS, depths: [1, 2, 3] }],
  ['Date night', { types: TYPES, genres: ['romance', 'comedy', 'drama', 'music'], depths: [1, 2] }],
  ['Deep talk', { types: TYPES, genres: GENRE_KEYS, depths: [2, 3] }],
  ['Light & fun', { types: TYPES, genres: ['comedy', 'animation', 'adventure', 'music', 'fantasy'], depths: [1] }],
  ['Movie night', { types: ['movie'], genres: GENRE_KEYS, depths: [1, 2, 3] }],
  ['Book club', { types: ['book'], genres: GENRE_KEYS, depths: [1, 2, 3] }],
];

const state = {
  movies: new Map(),
  scenes: [],
  posters: {},
  deck: [],
  index: 0,
  typeFilter: 'all', // all | movie | tv | book
  genre: 'all',      // all | one of GENRE_KEYS
  showDeep: false,
  room: null,        // { id, cfg, clock, by, peers: Set, ... } while playing long distance
};

const clientId = randomId(10);

/* ---------- helpers ---------- */

function randomId(n) {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => abc[b % abc.length]).join('');
}

function show(name) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('is-active', el.id === 'screen-' + name));
  window.scrollTo(0, 0);
}

// Seeded random numbers: every player of a room gets the same shuffle.
function seededRandom(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(h ^ seed.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function shuffle(arr, rand = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Avoid two cards from the same title in a row where possible.
function spreadTitles(deck) {
  for (let i = 1; i < deck.length; i++) {
    if (deck[i].movie === deck[i - 1].movie) {
      const k = deck.findIndex((s, idx) => idx > i && s.movie !== deck[i - 1].movie && (!deck[i + 1] || s.movie !== deck[i + 1].movie));
      if (k > -1) [deck[i], deck[k]] = [deck[k], deck[i]];
    }
  }
  return deck;
}

function hueFor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function store(op, key, value) {
  try { return op === 'get' ? localStorage.getItem(key) : op === 'set' ? localStorage.setItem(key, value) : localStorage.removeItem(key); } catch (e) { return null; }
}

async function loadJSON(path, optional) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(path + ' ' + res.status);
    return await res.json();
  } catch (err) {
    if (optional) return null;
    throw err;
  }
}

/* Analytics: off unless configured in js/config.js. See docs/DATA_COLLECTION.md.
   - GoatCounter: anonymous counts (visits, countries, and the click names below). No cookies.
   - PostHog (optional): the same events with details (which card, time on card) for funnels and dashboards.
     Runs in cookieless mode: no cookies, no stored ids, no personal profiles. */
const phQueue = [];
function track(name, props, opts) {
  try {
    if (!(opts && opts.gc === false) && window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'event/' + name, title: name, event: true });
    const p = Object.assign({ room: !!state.room }, props || {});
    if (window.posthog && window.posthog.__loaded) window.posthog.capture(name, p); else if (phQueue.length < 200) phQueue.push([name, p]);
  } catch (e) { /* never break the game */ }
}

function setupPostHog() {
  const cfg = window.FOL_CONFIG || {};
  if (!cfg.posthogKey) { phQueue.length = 0; phQueue.push = () => 0; return; }
  const host = (cfg.posthogHost || 'https://eu.i.posthog.com').replace(/\/$/, '');
  const sc = document.createElement('script');
  sc.async = true;
  sc.src = host.replace('.i.posthog.com', '-assets.i.posthog.com') + '/static/array.js';
  sc.onload = () => {
    try {
      window.posthog.init(cfg.posthogKey, {
        api_host: host, cookieless_mode: 'always', person_profiles: 'never',
        autocapture: false, capture_pageview: true, disable_session_recording: true,
        loaded: (ph) => { ph.__loaded = true; phQueue.splice(0).forEach(([n, p]) => ph.capture(n, p)); },
      });
    } catch (e) { /* ignore */ }
  };
  document.head.append(sc);
}

// Time each card is really on screen (paused while the tab is hidden), reported when you leave it.
const dwell = { scene: null, since: 0, acc: 0, deep: false };
function cardShown(scene) {
  cardLeft();
  dwell.scene = scene; dwell.acc = 0; dwell.deep = false; dwell.since = document.hidden ? 0 : performance.now();
}
function cardLeft() {
  if (!dwell.scene) return;
  if (dwell.since) dwell.acc += performance.now() - dwell.since;
  const sc = dwell.scene, m = state.movies.get(sc.movie);
  track('card_seen', { scene: sc.id, title: m.id, type: m.type, depth: sc.depth, seconds: Math.round(Math.min(dwell.acc, 600000) / 1000), deeper: dwell.deep }, { gc: false });
  dwell.scene = null;
}
document.addEventListener('visibilitychange', () => {
  if (!dwell.scene) return;
  if (document.hidden) { if (dwell.since) dwell.acc += performance.now() - dwell.since; dwell.since = 0; } else dwell.since = performance.now();
});
window.addEventListener('pagehide', cardLeft);

/* ---------- covers ---------- */

// Every book gets the same editorial cover: cream paper, double rule, title, ornament, author.
function bookCover(book) {
  const c = document.createElement('div');
  c.className = 'cover';
  const frame = document.createElement('div');
  frame.className = 'cover-frame';
  const t = document.createElement('div');
  t.className = 'cover-title';
  const longest = Math.max(...book.title.split(/\s+/).map((w) => w.length));
  const base = book.title.length > 34 ? 9 : book.title.length > 18 ? 12 : 15;
  t.style.fontSize = Math.min(base, 95 / longest).toFixed(1) + 'cqw'; // never break a word
  t.textContent = book.title;
  const orn = document.createElement('div');
  orn.className = 'cover-orn';
  orn.textContent = '❦︎';
  const a = document.createElement('div');
  a.className = 'cover-author';
  a.textContent = book.author || '';
  frame.append(t, orn, a);
  c.append(frame);
  return c;
}

function fillPoster(box, movie) {
  box.textContent = '';
  box.classList.toggle('book', movie.type === 'book');
  if (movie.type === 'book') { box.append(bookCover(movie)); return; }
  box.style.setProperty('--hue', hueFor(movie.id));
  const fallback = document.createElement('div');
  fallback.className = 'fallback';
  fallback.textContent = movie.title;
  box.append(fallback);
  const entry = state.posters[movie.id];
  if (entry && entry.poster) {
    const img = new Image(); // note: no loading="lazy", detached lazy images never load
    img.alt = 'Poster of ' + movie.title;
    img.onload = () => { fallback.remove(); box.append(img); };
    img.src = POSTER_BASE + entry.poster;
  }
}

/* ---------- filters ---------- */

function genresOf(movie) {
  const g = new Set(movie.genres);
  return GENRES.filter(([, , words]) => words.some((w) => g.has(w))).map(([k]) => k);
}

// cfg: { types: [...], genres: [...] or null for all, depths: [...] }
function poolFor(cfg) {
  return state.scenes.filter((sc) => {
    const m = state.movies.get(sc.movie);
    if (!cfg.types.includes(m.type)) return false;
    if (cfg.depths && !cfg.depths.includes(sc.depth)) return false;
    if (cfg.genres && cfg.genres.length < GENRE_KEYS.length && !genresOf(m).some((k) => cfg.genres.includes(k))) return false;
    return true;
  });
}

function localCfg() {
  return { types: state.typeFilter === 'all' ? TYPES : [state.typeFilter], genres: state.genre === 'all' ? null : [state.genre], depths: null };
}

function activeCfg() { return state.room ? state.room.cfg : localCfg(); }

function renderGenreMenu() {
  const menu = $('#genre-menu');
  menu.textContent = '';
  const types = localCfg().types;
  const counts = {};
  state.movies.forEach((m) => { if (types.includes(m.type)) genresOf(m).forEach((k) => { counts[k] = (counts[k] || 0) + 1; }); });
  if (state.genre !== 'all' && !counts[state.genre]) state.genre = 'all';
  const items = [['all', 'All genres']].concat(GENRES.filter(([k]) => counts[k]).map(([k, label]) => [k, label]));
  items.forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'genre-chip';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(state.genre === k));
    b.addEventListener('click', () => {
      state.genre = k;
      track('filter-genre/' + k);
      renderGenreMenu();
      newGame();
    });
    menu.append(b);
  });
  const on = menu.querySelector('[aria-pressed=true]');
  if (on && on.scrollIntoView && menu.scrollWidth > menu.clientWidth) menu.scrollLeft = on.offsetLeft - 16;
}

function syncTypeToggle() {
  document.querySelectorAll('#type-toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === state.typeFilter)));
}

/* ---------- deck ---------- */

// Local play: cards not yet seen on this device come first; everything is reshuffled every time.
function buildDeck(pool) {
  let seen = new Set();
  try { seen = new Set(JSON.parse(store('get', 'fol-seen') || '[]')); } catch (e) { /* ignore */ }
  let fresh = pool.filter((sc) => !seen.has(sc.id));
  if (!fresh.length) { pool.forEach((sc) => seen.delete(sc.id)); store('set', 'fol-seen', JSON.stringify(Array.from(seen))); fresh = pool; }
  const fs = new Set(fresh);
  return spreadTitles(shuffle(fresh)).concat(spreadTitles(shuffle(pool.filter((sc) => !fs.has(sc)))));
}

// Room play: the same deck for everybody with the same link.
function buildRoomDeck(room) {
  return spreadTitles(shuffle(poolFor(room.cfg), seededRandom(room.id + '/' + (room.round || 0))));
}

function markSeen(id) {
  try {
    const seen = new Set(JSON.parse(store('get', 'fol-seen') || '[]'));
    seen.add(id);
    store('set', 'fol-seen', JSON.stringify(Array.from(seen)));
  } catch (e) { /* ignore */ }
}

function newGame() {
  state.deck = state.room ? buildRoomDeck(state.room) : buildDeck(poolFor(localCfg()));
  state.index = 0;
  state.showDeep = false;
  show('play');
  if (!state.deck.length) {
    $('#card').hidden = true; $('#related').hidden = true; $('#controls').hidden = true;
    $('#progress').textContent = '0 cards';
    return;
  }
  renderCard();
}

/* ---------- rendering ---------- */

function renderCard() {
  const scene = state.deck[state.index];
  const movie = state.movies.get(scene.movie);
  $('#card').hidden = false;
  $('#controls').hidden = false;
  $('#progress').textContent = (state.index + 1) + ' / ' + state.deck.length;
  if (state.room) $('#room-summary').textContent = 'Card ' + (state.index + 1) + ' of ' + state.deck.length + ' · ' + describeCfg(state.room.cfg);
  $('#card-meta').textContent = TYPE_LABEL[movie.type] || 'Film';
  $('#card-title').textContent = movie.title;
  $('#card-sub').textContent = (movie.author ? movie.author + ' · ' : '') + movie.year + ' · ' + movie.genres.join(', ');
  const wiki = $('#card-wiki');
  wiki.hidden = !movie.wikipedia;
  if (movie.wikipedia) wiki.href = movie.wikipedia;
  fillPoster($('#poster'), movie);

  $('#moment').textContent = scene.moment;
  const line = $('#line');
  line.hidden = !scene.line;
  line.textContent = scene.line ? '“' + scene.line + '”' : '';

  $('#prompt').textContent = scene.prompt;
  const list = $('#followups');
  list.textContent = '';
  scene.followUps.forEach((q) => { const li = document.createElement('li'); li.textContent = q; list.append(li); });
  list.hidden = !state.showDeep;
  $('#btn-deep').setAttribute('aria-expanded', String(state.showDeep));

  renderRelated(movie);
  if (!dwell.scene || dwell.scene.id !== scene.id) cardShown(scene);
  markSeen(scene.id);
  syncHowto();
  $('#btn-next').textContent = state.index === state.deck.length - 1 ? 'Finish' : 'Next card';
  $('#btn-prev').disabled = state.index === 0;
}

/* ---------- "jump to something similar" row ---------- */

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  let inter = 0;
  A.forEach((x) => { if (B.has(x)) inter++; });
  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function similarity(a, b) {
  return 0.35 * jaccard(genresOf(a), genresOf(b))
    + 0.15 * jaccard(a.genres, b.genres)
    + 0.4 * jaccard(a.tags || [], b.tags || [])
    + 0.1 * (1 - Math.abs((a.intensity || 3) - (b.intensity || 3)) / 4);
}

// One film, one series and one book like the current title (or three of the same kind when filtered).
function relatedFor(cur) {
  const cfg = activeCfg();
  const playable = new Set(poolFor(cfg).map((sc) => sc.movie));
  const ranked = Array.from(state.movies.values())
    .filter((t) => t.id !== cur.id && playable.has(t.id))
    .map((t) => ({ t, s: similarity(cur, t) }))
    .sort((x, y) => y.s - x.s || x.t.id.localeCompare(y.t.id));
  const picks = [];
  if (cfg.types.length > 1) {
    cfg.types.forEach((type) => { const r = ranked.find((x) => x.t.type === type && !picks.includes(x)); if (r) picks.push(r); });
  }
  ranked.forEach((r) => { if (picks.length < 3 && !picks.includes(r)) picks.push(r); });
  return picks.slice(0, 3).map((r) => r.t);
}

function renderRelated(cur) {
  const row = $('#related-row');
  row.textContent = '';
  const items = relatedFor(cur);
  $('#related').hidden = !items.length;
  items.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tile';
    b.setAttribute('aria-label', 'Jump to a card about ' + t.title);
    const p = document.createElement('div');
    p.className = 'poster';
    fillPoster(p, t);
    const txt = document.createElement('span');
    txt.className = 'tile-text';
    const k = document.createElement('span');
    k.className = 'tile-kind';
    k.textContent = TYPE_LABEL[t.type];
    const n = document.createElement('span');
    n.className = 'tile-title';
    n.textContent = t.title;
    txt.append(k, n);
    b.append(p, txt);
    b.addEventListener('click', () => { track('related/' + t.type, { from: cur.id, to: t.id }); jumpToTitle(t.id); });
    row.append(b);
  });
}

/* ---------- moving through the deck ---------- */

// Show deck[idx]; in a room, tell the others.
function goTo(idx, opts = {}) {
  if (idx < 0 || idx >= state.deck.length) return;
  state.index = idx;
  state.showDeep = false;
  show('play');
  renderCard(opts.dir);
  if (opts.dir) animateIn(opts.dir);
  if (!opts.remote) broadcast();
}

// Bring a card of this title right after the current one, then go there (keeps the rest of the deck intact).
function jumpToTitle(id) {
  const options = state.deck.map((sc, i) => ({ sc, i })).filter((x) => x.sc.movie === id && x.i !== state.index);
  let pick = options.find((x) => x.i > state.index) || options[0];
  let scene = pick ? pick.sc : null;
  if (!scene) {
    const all = state.scenes.filter((sc) => sc.movie === id);
    if (!all.length) return;
    scene = all[Math.floor(Math.random() * all.length)];
  } else {
    state.deck.splice(pick.i, 1);
    if (pick.i < state.index) state.index--;
  }
  state.deck.splice(state.index + 1, 0, scene);
  goTo(state.index + 1, { dir: 'next' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function next() {
  if (state.index >= state.deck.length - 1) { endGame(); return; }
  goTo(state.index + 1, { dir: 'next' });
}

function back() {
  if (state.index > 0) goTo(state.index - 1, { dir: 'back' });
}

function reveal() { // toggle the follow-up questions
  state.showDeep = !state.showDeep;
  $('#followups').hidden = !state.showDeep;
  $('#btn-deep').setAttribute('aria-expanded', String(state.showDeep));
  if (state.showDeep) { dwell.deep = true; track('deeper'); }
  broadcast();
}

function endGame() {
  $('#end-text').textContent = 'You went through ' + state.deck.length + ' scenes together. Which one would you watch, or read, again?';
  $('#btn-again').textContent = state.room ? 'Start this deck again' : 'Shuffle and play again';
  cardLeft();
  track('deck-end', { cards: state.deck.length });
  show('end');
}

function animateIn(dir) {
  const card = $('#card');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  card.classList.remove('in-next', 'in-back');
  void card.offsetWidth; // restart the animation
  card.classList.add(dir === 'next' ? 'in-next' : 'in-back');
}

/* ---------- swipe (phones and tablets; the buttons stay) ---------- */

function setupSwipe() {
  const card = $('#card');
  let start = null;
  card.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { start = null; return; }
    start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), horizontal: null };
  }, { passive: true });
  card.addEventListener('touchmove', (e) => {
    if (!start) return;
    const dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y;
    if (start.horizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) start.horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
    if (!start.horizontal) return;
    e.preventDefault(); // keep the page from scrolling sideways
    const blocked = (dx > 0 && state.index === 0);
    const x = blocked ? dx * 0.25 : dx;
    card.style.transition = 'none';
    card.style.transform = 'translateX(' + x + 'px) rotate(' + (x / 40) + 'deg)';
    card.style.opacity = String(1 - Math.min(Math.abs(x) / 600, 0.4));
  }, { passive: false });
  const end = (e) => {
    if (!start) return;
    const touch = e.changedTouches && e.changedTouches[0];
    const dx = touch ? touch.clientX - start.x : 0;
    const speed = Math.abs(dx) / Math.max(performance.now() - start.t, 1);
    const wasHorizontal = start.horizontal;
    start = null;
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '';
    if (!wasHorizontal) return;
    if (Math.abs(dx) > 70 || (Math.abs(dx) > 35 && speed > 0.5)) {
      if (dx < 0) { track('swipe-next'); next(); } else if (state.index > 0) { track('swipe-back'); back(); }
    }
  };
  card.addEventListener('touchend', end);
  card.addEventListener('touchcancel', end);
}

/* ---------- long distance rooms ---------- */

// Link format: #room=<id>&t=movie.tv.book&g=romance.comedy (omitted = all genres)&d=1.2.3
function roomFromHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const id = (p.get('room') || '').toLowerCase();
  if (!/^[a-z0-9]{6,16}$/.test(id)) return null;
  const types = (p.get('t') || TYPES.join('.')).split('.').filter((t) => TYPES.includes(t));
  const g = p.get('g');
  const genres = g ? g.split('.').filter((k) => GENRE_KEYS.includes(k)) : GENRE_KEYS.slice();
  const depths = (p.get('d') || '1.2.3').split('.').map(Number).filter((d) => d >= 1 && d <= 3);
  return { id, cfg: { types: types.length ? types : TYPES, genres: genres.length ? genres : GENRE_KEYS.slice(), depths: depths.length ? depths : [1, 2, 3] } };
}

function roomLink(id, cfg) {
  const parts = ['room=' + id, 't=' + cfg.types.join('.')];
  if (cfg.genres.length < GENRE_KEYS.length) parts.push('g=' + cfg.genres.join('.'));
  parts.push('d=' + cfg.depths.join('.'));
  return location.origin + location.pathname + '#' + parts.join('&');
}

function describeCfg(cfg) {
  const t = cfg.types.length === 3 ? 'Films, series and books' : cfg.types.map((x) => ({ movie: 'Films', tv: 'Series', book: 'Books' })[x]).join(' and ');
  const g = cfg.genres.length >= GENRE_KEYS.length ? 'all genres' : cfg.genres.map((k) => GENRES.find((x) => x[0] === k)[1]).join(', ');
  const d = cfg.depths.length === 3 ? 'all depths' : cfg.depths.map((n) => DEPTHS[n - 1][1].toLowerCase()).join(' + ');
  return t + ' · ' + g + ' · ' + d;
}

function enterRoom(room) {
  if (state.room && state.room.id === room.id) return;
  if (state.room) leaveRoom(true);
  state.room = Object.assign(room, { clock: 0, by: '', round: 0, peers: new Map(), tabs: new Map(), net: null, bc: null });
  document.body.classList.add('in-room');
  $('#filters').hidden = true;
  $('#room-summary').hidden = false;
  $('#room-summary').textContent = describeCfg(room.cfg);
  $('#room-pill').hidden = false;
  updatePill();
  track('room-join');
  newGame();
  connectRoom(state.room);
}

function leaveRoom(silent) {
  const r = state.room;
  if (!r) return;
  try { if (r.net) r.net.leave(); } catch (e) { /* ignore */ }
  try { if (r.bc) { r.bc.postMessage({ bye: clientId }); r.bc.close(); } } catch (e) { /* ignore */ }
  clearInterval(r.timer);
  state.room = null;
  document.body.classList.remove('in-room');
  $('#filters').hidden = false;
  $('#room-summary').hidden = true;
  $('#room-pill').hidden = true;
  if (!silent) {
    history.replaceState(null, '', location.pathname + location.search);
    newGame();
  }
}

function updatePill() {
  const r = state.room;
  if (!r) return;
  // the same person can reach us twice (same browser + peer to peer): count unique players
  const others = new Set([...r.tabs.keys(), ...r.peers.values()]).size;
  $('#room-label').textContent = others ? 'Together · ' + (others + 1) + ' here' : (r.status || 'Waiting for others…');
  $('#room-pill').classList.toggle('live', others > 0);
}

function currentMsg() {
  const r = state.room;
  const sc = state.deck[state.index];
  return { v: 1, idx: state.index, scene: sc ? sc.id : '', deep: state.showDeep, round: r.round, c: r.clock, by: r.by, from: clientId };
}

// Called after every local change (card, follow-ups).
function broadcast() {
  const r = state.room;
  if (!r) return;
  r.clock += 1;
  r.by = clientId;
  send(currentMsg());
}

function send(msg, target) {
  const r = state.room;
  if (!r) return;
  try { if (r.bc && !target) r.bc.postMessage(msg); } catch (e) { /* ignore */ }
  try { if (r.action) r.action.send(msg, target ? { target } : undefined); } catch (e) { /* ignore */ }
}

// The newest change wins: higher counter, then the higher id breaks ties. Everyone converges on the same card.
function receive(m, peerId) {
  const r = state.room;
  if (!r || !m || m.v !== 1) return;
  const newer = m.c > r.clock || (m.c === r.clock && m.by > r.by);
  if (!newer) {
    if (m.c < r.clock && peerId) send(currentMsg(), peerId); // they are behind: catch them up
    return;
  }
  r.clock = m.c;
  r.by = m.by;
  if (m.round !== r.round) { r.round = m.round; state.deck = buildRoomDeck(r); }
  let idx = m.idx;
  const sc = state.scenes.find((s) => s.id === m.scene);
  if (sc && (!state.deck[idx] || state.deck[idx].id !== sc.id)) {
    const at = state.deck.findIndex((s) => s.id === sc.id);
    if (at > -1) state.deck.splice(at, 1);
    idx = Math.min(idx, state.deck.length);
    state.deck.splice(idx, 0, sc);
  }
  const dir = idx > state.index ? 'next' : idx < state.index ? 'back' : null;
  state.index = Math.max(0, Math.min(idx, state.deck.length - 1));
  state.showDeep = !!m.deep;
  show('play');
  renderCard();
  if (dir) animateIn(dir);
}

async function connectRoom(r) {
  // 1) other tabs of this browser (instant, also used for local testing)
  if ('BroadcastChannel' in window) {
    r.bc = new BroadcastChannel('fol-room-' + r.id);
    r.bc.onmessage = (e) => {
      const d = e.data || {};
      if (d.hello) { r.tabs.set(d.hello, Date.now()); updatePill(); if (!d.reply) r.bc.postMessage({ hello: clientId, reply: true }); r.bc.postMessage(currentMsg()); return; }
      if (d.bye) { r.tabs.delete(d.bye); updatePill(); return; }
      if (d.from) { r.tabs.set(d.from, Date.now()); updatePill(); }
      receive(d, null);
    };
    r.bc.postMessage({ hello: clientId });
    r.timer = setInterval(() => {
      r.bc.postMessage({ hello: clientId, reply: true });
      const now = Date.now();
      r.tabs.forEach((t, id) => { if (now - t > 25000) r.tabs.delete(id); });
      updatePill();
    }, 10000);
  }
  // 2) other devices: peer to peer (WebRTC), found through public Nostr relays. No server or account needed.
  try {
    r.status = 'Connecting…';
    updatePill();
    const mod = await import(TRYSTERO_URL);
    if (state.room !== r) return;
    const net = mod.joinRoom({ appId: APP_ID }, 'room-' + r.id);
    r.net = net;
    r.action = net.makeAction('state');
    r.action.onMessage = (d, meta) => {
      const peerId = meta && meta.peerId;
      if (peerId && d && d.from && r.peers.get(peerId) !== d.from) { r.peers.set(peerId, d.from); updatePill(); }
      receive(d, peerId);
    };
    net.onPeerJoin = (peerId) => { r.peers.set(peerId, 'peer:' + peerId); updatePill(); send(currentMsg(), peerId); };
    net.onPeerLeave = (peerId) => { r.peers.delete(peerId); updatePill(); };
    r.status = 'Waiting for others…';
  } catch (err) {
    console.warn('Live sync unavailable', err);
    r.status = 'Offline: follow the card number';
  }
  updatePill();
}

/* ---------- long distance pop-up ---------- */

const draft = { id: '', cfg: null };

function chip(container, value, label, checked, onChange) {
  const l = document.createElement('label');
  l.className = 'chip';
  const i = document.createElement('input');
  i.type = 'checkbox';
  i.value = value;
  i.checked = checked;
  i.addEventListener('change', () => onChange(i.checked));
  const s = document.createElement('span');
  s.textContent = label;
  l.append(i, s);
  container.append(l);
}

function renderRemote() {
  const cfg = draft.cfg;
  const toggle = (list, v, on) => { const i = list.indexOf(v); if (on && i < 0) list.push(v); if (!on && i > -1) list.splice(i, 1); };
  const rerender = () => renderRemote();
  const presets = $('#presets');
  presets.textContent = '';
  PRESETS.forEach(([name, p]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'genre-chip';
    b.textContent = name;
    const same = (a, c) => a.length === c.length && a.every((x) => c.includes(x));
    b.setAttribute('aria-pressed', String(same(p.types, cfg.types) && same(p.genres, cfg.genres) && same(p.depths, cfg.depths)));
    b.addEventListener('click', () => { draft.cfg = { types: p.types.slice(), genres: p.genres.slice(), depths: p.depths.slice() }; rerender(); });
    presets.append(b);
  });
  const types = $('#rm-types'); types.textContent = '';
  TYPES.forEach((t) => chip(types, t, { movie: 'Films', tv: 'Series', book: 'Books' }[t], cfg.types.includes(t), (on) => { toggle(cfg.types, t, on); rerender(); }));
  const genres = $('#rm-genres'); genres.textContent = '';
  GENRES.forEach(([k, label]) => chip(genres, k, label, cfg.genres.includes(k), (on) => { toggle(cfg.genres, k, on); rerender(); }));
  const depth = $('#rm-depth'); depth.textContent = '';
  DEPTHS.forEach(([n, label]) => chip(depth, n, label, cfg.depths.includes(n), (on) => { toggle(cfg.depths, n, on); rerender(); }));

  cfg.types.sort((a, b) => TYPES.indexOf(a) - TYPES.indexOf(b));
  cfg.genres.sort((a, b) => GENRE_KEYS.indexOf(a) - GENRE_KEYS.indexOf(b));
  cfg.depths.sort();
  const n = cfg.types.length && cfg.genres.length && cfg.depths.length ? poolFor(cfg).length : 0;
  $('#rm-count').textContent = n ? n + ' cards in this deck' : 'No cards match. Tick at least one option in each group.';
  $('#rm-count').classList.toggle('error', !n);
  const link = roomLink(draft.id, cfg);
  $('#rm-link').value = n ? link : '';
  document.querySelectorAll('#rm-share-grid button, #rm-open').forEach((b) => { b.disabled = !n; });
  $('#rm-status').textContent = '';
}

function openRemote() {
  draft.id = randomId(8);
  draft.cfg = state.room
    ? { types: state.room.cfg.types.slice(), genres: state.room.cfg.genres.slice(), depths: state.room.cfg.depths.slice() }
    : { types: localCfg().types.slice(), genres: state.genre === 'all' ? GENRE_KEYS.slice() : [state.genre], depths: [1, 2, 3] };
  if (state.room) draft.id = state.room.id;
  renderRemote();
  $('#remote').showModal();
  track('room-dialog');
}

// Share the room link through the app people already use.
async function shareRoom(via) {
  const url = $('#rm-link').value;
  if (!url) return;
  const text = 'Play Fears of Love with me: same cards, wherever we are. Open this link:';
  const both = text + ' ' + url;
  const status = $('#rm-status');
  const enc = encodeURIComponent;
  const open = (href) => { window.open(href, '_blank', 'noopener'); };
  track('room-share/' + via);
  if (via === 'whatsapp') return open('https://wa.me/?text=' + enc(both));
  if (via === 'telegram') return open('https://t.me/share/url?url=' + enc(url) + '&text=' + enc(text));
  if (via === 'email') { location.href = 'mailto:?subject=' + enc('Play Fears of Love with me') + '&body=' + enc(both); return; }
  if (via === 'sms') { location.href = 'sms:?&body=' + enc(both); return; }
  if ((via === 'signal' || via === 'more') && navigator.share) {
    try { await navigator.share({ title: 'Fears of Love', text, url }); status.textContent = ''; } catch (e) { /* cancelled */ }
    return;
  }
  // copy (and Signal on computers: Signal has no web share link, so copy and paste)
  const ok = await copyText(url);
  status.textContent = !ok ? 'Select the link above and copy it.'
    : via === 'signal' ? 'Link copied. Paste it in Signal.'
    : via === 'more' ? 'Link copied. Paste it wherever you like.'
    : 'Link copied. Send it to the others, then tap Open the room.';
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    const i = $('#rm-link'); i.focus(); i.select();
    try { return document.execCommand('copy'); } catch (e2) { return false; }
  }
}

function setupRemote() {
  $('#btn-remote').addEventListener('click', openRemote);
  $('#rm-close').addEventListener('click', () => $('#remote').close());
  $('#rm-genres-all').addEventListener('click', () => { draft.cfg.genres = GENRE_KEYS.slice(); renderRemote(); });
  $('#rm-genres-none').addEventListener('click', () => { draft.cfg.genres = []; renderRemote(); });
  $('#rm-link').addEventListener('focus', (e) => e.target.select());
  document.querySelectorAll('#rm-share-grid button').forEach((b) => b.addEventListener('click', () => shareRoom(b.dataset.via)));
  $('#rm-open').addEventListener('click', () => {
    track('room-open');
    const link = $('#rm-link').value;
    $('#remote').close();
    if (state.room && link.indexOf('#room=' + state.room.id) > -1 && location.href !== link) leaveRoom(true);
    location.hash = link.split('#')[1];
  });
  $('#room-leave').addEventListener('click', () => leaveRoom(false));
  window.addEventListener('hashchange', () => {
    const r = roomFromHash();
    if (r) { if (state.room && state.room.id === r.id) leaveRoom(true); enterRoom(r); } else if (state.room) leaveRoom(false);
  });
  window.addEventListener('pagehide', () => { if (state.room && state.room.bc) state.room.bc.postMessage({ bye: clientId }); });
}

/* ---------- anonymous visit counter (GoatCounter: no cookies, no personal data) ---------- */

function setupCounter() {
  const code = String((window.FOL_CONFIG || {}).goatcounter || '').trim();
  if (!/^[a-z0-9-]+$/i.test(code)) return;
  const sc = document.createElement('script');
  sc.async = true;
  sc.dataset.goatcounter = 'https://' + code + '.goatcounter.com/count';
  sc.src = 'https://gc.zgo.at/count.js';
  document.head.append(sc);
  // show the total in About (works once "Allow adding visitor counts" is switched on in GoatCounter)
  fetch('https://' + code + '.goatcounter.com/counter/TOTAL.json').then((r) => r.json()).then((d) => {
    if (d && d.count) { const v = $('#visits'); v.textContent = 'Visits so far: ' + d.count; v.hidden = false; }
  }).catch(() => {});
}

/* ---------- tutorial ---------- */

const TUTORIAL = [
  ['Read the scene', 'Each card describes a moment from a film, a series or a book. Read it out loud to each other.'],
  ['Answer together', 'The question in the dotted box is about you, not the character. Take turns: what would you do? There are no wrong answers.'],
  ['Go deeper', 'Tap the little arrow under the question for follow-up questions when you want to dig further.'],
  ['Pick what comes next', 'Under the card you get a film, a series and a book with a similar feel. Tap one to talk about it next, or use Next card. On a phone you can also swipe the card.'],
  ['Far apart?', 'Tap the globe at the top to make a long distance link. Everyone who opens it sees the same card, and the deck moves for everyone.'],
];
let tutStep = 0;

function renderTutorial() {
  const [title, text] = TUTORIAL[tutStep];
  $('#tut-step').textContent = 'Step ' + (tutStep + 1) + ' of ' + TUTORIAL.length;
  $('#tut-title').textContent = title;
  $('#tut-text').textContent = text;
  $('#tut-back').hidden = tutStep === 0;
  $('#tut-next').textContent = tutStep === TUTORIAL.length - 1 ? 'Got it' : 'Next';
  $('#tut-dots').innerHTML = TUTORIAL.map((_, i) => '<i class="' + (i === tutStep ? 'on' : '') + '"></i>').join('');
}

function openTutorial() {
  tutStep = 0;
  renderTutorial();
  $('#tutorial').showModal();
  track('tutorial');
}

function seenCount() {
  try { return JSON.parse(store('get', 'fol-seen') || '[]').length; } catch (e) { return 0; }
}

// The small "?" button glows during the first four cards on this device.
function syncHowto() {
  $('#btn-howto').classList.toggle('nudge', seenCount() <= 4 && !store('get', 'fol-howto-done'));
}

function setupTutorial() {
  $('#btn-howto').addEventListener('click', openTutorial);
  $('#about-howto').addEventListener('click', () => { $('#about').close(); openTutorial(); });
  $('#tut-back').addEventListener('click', () => { tutStep = Math.max(0, tutStep - 1); renderTutorial(); });
  $('#tut-next').addEventListener('click', () => {
    if (tutStep < TUTORIAL.length - 1) { tutStep++; renderTutorial(); return; }
    store('set', 'fol-howto-done', '1');
    $('#tutorial').close();
    syncHowto();
  });
}

/* ---------- init ---------- */

async function init() {
  setupCounter();
  setupPostHog();
  setupTutorial();
  setupRemote();
  setupSwipe();
  $('#btn-info').addEventListener('click', () => $('#about').showModal());
  try {
    const [movies, scenes, posters] = await Promise.all([
      loadJSON('data/movies.json'),
      loadJSON('data/scenes.json'),
      loadJSON('data/posters.json', true),
    ]);
    movies.forEach((m) => state.movies.set(m.id, m));
    state.scenes = scenes.filter((s) => state.movies.has(s.movie));
    state.posters = posters || {};
  } catch (err) {
    console.error(err);
    $('#progress').textContent = '';
    const msg = $('#load-error');
    msg.hidden = false;
    msg.textContent = 'The game data could not be loaded. If you opened index.html directly from your files, run "npm start" and open http://localhost:8080 instead.';
    return;
  }

  $('#btn-deep').addEventListener('click', reveal);
  document.querySelectorAll('#type-toggle button').forEach((btn) => btn.addEventListener('click', () => {
    state.typeFilter = btn.dataset.type;
    track('filter-type/' + state.typeFilter);
    syncTypeToggle();
    renderGenreMenu();
    newGame();
  }));
  $('#btn-next').addEventListener('click', next);
  $('#btn-prev').addEventListener('click', back);
  $('#btn-again').addEventListener('click', () => {
    if (state.room) { state.room.round += 1; state.deck = buildRoomDeck(state.room); goTo(0); } else newGame();
  });
  document.addEventListener('keydown', (e) => {
    if (!$('#screen-play').classList.contains('is-active') || document.querySelector('dialog[open]')) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') back();
    if (e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); reveal(); }
  });
  renderGenreMenu();
  const room = roomFromHash();
  if (room) enterRoom(room); else newGame();
}

document.addEventListener('DOMContentLoaded', init);

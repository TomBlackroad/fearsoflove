#!/usr/bin/env node
// For every title in our deck, asks TMDB for similar titles and keeps the good ones that are NOT in our deck.
// Result: data/similar.json, used by the "Beyond our deck" part of the Suggest button. No key is needed at play time.
//
//   export TMDB_API_KEY="..."   (or TMDB_TOKEN)
//   node tools/fetch-similar.mjs
//
// Requires data/posters.json (run tools/fetch-posters.mjs first).
import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.TMDB_TOKEN;
const apiKey = process.env.TMDB_API_KEY;
if (!token && !apiKey) { console.error('Set TMDB_TOKEN or TMDB_API_KEY first. See docs/POSTERS.md.'); process.exit(1); }

async function tmdb(path, params = {}) {
  const url = new URL('https://api.themoviedb.org/3' + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (!token) url.searchParams.set('api_key', apiKey);
  const res = await fetch(url, token ? { headers: { Authorization: 'Bearer ' + token } } : {});
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json();
}

const movies = JSON.parse(await readFile('data/movies.json', 'utf8'));
const posters = JSON.parse(await readFile('data/posters.json', 'utf8'));

const genreNames = {};
for (const kind of ['movie', 'tv']) {
  const list = await tmdb(`/genre/${kind}/list`);
  list.genres.forEach((g) => { genreNames[g.id] = g.name; });
}

const OUR = { 'Science Fiction': 'Sci-fi', 'Sci-Fi & Fantasy': 'Sci-fi', 'Action & Adventure': 'Adventure', 'War & Politics': 'Drama', History: 'Period' };
const LIGHT = ['Comedy', 'Family', 'Animation', 'Romance', 'Music', 'Kids'];
const HEAVY = ['Thriller', 'Horror', 'War', 'Crime', 'Mystery', 'War & Politics'];

function describe(ids) {
  const names = ids.map((id) => genreNames[id]).filter(Boolean);
  const genres = [...new Set(names.map((n) => OUR[n] || n))];
  if (names.includes('Comedy') && names.includes('Romance')) genres.push('Rom-com');
  const tags = [];
  if (names.includes('Comedy')) tags.push('funny');
  if (names.includes('Romance')) tags.push('romantic');
  if (names.some((n) => n.includes('Adventure'))) tags.push('adventurous');
  if (names.some((n) => ['Thriller', 'Crime', 'Mystery'].includes(n))) tags.push('thrilling');
  if (names.some((n) => ['Horror', 'Crime'].includes(n))) tags.push('dark');
  if (names.some((n) => ['Fantasy', 'War', 'History', 'Sci-Fi & Fantasy'].includes(n))) tags.push('epic');
  if (names.includes('Family')) tags.push('family');
  if (names.includes('Science Fiction') || names.includes('Sci-Fi & Fantasy')) tags.push('mind-bending');
  if (names.includes('Drama')) tags.push('bittersweet');
  const light = names.filter((n) => LIGHT.includes(n)).length;
  const heavy = names.filter((n) => HEAVY.includes(n)).length;
  const intensity = Math.max(1, Math.min(5, Math.round(3 + heavy * 1.2 - light * 0.9)));
  return { genres, tags, intensity };
}

const ours = new Set(Object.values(posters).map((p) => p.tmdbId));
const pool = {};
const by = {};
for (const m of movies) {
  const p = posters[m.id];
  if (!p) continue;
  const kind = m.type === 'tv' ? 'tv' : 'movie';
  try {
    const res = await tmdb(`/${kind}/${p.tmdbId}/recommendations`);
    const keep = (res.results || [])
      .filter((r) => r.poster_path && !r.adult && (r.vote_count || 0) >= 300 && (r.vote_average || 0) >= 6.3 && !ours.has(r.id))
      .slice(0, 8);
    by[m.id] = [];
    for (const r of keep) {
      const k = `${kind}:${r.id}`;
      const date = r.release_date || r.first_air_date || '';
      pool[k] = pool[k] || { key: k, tmdb: r.id, type: kind, title: r.title || r.name, year: Number(date.slice(0, 4)) || null, poster: r.poster_path, ...describe(r.genre_ids || []) };
      by[m.id].push(k);
    }
    console.log(`ok  ${m.title}: ${keep.length} outside suggestions`);
  } catch (err) { console.warn(`!!  ${m.title}: ${err.message}`); }
  await new Promise((r) => setTimeout(r, 120));
}
await writeFile('data/similar.json', JSON.stringify({ generated: new Date().toISOString().slice(0, 10), pool, by }) + '\n');
console.log(`\nSaved ${Object.keys(pool).length} outside titles for ${Object.keys(by).length} of our titles to data/similar.json`);

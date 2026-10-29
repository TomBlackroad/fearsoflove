#!/usr/bin/env node
// Looks up each title in data/movies.json on TMDB and stores only the poster path in data/posters.json.
// The browser later loads images straight from TMDB's CDN; we never re-host them.
//
// Usage:
//   export TMDB_TOKEN="your TMDB API Read Access Token"   (or TMDB_API_KEY="v3 key")
//   node tools/fetch-posters.mjs            # only titles that are missing
//   node tools/fetch-posters.mjs --force    # refetch everything
//
// Review the printed "matched" names: wrong matches can be fixed by adding "tmdbId" to the title in movies.json.

import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.TMDB_TOKEN;
const apiKey = process.env.TMDB_API_KEY;
if (!token && !apiKey) {
  console.error('Set TMDB_TOKEN (read access token) or TMDB_API_KEY first. See docs/POSTERS.md.');
  process.exit(1);
}
const force = process.argv.includes('--force');

async function tmdb(path, params = {}) {
  const url = new URL('https://api.themoviedb.org/3' + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  if (!token) url.searchParams.set('api_key', apiKey);
  const res = await fetch(url, token ? { headers: { Authorization: 'Bearer ' + token } } : {});
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json();
}

const movies = JSON.parse(await readFile('data/movies.json', 'utf8'));
let posters = {};
try { posters = JSON.parse(await readFile('data/posters.json', 'utf8')); } catch { /* first run */ }

for (const m of movies) {
  if (posters[m.id] && !force) continue;
  try {
    const kind = m.type === 'tv' ? 'tv' : 'movie';
    let hit;
    if (m.tmdbId) {
      hit = await tmdb(`/${kind}/${m.tmdbId}`);
    } else {
      const params = { query: m.searchTitle || m.title };
      params[kind === 'tv' ? 'first_air_date_year' : 'year'] = m.year;
      const res = await tmdb(`/search/${kind}`, params);
      hit = (res.results || []).find((r) => r.poster_path);
    }
    if (!hit || !hit.poster_path) { console.warn(`!! no poster found: ${m.title} (${m.year})`); continue; }
    posters[m.id] = { tmdbId: hit.id, poster: hit.poster_path };
    console.log(`ok  ${m.title} (${m.year}) -> matched "${hit.title || hit.name}"`);
  } catch (err) {
    console.warn(`!! ${m.title}: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 120)); // be polite
}

await writeFile('data/posters.json', JSON.stringify(posters, null, 2) + '\n');
console.log(`\nSaved ${Object.keys(posters).length}/${movies.length} posters to data/posters.json`);

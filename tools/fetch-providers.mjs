#!/usr/bin/env node
// "Where to watch" data for every title in our deck and every outside suggestion.
// Source: TMDB watch-providers endpoint (data by JustWatch; TMDB requires crediting JustWatch, see the About box).
// Output: data/providers.json  { generated, countries, by: { "movie:603": { CH: { l, s, r, b } } } }
//   l = TMDB watch-page link, s = stream (subscription), r = rent, b = buy (provider names)
//
//   export TMDB_API_KEY="..."   node tools/fetch-providers.mjs [--force]
// Resumable: titles already in the file are skipped unless --force. Availability changes, so re-run now and then.
import { readFile, writeFile } from 'node:fs/promises';

const token = process.env.TMDB_TOKEN;
const apiKey = process.env.TMDB_API_KEY;
if (!token && !apiKey) { console.error('Set TMDB_TOKEN or TMDB_API_KEY first.'); process.exit(1); }
const force = process.argv.includes('--force');
const COUNTRIES = ['CH', 'ES', 'FR', 'DE', 'IT', 'AT', 'PT', 'NL', 'BE', 'GB', 'IE', 'US', 'CA', 'MX', 'AR', 'BR', 'AU'];

async function tmdb(path) {
  const url = new URL('https://api.themoviedb.org/3' + path);
  if (!token) url.searchParams.set('api_key', apiKey);
  const res = await fetch(url, token ? { headers: { Authorization: 'Bearer ' + token } } : {});
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json();
}

const movies = JSON.parse(await readFile('data/movies.json', 'utf8'));
const posters = JSON.parse(await readFile('data/posters.json', 'utf8'));
let similar = { pool: {} };
try { similar = JSON.parse(await readFile('data/similar.json', 'utf8')); } catch { /* optional */ }

const keys = new Set();
movies.forEach((m) => { if (posters[m.id]) keys.add(`${m.type === 'tv' ? 'tv' : 'movie'}:${posters[m.id].tmdbId}`); });
Object.keys(similar.pool).forEach((k) => keys.add(k));

let out = { generated: '', countries: COUNTRIES, by: {} };
try { out = JSON.parse(await readFile('data/providers.json', 'utf8')); out.countries = COUNTRIES; } catch { /* first run */ }

const todo = [...keys].filter((k) => force || !out.by[k]);
console.log(`${todo.length} titles to fetch (${keys.size} total)`);
const names = (arr) => (arr || []).slice(0, 5).map((p) => p.provider_name);
let done = 0;
async function worker() {
  while (todo.length) {
    const k = todo.pop();
    const [kind, id] = k.split(':');
    try {
      const res = await tmdb(`/${kind}/${id}/watch/providers`);
      const by = {};
      COUNTRIES.forEach((c) => {
        const r = res.results && res.results[c];
        if (r) by[c] = { l: r.link, s: names(r.flatrate), r: names(r.rent), b: names(r.buy) };
      });
      out.by[k] = by;
    } catch (err) { console.warn(`!! ${k}: ${err.message}`); }
    if (++done % 50 === 0) console.log(`  ${done} done`);
  }
}
await Promise.all(Array.from({ length: 5 }, worker));
out.generated = new Date().toISOString().slice(0, 10);
await writeFile('data/providers.json', JSON.stringify(out) + '\n');
console.log(`Saved providers for ${Object.keys(out.by).length} titles to data/providers.json`);

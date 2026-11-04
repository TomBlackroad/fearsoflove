#!/usr/bin/env node
// Pulls daily, anonymous totals from PostHog for the private dashboard at /stats.
//
//   logs/stats.json   plain copy for you (logs/ is gitignored, never published)
//   stats/data.json   the same numbers ENCRYPTED with your passphrase (gitignored; the nightly
//                     GitHub Action publishes its copy on the stats-data branch, read by /stats)
//
// Setup (once): a file called .env in the project folder (it is gitignored) with
//   POSTHOG_PERSONAL_KEY=phx_...      Settings > Personal API keys > scope: Query Read
//   POSTHOG_PROJECT_ID=334255
//   POSTHOG_HOST=https://eu.posthog.com
//   STATS_PASSPHRASE=some long phrase you will type on /stats
// Then:  npm run stats                 (last 730 days; or: npm run stats -- --days 90)
// The GitHub Action in .github/workflows/stats.yml runs the same script every night.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';

try { // tiny .env reader, no dependencies
  const env = await readFile('.env', 'utf8');
  env.split('\n').forEach((line) => { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); });
} catch { /* no .env: the GitHub Action passes the values as environment variables */ }

const KEY = process.env.POSTHOG_PERSONAL_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID;
const HOST = (process.env.POSTHOG_HOST || 'https://eu.posthog.com').replace(/\/$/, '');
const PASS = process.env.STATS_PASSPHRASE || '';
const arg = (name, def) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : def; };
const DAYS = Math.max(1, Math.min(730, Number(arg('--days', 730)) || 730));
const TZ = 'Europe/Paris';
if (!KEY || !PROJECT) {
  console.error('Missing POSTHOG_PERSONAL_KEY or POSTHOG_PROJECT_ID. See docs/ANALYTICS_SETUP.md, part B.');
  process.exit(1);
}

// Every table is grouped by day (Paris time) so the dashboard can show any date range.
// No visitor ids leave PostHog: only counts.
const W = `timestamp >= now() - INTERVAL ${DAYS} DAY`;
const DAY = `toString(toDate(toTimeZone(timestamp, '${TZ}')))`;
const S = 'properties.$session_id';
const PV = `event = '$pageview' AND ${W}`;
const QUERIES = {
  // day, visits, pageviews, cards, ratings, room_joins, rounds
  daily: `SELECT ${DAY} AS d, count(DISTINCT ${S}), countIf(event = '$pageview'), countIf(event = 'card_seen'), countIf(event LIKE 'react/%'), countIf(event = 'room-join'), countIf(event = 'round-end') FROM events WHERE ${W} GROUP BY d ORDER BY d`,
  // day, country code, country, region code, region, city, lat, lon, visits
  geo: `SELECT ${DAY} AS d, properties.$geoip_country_code AS cc, properties.$geoip_country_name AS cn, properties.$geoip_subdivision_1_code AS rc, properties.$geoip_subdivision_1_name AS rn, properties.$geoip_city_name AS city, round(toFloat(properties.$geoip_latitude), 1) AS lat, round(toFloat(properties.$geoip_longitude), 1) AS lon, count(DISTINCT ${S}) FROM events WHERE ${PV} GROUP BY d, cc, cn, rc, rn, city, lat, lon ORDER BY d LIMIT 50000`,
  // day, screen, os, installed, visits
  devices: `SELECT ${DAY} AS d, properties.screen AS s, properties.$os AS os, toString(properties.installed) AS inst, count(DISTINCT ${S}) FROM events WHERE ${PV} GROUP BY d, s, os, inst ORDER BY d LIMIT 50000`,
  // day, referring domain, visits
  referrers: `SELECT ${DAY} AS d, properties.$referring_domain AS r, count(DISTINCT ${S}) FROM events WHERE ${PV} GROUP BY d, r ORDER BY d LIMIT 50000`,
  // day, language, time zone, visits
  languages: `SELECT ${DAY} AS d, properties.lang AS l, properties.tz AS tz, count(DISTINCT ${S}) FROM events WHERE ${PV} GROUP BY d, l, tz ORDER BY d LIMIT 50000`,
  // day, hour (Paris), visits
  hours: `SELECT ${DAY} AS d, toHour(toTimeZone(timestamp, '${TZ}')) AS h, count(DISTINCT ${S}) FROM events WHERE ${PV} GROUP BY d, h ORDER BY d LIMIT 50000`,
  // day, event name, count (our own events only)
  events: `SELECT ${DAY} AS d, event, count() FROM events WHERE ${W} AND event NOT LIKE '$%' GROUP BY d, event ORDER BY d LIMIT 50000`,
  // day, scene, title, type, depth, views, seconds (sum), opened deeper, quick skips (<5 s), in a room
  cards: `SELECT ${DAY} AS d, properties.scene AS sc, properties.title AS t, properties.type AS ty, properties.depth AS dp, count(), sum(toFloat(properties.seconds)), countIf(toString(properties.deeper) = 'true'), countIf(toFloat(properties.seconds) < 5), countIf(toString(properties.room) = 'true') FROM events WHERE event = 'card_seen' AND ${W} GROUP BY d, sc, t, ty, dp ORDER BY d LIMIT 50000`,
  // day, scene, reaction key, value 1-5 (null for the old 4-button scale), count
  ratings: `SELECT ${DAY} AS d, properties.scene AS sc, replaceOne(event, 'react/', '') AS k, properties.value AS v, count() FROM events WHERE event LIKE 'react/%' AND ${W} GROUP BY d, sc, k, v ORDER BY d LIMIT 50000`,
  // day, from title, to title, count (taps on the related row)
  jumps: `SELECT ${DAY} AS d, properties.from AS f, properties.to AS t, count() FROM events WHERE event LIKE 'related/%' AND ${W} GROUP BY d, f, t ORDER BY d LIMIT 50000`,
  // one row per visit, no id: day it started, cards seen, ratings, seconds long, played in a room
  visits: `SELECT d, c, r, len, room FROM (SELECT ${S} AS s, min(${DAY}) AS d, countIf(event = 'card_seen') AS c, countIf(event LIKE 'react/%') AS r, dateDiff('second', min(timestamp), max(timestamp)) AS len, max(toString(properties.room) = 'true') AS room FROM events WHERE ${W} AND ${S} IS NOT NULL GROUP BY s) ORDER BY d LIMIT 50000`,
};

async function run(name, sql) {
  const res = await fetch(`${HOST}/api/projects/${PROJECT}/query/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql }, name: `fol-stats ${name}` }),
  });
  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    console.error(`PostHog refused the key (HTTP ${res.status}). Check POSTHOG_PERSONAL_KEY (scope: Query Read), POSTHOG_PROJECT_ID and POSTHOG_HOST.`);
    process.exit(1);
  }
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${text.slice(0, 300)}`);
  const rows = JSON.parse(text).results || [];
  // numbers stay numbers, everything else becomes short strings; keeps the file small
  return rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : typeof v === 'number' ? Math.round(v * 10) / 10 : typeof v === 'boolean' ? (v ? 1 : 0) : String(v))));
}

const out = { v: 2, generated: new Date().toISOString(), days: DAYS, tz: TZ };
let failed = 0;
for (const [name, sql] of Object.entries(QUERIES)) {
  try { out[name] = await run(name, sql); console.log(`ok  ${name} (${out[name].length} rows)`); }
  catch (err) { failed++; out[name] = []; console.warn(`!!  ${err.message}`); }
  await new Promise((r) => setTimeout(r, 400)); // stay far below the rate limits
}
if (failed === Object.keys(QUERIES).length) { console.error('Every query failed; nothing written.'); process.exit(1); }

const json = JSON.stringify(out);
await mkdir('logs', { recursive: true });
await writeFile('logs/stats.json', json);
console.log(`\nSaved logs/stats.json (private, ${(json.length / 1024).toFixed(0)} KB).`);

if (!PASS) {
  console.log('No STATS_PASSPHRASE set, so stats/data.json was NOT written (the repo is public).');
} else {
  // gzip, then AES-256-GCM with a key derived from the passphrase (PBKDF2-SHA256).
  // The browser reverses this with WebCrypto on /stats; no server, no account.
  const ITER = 310000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(PASS), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, gzipSync(json)));
  const b64 = (u) => Buffer.from(u).toString('base64');
  const file = { v: 2, generated: out.generated, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), zip: 'gzip', data: b64(data) };
  await mkdir('stats', { recursive: true });
  await writeFile('stats/data.json', JSON.stringify(file));
  console.log(`Saved stats/data.json (encrypted, ${(JSON.stringify(file).length / 1024).toFixed(0)} KB). Open /stats locally to check it; online, the nightly GitHub Action publishes its own copy.`);
}
if (failed) console.log(`${failed} queries failed; their tables are empty this time.`);

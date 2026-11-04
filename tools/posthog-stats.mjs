#!/usr/bin/env node
// Pulls aggregated numbers from PostHog into logs/stats.json (private: logs/ is gitignored).
// Claude can read that file to build your dashboard. Your personal key never leaves your computer.
//
// One-time setup: put these lines in a file called .env in the project folder (it is gitignored):
//   POSTHOG_PERSONAL_KEY=phx_...      (Settings > Personal API keys > scope: Query Read)
//   POSTHOG_PROJECT_ID=12345          (Settings > Project > Project ID)
//   POSTHOG_HOST=https://eu.posthog.com
// Then run:  npm run stats            (or: npm run stats -- --days 365)

import { readFile, writeFile, mkdir } from 'node:fs/promises';

try { // tiny .env reader, no dependencies
  const env = await readFile('.env', 'utf8');
  env.split('\n').forEach((line) => { const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); });
} catch { /* no .env */ }

const KEY = process.env.POSTHOG_PERSONAL_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID;
const HOST = (process.env.POSTHOG_HOST || 'https://eu.posthog.com').replace(/\/$/, '');
const di = process.argv.indexOf('--days');
const DAYS = Math.max(1, Math.min(730, Number(di > -1 ? process.argv[di + 1] : 90) || 90));
if (!KEY || !PROJECT) {
  console.error('Missing POSTHOG_PERSONAL_KEY or POSTHOG_PROJECT_ID. See docs/ANALYTICS_SETUP.md, step 5.');
  process.exit(1);
}

const since = `timestamp >= now() - INTERVAL ${DAYS} DAY`;
const visit = 'properties.$session_id';
const QUERIES = {
  totals: `SELECT count(DISTINCT ${visit}) AS visits, countIf(event = '$pageview') AS pageviews, countIf(event = 'card_seen') AS cards_seen, countIf(event LIKE 'react/%') AS reactions, countIf(event = 'room-join') AS room_joins, countIf(event = 'round-end') AS rounds_finished FROM events WHERE ${since}`,
  daily: `SELECT toDate(timestamp) AS day, count(DISTINCT ${visit}) AS visits, countIf(event = 'card_seen') AS cards_seen FROM events WHERE ${since} GROUP BY day ORDER BY day`,
  countries: `SELECT properties.$geoip_country_name AS country, properties.$geoip_country_code AS code, count(DISTINCT ${visit}) AS visits FROM events WHERE event = '$pageview' AND ${since} GROUP BY country, code ORDER BY visits DESC LIMIT 100`,
  timezones: `SELECT properties.tz AS tz, count(DISTINCT ${visit}) AS visits FROM events WHERE event = '$pageview' AND ${since} GROUP BY tz ORDER BY visits DESC LIMIT 100`,
  languages: `SELECT properties.lang AS lang, count(DISTINCT ${visit}) AS visits FROM events WHERE event = '$pageview' AND ${since} GROUP BY lang ORDER BY visits DESC LIMIT 50`,
  devices: `SELECT properties.screen AS screen, properties.$os AS os, properties.installed AS installed, count(DISTINCT ${visit}) AS visits FROM events WHERE event = '$pageview' AND ${since} GROUP BY screen, os, installed ORDER BY visits DESC LIMIT 50`,
  referrers: `SELECT properties.$referring_domain AS referrer, count(DISTINCT ${visit}) AS visits FROM events WHERE event = '$pageview' AND ${since} GROUP BY referrer ORDER BY visits DESC LIMIT 50`,
  hours: `SELECT toHour(timestamp) AS hour_utc, toDayOfWeek(timestamp) AS weekday, count(DISTINCT ${visit}) AS visits FROM events WHERE event = '$pageview' AND ${since} GROUP BY hour_utc, weekday ORDER BY weekday, hour_utc`,
  events: `SELECT event, count() AS n FROM events WHERE ${since} AND event NOT LIKE '$%' GROUP BY event ORDER BY n DESC LIMIT 300`,
  visit_depth: `SELECT cards, count() AS visits FROM (SELECT ${visit} AS s, countIf(event = 'card_seen') AS cards FROM events WHERE ${since} GROUP BY s) GROUP BY cards ORDER BY cards LIMIT 200`,
  visit_length: `SELECT round(quantile(0.5)(len) / 60, 1) AS median_minutes, round(avg(len) / 60, 1) AS avg_minutes FROM (SELECT ${visit} AS s, dateDiff('second', min(timestamp), max(timestamp)) AS len FROM events WHERE ${since} GROUP BY s)`,
  cards: `SELECT properties.scene AS scene, properties.title AS title, properties.type AS type, properties.depth AS depth, count() AS views, round(avg(toFloat(properties.seconds)), 1) AS avg_seconds, countIf(toFloat(properties.seconds) < 5) AS quick_skips, countIf(toString(properties.deeper) = 'true') AS deeper FROM events WHERE event = 'card_seen' AND ${since} GROUP BY scene, title, type, depth ORDER BY views DESC LIMIT 2000`,
  reactions: `SELECT properties.scene AS scene, replaceOne(event, 'react/', '') AS reaction, count() AS n FROM events WHERE event LIKE 'react/%' AND ${since} GROUP BY scene, reaction ORDER BY n DESC LIMIT 5000`,
  jumps: `SELECT properties.from AS from_title, properties.to AS to_title, count() AS n FROM events WHERE event LIKE 'related/%' AND ${since} GROUP BY from_title, to_title ORDER BY n DESC LIMIT 1000`,
  filters: `SELECT event, count() AS n FROM events WHERE (event LIKE 'filter-%') AND ${since} GROUP BY event ORDER BY n DESC LIMIT 100`,
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
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  const cols = data.columns || [];
  return (data.results || []).map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

const out = { generated: new Date().toISOString(), days: DAYS, host: HOST };
let failed = 0;
for (const [name, sql] of Object.entries(QUERIES)) {
  try { out[name] = await run(name, sql); process.stdout.write(`ok  ${name} (${out[name].length} rows)\n`); }
  catch (err) { failed++; out[name] = { error: String(err.message || err) }; console.warn(`!!  ${err.message}`); }
  await new Promise((r) => setTimeout(r, 300)); // stay far below the rate limits
}
await mkdir('logs', { recursive: true });
await writeFile('logs/stats.json', JSON.stringify(out, null, 1));
console.log(`\nSaved logs/stats.json (${DAYS} days)${failed ? `, ${failed} queries failed` : ''}. Ask Claude to build the dashboard from it.`);

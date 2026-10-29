#!/usr/bin/env node
// Checks the content files for mistakes. Run before every commit: npm run validate
import { readFile } from 'node:fs/promises';

const movies = JSON.parse(await readFile('data/movies.json', 'utf8'));
const scenes = JSON.parse(await readFile('data/scenes.json', 'utf8'));
const errors = [];
const warn = [];

const movieIds = new Set();
for (const m of movies) {
  if (movieIds.has(m.id)) errors.push(`duplicate movie id: ${m.id}`);
  movieIds.add(m.id);
  if (!m.title || !m.year || !['movie', 'tv'].includes(m.type)) errors.push(`movie ${m.id}: needs title, year, type (movie|tv)`);
  if (!Array.isArray(m.genres) || m.genres.length === 0) errors.push(`movie ${m.id}: needs at least one genre`);
}

const sceneIds = new Set();
const perMovie = {};
for (const s of scenes) {
  if (sceneIds.has(s.id)) errors.push(`duplicate scene id: ${s.id}`);
  sceneIds.add(s.id);
  if (!movieIds.has(s.movie)) errors.push(`scene ${s.id}: unknown movie "${s.movie}"`);
  perMovie[s.movie] = (perMovie[s.movie] || 0) + 1;
  if (!s.moment || !s.prompt) errors.push(`scene ${s.id}: needs moment and prompt`);
  if (![1, 2, 3].includes(s.depth)) errors.push(`scene ${s.id}: depth must be 1, 2 or 3`);
  if (!Array.isArray(s.followUps) || s.followUps.length < 2) errors.push(`scene ${s.id}: needs 2 followUps`);
  if (s.line && s.line.split(/\s+/).length > 8) warn.push(`scene ${s.id}: quoted line is long; keep quotes to a few words (copyright)`);
  if ((s.moment || '').length > 260) warn.push(`scene ${s.id}: moment is long for a phone screen`);
}
for (const id of movieIds) if (!perMovie[id]) warn.push(`movie ${id} has no scenes`);

console.log(`${movies.length} titles, ${scenes.length} scenes`);
warn.forEach((w) => console.warn('warning: ' + w));
if (errors.length) { errors.forEach((e) => console.error('ERROR: ' + e)); process.exit(1); }
console.log('Content OK');

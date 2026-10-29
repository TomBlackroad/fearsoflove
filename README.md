# Fears of Love

## [Play the game: tomblackroad.github.io/fearsoflove](https://tomblackroad.github.io/fearsoflove/)

Just open the link above, on your phone or computer. Nothing to install. (The files below are only for people who want to look under the hood or help build it.)

An ice-breaker game for two. Each card shows an iconic moment from a film or series and asks one question: **what would you do?**

Working title; the name is still open.

## Run it locally

```
npm start        # serves the folder at http://localhost:8080
npm run validate # checks the content files before you commit
```

The game is plain HTML, CSS and JavaScript (no build step), so GitHub Pages serves it as is.

## Project layout

| Path | What it is |
|---|---|
| `index.html`, `css/`, `js/` | The game |
| `data/movies.json` | Titles (id, year, genres, film or series) |
| `data/scenes.json` | The cards: scene, question, follow-ups |
| `data/posters.json` | Poster paths from TMDB (generated, see `docs/POSTERS.md`) |
| `data/legacy-scenarios.json` | The 35 cards of the original version, kept for reference |
| `tools/` | Poster fetcher and content validator |
| `docs/` | Plan, content guide, poster and visit-counter instructions |
| `js/config.js` | Public settings (visit counter code) |
| `icons/`, `manifest.webmanifest` | App icon and home-screen setup |

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Scene descriptions are written in our own words; titles and artwork belong to their owners. Licensed under GPL-3.0.

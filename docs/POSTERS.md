# Posters (free, via TMDB)

We use [TMDB](https://www.themoviedb.org) for poster images: free for non-commercial projects, covers films and series, and serves images from its own CDN. We store only the poster path; the browser loads the image from TMDB. Nothing is re-hosted.

## One-time setup (you, about 5 minutes)

1. Create a free account at themoviedb.org and verify your email.
2. Open Settings > API and request a **Developer** key. Pick *personal / non-commercial*. Describe it as "free ice-breaker game based on movie scenes", and use the GitHub Pages URL as the site.
3. Copy the **API Read Access Token** (the long one). Keep it private: never paste it in the repo or in a public place.

## Fetch the posters

In a terminal inside the project folder:

```
export TMDB_TOKEN="paste-token-here"
npm run posters
```

It prints each match. Check the names are right. If one is wrong, add `"tmdbId": 12345` (the number from the movie's TMDB URL) to that title in `data/movies.json` and run `npm run posters -- --force`.

Commit the generated `data/posters.json`. It holds no secrets.

## Conditions we must respect

- Free only while the game is **non-commercial** (no ads, no paid features). If that changes, we need TMDB's written agreement first.
- Keep the credit text in the About dialog: "This product uses the TMDB API but is not endorsed or certified by TMDB." Add the approved TMDB logo to that dialog (download it from TMDB's "API logos" page).
- Posters remain the studios' artwork. Do not use them in promotional material such as social posts and ads. Use our own graphics there.

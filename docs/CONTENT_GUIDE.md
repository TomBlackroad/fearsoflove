# Content guide

Cards live in `data/scenes.json`, titles in `data/movies.json`.

## Add a title

```json
{ "id": "before-sunset", "title": "Before Sunset", "year": 2004, "type": "movie", "genres": ["Romance", "Drama"] }
```

- `id`: short, lowercase, unique.
- `type`: `movie` or `tv`.
- `searchTitle` (optional): use when TMDB names it differently. `tmdbId` (optional): pins the exact TMDB entry if the poster match is wrong.

## Add a card

```json
{ "id": "before-sunset-1", "movie": "before-sunset", "depth": 2,
  "moment": "What happens in the scene, in your own words (one or two sentences).",
  "line": "Optional: a very short iconic line.",
  "prompt": "The question each player answers: what would YOU do?",
  "followUps": ["A question that goes a bit deeper", "Another one"] }
```

## Rules of thumb

1. **Describe, don't quote.** Write the scene in your own words. Quote only a few words, and only when the line is the point ("I know.", "It'll pass.").
2. **Make it about them, not the film.** The best prompt works even for someone who has not seen it.
3. **Depth** sets the mood: 1 = light and fun, 2 = personal, 3 = vulnerable. Aim for a mix per title.
4. **Keep it short.** Phone screen first: moment under about 250 characters, prompt one or two sentences.
5. **Avoid spoilers** where you can, or keep them to well-known moments.
6. 3 cards per title is a good start; more is welcome.

Run `npm run validate` after editing. It catches missing fields, duplicate ids and unknown titles.

## Where to send ideas

Send me (Claude) a list of titles or favorite moments in any shape, even just names. I will turn them into cards for you to review.

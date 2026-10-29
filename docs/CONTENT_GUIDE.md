# Content guide

Cards live in `data/scenes.json`, titles in `data/movies.json`.

## Add a title

```json
{ "id": "before-sunset", "title": "Before Sunset", "year": 2004, "type": "movie", "genres": ["Romance", "Drama"] }
```

- `id`: short, lowercase, unique.
- `type`: `movie` or `tv`.
- `intensity`: 1 = light and cozy, 3 = in between, 5 = intense and deep. `tags`: 3 to 5 mood words (cozy, funny, romantic, bittersweet, heartbreaking, epic, adventurous, thrilling, mind-bending, witty, dreamy, coming-of-age, dark, nostalgic, feel-good, philosophical, rebellious, slow-burn, friendship, family). The recommender (Suggest button) uses both, so every title needs them.
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

1. **Write about people.** Describe each scene as something that happens to someone, using the character's name when the scene needs it ('Jim confesses his feelings to Pam...', 'Din Djarin finds a small child...'). For animated or fantasy titles, always keep a human reference: describe the human situation behind the scene, not the creature or the setting.
2. **Describe, don't quote.** Write the scene in your own words. Quote only a few words, and only when the line is the point ("I know.", "It'll pass.").
3. **Make it about them, not the film.** The best prompt works even for someone who has not seen it.
4. **Depth** sets the mood: 1 = light and fun, 2 = personal, 3 = vulnerable. Aim for a mix per title.
5. **Keep it short.** Phone screen first: moment under about 250 characters, prompt one or two sentences.
6. **Avoid spoilers** where you can, or keep them to well-known moments.
7. 3 cards per title is a good start; more is welcome.

Run `npm run validate` after editing. It catches missing fields, duplicate ids and unknown titles.

## Ideas from players

Ideas from players currently come through GitHub issues or directly to the project owner.

## Where to send ideas

Send me (Claude) a list of titles or favorite moments in any shape, even just names. I will turn them into cards for you to review.

## Books
- Same file format as films, with `"type": "book"` and an `"author"` field (required). The cover is drawn by the game (cream paper, title, author), so there is no image to fetch.
- Same rules: write about people, name the characters, keep a human reference, short quotes only.
- Suggestions mix books, films and series through shared genres and mood tags, so reuse the existing tags.
- Books link to Open Library ("Find it") instead of streaming services.

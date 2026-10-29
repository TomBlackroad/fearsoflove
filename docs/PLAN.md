# Plan

## Product
A couple ice-breaker. Each card: a famous film or series moment, then "what would you do?", then deeper follow-ups. English first; Spanish and French after testing.

## Done
- Repo cloned, restructured, GitHub Pages compatible
- 19 titles, 57 cards (first classics batch)
- Playable game: opens straight on a card, three steps per card (scene, question, follow-ups), posters, Wikipedia links, info dialog

- Recommender: two sliders (did you like it, mood you are in) and a Suggest button; content-based, runs on the device

## Next
1. **Posters:** user gets a TMDB token, we run `npm run posters` (docs/POSTERS.md)
2. **Test with real people:** 3 to 5 couples or friends; note which cards fall flat
3. **Content batches** of about 20 titles each (classic romance, sci-fi, thrillers, series; then niche)
4. **Design pass:** move to the Design environment, define logo, palette, card back, share image
5. **Launch kit:** Open Graph preview image, short demo video, name and domain decision
6. **Translations** (ES, FR) once the English version is validated

## Who does what
| Claude (tech lead) | You |
|---|---|
| Code, structure, deploys, content research and drafting | Taste: approve or kill cards, add niche favorites |
| Poster tooling and licensing checks | TMDB account and token, GitHub login |
| Design directions | Play-testing and promotion |


## Recommender and data (added)
- Two sliders (gold, silver) + shared mood slider; Suggest shows 3 from the deck and 2 outside, each with where-to-watch by country.
- Card order: new random shuffle each time, unseen cards first (per device).

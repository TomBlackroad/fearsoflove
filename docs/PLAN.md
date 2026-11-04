# Plan

## Product
A couple ice-breaker. Each card: a famous movie or series moment, then "what would you do?", then deeper follow-ups. English first; Spanish and French after testing.

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

## November 2026 update
- Removed the rating sliders and the Suggest pop-up. Under each card: one film, one series and one book with a similar feel (or three of the filtered type); tapping one jumps to its card.
- Genre menu under the type toggle; bigger Next button; swipe left or right on phones and tablets (buttons stay).
- Long-distance rooms: globe button, presets and checklists, a link to copy, share or open. Same seeded deck for everyone; card changes sync peer to peer (Trystero over Nostr relays, plus BroadcastChannel between tabs).
- 514 cards, 148 titles (new: horror, crime, animation, musicals, international, K-drama, romantasy and more).
- Analytics switches in js/config.js (GoatCounter, optional cookieless PostHog). Plan: docs/DATA_COLLECTION.md. Ideas: docs/IDEAS.md.
- Rounds of 20 cards with reactions (loved it, made me think, fun, pass). At the end of each round: a live graph (who matched whom, everyone's reactions, top cards), save or share as PNG, and "Next round" once everybody is ready. Names (aliases) are asked when joining a room.
- Invite button inside rooms (link + share buttons). "Movies" is the term everywhere (not "Film").
- Analytics: PostHog only (memory persistence, IP discarded after country lookup, DNT/GPC respected, opt-out in About). `npm run stats` exports aggregates to logs/stats.json for a custom dashboard. SEO: preview image, structured data, sitemap. Setup: docs/ANALYTICS_SETUP.md.
- One device: the whole deck (no rounds); filters in a pop-up behind a filter icon (type, genre, group dares 🌶️ Flirty / 🌶️🌶️ Steamy, off by default, explainer first). 5-level rating 🔥 → 🙈.
- Play with others: rounds of 20, a graph after each round (players fixed, each card pulled toward the players who liked it, so shared taste gathers in the middle), one small share icon, Continue when everyone is ready; spicy "Would you…?" cards can be switched on; a small "Similar titles" button opens 2 deck + 2 TMDB titles in a new tab.
- Content: 604 cards (514 conversation cards, 45 group dares, 45 "Would you…?").

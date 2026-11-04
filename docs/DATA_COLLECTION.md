# Data collection plan (sustainable, free or cheap)

Prices and limits were checked on 4 November 2026. Free tiers change, so re-check the linked pages before you rely on them.
This is a practical plan, not legal advice. Have a lawyer look at stage 3 before you collect personal profiles.

## The short version

| Stage | What you learn | Tool | Cost | Consent banner? | Effort |
|---|---|---|---|---|---|
| 1. Now | How many visits, from which countries, devices, referrers. Click counts (rooms, swipes, jumps, filters). | GoatCounter (already built in) | Free | No (no cookies, no personal data) | 3 min |
| 2. Next | Journeys: which cards keep people talking, where they drop off, how rooms are used, time per card, funnels, dashboards. | PostHog Cloud EU, cookieless mode (already built in) | Free up to 1M events per month | No in cookieless mode, but list it in the privacy note | 10 min |
| 3. Later | Taste profiles for a real recommender, compatibility, a dating product. | Your own database: Cloudflare Workers + D1, or Supabase | Free to start; about $5 or $25 per month when it grows | Yes, explicit opt-in, plus a privacy policy | A few days |

Rule of thumb: **anonymous counts first, anonymous journeys second, personal data only when people knowingly sign up for something they want.**

---

## Stage 1: visitor dashboard (do this now)

**What you get.** Total visits, unique visitors, countries, browsers, screen sizes, where people came from, and counts for every in-game event the app already sends:

| Event name | Meaning |
|---|---|
| `event/related/movie`, `/tv`, `/book` | Someone tapped a tile under the card |
| `event/swipe-next`, `event/swipe-back` | Swipes on phones and tablets |
| `event/deeper` | Follow-up questions opened |
| `event/filter-type/…`, `event/filter-genre/…` | Filter choices (shows which genres people want) |
| `event/room-dialog`, `room-copy`, `room-share`, `room-open`, `room-join` | The long-distance funnel |
| `event/tutorial`, `event/deck-end` | Tutorial opened, deck finished |

**Setup.**
1. Sign up at https://www.goatcounter.com and pick a code, e.g. `fearsoflove`.
2. Settings → Site → turn on "Allow adding visitor counts on your website" (this lets the About box show the total).
3. Put the code in `js/config.js`: `goatcounter: 'fearsoflove'`. Commit and push.
4. Dashboard: `https://fearsoflove.goatcounter.com`. You can make it public in the settings.

**Cost and limits.** Free "for reasonable public usage"; it only becomes a problem at millions of page views per day. You can export everything at any time. ([GoatCounter](https://www.goatcounter.com/), [events help](https://www.goatcounter.com/help/events))

**Limits of what you learn.** Counts only. You can't follow one person's path or measure time per card.

---

## Stage 2: event analytics with dashboards (when you want real answers)

**Tool: PostHog Cloud, EU region (Frankfurt), cookieless mode.**
- Free: **1,000,000 events per month**, 1 year of data retention, unlimited team members, dashboards, funnels, retention charts. After that, about $0.00005 per event, which is $50 per extra million. ([PostHog pricing](https://posthog.com/pricing))
- Cookieless mode (`cookieless_mode: 'always'`) stores nothing in the browser, so no cookie banner is needed. The trade-offs: returning visitors look new each day, there is no session replay, and there is no world map from IP. ([PostHog cookieless guide](https://www.posthog.com/tutorials/cookieless-tracking))
- Already wired: when `posthogKey` is set in `js/config.js`, the app sends the stage-1 events with details, plus `card_seen` (which card, how many seconds it was really on screen, whether "deeper" was opened). Personal profiles are switched off (`person_profiles: 'never'`).

**Setup.**
1. Create a free account at https://posthog.com and choose the **EU** region.
2. Project settings → Web analytics → enable **cookieless tracking**.
3. Copy the project API key (starts with `phc_`). It is public by design. Paste it into `js/config.js` as `posthogKey`. Push.
4. Build three dashboards (examples below).

**Volume estimate.** One visit is about 20 to 60 events (cards seen, jumps, swipes). So the free tier covers roughly **15,000 to 50,000 visits a month**. If you get close, sample `card_seen` (send it for 1 card in 3), or drop it and keep only the coarse events.

**Dashboards worth building.**
- *Card quality*: average seconds per card, % "deeper" opened, % skipped in under 5 seconds. Rank all 514 cards, then rewrite or retire the bottom 10%.
- *Content demand*: genre and type filters chosen vs cards available. Write more of what people ask for.
- *Long-distance funnel*: dialog opened → link copied/shared → room joined → rooms with 2+ people → cards played per room.
- *Engagement*: cards per visit, deck finished %, swipe vs button use (answers your swipe test), visits per weekday and hour.

**Simpler alternative:** Umami Cloud Hobby is free for 100,000 events per month, 1 website and 6 months of retention. It has nicer simple charts but weaker funnels. ([Umami pricing](https://umami.is/pricing))

---

## Stage 3: your own data for recommendations or a dating product

Only start this when you have a reason for people to give you data, for example "save our watchlist", "see our taste match", or "find people who love the same stories". Never send personal data to the analytics tools.

### Where to store it (pick one)

**Option A: Cloudflare Workers + D1 (recommended for a demo).**
- A tiny API (one Worker) writes rows into D1, Cloudflare's SQLite database.
- Free: 100,000 Worker requests per day; D1 5 GB storage, 5 million rows read and 100,000 rows written per day. Nothing pauses when quiet. ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/))
- Paid when needed: **$5 per month** for 10 million requests and 50 million row writes.
- Size check: one event row is about 200 bytes, so 5 GB holds about 25 million events.

**Option B: Supabase (Postgres, with built-in logins).**
- Free: 500 MB database, 50,000 monthly active users with login, 2 projects. **A free project is paused after a week without activity.** ([Supabase pricing](https://supabase.com/pricing))
- Pro: **$25 per month** (8 GB, no pausing, daily backups).
- Best if you want user accounts soon (the dating path), because authentication is included.

**Option C: Firebase (Google).** Free Spark plan: Firestore 1 GB, 20,000 writes and 50,000 reads per day. ([Firebase pricing](https://firebase.google.com/pricing)) This is fine, but query and export are clumsier for analysis than SQL.

**Not recommended for logging:** Google Sheets plus Apps Script. It is free, but it has tight daily quotas (90 minutes of trigger runtime per day on a personal account) and gets slow after tens of thousands of rows. ([Apps Script quotas](https://developers.google.com/apps-script/quotas))

### Suggested tables (stage 3)

```
sessions   (id, started_at, country, device, language, mode: solo|room, room_size)
card_views (session_id, scene_id, title_id, seconds, deeper, next_action: next|back|swipe|jump, at)
reactions  (session_id, title_id, reaction: loved|seen|want|not_for_us, at)      -- explicit taps
profiles   (user_id, created_at, age_range, country, languages, looking_for)    -- only with an account and consent
consents   (user_id, purpose, granted_at, withdrawn_at)
```
Keep raw events for 12 months, then aggregate (counts per card and month) and delete the raw rows. That keeps storage small and is easier to defend legally.

### Processing

- Weekly job: Cloudflare Cron Trigger (free) or a GitHub Action (free for public repositories). It turns raw rows into `data/stats.json` (public, aggregate only: e.g. top cards, "people who jumped from X went to Y").
- Analysis: export to CSV and use a notebook, or connect Metabase (open source) or Supabase's SQL editor. Ask Claude to read the exports and summarise them.

---

## What data is worth collecting

**Anonymous usage (stages 1 and 2).** Visits, country, device, language; cards seen and seconds per card; deeper opened; next, back, swipe and jump; filters; deck finished; rooms created, joined, size and duration.

**Signals that improve the game without knowing who anyone is.**
- *Card quality score* = time on card + deeper rate − quick skips. Use it to order decks (best cards first for new visitors).
- *Co-jump graph*: "people on Titanic jumped to The Notebook". That is collaborative filtering for the similar-titles row: blend it with today's genre and mood similarity.
- *Session shape*: how many cards people play before leaving, so you can design a natural "end of round".

**Explicit taste (needs a tap, can stay anonymous).** A small heart, check or cross per title ("loved it", "seen it", "want to see", "not for us"). In a room, compare both players: "You agree on 7 of 9 titles".

**Even more insightful (opt-in, later).**
- "This card sparked a great talk" button: the best quality signal you can get.
- Relationship context: first dates, couple, friends, family, group size.
- Answer style: short multiple-choice answers to some prompts ("I'd leave" or "I'd stay"). Great for compatibility, sensitive if stored with identity.
- Imported watch and read history (Letterboxd or Goodreads export) to build a personal deck.
- Free-text answers: very rich, very sensitive. Only with clear consent, never in analytics, and only if you really need them.

**Never collect.** Names or emails in analytics, IP addresses, precise location, anything typed into a box, or data about minors. Sexual orientation, health and similar data count as special-category or sensitive data under GDPR and the Swiss FADP. A dating product needs explicit consent, an 18+ check, a data protection impact assessment and legal advice.

---

## Legal checklist (Switzerland and EU)

- Stages 1 and 2 (cookieless, no profiles): mention them in a short privacy note in the About box. Swiss law requires telling users about processing and letting them refuse it, and GDPR applies to EU visitors. ([CookieYes on Swiss FADP](https://www.cookieyes.com/knowledge-base/cookie-consent/is-cookie-consent-required-in-switzerland.md/), [PostHog GDPR](https://posthog.com/docs/integrate/gdpr))
- Stage 3: opt-in consent per purpose, a privacy policy, a "delete my data" button, EU or Swiss hosting where possible, and data processing agreements with your providers (PostHog, Cloudflare and Supabase all offer one).
- Keep raw data out of the public GitHub repo (`logs/` is already in `.gitignore`).

## Cost summary

| Monthly use | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| Up to ~20k visits | Free | Free | Free (D1 or Supabase free) |
| ~100k visits | Free | ~$0–$150 depending on card_seen sampling | $5 (Workers Paid) or $25 (Supabase Pro) |
| Rooms | Free (peer to peer through public relays). Optional: Cloudflare TURN for difficult networks, first 1,000 GB per month free, then $0.05 per GB ([Cloudflare Realtime pricing](https://developers.cloudflare.com/realtime/sfu/platform/pricing/)) | | |

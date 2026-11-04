# Analytics, dashboard and search: setup (about 20 minutes, all free)

Decision (November 2026): **PostHog only** (GoatCounter dropped). Expected traffic is about 2,000 visits a year, far below PostHog's free 1,000,000 events per month.

How it is configured in the game (`js/app.js`, `setupPostHog`):
- `persistence: 'memory'`: no cookies, nothing stored on the visitor's device. Each visit counts as a new anonymous visitor.
- `person_profiles: 'never'`: anonymous events only, no profiles.
- Country comes from PostHog's IP lookup, then the IP is thrown away (you switch that on in step A4). Time zone and language are sent too, as a backup.
- Visitors with "Do Not Track" or "Global Privacy Control" are never counted. Anyone can switch stats off in the About box.
- No autocapture and no session recordings. Only the events listed in `docs/DATA_COLLECTION.md`.

## A. PostHog (10 minutes)

1. Go to https://posthog.com, sign up for free and choose **EU Cloud** when asked for a region.
2. Create a project called "Fears of Love". When it asks how to install, skip that: the code is already in the game.
3. Copy the **Project API key** (Settings → Project → General, starts with `phc_`). It is public by design, like the address of a mailbox.
4. Settings → Project → **IP data capture**: switch on **Discard client IP data**. Do **not** switch on "cookieless tracking", because that would remove the country.
5. Paste the key into `js/config.js`:
   ```js
   posthogKey: 'phc_xxxxxxxxxxxxxxxxxxxxxxxx',
   posthogHost: 'https://eu.i.posthog.com'
   ```
6. Commit, push, open the game, play 3 cards. In PostHog → Activity you should see `$pageview` and `card_seen` within a minute.

Useful views in PostHog itself: Web analytics (visits, countries, devices, referrers, no setup), plus Insights you can pin to a dashboard: trend of `card_seen` per day, a funnel `room-dialog` → `room-open` → `room-join`, and a table of `react/love` by `scene`.

## B. Your personal dashboard (5 minutes, then whenever you want fresh numbers)

1. In PostHog: your avatar → Settings → **Personal API keys** → Create key. Scope: **Query Read** only, for this project only. This key is secret: never put it in `js/config.js`, never commit it.
2. Note the **Project ID** (Settings → Project → General, a number).
3. In the project folder, create a file called `.env` (it is already ignored by git) with:
   ```
   POSTHOG_PERSONAL_KEY=phx_your_secret_key
   POSTHOG_PROJECT_ID=12345
   POSTHOG_HOST=https://eu.posthog.com
   ```
4. Run `npm run stats` (or `npm run stats -- --days 365`). It writes `logs/stats.json`: visits per day, countries, time zones, languages, devices, referrers, busy hours, visit length, cards per visit, every card's views, time and "deeper" rate, reactions, jumps between titles, filters, and every event count. Only aggregated numbers, no personal data.
5. Ask Claude "build my dashboard from logs/stats.json". Claude reads the file from your folder; the key never goes through the chat.

## C. Search and link previews (5 minutes)

Already in the page: a title and description for search results, a preview image for WhatsApp, Telegram, iMessage and social media (`icons/og-image.jpg`), structured data that tells Google this is a free web game, and `sitemap.xml`.

1. Go to https://search.google.com/search-console → Add property → **URL prefix** → `https://tomblackroad.github.io/fearsoflove/`.
2. Choose the **HTML tag** method, copy the `<meta name="google-site-verification" ...>` line, paste it into `index.html` where the comment says so, push, then click Verify.
3. Sitemaps → submit `https://tomblackroad.github.io/fearsoflove/sitemap.xml`.
4. Test the preview: paste the game link into a WhatsApp chat with yourself. If an old preview shows, add `?v=2` to the link once.

Note: `robots.txt` only works at the root of a domain (tomblackroad.github.io), which this project folder is not, so it's not needed until you have your own domain.

## D. Later (not needed at ~2,000 visits a year)

- **Own domain** (about $10.46 per year for a .com at Cloudflare Registrar): nicer to share and remember. GitHub Pages connects it for free (repository Settings → Pages → Custom domain). Update the canonical, `og:url`, `og:image` and sitemap URLs to the new domain afterwards.
- **App stores**: the game already installs from the browser (iPhone: Share → Add to Home Screen; Android: menu → Install app). Store versions cost $25 once (Google Play, can wrap the existing site) and $99 per year (Apple).

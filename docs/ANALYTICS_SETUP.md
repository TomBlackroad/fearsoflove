# Analytics, dashboard and search: setup (about 20 minutes, all free)

Decision (November 2026): **PostHog only** (GoatCounter dropped). Expected traffic is about 2,000 visits a year, far below PostHog's free 1,000,000 events per month.

How it is configured in the game (`js/app.js`, `setupPostHog`):
- `persistence: 'memory'`: no cookies, nothing stored on the visitor's device. Each visit counts as a new anonymous visitor.
- `person_profiles: 'never'`: anonymous events only, no profiles.
- Country and city come from PostHog's IP lookup, then the IP is thrown away (you switch that on in step A4). Time zone and language are sent too, as a backup.
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

Useful views in PostHog itself: Web analytics (visits, countries, devices, referrers, no setup), plus Insights you can pin to a dashboard: trend of `card_seen` per day, a funnel `room-dialog` → `room-open` → `room-join`, and a table of `react/fire` by `scene`.

## B. Your private dashboard at /stats (10 minutes, once)

The dashboard lives at **https://tomblackroad.github.io/fearsoflove/stats/** (not linked from the game, hidden from search engines). Every night a GitHub Action asks PostHog for anonymous daily totals, encrypts them with a passphrase only you know, and publishes the encrypted file on a separate branch called `stats-data`. The page downloads it and decrypts it in your browser. Your main branch never gets automatic commits, so `git pull` stays boring.

1. In PostHog: your avatar → Settings → **Personal API keys** → Create key. Scope: **Query Read** only, for this project only. This key is secret: never put it in `js/config.js`, never commit it, never paste it in a chat.
2. Choose a **passphrase** for the dashboard: four or five random words is good (example shape: `velvet-tram-orbit-lemon`). Keep it in your password manager.
3. GitHub → the repository → **Settings → Secrets and variables → Actions → New repository secret**. Add three secrets:
   - `POSTHOG_PERSONAL_KEY`: the `phx_` key from step 1
   - `POSTHOG_PROJECT_ID`: `334255`
   - `STATS_PASSPHRASE`: the passphrase from step 2
4. GitHub → **Actions** tab → "Refresh stats" → **Run workflow**. After about a minute it turns green and a `stats-data` branch appears.
5. Open `/stats/`, type the passphrase, tick "Remember on this device" on your own phone or laptop.

After that it refreshes by itself every night around 05:00 Paris time. For fresh numbers during the day, press **Run workflow** again.

What you can see: any date range (date 1 to date 2, or 7 / 30 / 90 days / All) with the change against the period just before; visits per day or week; a world map and a list of countries; a Europe map with city dots and top regions; weekday × hour heatmap; cards per visit; the 5-level rating mix; the multiplayer funnel; devices and installed app; features used; referrers; languages; every card with views, time, rating, deeper and skip rates; jumps between titles.

Working locally (optional): put the same three values in `.env` (`POSTHOG_PERSONAL_KEY`, `POSTHOG_PROJECT_ID`, `STATS_PASSPHRASE`, plus `POSTHOG_HOST=https://eu.posthog.com`) and run `npm run stats`. It writes `logs/stats.json` (plain, private, gitignored) and `stats/data.json` (encrypted, gitignored). Then `npm start` and open http://localhost:8080/stats/?local to see the local file instead of the published one.

Safety notes: the encrypted file is public but unreadable without the passphrase (AES-256-GCM, key from PBKDF2-SHA256 with 310,000 rounds). It holds only daily totals: no IP addresses, no visitor ids. City and coordinates come from PostHog's IP lookup, rounded to about 10 km. If you ever change the passphrase, update the secret and run the workflow again; "Remember on this device" will then ask once more.

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

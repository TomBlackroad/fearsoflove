# Visit counter (GoatCounter, ~3 minutes)

The game has no accounts, no cookies and no logging of what players do. The only measurement is an anonymous visit counter with a dashboard (visitors, countries, devices, referrers, totals).

1. Sign up (free for non-commercial sites) at https://www.goatcounter.com and pick a site code, e.g. `fearsoflove`.
2. In GoatCounter: Settings > Site > turn on "Allow adding visitor counts on your website" (this lets the About dialog show the total).
3. Put the code in `js/config.js`: `goatcounter: 'fearsoflove'`. Commit and push.
4. Your dashboard is at https://fearsoflove.goatcounter.com (replace with your code). Settings also let you make it public.

GoatCounter stores no personal data and sets no cookies, so no consent banner is needed. Leave `goatcounter` empty to switch counting off.

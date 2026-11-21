# The Biberty Bee — LU Instagram Analytics

A free static dashboard for GitHub Pages, designed to be embedded into a free Wix site. No build step, API key, server, or subscription required.

## Files
- `index.html` — complete analytics dashboard
- `widget.html` — compact top-five widget for your Wix homepage
- `styles.css` — dashboard styling
- `app.js` — data loading, rankings, comparisons and SVG charts

## Deploy to GitHub Pages
1. Create a **public** GitHub repository, e.g. `lu-instagram-leaderboard`.
2. Upload all four files to the repository root.
3. In repository **Settings → Pages**, select **Deploy from a branch**, branch `main`, folder `/ (root)`, and save.
4. After deployment, open `https://YOUR-GITHUB-USERNAME.github.io/lu-instagram-leaderboard/`.
5. The small widget is at `https://YOUR-GITHUB-USERNAME.github.io/lu-instagram-leaderboard/widget.html`.

## Add to free Wix
- In Wix Editor choose **Add Elements → Embed Code → Embed a Site**.
- Paste the GitHub Pages dashboard URL, resize the frame, and publish. Give the full dashboard enough height (start around 2400 px, adjust to avoid internal scrolling). For mobile, test and adjust the embed separately.
- For a homepage widget, embed the `/widget.html` URL; start around 440 px high and adjust.
- Wix iframes don't automatically resize to their content; embedding the entire dashboard on a page can require extra blank space or internal scrolling. A link to the hosted dashboard is a good alternative if the embed feels cramped.

## Data source
Uses the four public Google Sheets `gviz/tq?tqx=out:csv` URLs for spreadsheet ID `1VWFA9Q0dGfzOgcVFeE_QXfAVbbRc27DRz__paehFrj8`.
The app loads Leaderboard, Accounts, Follower History and Analytics every five minutes; the Analytics feed is fetched but current charts are computed from history and rankings. Instagram data is updated only when Muse successfully records a new reading.

**Important:** This build has not been verified against the actual CSV contents; network access to Google Sheets was unavailable during development. It uses flexible header matching, but if Muse uses different column headings, adjust the `pick()` field names in `processData()` in `app.js`. The first browser test will confirm whether the headers and CORS settings work.

## Privacy and limitations
The public sheet is publicly readable; never store secrets or private data in it. The code only reads the feed and cannot change the sheet. History charts use actual timestamps and never fabricate past data. Growth figures are taken from the Leaderboard tab, and insufficient history displays as `—`. Some older browsers, Google sharing configurations, or CORS changes may block direct access. If this occurs, use a separately hosted public JSON/CSV mirror rather than exposing credentials.

## Styling
The current look uses a yellow/charcoal bee-inspired palette, not the official Biberty Bee logo or font. Replace the emoji and adjust colors in `styles.css` once you provide official brand assets.

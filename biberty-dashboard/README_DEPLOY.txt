BIBERTY ANALYTICS — LIVE DATA BUILD (2026-11-21)

Upload all files from this directory into the /biberty-dashboard/ folder of the GitHub Pages repository thebibertybee/biberty-bee-leaderboard, replacing the previous demo files there.

The build fetches three Google Sheets tabs on page load: Accounts, Leaderboard, Follower History (fourth tab Analytics is not required for rendering). Public sheet: 1VWFA9Q0dGfzOgcVFeE_QXfAVbbRc27DRz__paehFrj8.

Google Sheets must be publicly readable. If CORS or sharing blocks CSV fetches, the app shows an error rather than fabricated values.

Recommended Accounts columns: Username, Display Name, Current Follower Count, Category, Affiliation, Profile Picture URL. Affiliation: official / unofficial (leave blank for unknown). Categories are automatically derived from the Accounts tab.

IMPORTANT: This code was prepared offline without direct network access to the actual sheet; CSV column compatibility and deployment must be verified in a browser before announcing public launch. No changes have been pushed to GitHub.

REPORT PRINT FIX: Report Print / Save as PDF opens a standalone printable tab. Print from that tab; Wix editor should not appear in output. Allow pop-ups if browser blocks the tab.

V32: Footer tagline now uses a Rockwell-first font stack and explicitly centers across the dashboard width. No font files are bundled; if Rockwell is absent the browser uses a slab-serif/serif fallback.

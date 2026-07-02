# 757 Fantasy Football — Stock Tracker

Live leaderboard of each league member's stock pick, ranked by percent gain
since July 1st. Prices come from Yahoo Finance's public chart API (no API key)
and refresh every 5 minutes.

## Editing picks

Edit [lib/league.js](lib/league.js) — the member list, tickers, and the
baseline date all live there. Push to `main` and Vercel redeploys
automatically.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

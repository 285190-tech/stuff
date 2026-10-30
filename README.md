# Sandbox Casino

A free, play-money casino. Everyone starts with 1,000 fake credits. No real money, no accounts, no cash prizes.

The server decides every outcome (Cloudflare Pages Functions + KV), so balances can't be edited from the browser.

## Games
Coinflip, Dice, Limbo, Plinko, Roulette, Wheel, Keno, Hi-Lo.

## Structure
- `public/index.html` — frontend
- `functions/api/play.js` — POST /api/play (game logic)
- `functions/api/state.js` — GET/POST /api/state (balance, daily bonus, reset, leaderboard)
- `functions/_lib.js` — cookie identity + KV helpers
- `wrangler.toml` — Cloudflare config and KV binding

## Run locally
    npx wrangler kv namespace create KV     # paste the id into wrangler.toml
    npx wrangler pages dev public --kv KV

## Deploy
Connect the repo in Cloudflare Pages: build command empty, output directory `public`,
and bind a KV namespace named `KV` under Settings → Bindings.

Play money only. Credits have no value and cannot be bought, sold or withdrawn.

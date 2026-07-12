# 🎯 UTMcraft

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**The UTM builder you buy once and own forever.** Build consistently-tagged campaign links with autocomplete and a naming-convention enforcer, generate 10 ad-set variants from CSV in one shot, and track real clicks through your own redirect short links — with dashboards by source, medium, device, and day.

UTM.io charges **$29/month** to fill out a form with dropdowns. UTMcraft is **$19 once**, self-hosted, and the click data is yours.

![UTMcraft screenshot](docs/screenshot.png)

## ☕ Skip the setup — get the 1-click installer

Don't want to touch a terminal? Grab the packaged Windows installer (and support development):

**→ [Get UTMcraft on Whop](https://whop.com/benjisaiempire/utmcraft)** — pay once, own it forever.

## Features

- 🔗 **Builder with autocomplete** — source/medium/campaign/term/content fields suggest from your own history, with a live URL preview as you type
- 🧹 **Auto-normalization** — every value is lowercased with spaces→underscores, so "Email", "email", and "E-mail" can never split your analytics again
- 🔒 **Naming-convention enforcer** — optionally lock utm_source and utm_medium to team-approved lists; off-list values are rejected with a helpful error
- 📦 **Bulk generator** — paste a CSV of variants (e.g. 10 ad sets), get 10 tagged links + short codes at once, with per-row error reporting
- 📊 **Click tracking via redirect short links** — share `/r/abc1234`; UTMcraft records referrer, device (mobile/desktop/tablet/bot), country (from proxy geo headers), and time, then 302s to the tagged URL
- 📈 **Dashboards** — clicks over time, by source, by medium, by device, top links; 7/30/90-day ranges
- 🗂 **Campaign groups** — bundle links per launch and compare channels with roll-up click counts
- 📤 **CSV export** — every link with its full UTM set, short link, and click count
- 🖥 **Web app + desktop mode** — run on a $5 VPS (Docker included) or as a local Electron app
- 🌑 Dark, fast UI: React + Tailwind + Framer Motion + Lucide

## Two ways to run it

**Desktop app** (for building links; tracked short links need the server reachable by clickers):

```bash
npm i
npm run build
npm run desktop
```

**Self-hosted web app** (recommended — short links work publicly):

```bash
cp .env.example .env   # set ADMIN_PASSWORD + BASE_URL!
docker compose up -d   # → http://your-server:5349
```

or without Docker:

```bash
npm i && npm run build && npm start
```

## Quick start (dev)

```bash
npm i
npm run build
npm start        # → http://localhost:5349 (password: admin — change via .env)
npm test         # full HTTP smoke: builder → enforcement → bulk → clicks → stats → export
```

## Tech stack

Node 20+ · Express · better-sqlite3 · React 18 · Vite · Tailwind 4 · Framer Motion · Lucide · Electron (desktop mode)

## UTMcraft vs UTM.io

| | **UTMcraft** | UTM.io |
|---|---|---|
| Price | **$19 once** | $29+/mo |
| Yearly cost | **$0 after purchase** | $348+ |
| UTM builder + templates | ✅ | ✅ |
| Naming-convention enforcement | ✅ | ✅ |
| Autocomplete from history | ✅ | ✅ |
| Bulk CSV generation | ✅ | ✅ |
| Short links + click tracking | ✅ (your domain) | ✅ (their domain) |
| Chrome extension / integrations | ❌ | ✅ |
| Multi-workspace team features | ➖ shared password | ✅ |
| Your click data on your server | ✅ | ❌ |

Honest positioning: UTM.io's browser extension and team workspaces are real conveniences for big marketing orgs. If you're a founder, freelancer, or small team that needs consistent links and honest click counts, UTMcraft does the job for less than one month of the subscription.

## License

MIT © 2026 Ben (bensblueprints)

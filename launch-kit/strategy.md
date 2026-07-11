# Launch strategy — UTMcraft

## Target communities

- **r/PPC** — the "my UTMs are a mess" thread appears weekly; answer with a naming-convention guide, tool in context (no bare links — this sub is strict, contribute first)
- **r/marketing + r/digital_marketing** — angle: "the $0/mo UTM governance setup"; both allow tool mentions in genuine workflow posts
- **r/selfhosted** — "self-hosted UTM.io alternative: one Docker container, one SQLite file" — lead with the compose file
- **r/Entrepreneur / r/SaaS** — build-in-public: replacing subscription micro-tools with pay-once equivalents
- **Indie Hackers** — the pricing-math essay: "$29/mo tools that are actually a form"

## Show HN draft

**Title:** Show HN: UTMcraft – self-hosted UTM builder with click tracking (pay once)

**Body:**
UTM builders are a $29/month SaaS category, and the product is a form with five inputs. The actual value is two-fold: naming consistency (so "Email" and "email" don't split your reports) and knowing whether anyone clicked.

UTMcraft does both, self-hosted: Node/Express + better-sqlite3 + React. Every UTM value is normalized (lowercase, spaces→underscores); sources/mediums can optionally be locked to an allowed list and rejected otherwise. Each link gets a short code; /r/:code logs referrer, device (UA heuristic), and country (from CF/Vercel geo headers if you're behind one), then 302s to the tagged URL. Dashboards aggregate by day/source/medium/device straight from SQLite.

Details HN might like:
- The redirect handler is registered before body parsing and never lets a tracking failure break the 302
- Bulk CSV parsing handles quoted fields; each row runs through the same validation as the form
- Same codebase runs as a Docker web app or an Electron desktop app (postinstall vendors both better-sqlite3 ABIs)

MIT source; $19 for the packaged installer. Honest limits: no browser extension, single-admin auth.

## SEO keywords (10)

1. utm builder tool
2. utm.io alternative
3. campaign url builder self hosted
4. utm link tracker free
5. utm naming convention tool
6. bulk utm link generator
7. google analytics utm builder
8. utm tracking software one time purchase
9. short link click tracker self hosted
10. utm parameter generator csv

## AppSumo / PitchGround pitch

UTMcraft replaces a $348/year subscription with a $19 lifetime tool for the job every marketer actually has: consistent campaign links and honest click counts. Auto-normalized values and lockable source/medium lists end the "Email vs email" analytics split forever; bulk CSV generation builds a whole ad launch in one paste; and tracked short links on the customer's own domain log referrer, device, and country with clean dashboards. Self-hosted via Docker with a single SQLite file — the data ownership story your audience buys lifetime deals for.

## Pricing math

- UTMcraft: **$19 one-time**
- UTM.io: $29/mo → **pays for itself in under 3 weeks**
- Year-one saving: **$329**
- Suggested launch pricing: $14 early-bird week → $19 standard

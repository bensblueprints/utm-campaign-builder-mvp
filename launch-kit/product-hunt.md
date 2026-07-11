# Product Hunt launch — UTMcraft

**Name:** UTMcraft

**Tagline (60 chars):** UTM builder + click tracking you own — no UTM.io subscription

**Description (260 chars):**
Build consistently-tagged campaign links (autocomplete + naming-convention lockdown), bulk-generate ad-set variants from CSV, and track clicks through your own redirect short links with source/medium/device dashboards. Self-hosted, $19 once vs $29/month.

**Full description:**
UTMcraft is a self-hosted UTM link builder and campaign click tracker:

- Builder with per-field autocomplete from your own link history and a live URL preview
- Every value auto-normalizes (lowercase, underscores) so "Email" vs "email" never splits your reports again
- Optional enforcement: lock utm_source/utm_medium to team-approved lists, off-list values get rejected
- Bulk CSV → 10 ad-set variants in one paste, with per-row errors
- Tracked short links on YOUR domain: /r/code records referrer, device, and country, then 302s to the tagged URL
- Dashboards: clicks by day/source/medium/device + top links, over 7/30/90 days
- Campaign groups with roll-up counts, and full CSV export
- One Docker container + one SQLite file, or run it as a desktop app

$19 once. MIT source on GitHub. Your campaign data lives on your server, not a vendor's.

**Maker first comment:**
Hi PH 👋 Ben here. I got tired of paying $29/mo for a form with five text boxes. That's genuinely what a UTM builder is — the value was never the form, it's (1) everyone on the team using the SAME spellings and (2) knowing if anyone actually clicked.

So UTMcraft does those two things properly: values normalize automatically, sources/mediums can be locked to an allowed list, and every link gets a short redirect on your own domain that logs referrer/device/country before passing through.

Honest limits: no Chrome extension, no multi-workspace roles — it's a single admin password and your SQLite file. For a founder or small team that's the whole job. MIT source; $19 buys the packaged installer and good karma.

**Gallery shots (5):**
1. Builder — form with autocomplete dropdown open and live tagged-URL preview
2. The enforcer rejecting "tiktok" with the allowed-list error message
3. Bulk CSV modal — 10 variants pasted, 10 links created
4. Analytics — clicks-over-time bars with source/medium/device breakdowns
5. Campaign group expanded showing per-link click counts and copy buttons

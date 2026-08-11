# GMBVault Dashboard

Internal outreach tracker for GMBVault — built for a non-technical user. React + TypeScript + Vite + Tailwind, backed by Vercel serverless functions.

**Vision:** "This book keeps track of every business we've reached out to — who's waiting, who needs a nudge, who said yes." The dashboard **tracks** email; it never sends it.

## Stack
- Frontend: React 18 / TypeScript / Vite / Tailwind CSS v3.4
- Backend: Vercel serverless functions (`api/`)
- Storage: Vercel KV for mutable pipeline state & open tracking; read-only `/data/all-data.json` seed
- Auth: single password (bcrypt hash) + JWT (24h) + per-IP rate limit

## Statuses (user labels ↔ internal)
| User badge | Internal | Color |
|---|---|---|
| Not sent yet | `drafted` | gray |
| Waiting to hear back | `sent` | blue |
| Needs a follow-up | `followup_1` | yellow |
| One more check-in | `followup_2` | orange |
| They replied | `replied` | green |
| New client | `converted` | purple |

Auto-advance: `sent` → `followup_1` → `followup_2` after `FOLLOW_UP_DAYS` (5) with no reply. A reply always wins over a stale follow-up tap.

## Local dev
```bash
npm install
# Seed pipeline auth:
node -e "console.log(require('bcryptjs').hashSync('devpass',10))"   # paste into DASHBOARD_PASSWORD_HASH in .env
npm run dev
```
Serverless functions need `vercel dev` (or a KV-aware runtime) to hit `/api/*`. Without KV, writes are in-memory and non-persistent.

## Env vars (see `.env.example`)
- `DASHBOARD_PASSWORD_HASH` — bcrypt hash of the login password
- `JWT_SECRET` — long random secret
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — optional; enables persistent pipeline/opens
- `INBOX_MCP_URL` / `INBOX_ACCESS_CLIENT_ID` / `INBOX_ACCESS_CLIENT_SECRET` — Agentic Inbox (Phase 1.2)

## Data
- `data/all-data.json` — extracted from `~/Desktop/gbp-audit/pages/index.js` (the `ALL_DATA` object, 22 businesses). Regenerate: `node scripts/extract-all-data.mjs`.

## API
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth` | POST | Password login → JWT |
| `/api/businesses` | GET | All businesses with pipeline status |
| `/api/business/[slug]` | GET | Detail for one business |
| `/api/business/[slug]` | PATCH | `action`: followup_sent \| replied \| convert \| notes |
| `/api/track?b=&e=` | GET | 1×1 tracking pixel (logs open) |
| `/api/opens` | GET | Open-tracking data |

## Phase 1 exclusions (honored)
No email sending, no Google Posts/reviews, no multi-user, no analytics beyond open rate, no write-back to MCP. Dashboard is read-only for outreach data.

> **Open tracking (Phase 1.2).** `/api/track` + `/api/opens` are wired and validated (known-slug + email-identity checks, dedupe by slug+emailHash), and the "seen" UI reads from them. **But the tracking pixel is not yet embedded in any email body** — Phase 1.1 emails are synthetic placeholders and nothing sends, so an email is never actually opened and `getOpens()` stays empty until Phase 1.2 wires the pixel into real sent mail. Until then treat the open rate shown in the dashboard as a preview, not real data.

> **Auth env vars (required at deploy).** `JWT_SECRET` and `DASHBOARD_PASSWORD_HASH` must both be set in Vercel. The server **fails closed** when `JWT_SECRET` is missing (login returns 500 rather than signing with any fallback secret) and rejects a password when `DASHBOARD_PASSWORD_HASH` is unset. Without JWT_SECRET and DASHBOARD_PASSWORD_HASH set, deployment authentically locks you out — that is intentional.

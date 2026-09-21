# ReviewFlow

Review request automation: buy a number, name it, verify it, write a
message with your review link, connect contacts from a CRM (via CSV or
webhook), and send SMS review requests.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Prisma 6 + SQLite (`prisma/dev.db`) — swap the datasource for Postgres/MySQL later without touching app code
- Twilio SDK, wrapped in `src/lib/twilio.ts` behind a mock/live toggle

## Running it

```bash
npm install
npx prisma migrate dev   # first time only
npm run dev
```

Visit `http://localhost:3000`.

## Mock mode vs real Twilio

`.env` has `TWILIO_MOCK=true` by default. In mock mode, number search,
purchase, alphanumeric sender registration, verification, and SMS sending
are all simulated in-memory (fake SIDs, ~95% simulated send success) so you
can click through the entire product without a Twilio account.

To go live:

1. Create a Twilio account, buy nothing yet.
2. Set in `.env`:
   ```
   TWILIO_MOCK=false
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxx      # Twilio Verify service, for number verification
   TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxx   # only needed if using alphanumeric sender IDs
   ```
3. No code changes needed — `src/lib/twilio.ts` calls the real SDK once `TWILIO_MOCK` is false.

Notes:
- Alphanumeric sender IDs (business name instead of a number) are **not
  supported for SMS in the US/Canada** — carriers block it. It works in
  AU/UK/EU/NZ and most other countries. The UI disables the field for US.
- For real US sending at any volume you'll also need **A2P 10DLC
  registration** (Twilio Trust Hub) — not wired up here, it's a compliance
  step done once per Twilio account/brand.

## CRM integrations

Four connectors ship working today:

- **Cliniko** (`src/lib/cliniko.ts`) — API-key based, no OAuth review needed.
  Enter the practice's API key + shard (region, e.g. `au4`), it pulls every
  patient with a phone number. Re-running "Sync now" updates existing
  contacts instead of duplicating them (deduped by Cliniko's patient `id`,
  stored as `Contact.externalId`).
- **Nookal** (`src/lib/nookal.ts`) — same pattern, API-key based.
- **CSV upload** — export contacts from any CRM, upload, map columns to
  `phone` / `first_name` / `last_name` / `email`.
- **Generic webhook** — each connection gets a unique URL
  (`/api/crm/webhook/<token>`). Point Zapier, Make, or any CRM's outgoing
  webhook at it; incoming JSON is mapped per the field mapping you set when
  creating the connection.

Both Cliniko and Nookal run in mock mode by default (`CRM_MOCK=true` in
`.env`) — same pattern as Twilio, so you can see the whole flow (connect →
sync → contacts land in the dashboard) without a real practice account. Flip
`CRM_MOCK=false` once you've signed up for a free Cliniko/Nookal trial and
have a real API key to test against.

**Field-name caveat:** the exact JSON shape Cliniko/Nookal return
(`patient_phone_numbers`, `mobile_phone`, etc.) was written from documented
API shapes, not verified against a live account — check the first real sync
response against what `src/lib/cliniko.ts` / `src/lib/nookal.ts` expect
before trusting it with real patient data.

Credentials are encrypted at rest (`src/lib/crypto.ts`, AES-256-GCM) using
`CRM_CREDENTIALS_KEY` in `.env` — generate a fresh one before deploying
anywhere real, same as `SESSION_SECRET`.

OAuth-based connectors (HubSpot, GoHighLevel, Square, ServiceM8, etc.) are
still listed as "coming soon" in the UI — those need you to register as a
developer with each platform first (free but takes time/review), whereas
Cliniko/Nookal needed nothing but code.

## Google Business Profile

On the Message page, "Connect Google Business Profile" lets the business
owner pick their *confirmed* Google listing rather than us guessing a match
by name search — important when there are several similarly-named
businesses. Picking a location auto-fills the review link
(`src/lib/google-business.ts` → `reviewLinkForPlace`) and marks the
connection as verified; disconnecting falls back to manual entry without
losing the last-known link.

Runs in mock mode (`GOOGLE_BUSINESS_MOCK=true`) — tested end-to-end: connect
→ pick a location → link auto-fills in the live preview → save → disconnect
→ falls back to editable manual input cleanly.

**Real mode is genuinely not built, and is a different kind of work than
everything else here.** Twilio/Cliniko/Nookal/ABN Lookup all go live with
just an API key. Google Business Profile needs:
1. A Google Cloud project with an OAuth consent screen.
2. Applying for Business Profile API access — Google reviews this manually,
   historically weeks, not guaranteed for a new/small app.
3. A full OAuth2 authorization-code flow (redirect, callback route,
   encrypted refresh-token storage) — substantially more than the
   `fetch()`-with-a-header pattern used everywhere else in this codebase.

`listOwnedGoogleLocations()` in `src/lib/google-business.ts` throws a clear
error if `GOOGLE_BUSINESS_MOCK=false` without that infrastructure in place,
rather than pretending to support it.

## Business verification (ABN)

`src/lib/abn.ts` validates an ABN two ways: first the ATO's public checksum
algorithm (pure math, always on, no API call), then a real lookup against
the free Australian Business Register web service to confirm the ABN is
registered and pull the legal entity name. Runs in mock mode
(`ABN_LOOKUP_MOCK=true`) by default.

To go live: self-register a free GUID at
https://abr.business.gov.au/Tools/WebServices (instant, no cost), set
`ABN_LOOKUP_GUID` and `ABN_LOOKUP_MOCK=false` in `.env`.

This is a basic fraud/legitimacy gate, not full KYC — it confirms the ABN is
real and active, not that the person signing up is authorized to act for
that business. Full identity verification (director ID matching, etc.)
needs a dedicated vendor — Stripe Identity, Frankie One, or Australia Post
Digital iD are the common picks — and isn't wired up here yet.

## Automation (rule-based auto-send)

Sending is no longer only a manual dashboard click. On the Message page,
toggle "Send automatically after a visit threshold" and set a number (e.g.
4) — from then on, every time a Cliniko or Nookal sync runs
(`src/lib/crm-sync.ts` → `checkAutomationRules` in `src/lib/automation.ts`),
any contact whose synced visit count has just crossed that threshold gets
sent automatically, once, via the same send path as a manual send
(`src/lib/send.ts`, shared by both).

How it avoids double-sends: `Contact.autoSentAtVisitCount` records the visit
count at which automation last fired for that contact. It only fires again
once `visitCount` has crossed a *new*, higher threshold — tested by hand:
syncing twice in a row correctly sent once per contact on the sync where
they crossed 4, and did not re-send on the next sync even though their
visit count kept climbing.

**Important limitation:** this only fires when a sync runs. There's no
scheduled/background job yet — visit counts (and therefore automation) only
update when someone clicks "Sync now," or when you wire up a cron job (e.g.
Vercel Cron hitting a new endpoint that syncs every active Cliniko/Nookal
connection) once this is deployed. CSV and webhook contacts have no visit
count at all (nothing re-syncs them), so automation only applies to
Cliniko/Nookal today. `AutomationRule.triggerType` is an enum specifically
so more trigger types (time-since-last-visit, job-marked-complete for
tradies, etc.) can be added without a schema rewrite.

## STOP/opt-out compliance

Every outgoing message gets "Reply STOP to opt out." appended automatically
(`appendOptOutNotice` in `src/lib/template.ts`) if the business owner's own
template doesn't already mention it — not optional, not left to them to
remember. Required under Australia's Spam Act 2003 for any commercial
electronic message, and the equivalent exists in most jurisdictions.

`POST /api/twilio/inbound` (`src/app/api/twilio/inbound/route.ts`) handles
the other half: when a contact replies STOP (or UNSUBSCRIBE/CANCEL/END/QUIT),
their `Contact.status` flips to `OPTED_OUT` and they're excluded from every
future send — manual or automated — for that business.
`sendReviewRequestToContact` also refuses to send to an opted-out contact
directly, as a second line of defense beyond the query filters. Replying
START re-subscribes them.

**Tested end-to-end via curl** (simulating Twilio's webhook format) against
this session's real data: a contact replied STOP → flipped to `OPTED_OUT` →
a subsequent "send to all pending" correctly sent to everyone else and
skipped them → replying START correctly reverted them to `PENDING`.

**To wire up for real:** once deployed somewhere with a public URL, set that
URL as the "A message comes in" webhook on your Twilio number/messaging
service (Console → Phone Numbers → your number → Messaging Configuration).
In mock mode (`TWILIO_MOCK=true`) the route skips Twilio's signature
verification so you can test it locally with curl, like above; in live mode
it validates `X-Twilio-Signature` via the Twilio SDK and rejects anything
that doesn't check out, so this endpoint can't be spoofed to opt people out
(or back in) without actually being Twilio.

## Accounts & multi-tenancy

Each signup creates a `User` + their first `Business`. Every business-scoped
API route (`/api/business/[id]`, `/api/numbers/*`, `/api/template`,
`/api/crm/connection`, `/api/contacts`, `/api/send`) checks
`business.ownerId === session.userId` and returns a plain 404 if it doesn't
match — no leaking whether a business exists. The `/biz/[id]` layout does
the same check server-side before rendering anything.

- Sessions are an HMAC-signed, httpOnly cookie (`src/lib/session.ts`) —
  no external auth service, keeps the stack small. `SESSION_SECRET` in
  `.env` signs them; **generate a fresh random one before deploying anywhere
  real** (don't reuse the dev value committed here).
- Passwords are hashed with Node's built-in `scrypt` (`src/lib/password.ts`)
  — no bcrypt dependency needed.
- One account can own multiple businesses (`/app` lists them, `/app/new`
  adds another) — the schema already supports agencies managing several
  locations under one login.
- `/api/crm/webhook/[token]` is intentionally the one route with **no**
  session check — that's the point, it's how external CRMs/Zapier reach in.
  It's scoped by an unguessable per-connection token instead.

## Data model

See `prisma/schema.prisma`. Core flow: `User` → `Business` → `PhoneNumber`
(+ `MessageTemplate`) → `CrmConnection` → `Contact` → `ReviewRequest` (send
log).

## What's not built yet

- **Billing** — no Stripe/subscription plan gating. Every account currently
  has unlimited access to everything.
- **Deployment** — this only runs locally against a SQLite file
  (`prisma/dev.db`). Shipping it means: a real Postgres database, deploying
  the Next.js app (Vercel is the path of least resistance), and moving
  secrets (`SESSION_SECRET`, Twilio creds) into that platform's env vars.
- **Email** — no email verification on signup, no password-reset flow, no
  transactional email at all yet.
- **A real scheduler** — visit-count automation (see above) exists and is
  tested, but it only checks on manual "Sync now" clicks. Needs a cron job
  once deployed to actually run unattended. Time-based triggers (e.g. "2
  hours after appointment") aren't built at all yet.
- Opt-out (STOP) handling and delivery status webhooks from Twilio.
- Native CRM connectors beyond Cliniko/Nookal/CSV/webhook (Square, ServiceM8,
  Tradify, HubSpot, GoHighLevel, Salesforce — all still OAuth-gated on
  someone signing up as a developer with each platform first).
- **Real Google Business Profile OAuth** — mock flow works end-to-end, but
  going live needs a Google Cloud OAuth app + applying for API access
  (Google's manual approval, not guaranteed) + a real authorization-code
  flow. Start the application early — it's the longest lead time of
  anything left on this list.
- Full identity/KYC verification beyond ABN checksum + registry lookup.

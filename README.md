# Karmate

A runnable full-stack build of the **Karmate (Karma + mate) Technical Design
Document** — a consumer-complaint platform where users report bad
experiences with hotels/drivers, businesses can appeal to a paid public
"court," and winning cases go to an event board where "hunters" accept
retaliation tasks for a reward.

This is a demo/prototype generated directly from the uploaded design doc: a
working state machine, database, and UI for every flow in the spec, with
third-party integrations (Stripe, AI image verification, SendGrid/Twilio,
S3) implemented as swappable mocks so it runs with zero external accounts.

> **About this build.** This is a fictional product concept turned into a
> working demo. The "revenge task" screens are UI/data flows only — accepting
> a task just writes a database row with a reward amount; nothing in this
> codebase contacts, dispatches, or coordinates any real-world action against
> a person or business. Treat the revenge-type list as sample copy to swap
> for your own concept.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (Pages Router) + Tailwind CSS | matches TDD §1 |
| Backend | Node.js + Express | matches TDD §1 |
| Database | SQLite via `better-sqlite3`, raw SQL | see *Database* below |
| Storage | Local disk (`backend/uploads/`), served at `/uploads/*` | stands in for S3/Cloudinary |
| Payments | Mocked Stripe (`src/services/payments.js`) | real Stripe SDK wired in, just needs a key |
| AI image check | Mocked (`src/services/aiVerification.js`) | real Sightengine call wired in, just needs keys |
| AI court headline | Mocked (`src/services/aiTitle.js`) | real Gemini call wired in, just needs a key |
| Notifications | Console log (`src/services/notifications.js`) | stands in for SendGrid/Twilio |

**Database note:** the TDD specifies PostgreSQL. This build uses SQLite
(via `better-sqlite3`) instead of Prisma+Postgres so the whole project runs
immediately with `npm install` and no database server or account — Prisma's
toolchain needs to download native engine binaries from the network the
first time you generate a client, which isn't always available (it failed
in the sandbox this was built in). `backend/schema.sql` is plain, portable
SQL; moving to Postgres later means: swap `better-sqlite3` for `pg`,
change `strftime('%Y-%m-%dT%H:%M:%fZ','now')` defaults to
`CURRENT_TIMESTAMP`, and swap the boolean `0/1` columns to real `BOOLEAN`.
The column names and shapes already match TDD §3 exactly.

## Quick start

```bash
npm run install:all      # installs backend/ and frontend/ separately

cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

npm run seed              # creates backend/data/karmate.db with demo users + a case

npm run dev                # runs backend (:4000) and frontend (:3000) together
```

Open http://localhost:3000.

Demo logins (password `password123` for all):

| Username | Role | Use it for |
|---|---|---|
| `alice` | normal | filing reports |
| `grand_hotel` | business | appealing a report to court |
| `bob` | hunter | voting, accepting revenge tasks |
| `admin` | admin | confirming task completion / payout |

Don't want the two services in one terminal? Run `npm run dev:backend` and
`npm run dev:frontend` in separate terminals instead.

## The demo clock

The TDD's deadlines are 3 days (appeal window), 24 hours (court voting), and
7 days (task deadline) — too long to watch happen live. By default
(`DEMO_FAST_CLOCK=true` in `backend/.env`) these are compressed to 3
minutes / 1 minute / 5 minutes so you can watch a case move through its
entire lifecycle in one sitting. A background job re-checks every 10
seconds (`backend/src/services/stateMachine.js`) and flips status
automatically — you don't need to click anything to advance `pending` past
its deadline, or `court` once voting closes.

Set `DEMO_FAST_CLOCK=false` to use the real spec durations.

## Application flow (matches TDD §2 and §4, updated per the modify-round requests)

0. **Gate page** (`/`) — the site's front door. Nobody sees the dashboard
   before logging in: full-bleed hero image with an Apple-style top shadow
   over the nav, project name + slogan bottom-left, a small "how it works"
   ticker that fades between steps (the fire/spark animation), and the two
   Log in / Sign up buttons. Everything fits in the viewport with no
   scrolling. Already-logged-in visitors are bounced straight to `/home`,
   which is where the old landing/dashboard content now lives.
1. **Upload** (`/upload`) — file a report against a hotel or driver, attach
   photos (run through the AI verification stub), choose cash-back or
   revenge. Starts the appeal countdown. Business accounts can't file
   reports or see this page — the nav hides the link and the page itself
   blocks the role.
2. **Business Desk** (`/business`) — visible only to business accounts (the
   nav item and the page both check the role). The reported business
   appeals within the window, which opens public court voting; otherwise
   the case expires straight into `revenging`.
3. **Court Room** (`/court`, `/court/[id]`) — its own nav item listing
   every case currently in live voting. Getting in used to mean paying per
   vote; now entry itself is the paid step: a one-time $0.50 charge seats
   you in the audience, and voting revenge-vs-let-it-go is free once
   you're in. The reporter and the reported business are seated
   automatically at no charge (they're parties, not spectators) and are
   the only two seats allowed to send text chat; the audience can only
   react with emoji. Everyone who has entered — either seat — can read the
   full chat history. The room is drawn in a cartoon pixel-art style
   (`components/PixelAvatar.js`, pure CSS/React, no image assets): two
   pixel characters for the reporter and the business face off, with the
   chat log as the "screen" between them. To its right, a narrator panel
   (`components/CourtNarrator.js`) has ▶ Read chat aloud / ⏸ Pause buttons
   that read each new text message aloud in character via ElevenLabs (one
   voice per seat, with a lightweight emotion cue) — falls back to the
   browser's own built-in speech synthesis with no key needed if
   `ELEVENLABS_API_KEY` isn't set. Emoji reactions aren't narrated.
4. **Event Board** (`/events`) — winning cases land here; a hunter accepts
   one, picks a method (or writes a custom plan), and now must actively
   submit it ("I completed this — mark as done") before it goes up for
   review — accepting a task no longer implies finishing it. An admin then
   confirms completion from that pending-review state, which pays out the
   reward. Next to the method list is a "✨ Ask Gemini" box
   (`components/AiSuggestionBox.js`) that reads the report's description and
   pitches its own revenge idea on request — one click drops it straight
   into the Custom plan field.

## API

All endpoints are under `http://localhost:4000/api`. JWT bearer auth
(`Authorization: Bearer <token>`) after `/auth/login` or `/auth/register`.

```
POST   /auth/register            { username, email, password, role?, ssn?, bankAccount? }
POST   /auth/login               { username, password }
GET    /auth/me

GET    /reports?status=          list reports, optional status filter
GET    /reports/:id              includes myAccess: { seat, entered } for the Court Room
POST   /reports                  multipart: targetType, targetName, targetContact,
                                  description, choice, media (files[])   [blocked for business accounts]
POST   /reports/:id/appeal       business-only; appeals a pending report -> court,
                                  records the appealer as the "business" seat

POST   /reports/:id/enter        one-time $0.50 charge -> seats the caller as audience
                                  (parties are auto-seated for free, no charge)
GET    /reports/:id/chat         chat history, requires an entered seat
POST   /reports/:id/chat         { kind: "text"|"emoji", content }
                                  text is reporter/business seats only; audience is emoji-only
POST   /reports/:id/votes        { voteChoice: boolean }  free; requires an entered
                                  audience seat (parties can't vote on their own case)
GET    /reports/:id/messages/:messageId/speech
                                  narrate one text message (ElevenLabs, audio/mpeg);
                                  501 tts_not_configured if no ELEVENLABS_API_KEY is set

GET    /tasks                    event board (revenging + in_progress reports)
GET    /tasks/:reportId/suggest  AI-pitched revenge idea (Gemini), fresh on every call
POST   /tasks/:reportId/accept   { revengeType, customDetails? }
POST   /tasks/:taskId/submit     hunter-only, in_progress -> pending_review
POST   /tasks/:taskId/complete   admin-only, requires pending_review, pays out the reward
```

## Going to production

This is a demo — before using it for anything real:

- **Secrets:** generate real values for `JWT_SECRET` and
  `FIELD_ENCRYPTION_KEY` in `backend/.env` (the example key is public).
  SSN/bank-account fields are AES-256-GCM encrypted at rest
  (`src/services/crypto.js`) per TDD §5, but you're still collecting
  extremely sensitive data — get a real compliance review before doing
  that with genuine user information.
- **Database:** move off SQLite to Postgres for concurrent write safety
  (see the *Database note* above).
- **Storage:** point `src/services/storage.js` at real S3/Cloudinary and
  actually upload the file there instead of local disk.
- **Payments:** set `STRIPE_SECRET_KEY` in `.env` — `src/services/payments.js`
  already calls the real Stripe SDK when a key is present. Real bounty
  *payouts* need Stripe Connect (left as a documented stub).
- **AI verification:** set `SIGHTENGINE_API_USER`/`SIGHTENGINE_API_SECRET`
  to switch on real image-authenticity checks.
- **AI court headline:** set `GEMINI_API_KEY` in `backend/.env` (get one at
  https://aistudio.google.com/apikey) to have `src/services/aiTitle.js` call
  Gemini for the courtroom headline generated when a business appeals;
  leave it unset to keep the local template.
- **Notifications:** wire `@sendgrid/mail` / Twilio into
  `src/services/notifications.js` (currently logs to the console).
- **Reward formula:** `rewardAmount = max(yesVotes, 1) * $0.50` in
  `src/routes/tasks.js` is a placeholder — the TDD doesn't specify one.
- Run `npm audit` in both `backend/` and `frontend/` and address anything
  new since this was built.

## Project layout

```
karmate/
  backend/
    schema.sql             # TDD §3 tables, plain SQL
    src/
      index.js             # Express app + state-machine timer
      db.js                # better-sqlite3 connection + schema bootstrap
      repo.js               # all SQL queries, row <-> JSON shaping
      constants.js          # enum lists + demo/real deadline durations
      middleware/auth.js    # JWT sign/verify
      routes/               # auth, reports, votes, tasks, courtroom (enter/chat)
      services/             # crypto, payments, aiVerification, notifications, storage,
                             # stateMachine, courtroom (seat/access rules)
    scripts/seed.js         # also seeds a case already live in the Court Room
  frontend/
    pages/
      index.js              # gate page (logged-out landing: log in / sign up)
      home.js                # authenticated dashboard (old index.js content)
      login.js, register.js, upload.js
      court/index.js         # Court Room list (all live-voting cases)
      court/[id].js           # a single Court Room: paywall, pixel avatars, chat, voting
      events/, business/
    components/             # Navbar, StatusBadge, VoteBar, CountdownTimer, ReportCard,
                             # PixelAvatar (CSS pixel-art courtroom characters)
    lib/                    # api.js (fetch wrapper), auth.js (React context)
    public/images/hero-fire.jpg   # gate-page background
```

## What changed in the modify round

Everything above already reflects the current behavior; in short, this
round of changes on top of the original build:

- Business accounts now have a fenced-off experience: they can't see or
  use "File a Report" / `/upload`, and only they can see/use "Business
  Desk" / `/business` — enforced in both the nav and the pages themselves.
- Task acceptance and task completion are now two separate hunter/admin
  steps (`accept` → `submit` → `complete`), with a `pending_review` status
  in between, instead of an admin being able to complete a task the hunter
  never actually finished.
- A new Court Room area (`/court` list + `/court/[id]` room) replaced the
  old pay-per-vote model with pay-once-to-enter, free voting, live chat
  restricted to the two named parties, free emoji reactions for everyone,
  shared chat history for the whole room, and a cartoon pixel-art
  presentation of the two sides.
- A logged-out gate page now sits in front of the whole app (project name,
  slogan, animated explainer, Log in / Sign up), with the previous
  homepage content moved to `/home` for logged-in users.
- The gate page was redesigned around the supplied hero image as a
  full-bleed background, an Apple-style top shadow behind the nav, and a
  no-scroll layout with copy anchored to the bottom-left.

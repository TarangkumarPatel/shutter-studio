# Shutter Studio

A cinematic, award-agency-style photography portfolio — built with Next.js 16
(App Router), TypeScript, Tailwind CSS, Framer Motion + GSAP, Prisma/Postgres
(Neon), and the Google Gemini API (free tier).

- **Cinematic intro** — a camera photo flies in from off-frame with a
  rotation, a viewfinder HUD slides open ("LIGHTS → CAMERA → SHOOT"
  typography, an autofocus bracket, an exposure readout), the lens punches
  in, then a GSAP aperture-blade shutter snaps shut before a flash reveals
  the gallery. Plays once per browser session (`sessionStorage`), with a
  Skip button, an optional synthesized shutter-click sound, and full
  `prefers-reduced-motion` support.
- **Masonry gallery** with a lightbox (Ken Burns zoom, like button with a
  burst animation, comments — no account required).
- **Gallery order is admin-curated**: photos display in the order set via
  drag-and-drop in `/admin` (ties — e.g. a fresh upload not yet
  repositioned — fall back to newest-first, and new uploads jump to the
  front by default).
- **/admin** — password-protected dashboard with two tabs: **Photos**
  (drag-and-drop upload with server-side processing/compression via `sharp`,
  a hamburger-handle drag-to-reorder list, comment moderation, delete) and
  **Messages** (contact-form submissions, with delete).
- **/contact** — a contact form (name/email/message), rate-limited and
  sanitized server-side, stored in the database and surfaced in the admin
  Messages tab.
- **/game** — "AI Photo Face-Off": an AI vision judge compares two photos —
  portfolio-vs-portfolio, or your own upload vs. a portfolio pick — and
  returns scores, critiques, and a verdict, revealed with animated counters,
  a typewriter effect, and confetti.

---

## Tech stack

| Concern             | Choice                                                        |
| -------------------- | -------------------------------------------------------------- |
| Framework             | Next.js 16 (App Router, Turbopack)                             |
| Language               | TypeScript                                                     |
| Styling                | Tailwind CSS v4                                                 |
| Animation              | Framer Motion (orchestration/UI) + GSAP (lens aperture timeline) |
| Database               | Postgres (Neon) via Prisma ORM — SQLite also works for local-only dev, see below |
| Image storage          | Local disk (`/public/uploads`) behind a storage adapter — see [Swapping to S3/Cloudinary](#swapping-to-s3cloudinary) |
| Image processing       | `sharp` (resize, WebP compression, blur placeholder)             |
| AI judge               | `@google/genai`, `gemini-2.5-flash` (vision) — free tier, no billing required |
| Smooth scroll          | Lenis                                                            |

---

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

| Variable         | Required | Value                                                    |
| ----------------- | -------- | ----------------------------------------------------------- |
| `DATABASE_URL`     | Yes      | `file:./dev.db` works out of the box locally.                |
| `ADMIN_PASSWORD`   | Yes      | Password for `/admin` (server-side only).                    |
| `SESSION_SECRET`   | Yes      | Random string, e.g. `openssl rand -hex 32`.                   |
| `GEMINI_API_KEY`   | For `/game` | Free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Without it, `/game` shows a "judge isn't configured" message — the rest of the site is unaffected. |

### 3. Set up the database

`DATABASE_URL`/`DATABASE_URL_UNPOOLED` should point at a Postgres database —
a free [Neon](https://neon.tech) project works well and is what this repo is
configured for (`prisma/schema.prisma` uses `directUrl` for migrations, so
grab both the pooled and unpooled connection strings from Neon/Vercel's
Storage tab). Prefer to skip provisioning a database for quick local
experiments? Point `DATABASE_URL` at `file:./dev.db` and change
`provider = "postgresql"` to `"sqlite"` in `prisma/schema.prisma` instead —
just note you'll get your own migration history either way.

```bash
npx prisma migrate dev   # applies the schema to your database
npm run db:seed          # seeds 8 procedurally-generated placeholder photos
```

The seed script draws its placeholder images with `sharp` (gradients +
abstract shapes) — no external downloads, no licensing questions, works
completely offline. Swap them for real photos any time via `/admin`; the
seed script skips itself if the `Photo` table already has rows.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/admin` and log
in with `ADMIN_PASSWORD` to upload/manage photos, and `/game` to try the AI
face-off (requires `GEMINI_API_KEY`).

### Other useful scripts

```bash
npm run build       # production build
npm run start        # run the production build
npm run db:studio    # Prisma Studio — browse/edit the DB visually
npm run db:migrate   # create a new migration after schema changes
```

---

## Project structure

```
prisma/
  schema.prisma        # Photo / Like / Comment / Message models
  seed.ts               # generates + inserts 8 placeholder photos
src/
  app/
    page.tsx             # gallery (server component, fetches + sorts photos)
    admin/page.tsx        # admin dashboard (password-gated)
    contact/page.tsx        # contact page
    game/page.tsx             # AI face-off game
    api/                        # route handlers (photos, likes, comments, contact, admin, game)
  components/
    intro/                 # cinematic intro sequence (CameraLens, IntroSequence)
    gallery/                # Gallery, PhotoCard, Lightbox, LikeButton, CommentSection
    contact/                 # ContactForm
    admin/                    # LoginForm, UploadForm, PhotoManageList, MessageManageList, AdminDashboard
    game/                      # GameArena, PhotoPicker, ChallengeUpload, ResultReveal, …
    layout/                     # Header, SmoothScrollProvider (Lenis)
  lib/
    storage.ts                # local-disk storage adapter (swap target for S3/Cloudinary)
    image.ts                   # sharp processing pipeline
    aiJudge.ts                   # Gemini vision judge
    messages.ts                  # contact-message queries
    auth.ts, ip.ts, rateLimit.ts, sanitize.ts, sorting.ts, photos.ts, …
public/
  uploads/
    web/                        # web-optimized WebP versions (what the site serves)
    originals/                   # preserved full-quality originals
  intro/
    camera.jpg                   # camera photo used in the cinematic intro
```

---

## How the pieces work

### Sorting

`src/lib/sorting.ts` sorts by the `Photo.order` column — a plain integer the
admin controls by dragging photos in `/admin`'s Photos tab (grip handle on
each row; the new order is persisted via `PATCH /api/admin/photos/reorder`
and reflected immediately on the gallery). Ties fall back to newest-first, so
a freshly-uploaded photo (which defaults to one less than the current lowest
`order`, i.e. the front of the list) still surfaces immediately even before
it's been manually repositioned. This runs on every gallery/game page load —
no cron job or cache to keep in sync.

### Contact & messages

`/contact` posts to `POST /api/contact`, which sanitizes the input
(`src/lib/sanitize.ts`), rate-limits by IP (3 messages / 15 minutes, same
`checkRateLimit()` limiter used for comments), and stores the message in the
`Message` table. Submissions show up in `/admin`'s **Messages** tab
(fetched server-side via `src/lib/messages.ts`), each deletable via
`DELETE /api/admin/messages/[id]`.

### Likes & comments

- **Likes**: one per photo per browser, enforced via a `clientId` generated
  client-side and persisted in `localStorage`, unique-constrained against
  `photoId` in the database. A soft server-side IP check (`Like.ipHash`, via
  a salted hash — the raw IP is never stored) additionally caps likes per
  photo per network to guard against `localStorage`-clearing abuse, without
  hard-blocking shared networks (offices, NAT, campus wifi).
- **Comments**: no account required — just a display name + text. Sanitized
  server-side with `sanitize-html` (all markup stripped) and rate-limited
  per IP (5 comments / 10 minutes) via an in-memory limiter in
  `src/lib/rateLimit.ts`. That limiter is per-process — fine for a single
  server/VPS deployment, but swap it for a shared store (e.g. Upstash Redis)
  behind the same `checkRateLimit()` signature if you deploy multiple
  instances.

### Admin auth

`/admin` checks `ADMIN_PASSWORD` server-side only (`src/app/api/admin/login/route.ts`)
and, on success, sets an `httpOnly`, `sameSite=lax` cookie containing a
payload signed with `SESSION_SECRET` (HMAC-SHA256, `src/lib/auth.ts`) — no
session table, no JWT library, just a signed token the server verifies on
every admin request. The password itself is never sent to, or readable by,
client-side JavaScript.

### The AI Photo Face-Off (`/game`)

- **Portfolio vs Portfolio**: pick any two gallery photos.
- **Challenge the Photographer**: pick one gallery photo, upload your own.
  Your upload is resized/compressed **in the browser** (`src/lib/clientImage.ts`,
  via `<canvas>`), sent to `/api/game/judge` as base64 in the request body,
  and used **only in memory** for that one request — it is never written to
  disk or the database, and the API route (`src/app/api/game/judge/route.ts`)
  discards it as soon as the response is sent. This is stated on the page
  itself, not just here.
- Gemini (`gemini-2.5-flash`, vision) is prompted to act as a professional
  photography judge and returns structured JSON (via Gemini's native
  `responseSchema` support) — score /100, a 2–3 sentence critique, and a
  winner + one-line verdict — for both photos (`src/lib/aiJudge.ts`).
  Malformed responses, refusals, and API errors are all caught and surfaced
  as a themed error state rather than a crash.
- While waiting, a "developing film" loader cycles through judge-themed
  status lines; results reveal with animated score counters, a typewriter
  critique, a spotlight on the winner, and confetti.

---

## Swapping to S3/Cloudinary

Image storage is behind a small interface (`src/lib/storage.ts`):

```ts
export interface StorageAdapter {
  save(key: string, buffer: Buffer): Promise<string>; // returns a public URL
  delete(key: string): Promise<void>;
}
```

Everything else in the app (upload route, image processing, `next/image`
rendering) only ever deals in the returned "key"/URL — never a local file
path directly. To move to S3 or Cloudinary:

1. Write a new class implementing `StorageAdapter` (e.g. `S3StorageAdapter`)
   that uploads to your bucket/account and returns the public URL.
2. Swap the `export const storage: StorageAdapter = new LocalStorageAdapter();`
   line at the bottom of `storage.ts` to your new class.
3. Add your bucket/CDN hostname to `images.remotePatterns` in `next.config.ts`
   so `next/image` will optimize remote URLs.
4. `src/app/api/game/judge/route.ts` currently reads portfolio images off
   local disk (`storageKeyToFilePath`) to base64-encode them for Gemini's
   vision API — swap that one read for an HTTP fetch of the stored URL.

## Switching database providers

The schema doesn't use any provider-specific types, so moving between
Postgres, SQLite, MySQL, etc. is just:

1. Change `datasource db { provider = "..." }` in `prisma/schema.prisma`
   (currently `"postgresql"`; drop the `directUrl` line if your new provider
   has no pooled/unpooled distinction).
2. Point `DATABASE_URL` (and `DATABASE_URL_UNPOOLED`, if applicable) at the
   new database.
3. Run `npx prisma migrate dev` to generate a fresh migration against the new
   provider — migration histories aren't interchangeable across providers,
   so this effectively starts migration history over (fine for a project
   this size).

---

## Accessibility & performance

- Images use `next/image` with `blurDataURL` placeholders (generated at
  upload/seed time) and responsive `sizes`, so nothing lays out unstyled or
  loads full-resolution unnecessarily.
- Alt text falls back to the photo title (`"Untitled photograph"` if none is
  set) throughout the gallery, lightbox, and game.
- The lightbox supports `Escape` to close and `←`/`→` to navigate, traps
  background scroll while open, and uses `role="dialog"` / `aria-modal`.
- `prefers-reduced-motion: reduce` disables the intro's heavy motion (it's
  skipped outright) and Lenis smooth scroll falls back to native scrolling;
  a global CSS rule also collapses most transition/animation durations
  site-wide for users who've opted out of motion at the OS level.
- Mobile-first responsive layout throughout, including the intro and the
  game's photo pickers/upload flow.

---

## Deployment

### Option A — Vercel (recommended for the simplest path, with one caveat)

The database is already sorted (Postgres via Neon, see above) — Vercel's
**ephemeral filesystem** only bites for `/public/uploads`. Anything written
there at runtime (i.e. every admin upload) disappears on the next deploy or
cold start. Two ways to handle this on Vercel:

1. **Swap to S3/Cloudinary before deploying** (see above) — the recommended
   path if you intend to keep uploading new photos in production. Storage
   becomes durable and you get a CDN for free.
2. **Ship your photos as part of the repo/build** (upload locally in dev,
   commit the resulting `/public/uploads`, don't use `/admin` in production)
   — fine for a mostly-static portfolio that rarely changes.

Steps:

```bash
vercel
```

In the Vercel dashboard, connect your Neon database to the project
(**Storage → your database → Connect Project** — this injects
`DATABASE_URL`/`DATABASE_URL_UNPOOLED` automatically), then set
`ADMIN_PASSWORD`, `SESSION_SECRET`, and `GEMINI_API_KEY` yourself under
**Settings → Environment Variables**. `npx prisma migrate deploy` needs to
run against the production database before first use — either run it
locally with `DATABASE_URL` pointed at production, or wire it into your
build step.

### Option B — A VPS (simplest for local file storage, no code changes needed)

If you'd rather not touch storage at all, deploy to any VPS with a
persistent disk (Railway, Render, Fly.io, a plain Ubuntu box, etc.) — local
file storage and SQLite both just work, since the filesystem persists
between requests and deploys.

```bash
npm install
npx prisma migrate deploy
npm run build
npm run start   # or run behind pm2 / systemd
```

Make sure `prisma/dev.db` and `public/uploads/` live on a persistent volume
if your host uses ephemeral containers (e.g. set a Docker volume mount for
both paths).

---

## Notes on the placeholder photos

The 6–8 required "seed" photos are generated procedurally (gradients +
abstract shapes rasterized with `sharp`) rather than downloaded stock
photography, so the project runs fully offline with zero setup and no
licensing ambiguity. They're intentionally abstract rather than trying to
fake real photographs — replace them with your own work via `/admin`
whenever you're ready.

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
- **Masonry gallery** with a lightbox (Ken Burns zoom, an Instagram-style
  caption overlaid directly on the photo, and comments/likes in a slide-in
  drawer rather than a permanent side panel — the photo stays the largest
  thing on screen).
- **Gallery order**: pinned photos always sort first, then by like count
  descending. Ties fall back to the admin-curated drag-and-drop order in
  `/admin`, then newest-first.
- **/admin** — password-protected dashboard with two tabs: **Photos**
  (drag-and-drop upload with server-side processing/compression via `sharp`,
  a hamburger-handle drag-to-reorder list, inline title/description editing,
  pin-to-top, comment moderation, delete) and **Messages** (contact-form
  submissions, with delete).
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
| Image storage          | Vercel Blob in production, local disk in dev — see [Photo storage](#photo-storage) |
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

`src/lib/sorting.ts` sorts `pinned` photos first (toggled per-photo from
`/admin`'s Photos tab, via `PATCH /api/admin/photos/[id]`), then by
`likeCount` descending. Ties (very common — most photos sit at the same
like count) fall back to the admin-curated `Photo.order` column — dragged
in `/admin`'s Photos tab, persisted via `PATCH /api/admin/photos/reorder`
— so that feature still has an effect once likes aren't the deciding
factor, and finally to newest-first. This runs on every gallery/game page
load — no cron job or cache to keep in sync.

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
  `photoId` in the database. Toggleable — liking again after unliking is just
  `POST`/`DELETE` on the same `(photoId, clientId)` pair
  (`src/app/api/photos/[id]/like/route.ts`). A soft server-side IP check
  (`Like.ipHash`, via a salted hash — the raw IP is never stored)
  additionally caps likes per photo per network to guard against
  `localStorage`-clearing abuse, without hard-blocking shared networks
  (offices, NAT, campus wifi).
- **Comments**: no account required — just a display name + text. Sanitized
  server-side with `sanitize-html` (all markup stripped) and rate-limited
  per IP (5 comments / 10 minutes) via an in-memory limiter in
  `src/lib/rateLimit.ts`. That limiter is per-process — fine for a single
  server/VPS deployment, but swap it for a shared store (e.g. Upstash Redis)
  behind the same `checkRateLimit()` signature if you deploy multiple
  instances.
- **Edit/delete your own comment**: comments store the same `clientId` as
  likes (nullable — comments predating this can't be claimed by anyone).
  `PATCH`/`DELETE /api/comments/[id]` require the request's `clientId` to
  match the comment's before allowing the change; the admin's own delete
  path (cookie auth) is unaffected and still works unconditionally.

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

## Photo storage

Local disk works fine for local dev, but **Vercel's serverless functions
have a read-only filesystem outside `/tmp`** — writing to `public/uploads`
at runtime (every admin upload) fails outright once deployed there. Image
storage is behind a small interface for exactly this reason
(`src/lib/storage.ts`):

```ts
export interface StorageAdapter {
  save(key: string, buffer: Buffer): Promise<string>; // returns a public URL
  delete(key: string): Promise<void>;
}
```

**On Vercel**, this is already handled: `storage.ts` automatically uses
**Vercel Blob** instead of local disk whenever `BLOB_READ_WRITE_TOKEN` is
present (auto-injected once you connect a Blob store to the project —
Storage → Create → Blob → Connect Project, same flow as the Neon database).
Nothing else to configure; `next.config.ts` already allows
`*.public.blob.vercel-storage.com` for `next/image`, and the game judge
route already fetches portfolio images over HTTP when `storageKey` is a
full URL rather than reading them off local disk.

**To use S3/Cloudinary instead** (e.g. deploying elsewhere, or wanting a
CDN in front of the images):

1. Write a new class implementing `StorageAdapter` (e.g. `S3StorageAdapter`)
   that uploads to your bucket/account and returns the public URL.
2. Update the `storage` export at the bottom of `storage.ts` to select it.
3. Add your bucket/CDN hostname to `images.remotePatterns` in `next.config.ts`.

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

### Option A — Vercel (recommended)

The database is already sorted (Postgres via Neon, see above), and photo
storage auto-switches to Vercel Blob in production (see
[Photo storage](#photo-storage)) — just connect a Blob store the same way
you connected Neon.

Steps:

```bash
vercel
```

In the Vercel dashboard, connect your Neon database (**Storage → your
database → Connect Project** — injects `DATABASE_URL`/`DATABASE_URL_UNPOOLED`)
and a Blob store (**Storage → Create → Blob → Connect Project** — injects
`BLOB_READ_WRITE_TOKEN`), then set `ADMIN_PASSWORD`, `SESSION_SECRET`, and
`GEMINI_API_KEY` yourself under **Settings → Environment Variables**.
`npx prisma migrate deploy` needs to run against the production database
before first use — either run it locally with `DATABASE_URL` pointed at
production, or wire it into your build step.

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

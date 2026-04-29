# Learning Tracker

Learning Tracker is a personal learning dashboard for saving educational videos, organizing them by category, and tracking progress as you watch.

It is built with Next.js, Prisma, and PostgreSQL (Supabase), with optional YouTube playlist sync for fast importing.

## What this project does

- Save YouTube videos by URL (title + thumbnail are fetched automatically)
- Assign a category when saving (`Programming`, `Business`, etc.)
- Mark videos as learned with a toggle
- Browse all saved videos on `/videos` with search + category filters
- Sync videos from a configured YouTube playlist into the database

## Tech stack

- Next.js (App Router)
- React + TypeScript
- Prisma ORM + PostgreSQL
- Supabase-hosted Postgres
- Tailwind CSS + Radix UI

## Quick start

1) Install dependencies:

```bash
npm install
```

2) Configure environment variables in `.env`:

```bash
DATABASE_URL="postgresql://..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
YOUTUBE_REFRESH_TOKEN="..."
YOUTUBE_SYNC_PLAYLIST_ID="PL..." # regular playlist ID to sync from
SYNC_SECRET="..."
```

3) Run Prisma migration:

```bash
npm run db:migrate
```

4) Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## YouTube sync setup

Run OAuth once to get a refresh token:

```bash
npm run youtube:oauth
```

Then:

- copy the printed `YOUTUBE_REFRESH_TOKEN` into `.env`
- set `YOUTUBE_SYNC_PLAYLIST_ID` to a playlist you own (can be private)

Note: the YouTube Data API does not reliably return Watch Later (`WL`) items, so this app syncs from a standard playlist ID.

Sync walks the playlist from the start up to a limit (default **2000** entries) so videos you add at the **end** of a long list are included. Optional: `YOUTUBE_SYNC_MAX_RESULTS=3000` in `.env` (max 5000).

## Useful scripts

- `npm run dev` - start development server
- `npm run build` - production build
- `npm run lint` - run ESLint
- `npm run db:migrate` - create/apply Prisma migrations
- `npm run db:push` - push schema without migrations
- `npm run db:generate` - generate Prisma client
- `npm run db:studio` - open Prisma Studio
- `npm run seed:get-smarter` - seed sample learning videos

## Project structure (high-level)

- `src/app/(app)/page.tsx` - dashboard/home
- `src/app/(app)/videos/page.tsx` - videos page with filters
- `src/components/dashboard/*` - dashboard UI
- `src/components/videos/*` - videos page client UI
- `src/lib/watch-later-sync.ts` - playlist sync orchestration
- `src/lib/youtube-ingest.ts` - YouTube URL ingest + DB insert
- `prisma/schema.prisma` - DB schema

## Security notes

- Never commit `.env`
- Keep `SYNC_SECRET` private (used to protect sync API route)
- Rotate OAuth credentials/tokens if leaked

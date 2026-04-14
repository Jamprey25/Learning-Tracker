# Learning Tracker - Technical Structure

Last updated: 2026-04-13

## 1) System Overview

Learning Tracker is a Next.js App Router application for collecting YouTube videos, categorizing them, and tracking learning progress. It stores canonicalized YouTube watch URLs in PostgreSQL via Prisma and supports both manual ingest and playlist-based sync from YouTube.

Core architecture style:
- UI in React client components
- Data access in server actions and API routes
- Persistence through Prisma ORM + Postgres
- External integration with YouTube OAuth + YouTube Data APIs

## 2) Runtime and Platform

- Framework: Next.js 16 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS 4, Radix UI primitives, framer-motion
- Database: PostgreSQL (Supabase-hosted expected), Prisma client with `@prisma/adapter-pg`
- Analytics: `@vercel/analytics`
- Runtime mode:
  - App routes render dynamically (`dynamic = "force-dynamic"` where used)
  - API handlers for sync/import run in Node runtime (`runtime = "nodejs"`)

## 3) Data Model

Primary model (`prisma/schema.prisma`):

- `Video`
  - `id: String` UUID primary key
  - `url: String` unique (canonical watch URL, dedupe invariant)
  - `title: String`
  - `thumbnail: String`
  - `category: String` default `"General"`
  - `isLearned: Boolean` default `false`
  - `createdAt: DateTime` default `now()`, mapped to `created_at`

Key invariant:
- One logical YouTube video maps to one DB row because URLs are normalized to `https://www.youtube.com/watch?v=<videoId>`.

## 4) Application Flows

### 4.1 Manual Add Flow
1. User submits URL in dashboard UI (`VideoDashboard`).
2. Server action `saveYoutubeVideo` calls `ingestYoutubeVideo`.
3. URL is parsed and canonicalized (`extractYoutubeVideoId`, `canonicalYoutubeWatchUrl`).
4. Duplicate checked in DB by unique `url`.
5. Metadata fetched via YouTube oEmbed unless supplied by caller.
6. Row inserted in Postgres and returned to client state.

### 4.2 Learned Toggle Flow
1. Client sets optimistic `isLearned` state.
2. Server action `setVideoLearned` updates DB row.
3. On failure, UI reverts optimistic state.

### 4.3 Playlist Sync Flow
1. Triggered from dashboard action or secured API endpoint.
2. `runWatchLaterSync` validates env configuration.
3. OAuth access token refreshed with refresh token.
4. Playlist items fetched from YouTube Data API (`playlistItems`).
5. Each item ingested through shared `ingestYoutubeVideo` pipeline.
6. Outcome returns attempted/added/skipped/errors summary.

### 4.4 Bulk URL Import Flow
1. `scripts/push-links-from-file.mjs` reads URL list from a text file.
2. Script posts URLs to `/api/videos/import` with `Bearer SYNC_SECRET`.
3. Route ingests each URL and returns grouped results.

## 5) External Integrations

- Google OAuth token endpoint:
  - Used for refresh token exchange and access-token refresh.
- YouTube Data API:
  - `playlistItems` for playlist ingestion
  - `search` in seeding script
- YouTube oEmbed endpoint:
  - Lightweight metadata retrieval (title/thumbnail)

Security boundaries:
- API sync/import routes require `Authorization: Bearer <SYNC_SECRET>`.
- If `SYNC_SECRET` is missing, auth always fails by design.

## 6) Environment Variables

Required for core app:
- `DATABASE_URL`

Required for playlist sync:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_REFRESH_TOKEN`
- `YOUTUBE_SYNC_PLAYLIST_ID` (must be regular playlist id, not `WL`)

Required for secured route/script automation:
- `SYNC_SECRET`

Optional script-specific:
- `IMPORT_BASE_URL` (defaults to `http://localhost:3000`)
- `YOUTUBE_API_KEY` (seed script only)

## 7) Source Structure and Responsibilities

### App layer
- `src/app/layout.tsx`: root HTML shell, fonts, metadata, analytics
- `src/app/globals.css`: global styling
- `src/app/(app)/layout.tsx`: authenticated/app shell container + nav wrapper
- `src/app/(app)/loading.tsx`: app-level loading boundary UI
- `src/app/(app)/page.tsx`: dashboard route, loads initial video data
- `src/app/(app)/videos/page.tsx`: videos index route, server-loaded list

### Actions and API
- `src/app/actions/video.ts`: list + update learned state
- `src/app/actions/youtube.ts`: URL save server action
- `src/app/actions/sync.ts`: dashboard sync action orchestration
- `src/app/api/sync/youtube/route.ts`: secured sync endpoint (cron/script-safe)
- `src/app/api/videos/import/route.ts`: secured bulk URL import endpoint

### Domain/Integration libs
- `src/lib/prisma.ts`: Prisma client + PG adapter + pool config
- `src/lib/youtube.ts`: YouTube URL parsing/canonicalization primitives
- `src/lib/youtube-ingest.ts`: canonical ingest pipeline + dedupe + persistence
- `src/lib/youtube-watch-later.ts`: OAuth refresh + playlist API client
- `src/lib/watch-later-sync.ts`: sync orchestration and result shaping
- `src/lib/sync-request-auth.ts`: bearer-token gate for sync/import routes
- `src/lib/categories.ts`: category taxonomy + badge color mapping
- `src/lib/infer-category.ts`: keyword-based category inference heuristic
- `src/lib/utils.ts`: UI utility helpers

### UI components
- `src/components/layout/app-nav.tsx`: top navigation bar
- `src/components/dashboard/video-dashboard.tsx`: dashboard client logic + add/sync/toggle
- `src/components/videos/videos-client.tsx`: searchable/filterable videos grid
- `src/components/ui/*`: reusable UI primitives

### Scripts and data
- `scripts/youtube-oauth-setup.mjs`: one-time OAuth bootstrap for refresh token
- `scripts/push-links-from-file.mjs`: bulk import from plain-text URLs
- `scripts/seed-get-smarter.ts`: seeded ingest using YouTube search API
- `scripts/backfill-categories.ts`: recategorize `"General"` videos by title heuristics
- `data/get-smarter-videos.json`: seed input dataset

### Infra/config
- `prisma/schema.prisma`: schema definition
- `prisma/migrations/*`: migration history
- `next.config.ts`: image host allowlist + turbopack root
- `eslint.config.mjs`, `postcss.config.mjs`, `tsconfig.json`: toolchain configuration

## 8) Operational Notes

- Prisma client is cached in development to avoid hot-reload connection churn.
- Non-local database targets default to SSL unless `sslmode=disable`.
- Connection pool max defaults to `connection_limit` URL param or `10`.
- Image optimization is restricted to YouTube thumbnail host patterns.

## 9) Testing and Validation Checklist

After technical changes, verify:
- `npm run lint` passes
- `npm run build` passes
- DB access works (`DATABASE_URL` valid)
- Add-video flow works (valid/invalid/duplicate URL cases)
- Sync route returns expected auth and summary behavior
- Learned toggle persists across reload

## 10) Documentation Maintenance Rule

When any technical behavior changes (routing, schema, env vars, scripts, API contracts, data flow, or module responsibility), update this file in the same change set.

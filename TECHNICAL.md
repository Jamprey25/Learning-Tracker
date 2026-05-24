# Learning Tracker - Technical Structure

Last updated: 2026-05-24

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

### Prisma CLI vs app runtime connections

- **`src/lib/prisma.ts`** always uses **`DATABASE_URL`** to build the `pg` pool (`PrismaClient` + `@prisma/adapter-pg`). The pool is created with **`connectionString: <full URL>`** so query parameters Supabase attaches (`sslmode`, timeouts, session mode hints) survive; if `DATABASE_URL` targets Supabase’s **transaction pooler** (`*.pooler.supabase.com`, port **6543**), the code appends **`pgbouncer=true`** when missing — required for pooled connections that don’t support prepared statements cleanly.
- **`prisma.config.ts`** sets **`datasource.url`** to **`DIRECT_URL` if defined**, otherwise `DATABASE_URL`. Prisma Migrate and other CLI commands therefore use the direct endpoint when configured.
- **Supabase caveat:** DDL (migrations) through the transaction pool host (often `*.pooler.supabase.com` and port **`6543`**) commonly **hangs or fails**. Put Supabase’s **direct** Postgres connection (host `db.<project-ref>.supabase.co`, port **`5432`**) in **`DIRECT_URL`** for `prisma migrate` while keeping a pooler URL in **`DATABASE_URL`** for the running app. Supabase may label that direct host as IPv6-only on some plans; if your network is IPv4-only and the direct URL won’t connect, use the dashboard **Session pooler** string for `DIRECT_URL` or enable Supabase’s IPv4 add-on—see current Supabase connectivity docs.

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

Additional gamification models:

- `ProgressEvent`
  - `id: String` UUID primary key
  - `entityType: String` shared domain key (`"video" | "course" | "course_module" | "project" | "milestone" | "venture" | "research"`)
  - `entityId: String` referenced entity row id
  - `eventType: String` progress semantic (`"saved" | "completed" | "progressed" | "shipped" | ...`)
  - `xp: Int` XP awarded for the event
  - `note: String?` optional freeform annotation
  - `occurredAt: DateTime` default `now()`, mapped to `occurred_at`
  - Indexes: `[occurredAt]`, `[entityType, entityId]`

- `Streak`
  - Singleton-style table used as streak state
  - `currentCount: Int` mapped to `current_count`
  - `longestCount: Int` mapped to `longest_count`
  - `lastEventDate: DateTime?` mapped to `last_event_date`

- `Course`
  - `id: String` UUID primary key
  - `title: String`
  - `provider: String?` optional source/platform
  - `url: String?` optional external course URL
  - `totalModules: Int` default `1`, mapped to `total_modules`
  - `completedModules: Int` default `0`, mapped to `completed_modules`
  - `status: String` default `"active"` (`active` | `completed` | `paused` | `dropped`)
  - `category: String` default `"General"`
  - `startedAt: DateTime` default `now()`, mapped to `started_at`
  - `targetCompletionDate: DateTime?` mapped to `target_completion_date`
  - `completedAt: DateTime?` mapped to `completed_at`
  - Relation: one-to-many with `CourseModule`

- `CourseModule`
  - `id: String` UUID primary key
  - `courseId: String` mapped to `course_id`
  - `title: String`
  - `orderIndex: Int` mapped to `order_index`
  - `completedAt: DateTime?` mapped to `completed_at`
  - Relation: belongs to `Course` with cascade delete
  - Index: `[courseId]`

- `Project`
  - `id: String` UUID primary key
  - `name: String`
  - `description: String?` optional project summary
  - `repoUrl: String?` mapped to `repo_url`
  - `status: String` default `"planning"` (`planning` | `active` | `shipped` | `shelved`)
  - `category: String` default `"General"`
  - `startedAt: DateTime` default `now()`, mapped to `started_at`
  - `shippedAt: DateTime?` mapped to `shipped_at`
  - Relation: one-to-many with `Milestone`

- `Milestone`
  - `id: String` UUID primary key
  - `projectId: String` mapped to `project_id`
  - `title: String`
  - `status: String` default `"pending"` (`pending` | `done`)
  - `orderIndex: Int` mapped to `order_index`
  - `completedAt: DateTime?` mapped to `completed_at`
  - Relation: belongs to `Project` with cascade delete
  - Index: `[projectId]`

- `Venture`
  - `id: String` UUID primary key
  - `name: String`
  - `oneLiner: String?` mapped to `one_liner`
  - `stage: String` default `"idea"` (`idea` | `validating` | `building` | `launched`)
  - `startedAt: DateTime` default `now()`, mapped to `started_at`
  - `keyMetricLabel: String?` mapped to `key_metric_label`
  - `keyMetricValue: Float?` mapped to `key_metric_value`
  - `keyMetricUpdatedAt: DateTime?` mapped to `key_metric_updated_at`

- `ResearchTopic`
  - `id: String` UUID primary key
  - `title: String`
  - `phase: String` default `"planning"` (`planning` | `lit_review` | `methodology` | `data` | `writing` | `done`)
  - `notesUrl: String?` mapped to `notes_url`
  - `targetDate: DateTime?` mapped to `target_date`
  - `startedAt: DateTime` default `now()`, mapped to `started_at`

Key invariants:
- One logical YouTube video maps to one DB row because URLs are normalized to `https://www.youtube.com/watch?v=<videoId>`.
- Progress/streak updates run transactionally via `recordProgressEvent` so event write and streak mutation stay consistent.

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
4. Playlist items fetched from YouTube Data API (`playlistItems`) in **playlist order**, paginating until the configured max item count or the playlist ends.
5. Each item ingested through shared `ingestYoutubeVideo` pipeline.
6. Outcome returns attempted/added/skipped/errors summary.

**Invariant / gotcha:** YouTube usually places newly saved videos at the **end** of a playlist. The sync only considers the first *N* positions (default 2000, hard cap 5000). If *N* is smaller than the playlist length, items beyond position *N* are never seen—previously the default was 50, which missed new tail additions on longer playlists.

### 4.4 Progress Event + Streak Flow
1. Mutations that represent learning progress call `recordProgressEvent` (`src/lib/progress.ts`).
2. `recordProgressEvent` inserts one `ProgressEvent` row and updates the singleton `Streak` row in the same transaction.
3. Streak update semantics:
   - If last event day is **today**: no streak increment.
   - If last event day is **yesterday**: increment current streak.
   - If last event day is older than yesterday (or empty): reset current streak to `1`.
4. `longestCount` updates when `currentCount` exceeds prior max.
5. Dashboard home route preloads streak and 84-day activity to render streak/weekly/heatmap widgets.

### 4.5 Video Progress Event Emission
1. `ingestYoutubeVideo` emits `saved` events (`xp: 1`) on successful inserts.
2. `setVideoLearned` emits `completed` events (`xp: 5`) only on `false -> true` transitions.
3. `true -> false` toggles intentionally do not emit any progress event.

### 4.6 Bulk URL Import Flow
1. `scripts/push-links-from-file.mjs` reads URL list from a text file.
2. Script posts URLs to `/api/videos/import` with `Bearer SYNC_SECRET`.
3. Route ingests each URL and returns grouped results.

### 4.7 Course Progress Update Flow
1. Client calls `updateCourseProgress` from the courses page with an explicit completed module count.
2. Action normalizes the module count into `[0, totalModules]` using `src/lib/course-progress.ts`.
3. Status transitions to `completed` when count reaches total; otherwise completed courses are reopened to `active`.
4. A `course` `completed` ProgressEvent (+25 XP) emits only on transition into completed status.

### 4.8 Course Module Completion Flow
1. Client (or future module UI) calls `completeCourseModule` for one `CourseModule` row.
2. Action transactionally marks the module complete, recomputes completed module count, and updates parent `Course`.
3. Emits `course_module` `progressed` ProgressEvent (+3 XP) only when the module flips incomplete -> complete.
4. If the parent course transitions to completed in that transaction, emits one additional `course` `completed` event (+25 XP).

### 4.9 Courses Dashboard Integration
1. Home route loads `listActiveCourses(3)` in parallel with videos and streak/activity metrics.
2. Dashboard renders an "Active Courses" widget showing top 3 active courses and progress bars.
3. Top navigation includes a `/courses` route for dedicated course management.

### 4.10 Project Milestone and Shipping Flow
1. Project mutations are handled in `src/app/actions/project.ts` (`addProject`, `updateProjectStatus`, `addMilestone`, `completeMilestone`, `reorderMilestones`).
2. `completeMilestone` transitions a milestone from `pending` to `done` transactionally and emits one `milestone` `progressed` event (+10 XP) only on first completion.
3. `updateProjectStatus` emits one `project` `shipped` event (+50 XP) when status transitions into `shipped`; moving out of `shipped` does not emit additional events.
4. Milestone reordering validates exact milestone membership for a project before applying new `orderIndex` values to preserve ordering integrity.
5. `updateProjectStatus` includes a deferred `// TODO: v2` hook point for future GitHub commit auto-fetch integration after shipping.

### 4.11 Projects UI Flow
1. `/projects` server route loads projects via `listProjects()` and renders a client board.
2. The client groups projects by status (`planning`, `active`, `shipped`, `shelved`) for a kanban-style workflow.
3. Project cards allow inline status transitions, milestone add/complete operations, and local milestone reordering.
4. All project card mutations call server actions in `src/app/actions/project.ts`, then reconcile local optimistic state with server responses.

### 4.12 Venture Stage and Metric Flow
1. `/ventures` route loads venture rows using `listVentures()` and renders a lightweight card list.
2. `updateVentureStage` emits a `venture` `progressed` event (+30 XP) only when stage changes.
3. `updateVentureMetric` updates one key metric (`label` and/or `value`) and emits a `venture` `progressed` event (+5 XP).
4. Venture cards keep one in-focus metric by design to stay lightweight while preserving progress signal in `ProgressEvent`.

### 4.13 Research Phase Flow
1. `/research` route loads research topics via `listResearchTopics()` and renders phase-oriented cards.
2. `updateResearchPhase` emits `research` `progressed` events (+15 XP) for phase advances and `research` `completed` (+40 XP) when transitioning into `done`.
3. Research cards keep optional `notesUrl` and `targetDate` metadata to bridge external note systems while preserving in-app progress checkpoints.

### 4.14 Unified Summary Aggregation Flow
1. `getDashboardSummary()` (`src/lib/dashboard-summary.ts`) fetches cross-entity dashboard data in one server-side call: streak, XP this week, active courses/projects, ventures, recent videos, and recent progress events.
2. Recent `ProgressEvent` rows are hydrated with entity titles by grouping IDs by `entityType` and bulk-loading names/titles from each domain table.
3. The helper returns `HydratedProgressEvent[]` (`ProgressEvent` + `entityTitle`) so UI rendering can describe activity without additional per-row lookups.

## 5) External Integrations

- Google OAuth token endpoint:
  - Used for refresh token exchange and access-token refresh.

**OAuth `invalid_grant` (token expired or revoked):** The refresh flow in `src/lib/youtube-watch-later.ts` posts `YOUTUBE_REFRESH_TOKEN` to Google; a 400 with `invalid_grant` means Google no longer accepts that refresh token. Common causes:
- **OAuth consent screen in “Testing”:** Google invalidates refresh tokens after about **seven days** unless the signing-in Google account is listed under **Test users** (still subject to testing limits) or you **publish** the app to production (Scopes like `youtube.readonly` typically do not require verification for personal/Google-account use—check current Google Cloud policy for your project).
- **User revoked access** (Google Account → Security → Third-party access) or removed the Learning Tracker OAuth client’s access.
- **Client credential mismatch:** Rotating **`GOOGLE_CLIENT_SECRET`** or switching to a **different OAuth client ID** invalidates tokens issued under the previous client pair.
Remediation: Fix the consent-screen / credential issue in Google Cloud Console, then run **`npm run youtube:oauth`** (see `scripts/youtube-oauth-setup.mjs`), replace **`YOUTUBE_REFRESH_TOKEN`** in `.env`, and redeploy/restart so the runtime picks up the new value.
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

Optional for playlist sync:
- `YOUTUBE_SYNC_MAX_RESULTS` — max playlist positions to scan per sync (default `2000`, clamped to `5000`). Raise if your playlist is longer and new saves sit near the end.

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
- `src/app/(app)/page.tsx`: dashboard route, loads video + streak/activity + active courses data
- `src/app/(app)/videos/page.tsx`: videos index route, server-loaded list
- `src/app/(app)/courses/page.tsx`: courses index route, server-loaded list
- `src/app/(app)/projects/page.tsx`: projects route, server-loaded list for status-board rendering
- `src/app/(app)/ventures/page.tsx`: ventures route, server-loaded card list with stage and key metric editing
- `src/app/(app)/research/page.tsx`: research route, server-loaded topic list with phase progression

### Actions and API
- `src/app/actions/video.ts`: list + update learned state + learned completion event emission
- `src/app/actions/course.ts`: list/add/update course progress/status + module completion actions with XP emission
- `src/app/actions/project.ts`: list/add/update project status + milestone lifecycle actions with XP emission
- `src/app/actions/venture.ts`: list/add ventures + stage/metric updates with XP emission
- `src/app/actions/research.ts`: list/add research topics + phase updates with XP emission
- `src/app/actions/youtube.ts`: URL save server action
- `src/app/actions/sync.ts`: dashboard sync action orchestration
- `src/app/api/sync/youtube/route.ts`: secured sync endpoint (cron/script-safe)
- `src/app/api/videos/import/route.ts`: secured bulk URL import endpoint

### Domain/Integration libs
- `src/lib/prisma.ts`: Prisma client + PG adapter + pool config
- `src/lib/progress.ts`: canonical progress event writes + streak + activity aggregation queries
- `src/lib/course-progress.ts`: course status + module count normalization helpers
- `src/lib/dashboard-summary.ts`: cross-entity dashboard aggregation + progress-event title hydration
- `src/lib/youtube.ts`: YouTube URL parsing/canonicalization primitives
- `src/lib/youtube-ingest.ts`: canonical ingest pipeline + dedupe + persistence
- `src/lib/youtube-watch-later.ts`: OAuth refresh + playlist API client
- `src/lib/watch-later-sync.ts`: sync orchestration and result shaping
- `src/lib/sync-request-auth.ts`: bearer-token gate for sync/import routes
- `src/lib/categories.ts`: category taxonomy + badge color mapping
- `src/lib/infer-category.ts`: keyword-based category inference heuristic
- `src/lib/utils.ts`: UI utility helpers

### UI components
- `src/components/layout/app-nav.tsx`: top navigation bar (home/videos/courses)
- `src/components/layout/app-nav.tsx`: top navigation bar (home/videos/courses/projects/ventures/research)
- `src/components/dashboard/video-dashboard.tsx`: dashboard client logic + add/sync/toggle + gamification summary widgets + active courses
- `src/components/dashboard/streak-card.tsx`: streak metric card
- `src/components/dashboard/weekly-summary.tsx`: rolling 7-day event and XP summary card
- `src/components/dashboard/activity-heatmap.tsx`: 84-day GitHub-style activity heatmap
- `src/components/videos/videos-client.tsx`: searchable/filterable videos grid
- `src/components/courses/add-course-form.tsx`: quick add form for course metadata and module target
- `src/components/courses/course-card.tsx`: per-course progress card with inline module controls
- `src/components/courses/courses-client.tsx`: searchable/filterable courses view with optimistic updates
- `src/components/projects/project-detail.tsx`: milestone list/add/reorder and completion controls per project
- `src/components/projects/project-card.tsx`: project-level status controls + embedded milestone detail
- `src/components/projects/projects-client.tsx`: status-board grouping, add-project form, and optimistic project/milestone mutations
- `src/components/ventures/ventures-client.tsx`: venture list, stage selector, and key metric update controls
- `src/components/research/research-client.tsx`: research topic list with phase selector and notes/target metadata
- `src/components/ui/*`: reusable UI primitives

### Scripts and data
- `scripts/youtube-oauth-setup.mjs`: one-time OAuth bootstrap for refresh token
- `scripts/push-links-from-file.mjs`: bulk import from plain-text URLs
- `scripts/seed-get-smarter.ts`: seeded ingest using YouTube search API
- `scripts/backfill-categories.ts`: recategorize `"General"` videos by title heuristics
- `data/get-smarter-videos.json`: seed input dataset

### Infra/config
- `prisma/schema.prisma`: schema definition (Video/ProgressEvent/Streak/Course/CourseModule/Project/Milestone/Venture/ResearchTopic)
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

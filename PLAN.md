# Learning Tracker — Expansion Plan

> Drop this file at the repo root. Work through one task block at a time in Cursor. Each task is self-contained: read the **Scope**, touch the **Files**, finish at the **Done when**.

---

## Context (read first)

Existing app is a Next.js 16 + Prisma + Postgres (Supabase) YouTube video tracker. We're expanding it into a centralized learning/progress dashboard that also tracks **Courses**, **Coding Projects**, **Ventures (startups)**, and **Research Topics**, with a gamification layer (XP, streaks, weekly activity) that works uniformly across all entity types.

**Architectural decisions already made (don't relitigate):**
- Separate Prisma tables per entity type (not one polymorphic table).
- One shared `ProgressEvent` table is the gamification spine — every meaningful action writes a row.
- Build the gamification spine **first**, retrofit Videos to it, then add new entities one at a time.
- Ventures + Research come last and may be lightweight (just a "log progress" button pointing to external notes) — gated decision before Phase 4.

---

## Conventions to preserve (Cursor: match these)

- Server actions live in `src/app/actions/*.ts`. API routes in `src/app/api/*/route.ts` with `runtime = "nodejs"` and bearer auth via `src/lib/sync-request-auth.ts` if secured.
- Domain logic in `src/lib/*.ts` (e.g., `youtube-ingest.ts`). Keep new domain files in the same layer.
- DB access goes through `src/lib/prisma.ts`.
- App routes render with `dynamic = "force-dynamic"` where they read user data.
- Dashboard pages live under `src/app/(app)/`. Client UI lives under `src/components/`.
- Tailwind 4 + Radix UI primitives. Match existing component style (look at `src/components/videos/videos-client.tsx` and `src/components/dashboard/video-dashboard.tsx` before writing new components).
- After any technical behavior change, update `TECHNICAL.md` per its Section 10 rule.

---

## How to use this with Cursor

1. Open this file. Check the next unchecked task.
2. Prompt Cursor's agent with: *"Do task X.Y from PLAN.md. Don't do anything outside its scope."*
3. After the agent finishes, run `npm run lint && npm run build` before moving on.
4. Check the box. Commit. Move to the next task.

**Do not let Cursor batch multiple tasks together.** One task = one commit = one verifiable change.

---

# Phase 1 — ProgressEvent foundation + retrofit Videos

Goal: streaks and XP visible on the dashboard, fed by existing Video activity.

## 1.1 Schema: ProgressEvent + Streak

- [ ] **Scope:** Add two Prisma models.
- [ ] **Files:** `prisma/schema.prisma`
- [ ] **Add:**
  ```prisma
  model ProgressEvent {
    id          String   @id @default(uuid())
    entityType  String   // "video" | "course" | "course_module" | "project" | "milestone" | "venture" | "research"
    entityId    String
    eventType   String   // "completed" | "started" | "progressed" | "shipped" | ...
    xp          Int      @default(0)
    note        String?
    occurredAt  DateTime @default(now()) @map("occurred_at")

    @@index([occurredAt])
    @@index([entityType, entityId])
  }

  model Streak {
    id            String   @id @default(uuid())
    currentCount  Int      @default(0) @map("current_count")
    longestCount  Int      @default(0) @map("longest_count")
    lastEventDate DateTime? @map("last_event_date")
  }
  ```
- [ ] **Done when:** `npm run db:migrate` creates the migration cleanly and `npx prisma studio` shows the tables.

## 1.2 Progress emission helpers

- [ ] **Scope:** Create the canonical helper module for recording and reading progress.
- [ ] **Files:** create `src/lib/progress.ts`
- [ ] **Export:**
  - `recordProgressEvent({ entityType, entityId, eventType, xp, note? })` — inserts a row AND updates the Streak singleton (increment if last event was yesterday, reset to 1 if older than yesterday, do nothing if today).
  - `getStreak()` → `{ current, longest, lastEventDate }`
  - `getRecentEvents(limit = 20)` → ProgressEvent[]
  - `getXpTotal(sinceDays?)` → number
  - `getActivityByDay(days = 84)` → `Array<{ date: string; count: number; xp: number }>` for the heatmap
- [ ] **Done when:** functions compile, types exported, all queries use `prisma` from `src/lib/prisma.ts`.

## 1.3 Wire Videos into ProgressEvent

- [ ] **Scope:** Every existing Video mutation that represents learning progress should call `recordProgressEvent`.
- [ ] **Files:** `src/app/actions/video.ts`, `src/app/actions/youtube.ts`, `src/lib/youtube-ingest.ts`
- [ ] **Events to emit:**
  - When a video is added → `{ entityType: "video", eventType: "saved", xp: 1 }`
  - When `isLearned` flips `false → true` → `{ entityType: "video", eventType: "completed", xp: 5 }`
  - When `isLearned` flips `true → false` → no event (don't penalize, just don't reward twice)
- [ ] **Done when:** marking a video learned writes a ProgressEvent and bumps the Streak. Verify via Prisma Studio.

## 1.4 Dashboard gamification UI

- [ ] **Scope:** Add three components to the home dashboard.
- [ ] **Files:** `src/components/dashboard/streak-card.tsx`, `src/components/dashboard/weekly-summary.tsx`, `src/components/dashboard/activity-heatmap.tsx`, and integrate them in `src/components/dashboard/video-dashboard.tsx`
- [ ] **Components:**
  - `StreakCard` — shows current streak + longest streak + flame icon
  - `WeeklySummary` — last 7 days: event count + XP total
  - `ActivityHeatmap` — GitHub-style 7-row × 12-col grid (last ~84 days), color intensity scaled by event count
- [ ] **Data:** server-load via the helpers from 1.2. Pass to client components as props.
- [ ] **Done when:** dashboard renders all three. Marking a video learned causes streak/heatmap to update on reload.

## 1.5 Phase 1 closeout

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `TECHNICAL.md` updated: new models in §3, new flows in §4, new lib files in §7
- [ ] Manual test: add video → mark learned → see streak go up. Reload → state persists.

---

# Phase 2 — Courses module

Goal: track multi-module courses with progress bars, feeding the same gamification.

## 2.1 Schema: Course + CourseModule

- [ ] **Files:** `prisma/schema.prisma`
- [ ] **Add:**
  ```prisma
  model Course {
    id                   String    @id @default(uuid())
    title                String
    provider             String?   // "Coursera" | "YouTube" | "Udemy" | "Book" | ...
    url                  String?
    totalModules         Int       @default(1) @map("total_modules")
    completedModules     Int       @default(0) @map("completed_modules")
    status               String    @default("active") // "active" | "completed" | "paused" | "dropped"
    category             String    @default("General")
    startedAt            DateTime  @default(now()) @map("started_at")
    targetCompletionDate DateTime? @map("target_completion_date")
    completedAt          DateTime? @map("completed_at")
    modules              CourseModule[]
  }

  model CourseModule {
    id          String    @id @default(uuid())
    courseId    String    @map("course_id")
    course      Course    @relation(fields: [courseId], references: [id], onDelete: Cascade)
    title       String
    orderIndex  Int       @map("order_index")
    completedAt DateTime? @map("completed_at")

    @@index([courseId])
  }
  ```
- [ ] **Done when:** migration applies cleanly.

## 2.2 Course backend

- [ ] **Files:** create `src/app/actions/course.ts`, create `src/lib/course-progress.ts`
- [ ] **First do:** read `src/app/actions/youtube.ts` and `src/lib/youtube-ingest.ts` to match the manual-add pattern.
- [ ] **Implement server actions:**
  - `addCourse({ title, provider, url, totalModules, category, targetCompletionDate })`
  - `updateCourseProgress({ courseId, completedModules })` — also flips `status` to `"completed"` if `completedModules === totalModules`
  - `completeCourseModule({ moduleId })` — for granular tracking when modules are pre-seeded
  - `setCourseStatus({ courseId, status })`
- [ ] **ProgressEvents:**
  - On module complete → `xp: 3, eventType: "progressed"`
  - On course complete → `xp: 25, eventType: "completed"`
- [ ] **Done when:** actions compile, can manually call from a test page.

## 2.3 Courses page UI

- [ ] **Files:** `src/app/(app)/courses/page.tsx`, `src/components/courses/courses-client.tsx`, `src/components/courses/course-card.tsx`, `src/components/courses/add-course-form.tsx`
- [ ] **Mirror:** `/videos` page structure (`src/app/(app)/videos/page.tsx` + `src/components/videos/videos-client.tsx`).
- [ ] **Course card shows:** title, provider, progress bar (`completedModules / totalModules`), category badge, status pill.
- [ ] **Inline progress control:** +/- button on card to increment/decrement `completedModules` (calls `updateCourseProgress`).
- [ ] **Done when:** can add a course, increment progress, see progress bar fill, mark complete.

## 2.4 Nav + dashboard integration

- [ ] Add `/courses` link to `src/components/layout/app-nav.tsx`.
- [ ] Add "Active Courses" widget to dashboard showing top 3 in-progress courses.

## 2.5 Phase 2 closeout

- [ ] Lint + build pass
- [ ] `TECHNICAL.md` and `README.md` updated
- [ ] Manual test: full flow add → progress → complete, streak increments

---

# Phase 3 — Projects module

Goal: track coding projects with milestones.

## 3.1 Schema: Project + Milestone

- [x] **Files:** `prisma/schema.prisma`
- [x] **Add:**
  ```prisma
  model Project {
    id          String      @id @default(uuid())
    name        String
    description String?
    repoUrl     String?     @map("repo_url")
    status      String      @default("planning") // "planning" | "active" | "shipped" | "shelved"
    category    String      @default("General")
    startedAt   DateTime    @default(now()) @map("started_at")
    shippedAt   DateTime?   @map("shipped_at")
    milestones  Milestone[]
  }

  model Milestone {
    id          String    @id @default(uuid())
    projectId   String    @map("project_id")
    project     Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
    title       String
    status      String    @default("pending") // "pending" | "done"
    orderIndex  Int       @map("order_index")
    completedAt DateTime? @map("completed_at")

    @@index([projectId])
  }
  ```

## 3.2 Project backend

- [x] **Files:** `src/app/actions/project.ts`
- [x] **Actions:** `addProject`, `updateProjectStatus`, `addMilestone`, `completeMilestone`, `reorderMilestones`
- [x] **ProgressEvents:**
  - Milestone complete → `xp: 10, eventType: "progressed"`
  - Status → "shipped" → `xp: 50, eventType: "shipped"` (the big one)
- [x] **Deferred (do NOT build now):** GitHub commit auto-fetch. Add a `// TODO: v2` comment where it would plug in.

## 3.3 Projects page UI

- [x] **Files:** `src/app/(app)/projects/page.tsx`, `src/components/projects/projects-client.tsx`, `src/components/projects/project-card.tsx`, `src/components/projects/project-detail.tsx`
- [x] **Layout:** kanban-style columns for `planning` / `active` / `shipped` / `shelved` (or a tab/filter — pick what looks better in your existing UI).
- [x] **Project detail view:** milestone list with check-off + add-milestone input.
- [x] **Add to nav.**

## 3.4 Phase 3 closeout

- [x] Lint + build pass, docs updated.
- [ ] Manual test full flow (blocked until DB schema apply command succeeds in this environment).

---

# Phase 4 — Ventures + Research (decision gate first)

## 4.0 DECISION GATE — answer before building

> **You decide, not Cursor.** Pick one of:
>
> **Option A (lightweight):** Ventures and Research are *just* ProgressEvent sources. Single "Log work on [Venture X]" button on the dashboard, no entity tables, names stored in a config or single `Tracker` table. Notes live in Notion/Obsidian.
>
> **Option B (full):** Build entity tables (below). More to maintain. Only do this if you've already decided the in-app surface is more useful than your existing notes tool.

If A → skip to 4.3 (lite version). If B → do 4.1 + 4.2.

## 4.1 Venture entity (Option B only)

- [x] **Schema:**
  ```prisma
  model Venture {
    id                  String   @id @default(uuid())
    name                String
    oneLiner            String?  @map("one_liner")
    stage               String   @default("idea") // "idea" | "validating" | "building" | "launched"
    startedAt           DateTime @default(now()) @map("started_at")
    keyMetricLabel      String?  @map("key_metric_label")
    keyMetricValue      Float?   @map("key_metric_value")
    keyMetricUpdatedAt  DateTime? @map("key_metric_updated_at")
  }
  ```
- [x] **Actions:** `addVenture`, `updateVentureStage`, `updateVentureMetric`
- [x] **ProgressEvents:** stage change → `xp: 30, eventType: "progressed"`; metric update → `xp: 5`
- [x] **UI:** `/ventures` page, simple card list. One metric per venture, no analytics dashboards.

## 4.2 Research entity (Option B only)

- [x] **Schema:**
  ```prisma
  model ResearchTopic {
    id          String   @id @default(uuid())
    title       String
    phase       String   @default("planning") // "planning" | "lit_review" | "methodology" | "data" | "writing" | "done"
    notesUrl    String?  @map("notes_url")
    targetDate  DateTime? @map("target_date")
    startedAt   DateTime @default(now()) @map("started_at")
  }
  ```
- [x] **Actions:** `addResearchTopic`, `updateResearchPhase`
- [x] **ProgressEvents:** phase advance → `xp: 15, eventType: "progressed"`; phase = "done" → `xp: 40, eventType: "completed"`
- [x] **UI:** `/research` page.

## 4.3 Lite version (Option A only)

- [ ] **Schema:**
  ```prisma
  model Tracker {
    id      String @id @default(uuid())
    name    String
    kind    String  // "venture" | "research"
    archived Boolean @default(false)
  }
  ```
- [ ] **UI:** dashboard widget listing all Trackers with a "Log work" button that emits a ProgressEvent (`entityType: "venture"` or `"research"`, `xp: 5`, `eventType: "progressed"`, prompt for an optional note).
- [ ] **Done when:** clicking "Log work" on a tracker bumps streak and shows in the recent activity feed.

## 4.4 Phase 4 closeout

- [x] Lint + build, docs updated.
- [ ] DB schema apply still blocked in this environment (`db:migrate` currently fails with P1000 auth).

---

# Phase 5 — Unified dashboard

Goal: one home screen that surfaces what's active across every entity type.

## 5.1 Cross-entity summary query

- [ ] **Files:** create `src/lib/dashboard-summary.ts`
- [ ] **Export:** `getDashboardSummary()` returning:
  ```ts
  {
    streak: { current, longest },
    xpThisWeek: number,
    activeCourses: Course[],      // status === "active", limit 3
    activeProjects: Project[],    // status === "active", limit 3
    ventures: Venture[] | Tracker[],
    recentVideos: Video[],        // limit 4, ordered by createdAt desc
    recentEvents: ProgressEvent[] // limit 15, hydrated with entity titles
  }
  ```

## 5.2 Home dashboard rebuild

- [ ] **Files:** `src/components/dashboard/video-dashboard.tsx` (rename mentally to a generic dashboard; keep file name to avoid churn unless trivial).
- [ ] **Layout:** streak/weekly/heatmap row → "in flight" row (courses / projects / ventures cards) → recent activity feed → recent videos.
- [ ] **Recent activity feed item format:** `{icon} {entity title} — {event description} · {relative time} · +{xp} XP`

## 5.3 Phase 5 closeout

- [ ] Lint + build, docs updated, screenshot the dashboard for your own records.

---

# After everything: honest checkpoint

Before adding *anything* else (auth, multi-user, mobile app, GitHub integration, AI features, etc.), use the app daily for **two weeks**. Then answer in writing:

1. Did the streak actually motivate me, or did I game it?
2. Which entity type do I touch most? Least? Why?
3. What did I want to track that I couldn't?
4. What's the next *smallest* thing that would make this better?

Resist building anything not answering question 4.

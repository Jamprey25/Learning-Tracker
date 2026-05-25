import { VideoDashboard } from "@/components/dashboard/video-dashboard";
import { getDashboardSummary } from "@/lib/dashboard-summary";
import { getActivityByDay } from "@/lib/progress";
import { isWatchLaterConfigured } from "@/lib/watch-later-sync";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [summary, activityByDay] = await Promise.all([
    getDashboardSummary(),
    getActivityByDay(84),
  ]);
  const watchLaterConfigured = isWatchLaterConfigured();

  const last7Days = activityByDay.slice(-7);
  const weeklySummary = {
    eventCount: last7Days.reduce((sum, day) => sum + day.count, 0),
    xpTotal: last7Days.reduce((sum, day) => sum + day.xp, 0),
  };

  return (
    <VideoDashboard
      initialVideos={summary.recentVideos.map((video) => ({
        id: video.id,
        url: video.url,
        title: video.title,
        thumbnail: video.thumbnail,
        category: video.category,
        isLearned: video.isLearned,
        createdAt: video.createdAt.toISOString(),
      }))}
      watchLaterConfigured={watchLaterConfigured}
      streak={{ ...summary.streak, lastEventDate: null }}
      weeklySummary={weeklySummary}
      activityByDay={activityByDay}
      activeCourses={summary.activeCourses.map((course) => ({
        id: course.id,
        title: course.title,
        provider: course.provider ?? null,
        url: course.url ?? null,
        totalModules: course.totalModules,
        completedModules: course.completedModules,
        status: course.status,
        category: course.category,
        startedAt: course.startedAt.toISOString(),
        targetCompletionDate: course.targetCompletionDate?.toISOString() ?? null,
        completedAt: course.completedAt?.toISOString() ?? null,
      }))}
      activeProjects={summary.activeProjects.map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        category: project.category,
        startedAt: project.startedAt.toISOString(),
        shippedAt: project.shippedAt?.toISOString() ?? null,
      }))}
      ventures={summary.ventures.map((venture) => ({
        id: venture.id,
        name: venture.name,
        stage: venture.stage,
        keyMetricLabel: venture.keyMetricLabel ?? null,
        keyMetricValue:
          venture.keyMetricValue == null ? null : Number(venture.keyMetricValue),
        startedAt: venture.startedAt.toISOString(),
      }))}
      recentEvents={summary.recentEvents.map((event) => ({
        id: event.id,
        entityType: event.entityType,
        entityId: event.entityId,
        eventType: event.eventType,
        xp: event.xp,
        note: event.note ?? null,
        entityTitle: event.entityTitle,
        relativeTimeLabel: event.relativeTimeLabel,
        occurredAt: event.occurredAt.toISOString(),
      }))}
    />
  );
}

import { listActiveCourses } from "@/app/actions/course";
import { listVideos } from "@/app/actions/video";
import { VideoDashboard } from "@/components/dashboard/video-dashboard";
import { getActivityByDay, getStreak } from "@/lib/progress";
import { isWatchLaterConfigured } from "@/lib/watch-later-sync";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [videos, streak, activityByDay, activeCourses] = await Promise.all([
    listVideos(),
    getStreak(),
    getActivityByDay(84),
    listActiveCourses(3),
  ]);
  const watchLaterConfigured = isWatchLaterConfigured();

  const last7Days = activityByDay.slice(-7);
  const weeklySummary = {
    eventCount: last7Days.reduce((sum, day) => sum + day.count, 0),
    xpTotal: last7Days.reduce((sum, day) => sum + day.xp, 0),
  };

  return (
    <VideoDashboard
      initialVideos={videos}
      watchLaterConfigured={watchLaterConfigured}
      streak={streak}
      weeklySummary={weeklySummary}
      activityByDay={activityByDay}
      activeCourses={activeCourses}
    />
  );
}

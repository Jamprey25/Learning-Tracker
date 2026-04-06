import { listVideos } from "@/app/actions/video";
import { VideoDashboard } from "@/components/dashboard/video-dashboard";
import { isWatchLaterConfigured } from "@/lib/watch-later-sync";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const videos = await listVideos();
  const watchLaterConfigured = isWatchLaterConfigured();

  return (
    <VideoDashboard
      initialVideos={videos}
      watchLaterConfigured={watchLaterConfigured}
    />
  );
}

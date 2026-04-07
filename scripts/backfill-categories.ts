import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { inferCategoryFromTitle } from "../src/lib/infer-category";

async function main() {
  const videos = await prisma.video.findMany({
    where: { category: "General" },
    select: { id: true, title: true, category: true },
  });

  if (videos.length === 0) {
    console.log("No General videos found. Nothing to backfill.");
    return;
  }

  const updates: { id: string; title: string; from: string; to: string }[] = [];

  for (const video of videos) {
    const inferred = inferCategoryFromTitle(video.title);
    if (inferred !== video.category) {
      updates.push({ id: video.id, title: video.title, from: video.category, to: inferred });
    }
  }

  if (updates.length === 0) {
    console.log(`Checked ${videos.length} videos. No category changes suggested.`);
    return;
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.video.update({
        where: { id: u.id },
        data: { category: u.to },
      }),
    ),
  );

  const changedByCategory = updates.reduce<Record<string, number>>((acc, u) => {
    acc[u.to] = (acc[u.to] ?? 0) + 1;
    return acc;
  }, {});

  console.log(
    JSON.stringify(
      {
        checkedGeneral: videos.length,
        updated: updates.length,
        changedByCategory,
        sample: updates.slice(0, 10).map((u) => ({ title: u.title, to: u.to })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


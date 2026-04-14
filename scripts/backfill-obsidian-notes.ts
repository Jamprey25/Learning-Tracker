import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { createObsidianNote } from "../src/lib/obsidian";

type BackfillOptions = {
  limit?: number;
  dryRun: boolean;
};

function parseArgs(argv: string[]): BackfillOptions {
  let limit: number | undefined;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      const raw = arg.split("=")[1];
      const value = Number.parseInt(raw, 10);
      if (Number.isFinite(value) && value > 0) {
        limit = value;
      }
    }
  }

  return { limit, dryRun };
}

async function main() {
  const { limit, dryRun } = parseArgs(process.argv.slice(2));
  const learnedVideos = await prisma.video.findMany({
    where: { isLearned: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, url: true, category: true },
    ...(limit ? { take: limit } : {}),
  });

  if (learnedVideos.length === 0) {
    console.log("No learned videos found. Nothing to upload.");
    return;
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          totalLearned: learnedVideos.length,
          sample: learnedVideos.slice(0, 10).map((v) => ({
            id: v.id,
            title: v.title,
            category: v.category,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  let success = 0;
  let failed = 0;

  for (const video of learnedVideos) {
    const ok = await createObsidianNote({
      title: video.title,
      url: video.url,
      category: video.category,
    });
    if (ok) {
      success += 1;
      console.log(`OK   ${video.title}`);
    } else {
      failed += 1;
      console.log(`FAIL ${video.title}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        processed: learnedVideos.length,
        success,
        failed,
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

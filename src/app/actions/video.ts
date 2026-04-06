"use server";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type DashboardVideo = {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  category: string;
  isLearned: boolean;
  createdAt: string;
};

export async function listVideos(): Promise<DashboardVideo[]> {
  try {
    const rows = await prisma.video.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        title: true,
        thumbnail: true,
        category: true,
        isLearned: true,
        createdAt: true,
      },
    });
    return rows.map((v) => ({
      ...v,
      createdAt: v.createdAt.toISOString(),
    }));
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2021"
    ) {
      return [];
    }
    throw e;
  }
}

export async function setVideoLearned(
  id: string,
  isLearned: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await prisma.video.update({
      where: { id },
      data: { isLearned },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not update video." };
  }
}

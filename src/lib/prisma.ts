import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnectionString: string | undefined;
};

function resolvePoolMax(dbUrl: URL): number {
  const fromUrl = Number(dbUrl.searchParams.get("connection_limit"));
  if (Number.isFinite(fromUrl) && fromUrl > 0) {
    return fromUrl;
  }
  // Serverless + Supabase pooler: one connection per function instance is enough.
  if (dbUrl.hostname.endsWith(".pooler.supabase.com")) {
    return 1;
  }
  return 10;
}

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const dbUrl = new URL(raw);
  const isLocalhost =
    dbUrl.hostname === "localhost" || dbUrl.hostname === "127.0.0.1";
  const sslMode = dbUrl.searchParams.get("sslmode");
  const shouldUseSsl = !isLocalhost && sslMode !== "disable";
  const poolMax = resolvePoolMax(dbUrl);

  const isSupabaseTransactionPool =
    dbUrl.hostname.endsWith(".pooler.supabase.com") && dbUrl.port === "6543";
  if (isSupabaseTransactionPool && !dbUrl.searchParams.has("pgbouncer")) {
    dbUrl.searchParams.set("pgbouncer", "true");
  }
  if (!isLocalhost && !dbUrl.searchParams.has("sslmode")) {
    dbUrl.searchParams.set("sslmode", "require");
  }

  // `@prisma/adapter-pg` uses node-postgres directly; Prisma's `pgbouncer=true`
  // URL flag does not fully disable prepared statements in the adapter path.
  // Supabase transaction pool (6543) rejects prepared statements — prefer session
  // pool (5432) for DATABASE_URL on Vercel with this adapter setup.
  const pool = new pg.Pool({
    connectionString: dbUrl.toString(),
    max: poolMax,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const currentConnectionString = process.env.DATABASE_URL ?? "";

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaConnectionString === currentConnectionString
  ) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  globalForPrisma.prismaConnectionString = currentConnectionString;
  return client;
}

export const prisma = getPrismaClient();

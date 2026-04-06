import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnectionString: string | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const dbUrl = new URL(connectionString);
  const isLocalhost =
    dbUrl.hostname === "localhost" || dbUrl.hostname === "127.0.0.1";
  const sslMode = dbUrl.searchParams.get("sslmode");
  const shouldUseSsl = !isLocalhost && sslMode !== "disable";
  const connectionLimit = Number(
    dbUrl.searchParams.get("connection_limit") ?? "10",
  );

  const pool = new pg.Pool({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || "5432"),
    database: dbUrl.pathname.replace(/^\//, ""),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    max: Number.isFinite(connectionLimit) ? connectionLimit : 10,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const currentConnectionString = process.env.DATABASE_URL ?? "";
const shouldCreateClient =
  !globalForPrisma.prisma ||
  globalForPrisma.prismaConnectionString !== currentConnectionString;

export const prisma = shouldCreateClient
  ? createPrismaClient()
  : globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConnectionString = currentConnectionString;
}

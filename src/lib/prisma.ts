import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnectionString: string | undefined;
};

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
  const connectionLimit = Number(
    dbUrl.searchParams.get("connection_limit") ?? "10",
  );

  // Supabase transaction pool (Supavisor, port 6543) rejects Prisma/pg prepared
  // statements unless callers opt out via this flag — see Supabase Prisma troubleshooting.
  const isSupabaseTransactionPool =
    dbUrl.hostname.endsWith(".pooler.supabase.com") && dbUrl.port === "6543";
  if (isSupabaseTransactionPool && !dbUrl.searchParams.has("pgbouncer")) {
    dbUrl.searchParams.set("pgbouncer", "true");
  }

  // Pass full URL through `pg`: preserves sslmode, pgbouncer, connect_timeout,
  // Supabase session parameters, etc. (manual host/user/password drops those).
  const pool = new pg.Pool({
    connectionString: dbUrl.toString(),
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

const prismaClient: PrismaClient = shouldCreateClient
  ? createPrismaClient()
  : (globalForPrisma.prisma ?? createPrismaClient());

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
  globalForPrisma.prismaConnectionString = currentConnectionString;
}

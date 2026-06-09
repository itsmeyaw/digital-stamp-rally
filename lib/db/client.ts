import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "@/lib/env";

export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Connection handling for Vercel serverless + Postgres.
 *
 * Serverless functions are short-lived and may run many concurrent instances,
 * so we keep the pool tiny (`max: 1`) and disable prepared statements (required
 * for transaction-pooled connections such as Supabase/Neon PgBouncer). The
 * client is cached on `globalThis` to survive hot-reloads in dev and warm
 * lambda reuse in prod, avoiding connection exhaustion.
 */
declare global {
  var __dsrSql: ReturnType<typeof postgres> | undefined;
  var __dsrDb: Database | undefined;
}

export function createDb(url: string): Database {
  const sql = postgres(url, { max: 1, prepare: false });
  return drizzle(sql, { schema });
}

export function getDb(): Database {
  if (!globalThis.__dsrDb) {
    const sql = postgres(databaseUrl(), { max: 1, prepare: false });
    globalThis.__dsrSql = sql;
    globalThis.__dsrDb = drizzle(sql, { schema });
  }
  return globalThis.__dsrDb;
}

export { schema };

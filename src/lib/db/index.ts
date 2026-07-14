import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { publisherSchema } from "@/lib/db/schemas/publisher.schema";

export type SigmoidEdgeDb = ReturnType<typeof drizzle<typeof publisherSchema>>;

let dbInstance: SigmoidEdgeDb | null = null;

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Configure the Supabase connection string before initializing the Drizzle client.",
    );
  }
  return databaseUrl;
}

function createDbInstance(): SigmoidEdgeDb {
  const databaseUrl = resolveDatabaseUrl();
  const queryClient = postgres(databaseUrl, {
    max: 10,
    prepare: false,
  });
  return drizzle(queryClient, {
    schema: publisherSchema,
    casing: "snake_case",
  });
}

export const db = new Proxy({} as SigmoidEdgeDb, {
  get(_target, prop: string) {
    if (!dbInstance) {
      dbInstance = createDbInstance();
    }
    const value = (dbInstance as unknown as Record<string, unknown>)[prop];
    return typeof value === "function" ? value.bind(dbInstance) : value;
  },
});

export { publisherSchema };

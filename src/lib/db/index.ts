import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { publisherSchema } from "@/lib/db/schemas/publisher.schema";

export type SigmoidEdgeDb = ReturnType<typeof drizzle<typeof publisherSchema>>;

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.length === 0) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Configure the Supabase connection string before initializing the Drizzle client.",
    );
  }
  return databaseUrl;
}

const databaseUrl = resolveDatabaseUrl();

const queryClient = postgres(databaseUrl, {
  max: 10,
  prepare: false,
});

export const db: SigmoidEdgeDb = drizzle(queryClient, {
  schema: publisherSchema,
  casing: "snake_case",
});

export { publisherSchema };

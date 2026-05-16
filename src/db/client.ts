import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for persisted lessons.");
  }
  if (!(client && dbInstance)) {
    client = postgres(databaseUrl, {
      max: 1,
      prepare: false,
    });
    dbInstance = drizzle(client, { schema });
  }
  return dbInstance;
}

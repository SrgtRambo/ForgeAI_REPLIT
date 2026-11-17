import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../drizzle/schema";

let sqlClient: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle> | undefined;

export function getSqlClient() {
  if (sqlClient) return sqlClient;

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("Replit database configuration is missing.");

  sqlClient = postgres(databaseUrl, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return sqlClient;
}

export function getDb() {
  if (!database) database = drizzle(getSqlClient(), { schema });
  return database;
}

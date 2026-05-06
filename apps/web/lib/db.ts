import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;

export function requireDatabaseUrl() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }
  return databaseUrl;
}

export async function withDb<T>(fn: (client: Client) => Promise<T>) {
  const client = new Client({ connectionString: requireDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}


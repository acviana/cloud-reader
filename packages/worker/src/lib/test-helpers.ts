import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "../db/schema.ts";

/**
 * Create an in-memory SQLite database with the cloud-reader schema applied.
 * Used in tests as a drop-in replacement for a real D1 binding.
 */
export function createTestDb(): LibSQLDatabase<typeof schema> {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });

  // Apply schema synchronously via raw SQL
  client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY NOT NULL,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      site_url TEXT,
      description TEXT,
      image_url TEXT,
      last_fetched_at INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY NOT NULL,
      feed_id TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      summary TEXT,
      content TEXT,
      published_at INTEGER,
      read INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id);
    CREATE INDEX IF NOT EXISTS idx_articles_read ON articles(read);
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
  `);

  return db;
}

import type { DrizzleD1Database } from "drizzle-orm/d1";
import { feeds } from "../db/schema.ts";
import { refreshFeed } from "../lib/refresh.ts";

export async function runCron(db: DrizzleD1Database): Promise<void> {
  const allFeeds = await db.select({ id: feeds.id }).from(feeds);
  await Promise.allSettled(allFeeds.map((f) => refreshFeed(f.id, db)));
}

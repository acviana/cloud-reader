import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { feedsRouter } from "./routes/feeds.ts";
import { articlesRouter } from "./routes/articles.ts";

export interface Env {
  DB: D1Database;
}

// Hono context variable: db is injected by middleware so routes are testable
export type Variables = {
  db: DrizzleD1Database;
};

export function createApp(dbOverride?: DrizzleD1Database) {
  const app = new Hono<{ Bindings: Env; Variables: Variables }>();

  // Inject db into context — allows tests to pass in a test db
  app.use("*", async (c, next) => {
    const db = dbOverride ?? drizzle(c.env.DB);
    c.set("db", db);
    await next();
  });

  app.get("/api/health", (c) => c.json({ status: "ok" }));
  app.route("/api/feeds", feedsRouter);
  app.route("/api/articles", articlesRouter);
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  return app;
}

const app = createApp();

export default {
  fetch: app.fetch,

  async scheduled(_event: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const db = drizzle(env.DB);
    const { runCron } = await import("./cron.ts");
    await runCron(db);
  },
} satisfies ExportedHandler<Env>;

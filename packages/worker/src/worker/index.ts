export interface Env {
  DB: D1Database;
}

export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response("cloud-reader API — coming soon", { status: 200 });
  },

  async scheduled(_event: ScheduledController, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // Cron handler — implemented in increment 8
  },
} satisfies ExportedHandler<Env>;

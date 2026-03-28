import { Hono } from "hono";
import type { Env, Variables } from "../index.ts";

export const articlesRouter = new Hono<{ Bindings: Env; Variables: Variables }>();

// Implemented in increment 7
articlesRouter.get("/", (c) => c.json({ error: "Not implemented" }, 501));
articlesRouter.patch("/:id", (c) => c.json({ error: "Not implemented" }, 501));

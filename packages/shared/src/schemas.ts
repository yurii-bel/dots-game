import { z } from "zod";

/** Placeholder player id — not tied to gameplay yet. */
export const PlayerIdSchema = z.string().uuid();
export type PlayerId = z.infer<typeof PlayerIdSchema>;

/** Shared health-check payload for HTTP / Socket probes. */
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string().min(1),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

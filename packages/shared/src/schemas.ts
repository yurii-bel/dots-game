import { z } from "zod";

/** Shared health-check payload for HTTP / Socket probes. */
export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string().min(1),
  timestamp: z.string().datetime(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export {
  PlayerIdSchema,
  type PlayerId,
} from "./socket";

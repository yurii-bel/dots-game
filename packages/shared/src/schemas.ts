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

export {
  NicknameSchema,
  SetNicknameBodySchema,
  MeResponseSchema,
  normalizeNickname,
  NICKNAME_MIN_LENGTH,
  NICKNAME_MAX_LENGTH,
  NICKNAME_PATTERN,
  type Nickname,
  type SetNicknameBody,
  type MeResponse,
} from "./nickname";

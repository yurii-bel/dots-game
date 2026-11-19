import { z } from "zod";

/** Display nickname length bounds (server-enforced). */
export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;

/** Allowed charset: letters, digits, underscore. */
export const NICKNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/**
 * Trimmed display nickname.
 * Normalize for uniqueness with {@link normalizeNickname}.
 */
export const NicknameSchema = z
  .string()
  .trim()
  .min(NICKNAME_MIN_LENGTH)
  .max(NICKNAME_MAX_LENGTH)
  .regex(NICKNAME_PATTERN, "Nickname may only contain letters, digits, and underscore");

export type Nickname = z.infer<typeof NicknameSchema>;

/** Case-insensitive uniqueness key: lower(trim(nickname)). */
export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase();
}

export const SetNicknameBodySchema = z.object({
  nickname: NicknameSchema,
});
export type SetNicknameBody = z.infer<typeof SetNicknameBodySchema>;

export const ClassicalTitleSchema = z.enum([
  "N",
  "3",
  "2",
  "1",
  "C",
  "M",
  "H",
  "G",
]);

/** Classical rating snapshot for lobby chip / profile (pool: classical). */
export const ClassicalRatingSchema = z.object({
  rating: z.number().int().min(100),
  title: ClassicalTitleSchema,
  gamesPlayed: z.number().int().nonnegative(),
  /** True after 5 ranked games and activity within 365 days. */
  leaderboardVisible: z.boolean(),
});
export type ClassicalRating = z.infer<typeof ClassicalRatingSchema>;

export const MeResponseSchema = z.object({
  id: z.string().min(1),
  clerkId: z.string().min(1),
  email: z.string().email().nullable(),
  nickname: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  classical: ClassicalRatingSchema,
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

/** One public Classical leaderboard row (placement + activity already applied). */
export const LeaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  nickname: z.string().min(1),
  title: ClassicalTitleSchema,
  rating: z.number().int().min(100),
  gamesPlayed: z.number().int().nonnegative(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardResponseSchema = z.object({
  pool: z.literal("classical"),
  entries: z.array(LeaderboardEntrySchema),
});
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

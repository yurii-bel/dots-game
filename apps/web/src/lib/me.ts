import type { ClassicalRating, MeResponse, UserRecord } from "@dots/shared";

export function toMeResponse(
  user: UserRecord,
  classical: ClassicalRating,
): MeResponse {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    classical,
  };
}

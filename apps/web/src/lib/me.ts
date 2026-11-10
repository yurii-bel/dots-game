import type { MeResponse, UserRecord } from "@dots/shared";

export function toMeResponse(user: UserRecord): MeResponse {
  return {
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    nickname: user.nickname,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

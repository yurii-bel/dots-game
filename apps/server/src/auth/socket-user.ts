import { prisma } from "@dots/database";

export type SocketAuthUser = {
  userId: string;
  clerkId: string;
  nickname: string;
};

/**
 * Load Prisma user for a verified Clerk id.
 * Requires nickname (onboarding complete) for game/lobby sockets.
 */
export async function loadSocketUser(clerkId: string): Promise<SocketAuthUser> {
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (!user.nickname) {
    throw new Error("NICKNAME_REQUIRED");
  }
  return {
    userId: user.id,
    clerkId: user.clerkId,
    nickname: user.nickname,
  };
}

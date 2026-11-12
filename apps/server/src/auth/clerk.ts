import { verifyToken } from "@clerk/backend";
import { SocketHandshakeAuthSchema } from "@dots/shared";
import { env } from "../env.js";

export type VerifiedClerkIdentity = {
  clerkId: string;
};

/**
 * Verify Clerk session JWT from Socket.IO handshake auth.
 * Never trusts client-sent userId / nickname / color.
 */
export async function verifyClerkSocketToken(
  handshakeAuth: unknown,
): Promise<VerifiedClerkIdentity> {
  const parsed = SocketHandshakeAuthSchema.safeParse(handshakeAuth);
  if (!parsed.success) {
    throw new Error("UNAUTHORIZED");
  }

  const options: {
    secretKey: string;
    jwtKey?: string;
    authorizedParties?: string[];
  } = {
    secretKey: env.CLERK_SECRET_KEY,
  };

  if (env.CLERK_JWT_KEY) {
    options.jwtKey = env.CLERK_JWT_KEY;
  }
  if (env.CLERK_AUTHORIZED_PARTIES.length > 0) {
    options.authorizedParties = env.CLERK_AUTHORIZED_PARTIES;
  }

  try {
    const payload = await verifyToken(parsed.data.token, options);
    const clerkId = payload.sub;
    if (!clerkId) {
      throw new Error("UNAUTHORIZED");
    }
    return { clerkId };
  } catch {
    throw new Error("UNAUTHORIZED");
  }
}

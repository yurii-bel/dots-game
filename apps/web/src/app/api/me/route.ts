import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@dots/database";
import { MeResponseSchema, upsertUserByClerkId } from "@dots/shared";
import { toMeResponse } from "@/lib/me";

export const dynamic = "force-dynamic";

/** Authenticated upsert-by-clerkId fallback (idempotent + concurrent-safe). */
export async function GET() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses?.[0]?.emailAddress ??
    null;

  const user = await upsertUserByClerkId(prisma, { clerkId, email });
  const body = MeResponseSchema.parse(toMeResponse(user));
  return Response.json(body);
}

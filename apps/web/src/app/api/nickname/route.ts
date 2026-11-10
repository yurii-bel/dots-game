import { auth } from "@clerk/nextjs/server";
import { prisma } from "@dots/database";
import {
  MeResponseSchema,
  SetNicknameBodySchema,
  setUserNickname,
  upsertUserByClerkId,
} from "@dots/shared";
import { toMeResponse } from "@/lib/me";

export const dynamic = "force-dynamic";

/** Set or change nickname (authenticated; uniqueness on nicknameNormalized). */
export async function POST(request: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SetNicknameBodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid nickname", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await upsertUserByClerkId(prisma, { clerkId });
  const result = await setUserNickname(prisma, {
    userId: user.id,
    nickname: parsed.data.nickname,
  });

  if (!result.ok) {
    if (result.code === "NICKNAME_TAKEN") {
      return Response.json({ error: "Nickname already taken" }, { status: 409 });
    }
    if (result.code === "INVALID_NICKNAME") {
      return Response.json({ error: "Invalid nickname" }, { status: 400 });
    }
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json(MeResponseSchema.parse(toMeResponse(result.user)));
}

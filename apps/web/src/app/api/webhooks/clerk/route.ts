import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@dots/database";
import { upsertUserByClerkId } from "@dots/shared";

export const dynamic = "force-dynamic";

type ClerkEmailAddress = {
  id: string;
  email_address: string;
};

type ClerkUserEventData = {
  id: string;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
};

type ClerkWebhookEvent = {
  type: string;
  data: ClerkUserEventData;
};

function primaryEmail(data: ClerkUserEventData): string | null {
  const list = data.email_addresses ?? [];
  if (data.primary_email_address_id) {
    const match = list.find((e) => e.id === data.primary_email_address_id);
    if (match) return match.email_address;
  }
  return list[0]?.email_address ?? null;
}

/**
 * Idempotent Clerk webhook: user.created / user.updated → upsert Prisma User by clerkId.
 */
export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return Response.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const wh = new Webhook(secret);
  let event: ClerkWebhookEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookEvent;
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const clerkId = event.data.id;
    if (!clerkId) {
      return Response.json({ error: "Missing user id" }, { status: 400 });
    }
    await upsertUserByClerkId(prisma, {
      clerkId,
      email: primaryEmail(event.data),
    });
  }

  return Response.json({ ok: true });
}

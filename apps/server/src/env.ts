import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLERK_SECRET_KEY: z.string().min(1),
  /** Optional PEM JWT public key for networkless verifyToken. */
  CLERK_JWT_KEY: z.string().optional(),
  /**
   * Comma-separated authorized parties (origins) for Clerk JWT azp checks.
   * Example: http://localhost:3000
   */
  CLERK_AUTHORIZED_PARTIES: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export const env = EnvSchema.parse({
  PORT: process.env.SERVER_PORT ?? process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_JWT_KEY: process.env.CLERK_JWT_KEY,
  CLERK_AUTHORIZED_PARTIES:
    process.env.CLERK_AUTHORIZED_PARTIES ?? process.env.NEXT_PUBLIC_APP_URL,
});

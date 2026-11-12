import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("server env schema", () => {
  it("defaults PORT to 4000", () => {
    const schema = z.object({
      PORT: z.coerce.number().int().positive().default(4000),
    });
    expect(schema.parse({}).PORT).toBe(4000);
  });

  it("requires CLERK_SECRET_KEY and parses authorized parties", () => {
    const schema = z.object({
      CLERK_SECRET_KEY: z.string().min(1),
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

    expect(() => schema.parse({})).toThrow();
    const parsed = schema.parse({
      CLERK_SECRET_KEY: "sk_test_placeholder",
      CLERK_AUTHORIZED_PARTIES: "http://localhost:3000, https://example.com",
    });
    expect(parsed.CLERK_AUTHORIZED_PARTIES).toEqual([
      "http://localhost:3000",
      "https://example.com",
    ]);
  });
});

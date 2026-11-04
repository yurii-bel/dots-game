import { describe, expect, it } from "vitest";
import { HealthResponseSchema } from "./schemas";

describe("HealthResponseSchema", () => {
  it("accepts a valid health payload", () => {
    const parsed = HealthResponseSchema.parse({
      ok: true,
      service: "server",
      timestamp: new Date().toISOString(),
    });
    expect(parsed.ok).toBe(true);
  });
});

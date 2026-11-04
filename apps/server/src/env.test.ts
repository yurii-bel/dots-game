import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("server env schema", () => {
  it("defaults PORT to 4000", () => {
    const schema = z.object({
      PORT: z.coerce.number().int().positive().default(4000),
    });
    expect(schema.parse({}).PORT).toBe(4000);
  });
});

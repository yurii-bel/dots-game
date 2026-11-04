import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, getEngineStatus } from "./index";

describe("game-engine stub", () => {
  it("reports scaffold-only status", () => {
    const status = getEngineStatus();
    expect(status.version).toBe(ENGINE_VERSION);
    expect(status.ready).toBe(false);
  });
});

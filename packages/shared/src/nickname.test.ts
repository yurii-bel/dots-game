import { describe, expect, it } from "vitest";
import {
  NicknameSchema,
  SetNicknameBodySchema,
  normalizeNickname,
} from "./nickname";

describe("NicknameSchema", () => {
  it("accepts valid nicknames", () => {
    expect(NicknameSchema.parse("Abe")).toBe("Abe");
    expect(NicknameSchema.parse("player_01")).toBe("player_01");
    expect(NicknameSchema.parse("A".repeat(20))).toHaveLength(20);
  });

  it("rejects too short / long / bad charset", () => {
    expect(() => NicknameSchema.parse("ab")).toThrow();
    expect(() => NicknameSchema.parse("A".repeat(21))).toThrow();
    expect(() => NicknameSchema.parse("bad name")).toThrow();
    expect(() => NicknameSchema.parse("hi!")).toThrow();
  });

  it("trims before validating", () => {
    expect(NicknameSchema.parse("  Alice  ")).toBe("Alice");
  });
});

describe("normalizeNickname", () => {
  it("lowercases trimmed display form", () => {
    expect(normalizeNickname("  Alice_1  ")).toBe("alice_1");
  });
});

describe("SetNicknameBodySchema", () => {
  it("parses body", () => {
    expect(SetNicknameBodySchema.parse({ nickname: "Bob_2" })).toEqual({
      nickname: "Bob_2",
    });
  });
});

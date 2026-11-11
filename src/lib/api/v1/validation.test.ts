import { describe, expect, it } from "vitest";
import {
  isIsoDate,
  isUuid,
  isValidEmail,
  isValidSouthAfricanPhone,
  normalizePhoneForMatch,
} from "./validation";

describe("api v1 validation", () => {
  it("validates emails and SA phones", () => {
    expect(isValidEmail("jacques@novafire.co.za")).toBe(true);
    expect(isValidEmail("bad")).toBe(false);
    expect(isValidSouthAfricanPhone("066 270 0293")).toBe(true);
    expect(isValidSouthAfricanPhone("+27662700293")).toBe(true);
    expect(isValidSouthAfricanPhone("123")).toBe(false);
  });

  it("normalizes phones and dates", () => {
    expect(normalizePhoneForMatch("+27 66 270 0293")).toBe("0662700293");
    expect(isIsoDate("2027-03-01")).toBe(true);
    expect(isIsoDate("01/03/2027")).toBe(false);
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
});

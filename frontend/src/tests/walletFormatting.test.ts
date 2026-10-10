import { describe, it, expect } from "vitest";
import { formatMON, shortAddress } from "../services/monadRpc";

describe("Wallet Formatting Unit Tests", () => {
  describe("shortAddress", () => {
    it("shortens standard 42-character EVM address correctly", () => {
      expect(shortAddress("0x71F00000000000000000000000000000000092A4")).toBe("0x71F0...92A4");
    });

    it("returns empty string when given empty string", () => {
      expect(shortAddress("")).toBe("");
    });

    it("returns empty string when given null or undefined", () => {
      expect(shortAddress(null)).toBe("");
      expect(shortAddress(undefined)).toBe("");
    });

    it("returns unmodified string if length <= 10", () => {
      expect(shortAddress("0x1234")).toBe("0x1234");
    });
  });

  describe("formatMON", () => {
    it("formats 0 wei as 0.0000 MON", () => {
      expect(formatMON(0n)).toBe("0.0000 MON");
    });

    it("formats 1 full MON (10^18 wei) as 1.0000 MON", () => {
      expect(formatMON(1000000000000000000n)).toBe("1.0000 MON");
    });

    it("formats fractional wei without floating-point inaccuracies", () => {
      expect(formatMON(500000000000000000n)).toBe("0.5000 MON");
      expect(formatMON(1234500000000000000n)).toBe("1.2345 MON");
      expect(formatMON(10000000000000000n)).toBe("0.0100 MON");
    });

    it("pads trailing zeros up to 4 decimal places", () => {
      expect(formatMON(2000000000000000000n)).toBe("2.0000 MON");
    });
  });
});

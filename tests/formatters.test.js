import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDate,
  buildTransformQuery,
  applyTransformToUrl,
} from "../src/utils/formatters.js";

describe("formatters", () => {
  describe("formatBytes", () => {
    it("should format 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(null)).toBe("0 B");
    });

    it("should format kilobytes and megabytes", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(5242880)).toBe("5 MB");
    });
  });

  describe("formatDate", () => {
    it("should format ISO string to readable timestamp", () => {
      const formatted = formatDate("2026-09-19T10:30:00.000Z");
      expect(formatted).toBe("2026-09-19 10:30:00");
    });

    it("should return dash for invalid or null dates", () => {
      expect(formatDate(null)).toBe("-");
      expect(formatDate("invalid-date")).toBe("-");
    });
  });

  describe("buildTransformQuery", () => {
    it("should construct query for width and height", () => {
      expect(buildTransformQuery({ width: 800, height: 600 })).toBe("w-800,h-600");
    });

    it("should include quality and format", () => {
      expect(
        buildTransformQuery({ width: 400, quality: 80, format: "WEBP" })
      ).toBe("w-400,q-80,f-webp");
    });

    it("should prioritize custom tr string", () => {
      expect(buildTransformQuery({ tr: "w-500,bl-5" })).toBe("w-500,bl-5");
    });

    it("should return empty string if no options provided", () => {
      expect(buildTransformQuery({})).toBe("");
    });
  });

  describe("applyTransformToUrl", () => {
    it("should append tr query parameter to ImageKit URL", () => {
      const url = "https://ik.imagekit.io/myid/sample.png";
      const transformed = applyTransformToUrl(url, { width: 500, quality: 90 });
      expect(transformed).toBe("https://ik.imagekit.io/myid/sample.png?tr=w-500%2Cq-90");
    });

    it("should return original URL if no transform options provided", () => {
      const url = "https://ik.imagekit.io/myid/sample.png";
      expect(applyTransformToUrl(url, {})).toBe(url);
    });
  });
});

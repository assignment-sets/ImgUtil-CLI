import { describe, it, expect } from "vitest";
import path from "path";
import os from "os";
import fs from "fs";
import { expandHome, resolveDownloadPath } from "../src/utils/paths.js";

describe("paths utility", () => {
  describe("expandHome", () => {
    it("should expand ~ to home directory", () => {
      expect(expandHome("~")).toBe(os.homedir());
    });

    it("should expand ~/Downloads to user Downloads path", () => {
      expect(expandHome("~/Downloads")).toBe(path.join(os.homedir(), "Downloads"));
    });

    it("should return relative and absolute paths unchanged", () => {
      expect(expandHome("./images")).toBe("./images");
      expect(expandHome("/tmp/test")).toBe("/tmp/test");
    });
  });

  describe("resolveDownloadPath", () => {
    it("should append filename when path ends in slash", () => {
      const result = resolveDownloadPath("~/Downloads/", "photo.jpg");
      expect(result).toBe(path.join(os.homedir(), "Downloads", "photo.jpg"));
    });

    it("should handle default relative path", () => {
      const result = resolveDownloadPath("", "default.png");
      expect(result).toBe(path.resolve("./default.png"));
    });

    it("should preserve specific target filename", () => {
      const result = resolveDownloadPath("/tmp/my-custom-name.png", "default.png");
      expect(result).toBe("/tmp/my-custom-name.png");
    });
  });
});

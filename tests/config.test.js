import { describe, it, expect, beforeEach } from "vitest";
import { getConfig, setConfig, resetConfig } from "../src/services/config.js";

describe("config service", () => {
  beforeEach(() => {
    resetConfig();
  });

  it("should return default config when freshly initialized", () => {
    const config = getConfig();
    expect(config.defaultFolder).toBe("/");
    expect(config.autoCopy).toBe(true);
    expect(Array.isArray(config.defaultTags)).toBe(true);
  });

  it("should update config values and persist them", () => {
    setConfig({ defaultFolder: "/blog-images", autoCopy: false });
    const updated = getConfig();
    expect(updated.defaultFolder).toBe("/blog-images");
    expect(updated.autoCopy).toBe(false);
  });
});

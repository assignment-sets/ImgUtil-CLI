import { describe, it, expect, beforeEach } from "vitest";
import { getConfig, setConfig, resetConfig } from "../src/services/config.js";

describe("config service", () => {
  beforeEach(() => {
    resetConfig();
  });

  it("should return default config when freshly initialized", () => {
    const config = getConfig();
    expect(config.autoCopy).toBe(true);
    expect(config.autoOpen).toBe(false);
    expect(Array.isArray(config.defaultTags)).toBe(true);
  });

  it("should update config values and persist them", () => {
    setConfig({ autoCopy: false, autoOpen: true });
    const updated = getConfig();
    expect(updated.autoCopy).toBe(false);
    expect(updated.autoOpen).toBe(true);
  });
});

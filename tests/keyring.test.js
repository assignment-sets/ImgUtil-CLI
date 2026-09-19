import { describe, it, expect, beforeEach } from "vitest";
import {
  isKeyringAvailable,
  getCredentials,
  saveCredentials,
  clearCredentials,
  hasCredentials,
} from "../src/services/keyring.js";

describe("keyring service", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.IMAGEKIT_PUBLIC_KEY;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_URL_ENDPOINT;
    delete process.env.IMGUTIL_PUBLIC_KEY;
    delete process.env.IMGUTIL_PRIVATE_KEY;
    delete process.env.IMGUTIL_URL_ENDPOINT;
  });

  it("should check if secret-tool is available", () => {
    const available = isKeyringAvailable();
    expect(typeof available).toBe("boolean");
  });

  if (isKeyringAvailable()) {
    it("should store, retrieve, and clear credentials in GNOME Keyring", () => {
      saveCredentials({
        publicKey: "test_public_123",
        privateKey: "test_private_456",
        urlEndpoint: "https://ik.imagekit.io/test_account/",
      });

      const creds = getCredentials();
      expect(creds.source).toBe("keyring");
      expect(creds.publicKey).toBe("test_public_123");
      expect(creds.privateKey).toBe("test_private_456");
      expect(creds.urlEndpoint).toBe("https://ik.imagekit.io/test_account/");
      expect(hasCredentials()).toBe(true);

      clearCredentials();
      const clearedCreds = getCredentials();
      expect(clearedCreds.source).toBe("none");
      expect(hasCredentials()).toBe(false);
    });
  }

  it("should fallback to environment variables if keyring is empty", () => {
    clearCredentials();
    process.env.IMAGEKIT_PUBLIC_KEY = "env_pub_key";
    process.env.IMAGEKIT_PRIVATE_KEY = "env_priv_key";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/env_url/";

    const creds = getCredentials();
    expect(creds.source).toBe("env");
    expect(creds.publicKey).toBe("env_pub_key");
    expect(creds.privateKey).toBe("env_priv_key");
    expect(creds.urlEndpoint).toBe("https://ik.imagekit.io/env_url/");
  });
});

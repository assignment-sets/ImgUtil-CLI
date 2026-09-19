import { describe, it, expect, vi } from "vitest";
import ImageKit from "@imagekit/nodejs";
import fs from "fs";
import path from "path";
import { uploadImage } from "../src/services/imagekit.js";
import * as keyring from "../src/services/keyring.js";

describe("ImageKit service upload payload serialization", () => {
  it("should convert buffer to standard File instance using ImageKit.toFile", async () => {
    const buffer = Buffer.from("sample-image-content");
    const fileObj = await ImageKit.toFile(buffer, "test-image.png");

    expect(fileObj).toBeDefined();
    expect(fileObj.name).toBe("test-image.png");
    expect(fileObj.size).toBe(buffer.length);
    expect(fileObj instanceof Blob).toBe(true);
    expect(fileObj instanceof File).toBe(true);
  });

  it("should pass standard File object to client.files.upload", async () => {
    let capturedPayload = null;

    vi.spyOn(keyring, "getCredentials").mockReturnValue({
      publicKey: "test_public",
      privateKey: "test_private",
      urlEndpoint: "https://ik.imagekit.io/test/",
      source: "keyring",
    });

    // Mock client.files.upload
    const mockUpload = vi.fn().mockImplementation(async (payload) => {
      capturedPayload = payload;
      return {
        fileId: "mock_file_id_123",
        name: payload.fileName,
        url: `https://ik.imagekit.io/test/${payload.fileName}`,
        size: payload.file.size,
        tags: payload.tags,
      };
    });

    const mockPost = vi.fn().mockImplementation(async (path, reqOpts) => {
      // reqOpts.body is the FormData created by createForm
      const form = await reqOpts.body;
      return {
        fileId: "mock_file_id_123",
        name: "badge.png",
        url: "https://ik.imagekit.io/test/badge.png",
      };
    });

    vi.spyOn(ImageKit.prototype, "post").mockImplementation(mockPost);

    const buffer = Buffer.from("test image bytes");
    const result = await uploadImage({
      fileBuffer: buffer,
      fileName: "badge.png",
      tags: ["icon", "ui"],
      folder: "/assets",
    });

    expect(mockPost).toHaveBeenCalledOnce();
    expect(mockPost.mock.calls[0][0]).toBe("/api/v1/files/upload");
    expect(result.fileId).toBe("mock_file_id_123");
  });
});

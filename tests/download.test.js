import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { downloadFile } from "../src/utils/download.js";

describe("downloadFile security and robustness", () => {
  let server;
  let serverPort;
  let baseUrl;
  const tempFiles = [];

  const getTempFilePath = (name = "test_download.tmp") => {
    const tmp = path.join(os.tmpdir(), `imgutil_test_${Date.now()}_${name}`);
    tempFiles.push(tmp);
    return tmp;
  };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${serverPort}`);

      if (url.pathname === "/success") {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("image-data-success-content");
      } else if (url.pathname === "/redirect-1") {
        res.writeHead(302, { Location: `http://localhost:${serverPort}/redirect-2` });
        res.end();
      } else if (url.pathname === "/redirect-2") {
        res.writeHead(302, { Location: `http://localhost:${serverPort}/redirect-3` });
        res.end();
      } else if (url.pathname === "/redirect-3") {
        res.writeHead(302, { Location: `http://localhost:${serverPort}/success` });
        res.end();
      } else if (url.pathname === "/redirect-infinite") {
        res.writeHead(302, { Location: `http://localhost:${serverPort}/redirect-infinite` });
        res.end();
      } else if (url.pathname === "/redirect-loop-a") {
        res.writeHead(302, { Location: `http://localhost:${serverPort}/redirect-loop-b` });
        res.end();
      } else if (url.pathname === "/redirect-loop-b") {
        res.writeHead(302, { Location: `http://localhost:${serverPort}/redirect-loop-a` });
        res.end();
      } else if (url.pathname === "/huge-header") {
        // Declares a huge content length
        res.writeHead(200, {
          "Content-Length": "200000000", // ~200MB
          "Content-Type": "application/octet-stream",
        });
        res.end("data");
      } else if (url.pathname === "/infinite-stream") {
        res.writeHead(200, { "Content-Type": "application/octet-stream" });
        // Stream chunks continuously
        const interval = setInterval(() => {
          if (res.writableEnded || res.destroyed) {
            clearInterval(interval);
            return;
          }
          res.write(Buffer.alloc(1024, "a"));
        }, 10);
      } else if (url.pathname === "/hang") {
        // Never ends response (simulates stalled server)
        res.writeHead(200, { "Content-Type": "text/plain" });
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        serverPort = server.address().port;
        baseUrl = `http://127.0.0.1:${serverPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    for (const f of tempFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
  });

  it("should successfully download a valid file", async () => {
    const dest = getTempFilePath("valid.txt");
    await downloadFile(`${baseUrl}/success`, dest);

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf-8")).toBe("image-data-success-content");
  });

  it("should follow safe redirects within the max limit", async () => {
    const dest = getTempFilePath("redirect.txt");
    await downloadFile(`${baseUrl}/redirect-1`, dest, { maxRedirects: 5 });

    expect(fs.existsSync(dest)).toBe(true);
    expect(fs.readFileSync(dest, "utf-8")).toBe("image-data-success-content");
  });

  it("should reject and abort on self-referencing redirect loops", async () => {
    const dest = getTempFilePath("loop.txt");
    await expect(
      downloadFile(`${baseUrl}/redirect-infinite`, dest, { maxRedirects: 5 })
    ).rejects.toThrow(/redirect loop/i);

    expect(fs.existsSync(dest)).toBe(false);
  });

  it("should reject and abort on multi-hop circular redirect loops", async () => {
    const dest = getTempFilePath("loop_ab.txt");
    await expect(
      downloadFile(`${baseUrl}/redirect-loop-a`, dest, { maxRedirects: 5 })
    ).rejects.toThrow(/redirect loop/i);

    expect(fs.existsSync(dest)).toBe(false);
  });

  it("should reject files exceeding Content-Length quota and clean up partial file", async () => {
    const dest = getTempFilePath("huge_header.bin");
    await expect(
      downloadFile(`${baseUrl}/huge-header`, dest, { maxBytes: 1024 })
    ).rejects.toThrow(/exceeds maximum limit/i);

    expect(fs.existsSync(dest)).toBe(false);
  });

  it("should abort infinite streams exceeding maxBytes quota and unlink partial file", async () => {
    const dest = getTempFilePath("stream_overflow.bin");
    await expect(
      downloadFile(`${baseUrl}/infinite-stream`, dest, { maxBytes: 2048 })
    ).rejects.toThrow(/exceeded maximum file size limit/i);

    // Partial file must be unlinked
    expect(fs.existsSync(dest)).toBe(false);
  });

  it("should abort request when timeout is reached and unlink partial file", async () => {
    const dest = getTempFilePath("timeout.bin");
    await expect(
      downloadFile(`${baseUrl}/hang`, dest, { timeoutMs: 200 })
    ).rejects.toThrow(/timed out/i);

    expect(fs.existsSync(dest)).toBe(false);
  });

  it("should reject unsupported protocols", async () => {
    const dest = getTempFilePath("proto.bin");
    await expect(
      downloadFile("ftp://example.com/test.png", dest)
    ).rejects.toThrow(/unsupported protocol/i);

    expect(fs.existsSync(dest)).toBe(false);
  });
});

import fs from "fs";
import https from "https";
import http from "http";

const DEFAULT_MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Downloads a file from a URL to a local destination path with security bounds:
 * - Maximum redirect limits and cycle detection
 * - Request timeouts and partial file cleanup
 * - Maximum download size quotas (via Content-Length & live byte stream counting)
 * 
 * @param {string} url 
 * @param {string} destPath 
 * @param {Object} [options]
 * @param {number} [options.maxRedirects=5]
 * @param {number} [options.timeoutMs=30000]
 * @param {number} [options.maxBytes=104857600]
 * @param {number} [options.redirectCount=0]
 * @param {Set<string>} [options.visitedUrls]
 * @returns {Promise<void>}
 */
export function downloadFile(url, destPath, options = {}) {
  const {
    maxRedirects = DEFAULT_MAX_REDIRECTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    redirectCount = 0,
    visitedUrls = new Set(),
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Guard against unbounded redirects
    if (redirectCount > maxRedirects) {
      return reject(
        new Error(`Exceeded maximum redirect limit of ${maxRedirects}`)
      );
    }

    // 2. Guard against redirect loops
    if (visitedUrls.has(url)) {
      return reject(new Error(`Detected redirect loop for URL: ${url}`));
    }
    visitedUrls.add(url);

    // 3. Validate protocol
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return reject(new Error(`Invalid URL: ${url}`));
    }

    let protocol;
    if (parsedUrl.protocol === "https:") {
      protocol = https;
    } else if (parsedUrl.protocol === "http:") {
      protocol = http;
    } else {
      return reject(
        new Error(`Unsupported protocol '${parsedUrl.protocol}' in URL: ${url}`)
      );
    }

    let fileStream;
    let request;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (fileStream) {
        try {
          fileStream.destroy();
        } catch {}
      }
      try {
        if (fs.existsSync(destPath)) {
          fs.unlinkSync(destPath);
        }
      } catch {}
    };

    try {
      fileStream = fs.createWriteStream(destPath);
    } catch (err) {
      return reject(err);
    }

    fileStream.on("error", (err) => {
      cleanup();
      reject(err);
    });

    let downloadedBytes = 0;

    request = protocol.get(url, { timeout: timeoutMs }, (response) => {
      // 4. Handle HTTP redirects (301, 302, 303, 307, 308)
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        if (fileStream) {
          try {
            fileStream.destroy();
          } catch {}
        }
        try {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        } catch {}

        const nextUrl = new URL(response.headers.location, url).toString();
        return downloadFile(nextUrl, destPath, {
          maxRedirects,
          timeoutMs,
          maxBytes,
          redirectCount: redirectCount + 1,
          visitedUrls,
        })
          .then(resolve)
          .catch(reject);
      }

      // 5. Check response status code
      if (response.statusCode !== 200) {
        cleanup();
        return reject(
          new Error(`Failed to download (HTTP ${response.statusCode})`)
        );
      }

      // 6. Pre-check Content-Length header if present
      const contentLengthHeader = response.headers["content-length"];
      if (contentLengthHeader) {
        const declaredLength = parseInt(contentLengthHeader, 10);
        if (!isNaN(declaredLength) && declaredLength > maxBytes) {
          cleanup();
          request.destroy();
          return reject(
            new Error(
              `File size (${declaredLength} bytes) exceeds maximum limit of ${maxBytes} bytes`
            )
          );
        }
      }

      // 7. Track stream chunks to enforce maxBytes cap
      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        if (downloadedBytes > maxBytes) {
          cleanup();
          request.destroy();
          response.destroy();
          reject(
            new Error(
              `Download exceeded maximum file size limit of ${maxBytes} bytes`
            )
          );
        }
      });

      response.on("error", (err) => {
        cleanup();
        reject(err);
      });

      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });

      response.pipe(fileStream);
    });

    // 8. Request timeout handling
    request.on("timeout", () => {
      request.destroy();
      cleanup();
      reject(new Error(`Download request timed out after ${timeoutMs}ms`));
    });

    request.on("error", (err) => {
      cleanup();
      reject(err);
    });
  });
}

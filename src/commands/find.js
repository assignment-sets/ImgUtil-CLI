import fs from "fs";
import https from "https";
import http from "http";
import open from "open";
import pc from "picocolors";
import { search, select, input, confirm } from "@inquirer/prompts";
import { listAssets, searchAssets, deleteAsset } from "../services/imagekit.js";
import { copyToClipboard } from "../services/clipboard.js";
import { ensureAuthenticated } from "./auth.js";
import { formatBytes, formatDate, applyTransformToUrl } from "../utils/formatters.js";
import { resolveDownloadPath } from "../utils/paths.js";
import {
  createSpinner,
  printSuccess,
  printError,
  printInfo,
  printSummary,
} from "../utils/ui.js";

/**
 * Downloads a file from a URL to a local destination path.
 * @param {string} url 
 * @param {string} destPath 
 * @returns {Promise<void>}
 */
export function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    let fileStream;
    try {
      fileStream = fs.createWriteStream(destPath);
    } catch (err) {
      return reject(err);
    }

    fileStream.on("error", (err) => {
      try {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      } catch {}
      reject(err);
    });

    const protocol = url.startsWith("https") ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        fileStream.close();
        return downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        fileStream.close();
        try {
          if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        } catch {}
        return reject(new Error(`Failed to download (HTTP ${response.statusCode})`));
      }

      response.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        resolve();
      });
    });

    request.on("error", (err) => {
      fileStream.close();
      try {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      } catch {}
      reject(err);
    });
  });
}

/**
 * Handles 'img find [query]' command.
 * @param {string} [initialQuery] 
 * @param {Object} [options] 
 */
export async function handleFind(initialQuery = "", options = {}) {
  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    printError("Authentication required.");
    process.exit(1);
  }

  const limit = options.all ? 1000 : options.limit ? parseInt(options.limit, 10) : 100;
  const hasQuery = Boolean((initialQuery && initialQuery.trim()) || options.tag);

  const spinnerText = hasQuery
    ? `Searching ImageKit cloud for '${[initialQuery, options.tag ? `#${options.tag}` : null].filter(Boolean).join(" ")}'...`
    : "Fetching recent image assets from ImageKit...";

  const spinner = createSpinner(spinnerText).start();
  let files = [];

  try {
    if (hasQuery) {
      // Execute cloud-side search across entire account
      files = await searchAssets({
        query: initialQuery,
        tags: options.tag,
        limit,
      });
    } else {
      // Load recent 100 images for instant in-memory browsing
      files = await listAssets({ limit });
    }
    spinner.stop();
  } catch (err) {
    spinner.fail(pc.red(`Failed to fetch assets: ${err.message}`));
    process.exit(1);
  }

  if (!files.length) {
    if (hasQuery) {
      printInfo(
        `No images matching '${initialQuery || options.tag}' found in your ImageKit account.`
      );
    } else {
      printInfo("No images found in your ImageKit account.");
    }
    return;
  }

  try {
    const promptMessage = hasQuery
      ? `Found ${files.length} matching cloud image(s). Type to refine:`
      : `Type to search across ${files.length} recent images (use arrow keys to browse):`;

    const selectedFile = await search({
      message: promptMessage,
      pageSize: 10,
      source: async (term) => {
        const query = (term || "").toLowerCase().trim();
        const filtered = query
          ? files.filter((f) => {
              const inName = (f.name || "").toLowerCase().includes(query);
              const inTags = (f.tags || []).some((t) => (t || "").toLowerCase().includes(query));
              const inPath = (f.filePath || "").toLowerCase().includes(query);
              return inName || inTags || inPath;
            })
          : files;

        return filtered.map((f) => {
          const tagsStr = (f.tags || []).map((t) => pc.dim(`#${t}`)).join(" ");
          const sizeStr = pc.dim(`(${formatBytes(f.size)})`);
          return {
            name: `${pc.bold(f.name)} ${tagsStr} ${sizeStr}`,
            value: f,
          };
        });
      },
    });

    if (!selectedFile) return;

    // Action menu for selected image
    const action = await select({
      message: `Selected: ${pc.bold(selectedFile.name)}`,
      pageSize: 8,
      choices: [
        { name: "📋 Copy Raw CDN URL", value: "copy-raw" },
        { name: "🎨 Copy Transformed CDN URL (resize/format)", value: "copy-tr" },
        { name: "💾 Download locally", value: "download" },
        { name: "🌐 Open in Browser", value: "open" },
        { name: "ℹ️ View Details & Metadata", value: "details" },
        { name: "🗑️ Delete Image", value: "delete" },
      ],
    });

    switch (action) {
      case "copy-raw": {
        await copyToClipboard(selectedFile.url);
        printSuccess(`Copied to clipboard: ${pc.cyan(selectedFile.url)}`);
        break;
      }

      case "copy-tr": {
        const width = await input({
          message: "Width in pixels (or leave empty):",
          default: "",
        });
        const height = await input({
          message: "Height in pixels (or leave empty):",
          default: "",
        });
        const quality = await input({
          message: "Quality (1-100, or leave empty):",
          default: "80",
        });
        const format = await input({
          message: "Format (webp, png, jpg, avif, or leave empty):",
          default: "",
        });

        const transformedUrl = applyTransformToUrl(selectedFile.url, {
          width: width.trim() || undefined,
          height: height.trim() || undefined,
          quality: quality.trim() || undefined,
          format: format.trim() || undefined,
        });

        await copyToClipboard(transformedUrl);
        printSuccess(`Transformed URL copied to clipboard: ${pc.cyan(transformedUrl)}`);
        break;
      }

      case "download": {
        const defaultName = selectedFile.name || `download_${Date.now()}.png`;
        const destInput = await input({
          message: "Download destination path (supports ~ and folders):",
          default: `./${defaultName}`,
        });

        const targetPath = resolveDownloadPath(destInput, defaultName);
        const dlSpinner = createSpinner(`Downloading to ${targetPath}...`).start();
        try {
          await downloadFile(selectedFile.url, targetPath);
          dlSpinner.succeed(pc.green(`Downloaded to ${pc.bold(targetPath)}`));
        } catch (err) {
          dlSpinner.fail(pc.red(`Download failed: ${err.message}`));
        }
        break;
      }

      case "open": {
        await open(selectedFile.url);
        printSuccess(`Opened in browser: ${pc.cyan(selectedFile.url)}`);
        break;
      }

      case "details": {
        printSummary("Image Details", [
          ["Name", selectedFile.name],
          ["File ID", selectedFile.fileId],
          ["Path", selectedFile.filePath || "/"],
          ["Size", formatBytes(selectedFile.size)],
          ["Dimensions", selectedFile.width && selectedFile.height ? `${selectedFile.width}x${selectedFile.height}` : "-"],
          ["Tags", (selectedFile.tags || []).map((t) => `#${t}`).join(" ") || "-"],
          ["Created At", formatDate(selectedFile.createdAt)],
          ["CDN URL", pc.cyan(selectedFile.url)],
        ]);
        break;
      }

      case "delete": {
        const confirmDelete = await confirm({
          message: `Are you sure you want to permanently delete '${selectedFile.name}' from cloud storage?`,
          default: false,
        });

        if (confirmDelete) {
          const delSpinner = createSpinner(`Deleting ${selectedFile.name}...`).start();
          try {
            await deleteAsset(selectedFile.fileId);
            delSpinner.succeed(pc.green(`Deleted ${pc.bold(selectedFile.name)} from ImageKit.`));
          } catch (err) {
            delSpinner.fail(pc.red(`Delete failed: ${err.message}`));
          }
        } else {
          printInfo("Deletion cancelled.");
        }
        break;
      }
    }
  } catch (err) {
    if (err.name === "ExitPromptError") {
      return;
    }
    printError(`An error occurred: ${err.message}`);
  }
}

import fs from "fs";
import path from "path";
import open from "open";
import pc from "picocolors";
import { uploadImage } from "../services/imagekit.js";
import { copyToClipboard } from "../services/clipboard.js";
import { getConfig } from "../services/config.js";
import { ensureAuthenticated } from "./auth.js";
import { formatBytes } from "../utils/formatters.js";
import {
  createSpinner,
  printSuccess,
  printError,
  printSummary,
} from "../utils/ui.js";

/**
 * Handles 'img up <filepath>' command.
 * @param {string} filePath 
 * @param {Object} options 
 */
export async function handleUpload(filePath, options = {}) {
  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    printError("Authentication required to upload images.");
    process.exit(1);
  }

  if (!filePath) {
    printError("Please provide an image file path: img up <file>");
    process.exit(1);
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    printError(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  const fileStats = fs.statSync(resolvedPath);
  if (!fileStats.isFile()) {
    printError(`Path is not a regular file: ${resolvedPath}`);
    process.exit(1);
  }

  const fileName = options.name || path.basename(resolvedPath);
  const config = getConfig();
  const folder = options.folder ? options.folder.trim() : null;

  // Combine user tags with default config tags
  const tags = [
    ...(config.defaultTags || []),
    ...(options.tags || []),
  ].filter(Boolean);

  const spinner = createSpinner(`Uploading ${pc.bold(fileName)} (${formatBytes(fileStats.size)})...`).start();

  try {
    const fileBuffer = fs.readFileSync(resolvedPath);
    const result = await uploadImage({
      fileBuffer,
      fileName,
      tags,
      folder,
    });

    spinner.succeed(pc.green(`Successfully uploaded: ${pc.bold(result.name)}`));

    const cdnUrl = result.url;
    const shouldCopy = options.copy !== false && config.autoCopy !== false;

    if (shouldCopy) {
      const copied = await copyToClipboard(cdnUrl);
      if (copied) {
        printSuccess(pc.cyan("CDN URL copied to clipboard!"));
      }
    }

    printSummary("Uploaded Asset Details", [
      ["File Name", result.name],
      ["File ID", result.fileId],
      ["Size", formatBytes(result.size)],
      ["Dimensions", result.width && result.height ? `${result.width}x${result.height}` : "-"],
      ["Tags", (result.tags || []).map((t) => `#${t}`).join(" ") || "-"],
      ["CDN URL", pc.cyan(result.url)],
    ]);

    if (options.open || config.autoOpen) {
      await open(cdnUrl);
    }
  } catch (err) {
    spinner.fail(pc.red(`Upload failed: ${err.message}`));
    process.exit(1);
  }
}

import fs from "fs";
import path from "path";
import open from "open";
import pc from "picocolors";
import { listAssets, getAssetDetails } from "../services/imagekit.js";
import { copyToClipboard } from "../services/clipboard.js";
import { ensureAuthenticated } from "./auth.js";
import { applyTransformToUrl } from "../utils/formatters.js";
import { resolveDownloadPath } from "../utils/paths.js";
import { downloadFile } from "../utils/download.js";
import {
  createSpinner,
  printSuccess,
  printError,
  printInfo,
} from "../utils/ui.js";

/**
 * Handles 'img get <query-or-url>' command.
 * @param {string} query 
 * @param {Object} options 
 */
export async function handleGet(query, options = {}) {
  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    printError("Authentication required.");
    process.exit(1);
  }

  if (!query) {
    printError("Please provide an image filename, file ID, or URL: img get <name|id|url>");
    process.exit(1);
  }

  let targetUrl = "";
  let baseName = "image.png";

  if (query.startsWith("http://") || query.startsWith("https://")) {
    targetUrl = query;
    try {
      const parsed = new URL(query);
      baseName = path.basename(parsed.pathname) || baseName;
    } catch {
      // Keep default
    }
  } else {
    const spinner = createSpinner(`Looking up '${query}' in ImageKit...`).start();
    try {
      const files = await listAssets({ limit: 100 });
      const matched = files.find(
        (f) => f.name === query || f.fileId === query || f.filePath === query || f.name.includes(query)
      );

      if (!matched) {
        spinner.fail(pc.red(`No image found matching '${query}'`));
        process.exit(1);
      }

      spinner.stop();
      targetUrl = matched.url;
      baseName = matched.name || baseName;
    } catch (err) {
      spinner.fail(pc.red(`Lookup failed: ${err.message}`));
      process.exit(1);
    }
  }

  // Apply transformations if requested
  const finalUrl = applyTransformToUrl(targetUrl, {
    width: options.width,
    height: options.height,
    quality: options.quality,
    format: options.format,
    tr: options.tr,
  });

  if (options.copyUrl) {
    await copyToClipboard(finalUrl);
    printSuccess(`URL copied to clipboard: ${pc.cyan(finalUrl)}`);
    return;
  }

  if (options.open) {
    await open(finalUrl);
    printSuccess(`Opened in browser: ${pc.cyan(finalUrl)}`);
    return;
  }

  // Download locally with robust path resolution (supporting ~ and directories)
  const destInput = options.output || `./${baseName}`;
  const resolvedDest = resolveDownloadPath(destInput, baseName);

  const dlSpinner = createSpinner(`Downloading to ${resolvedDest}...`).start();
  try {
    await downloadFile(finalUrl, resolvedDest);
    dlSpinner.succeed(pc.green(`Downloaded image to ${pc.bold(resolvedDest)}`));
    console.log(`Source CDN: ${pc.dim(finalUrl)}`);
  } catch (err) {
    dlSpinner.fail(pc.red(`Download failed: ${err.message}`));
    process.exit(1);
  }
}

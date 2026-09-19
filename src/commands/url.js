import open from "open";
import pc from "picocolors";
import { listAssets } from "../services/imagekit.js";
import { copyToClipboard } from "../services/clipboard.js";
import { ensureAuthenticated } from "./auth.js";
import { applyTransformToUrl } from "../utils/formatters.js";
import {
  createSpinner,
  printSuccess,
  printError,
} from "../utils/ui.js";

/**
 * Handles 'img url <name|url>' command.
 * @param {string} identifier 
 * @param {Object} options 
 */
export async function handleUrl(identifier, options = {}) {
  let targetUrl = identifier;

  if (!identifier.startsWith("http://") && !identifier.startsWith("https://")) {
    const isAuthed = await ensureAuthenticated();
    if (!isAuthed) {
      printError("Authentication required.");
      process.exit(1);
    }

    const spinner = createSpinner(`Resolving '${identifier}'...`).start();
    try {
      const files = await listAssets({ limit: 100 });
      const matched = files.find(
        (f) => f.name === identifier || f.fileId === identifier || f.name.includes(identifier)
      );

      if (!matched) {
        spinner.fail(pc.red(`No image found matching '${identifier}'`));
        process.exit(1);
      }
      spinner.stop();
      targetUrl = matched.url;
    } catch (err) {
      spinner.fail(pc.red(`Resolution failed: ${err.message}`));
      process.exit(1);
    }
  }

  const finalUrl = applyTransformToUrl(targetUrl, {
    width: options.width,
    height: options.height,
    quality: options.quality,
    format: options.format,
    blur: options.blur,
    crop: options.crop,
    tr: options.tr,
  });

  if (options.copy !== false) {
    await copyToClipboard(finalUrl);
    printSuccess(`Transformed URL copied to clipboard:`);
  }

  console.log(pc.bold(pc.cyan(finalUrl)));

  if (options.open) {
    await open(finalUrl);
  }
}

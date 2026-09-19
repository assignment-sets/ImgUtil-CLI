import pc from "picocolors";
import { listAssets } from "../services/imagekit.js";
import { ensureAuthenticated } from "./auth.js";
import { formatBytes, formatDate } from "../utils/formatters.js";
import {
  createSpinner,
  printTable,
  printInfo,
  printError,
} from "../utils/ui.js";

/**
 * Handles 'img ls' / 'img list' command.
 * @param {Object} options 
 */
export async function handleList(options = {}) {
  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    printError("Authentication required.");
    process.exit(1);
  }

  const limit = options.all ? 1000 : options.limit ? parseInt(options.limit, 10) : 20;
  const spinner = createSpinner("Fetching uploaded assets...").start();

  let files = [];
  try {
    files = await listAssets({
      limit,
      tags: options.tag,
    });
    spinner.stop();
  } catch (err) {
    spinner.fail(pc.red(`Failed to fetch assets: ${err.message}`));
    process.exit(1);
  }

  if (options.json) {
    console.log(JSON.stringify(files, null, 2));
    return;
  }

  if (!files.length) {
    printInfo("No images found in your ImageKit account.");
    return;
  }

  console.log();
  console.log(pc.bold(pc.cyan(`Recent Cloud Images (${files.length})`)));
  console.log();

  const headers = ["Name", "Size", "Tags", "Uploaded", "CDN URL"];
  const rows = files.map((f) => {
    const tagsStr = (f.tags || []).map((t) => `#${t}`).join(" ") || "-";
    return [
      f.name || "-",
      formatBytes(f.size),
      tagsStr,
      formatDate(f.createdAt),
      f.url || "-",
    ];
  });

  printTable(headers, rows);

  if (!options.all && files.length >= limit) {
    console.log(
      pc.dim(
        `  Showing ${files.length} most recent uploads. Use ${pc.cyan("img ls -l 50")} or ${pc.cyan("img ls -a")} for more, or ${pc.cyan("img find")} for fuzzy search.`
      )
    );
    console.log();
  }
}

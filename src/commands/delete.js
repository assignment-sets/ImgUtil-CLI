import { confirm } from "@inquirer/prompts";
import pc from "picocolors";
import { deleteAsset } from "../services/imagekit.js";
import { ensureAuthenticated } from "./auth.js";
import {
  createSpinner,
  printSuccess,
  printError,
  printInfo,
} from "../utils/ui.js";

/**
 * Handles 'img del <identifier>' command.
 * @param {string} identifier 
 * @param {Object} options 
 */
export async function handleDelete(identifier, options = {}) {
  const isAuthed = await ensureAuthenticated();
  if (!isAuthed) {
    printError("Authentication required.");
    process.exit(1);
  }

  if (!identifier) {
    printError("Please specify a filename or file ID to delete: img del <fileId|filename>");
    process.exit(1);
  }

  if (!options.yes) {
    const confirmed = await confirm({
      message: `Are you sure you want to permanently delete '${identifier}' from ImageKit?`,
      default: false,
    });

    if (!confirmed) {
      printInfo("Deletion cancelled.");
      return;
    }
  }

  const spinner = createSpinner(`Deleting '${identifier}' from ImageKit...`).start();
  try {
    const result = await deleteAsset(identifier);
    spinner.succeed(pc.green(`Successfully deleted: ${pc.bold(result.name || identifier)}`));
  } catch (err) {
    spinner.fail(pc.red(`Deletion failed: ${err.message}`));
    process.exit(1);
  }
}

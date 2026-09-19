import { Command } from "commander";
import pc from "picocolors";
import { runOnboardingWizard } from "./commands/init.js";
import { handleAuthLogin, handleAuthStatus, handleAuthLogout } from "./commands/auth.js";
import { handleUpload } from "./commands/upload.js";
import { handleFind } from "./commands/find.js";
import { handleGet } from "./commands/get.js";
import { handleList } from "./commands/list.js";
import { handleDelete } from "./commands/delete.js";
import { handleUrl } from "./commands/url.js";
import { hasCredentials } from "./services/keyring.js";

export function createProgram() {
  const program = new Command();

  program
    .name("img")
    .description(
      pc.bold(pc.cyan("img")) +
        " - Lightweight Image Utility CLI with Ubuntu Keyring security, instant CDN upload & fuzzy search"
    )
    .version("1.0.0", "-v, --version", "Output the current version")
    .helpOption("-h, --help", "Display help for command");

  // Onboarding / Init
  program
    .command("init")
    .alias("setup")
    .description("Interactive first-time onboarding wizard to configure ImageKit credentials in Keyring")
    .action(async () => {
      await runOnboardingWizard();
    });

  // Auth commands
  const authCmd = program
    .command("auth")
    .description("Manage ImageKit credentials securely stored in the OS Keyring");

  authCmd
    .command("login")
    .description("Log in and save ImageKit credentials to GNOME Keyring")
    .action(async () => {
      await handleAuthLogin();
    });

  authCmd
    .command("status")
    .description("Check keyring credential status and test ImageKit connection")
    .action(async () => {
      await handleAuthStatus();
    });

  authCmd
    .command("logout")
    .description("Remove stored credentials from OS Keyring")
    .action(async () => {
      await handleAuthLogout();
    });

  // Upload command
  program
    .command("up <filepath>")
    .alias("upload")
    .description("Upload an image file to ImageKit and copy CDN link to clipboard")
    .option("-t, --tags <tags...>", "Tags for categorization and search (e.g. -t banner logo)")
    .option("-n, --name <name>", "Custom filename in cloud storage")
    .option("-f, --folder <folder>", "Target folder path in cloud storage")
    .option("--no-copy", "Do not copy CDN link to clipboard automatically")
    .option("--open", "Open CDN link in browser immediately after upload")
    .action(async (filepath, options) => {
      await handleUpload(filepath, options);
    });

  // Find / Interactive Search command
  program
    .command("find [query]")
    .alias("search")
    .alias("f")
    .description("Interactive terminal fuzzy search to copy URL, download, or delete images")
    .option("-t, --tag <tag>", "Search specifically by tag on ImageKit cloud")
    .option("-l, --limit <number>", "Max items to load (default: 100)", "100")
    .option("-a, --all", "Load all assets from cloud storage")
    .action(async (query, options) => {
      await handleFind(query, options);
    });

  // Get / Download / Transform command
  program
    .command("get <query>")
    .alias("fetch")
    .alias("download")
    .description("Download or transform an image by name, ID, or CDN URL")
    .option("-o, --output <path>", "Destination directory or file path (supports ~ and folders)")
    .option("-w, --width <pixels>", "Resize image width (e.g. -w 800)")
    .option("-h, --height <pixels>", "Resize image height (e.g. -h 600)")
    .option("-q, --quality <number>", "Set image quality (1-100, e.g. -q 80)")
    .option("-f, --format <format>", "Convert format: webp, png, jpg, avif")
    .option("--tr <custom>", "Custom transformation string (e.g. --tr 'w-500,bl-3')")
    .option("--copy-url", "Copy transformed CDN URL to clipboard instead of downloading")
    .option("--open", "Open transformed URL in browser")
    .action(async (query, options) => {
      await handleGet(query, options);
    });

  // List command
  program
    .command("ls")
    .alias("list")
    .description("List recent images from cloud storage in a tabular format")
    .option("-l, --limit <number>", "Number of images to list (default: 20)", "20")
    .option("-a, --all", "List all images")
    .option("-t, --tag <tag>", "Filter listing by tag")
    .option("--json", "Output response as raw JSON")
    .action(async (options) => {
      await handleList(options);
    });

  // Delete command
  program
    .command("del <identifier>")
    .alias("rm")
    .alias("delete")
    .description("Delete an image from cloud storage by file ID or exact filename")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(async (identifier, options) => {
      await handleDelete(identifier, options);
    });

  // URL Transformation helper
  program
    .command("url <name-or-url>")
    .description("Generate and copy a transformed CDN URL")
    .option("-w, --width <pixels>", "Resize width")
    .option("-h, --height <pixels>", "Resize height")
    .option("-q, --quality <number>", "Quality (1-100)")
    .option("-f, --format <format>", "Format (webp, png, jpg, avif)")
    .option("--crop <mode>", "Crop mode")
    .option("--blur <radius>", "Blur radius")
    .option("--tr <custom>", "Custom transformation string")
    .option("--no-copy", "Do not copy URL to clipboard")
    .option("--open", "Open in browser")
    .action(async (identifier, options) => {
      await handleUrl(identifier, options);
    });

  // Custom help formatting
  program.addHelpText(
    "after",
    `
${pc.bold(pc.cyan("Examples:"))}
  ${pc.dim("# First-time setup:")}
  $ ${pc.cyan("img init")}

  ${pc.dim("# Upload image with tags & copy CDN link:")}
  $ ${pc.cyan("img up ./diagram.png -t architecture backend")}

  ${pc.dim("# Interactive fuzzy search (copy URL, download, delete):")}
  $ ${pc.cyan("img find")}

  ${pc.dim("# Resize image to 800px width and download:")}
  $ ${pc.cyan("img get diagram.png -w 800 -o ~/Downloads/")}

  ${pc.dim("# List recent 20 images:")}
  $ ${pc.cyan("img ls")}

  ${pc.dim("# Check keyring authentication status:")}
  $ ${pc.cyan("img auth status")}
`
  );

  return program;
}

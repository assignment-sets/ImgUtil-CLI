import { input, password, confirm } from "@inquirer/prompts";
import pc from "picocolors";
import { saveCredentials, isKeyringAvailable, getCredentials } from "../services/keyring.js";
import { testConnection } from "../services/imagekit.js";
import { setConfig, getConfig } from "../services/config.js";
import {
  printWelcomeBanner,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  createSpinner,
  printSummary,
} from "../utils/ui.js";

/**
 * Runs the interactive onboarding wizard.
 * @param {Object} [options]
 * @param {boolean} [options.reauth]
 */
export async function runOnboardingWizard(options = {}) {
  printWelcomeBanner();

  if (!isKeyringAvailable()) {
    printWarning(
      "Linux secret-tool is not found on your system.\nPlease install it: sudo apt install libsecret-tools"
    );
  }

  const existingCreds = getCredentials();
  if (existingCreds.source === "keyring" && !options.reauth) {
    const shouldOverwrite = await confirm({
      message: "Credentials are already stored in your OS Keyring. Do you want to update them?",
      default: false,
    });
    if (!shouldOverwrite) {
      printInfo("Keeping existing credentials.");
      return;
    }
  }

  console.log(pc.bold(pc.cyan("Step 1: Obtain your ImageKit API Credentials")));
  console.log(
    pc.dim("  1. Log into your ImageKit Dashboard: ") +
      pc.underline(pc.cyan("https://imagekit.io/dashboard/developer/api-keys"))
  );
  console.log(
    pc.dim("  2. Copy your Public Key, URL Endpoint, and Private Key.")
  );
  console.log();

  let valid = false;
  let credentials = null;

  while (!valid) {
    const publicKey = await input({
      message: "Enter ImageKit Public Key:",
      default: existingCreds.publicKey || "",
      validate: (val) => (val.trim() ? true : "Public key cannot be empty."),
    });

    const urlEndpoint = await input({
      message: "Enter ImageKit URL Endpoint (e.g. https://ik.imagekit.io/your_id/):",
      default: existingCreds.urlEndpoint || "",
      validate: (val) => {
        if (!val.trim()) return "URL endpoint cannot be empty.";
        if (!val.startsWith("http://") && !val.startsWith("https://")) {
          return "URL endpoint must start with https:// or http://";
        }
        return true;
      },
    });

    const privateKey = await password({
      message: "Enter ImageKit Private Key (hidden):",
      mask: "*",
      validate: (val) => (val.trim() ? true : "Private key cannot be empty."),
    });

    credentials = {
      publicKey: publicKey.trim(),
      urlEndpoint: urlEndpoint.trim().replace(/\/+$/, "") + "/",
      privateKey: privateKey.trim(),
    };

    const spinner = createSpinner("Verifying credentials against ImageKit API...").start();
    const testResult = await testConnection(credentials);

    if (testResult.success) {
      spinner.succeed(pc.green("Credentials verified successfully!"));
      valid = true;
    } else {
      spinner.fail(pc.red(`Authentication failed: ${testResult.message}`));
      const retry = await confirm({
        message: "Would you like to re-enter your credentials?",
        default: true,
      });
      if (!retry) {
        printError("Onboarding cancelled.");
        return;
      }
    }
  }

  // Save credentials securely to GNOME Keyring
  const saveSpinner = createSpinner("Saving credentials securely into OS Keyring...").start();
  try {
    saveCredentials(credentials);
    saveSpinner.succeed(
      pc.green("Saved credentials to Ubuntu GNOME Keyring (zero plaintext files on disk).")
    );
  } catch (err) {
    saveSpinner.fail(pc.red(`Failed to save to Keyring: ${err.message}`));
    return;
  }

  // Configure non-sensitive preferences
  console.log();
  console.log(pc.bold(pc.cyan("Step 2: General Preferences")));
  const currentConfig = getConfig();

  const autoCopy = await confirm({
    message: "Automatically copy uploaded CDN links to clipboard?",
    default: currentConfig.autoCopy !== false,
  });

  setConfig({
    autoCopy,
  });

  printSuccess("Preferences saved to ~/.config/imgutil/config.json");

  // Onboarding summary
  printSummary("Setup Complete! Ready to use ImgUtil", [
    ["Public Key", credentials.publicKey],
    ["URL Endpoint", credentials.urlEndpoint],
    ["Private Key", "•••••••••••••••• (Encrypted in Keyring)"],
    ["Storage", "Ubuntu Keyring (Secret Service)"],
  ]);

  console.log(pc.bold("Quick Start Commands:"));
  console.log(`  ${pc.cyan("img up ./screenshot.png")}     ${pc.dim("# Upload image and copy CDN link")}`);
  console.log(`  ${pc.cyan("img find")}                   ${pc.dim("# Interactive fuzzy search & download")}`);
  console.log(`  ${pc.cyan("img ls")}                     ${pc.dim("# List recently uploaded images")}`);
  console.log(`  ${pc.cyan("img help")}                   ${pc.dim("# View all available commands")}`);
  console.log();
}

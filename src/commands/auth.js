import { confirm } from "@inquirer/prompts";
import pc from "picocolors";
import {
  getCredentials,
  clearCredentials,
  hasCredentials,
  isKeyringAvailable,
} from "../services/keyring.js";
import { testConnection } from "../services/imagekit.js";
import { runOnboardingWizard } from "./init.js";
import {
  printSuccess,
  printError,
  printInfo,
  printWarning,
  printSummary,
  createSpinner,
} from "../utils/ui.js";

/**
 * Ensures the user has configured credentials, or prompts to run onboarding.
 * @returns {Promise<boolean>}
 */
export async function ensureAuthenticated() {
  if (hasCredentials()) {
    return true;
  }

  printWarning("No ImageKit credentials configured on this system.");
  const shouldSetup = await confirm({
    message: "Would you like to run the onboarding setup wizard now?",
    default: true,
  });

  if (shouldSetup) {
    await runOnboardingWizard();
    return hasCredentials();
  }

  return false;
}

/**
 * Handles 'img auth login' command.
 */
export async function handleAuthLogin() {
  await runOnboardingWizard({ reauth: true });
}

/**
 * Handles 'img auth status' command.
 */
export async function handleAuthStatus() {
  const creds = getCredentials();

  if (!creds.publicKey && !creds.privateKey) {
    printWarning("No credentials found in OS Keyring or environment variables.");
    console.log(`Run ${pc.cyan("img init")} or ${pc.cyan("img auth login")} to authenticate.`);
    return;
  }

  const maskedPrivate = creds.privateKey
    ? `${creds.privateKey.slice(0, 6)}••••••••••••${creds.privateKey.slice(-4)}`
    : "Not configured";

  const spinner = createSpinner("Testing connection with ImageKit API...").start();
  const testRes = await testConnection(creds);

  if (testRes.success) {
    spinner.succeed(pc.green("Connection status: Connected & Authorized"));
  } else {
    spinner.fail(pc.red(`Connection status: Error (${testRes.message})`));
  }

  printSummary("ImgUtil Authentication Status", [
    ["Storage Provider", creds.source === "keyring" ? "Ubuntu GNOME Keyring" : "Environment Variables"],
    ["Keyring Available", isKeyringAvailable() ? "Yes (/usr/bin/secret-tool)" : "No"],
    ["Public Key", creds.publicKey || pc.dim("(not set)")],
    ["URL Endpoint", creds.urlEndpoint || pc.dim("(not set)")],
    ["Private Key", maskedPrivate],
    ["Status", testRes.success ? pc.green("Active") : pc.red("Invalid / Expired")],
  ]);
}

/**
 * Handles 'img auth logout' command.
 */
export async function handleAuthLogout() {
  if (!hasCredentials()) {
    printInfo("No credentials currently stored.");
    return;
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to remove ImageKit credentials from OS Keyring?",
    default: false,
  });

  if (!shouldLogout) {
    printInfo("Logout cancelled.");
    return;
  }

  clearCredentials();
  printSuccess("Credentials cleared from OS Keyring.");
}

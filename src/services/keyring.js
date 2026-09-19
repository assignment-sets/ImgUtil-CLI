import { execFileSync, spawnSync } from "child_process";

const SERVICE_NAME = "imgutil";
const KEY_PUBLIC = "imagekit_public_key";
const KEY_PRIVATE = "imagekit_private_key";
const KEY_ENDPOINT = "imagekit_url_endpoint";

/**
 * Checks whether secret-tool is available on the current system.
 * @returns {boolean}
 */
export function isKeyringAvailable() {
  try {
    const result = spawnSync("which", ["secret-tool"], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Stores a secret in GNOME Keyring using secret-tool.
 * @param {string} keyName 
 * @param {string} secretValue 
 * @param {string} [label] 
 */
export function setSecret(keyName, secretValue, label = "ImgUtil Secret") {
  if (!isKeyringAvailable()) {
    throw new Error(
      "secret-tool is not available on this system. Please install libsecret-tools: sudo apt install libsecret-tools"
    );
  }

  const result = spawnSync(
    "secret-tool",
    ["store", `--label=${label}`, "service", SERVICE_NAME, "key", keyName],
    {
      input: secretValue,
      encoding: "utf-8",
    }
  );

  if (result.status !== 0) {
    throw new Error(`Failed to store secret '${keyName}' in keyring: ${result.stderr?.trim() || "unknown error"}`);
  }
}

/**
 * Retrieves a secret from GNOME Keyring using secret-tool.
 * @param {string} keyName 
 * @returns {string|null}
 */
export function getSecret(keyName) {
  if (!isKeyringAvailable()) {
    return null;
  }

  try {
    const result = spawnSync(
      "secret-tool",
      ["lookup", "service", SERVICE_NAME, "key", keyName],
      {
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    );

    if (result.status === 0 && result.stdout) {
      const val = result.stdout.trim();
      return val.length > 0 ? val : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clears a secret from GNOME Keyring using secret-tool.
 * @param {string} keyName 
 */
export function deleteSecret(keyName) {
  if (!isKeyringAvailable()) {
    return;
  }

  try {
    spawnSync("secret-tool", ["clear", "service", SERVICE_NAME, "key", keyName], {
      stdio: "ignore",
    });
  } catch {
    // Ignore clear failure
  }
}

/**
 * Retrieves credentials from keyring, with fallback to environment variables.
 * @returns {{ publicKey: string|null, privateKey: string|null, urlEndpoint: string|null, source: 'keyring'|'env'|'none' }}
 */
export function getCredentials() {
  const keyPublic = getSecret(KEY_PUBLIC);
  const keyPrivate = getSecret(KEY_PRIVATE);
  const keyEndpoint = getSecret(KEY_ENDPOINT);

  if (keyPublic && keyPrivate && keyEndpoint) {
    return {
      publicKey: keyPublic,
      privateKey: keyPrivate,
      urlEndpoint: keyEndpoint,
      source: "keyring",
    };
  }

  // Fallback to environment variables (for CI/CD or docker)
  const envPublic = process.env.IMAGEKIT_PUBLIC_KEY || process.env.IMGUTIL_PUBLIC_KEY;
  const envPrivate = process.env.IMAGEKIT_PRIVATE_KEY || process.env.IMGUTIL_PRIVATE_KEY;
  const envEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.IMGUTIL_URL_ENDPOINT;

  if (envPublic && envPrivate && envEndpoint) {
    return {
      publicKey: envPublic.trim(),
      privateKey: envPrivate.trim(),
      urlEndpoint: envEndpoint.trim(),
      source: "env",
    };
  }

  return {
    publicKey: keyPublic || envPublic || null,
    privateKey: keyPrivate || envPrivate || null,
    urlEndpoint: keyEndpoint || envEndpoint || null,
    source: "none",
  };
}

/**
 * Securely stores ImageKit credentials into the Keyring.
 * @param {{ publicKey: string, privateKey: string, urlEndpoint: string }} creds 
 */
export function saveCredentials({ publicKey, privateKey, urlEndpoint }) {
  setSecret(KEY_PUBLIC, publicKey.trim(), "ImgUtil ImageKit Public Key");
  setSecret(KEY_PRIVATE, privateKey.trim(), "ImgUtil ImageKit Private Key");
  setSecret(KEY_ENDPOINT, urlEndpoint.trim(), "ImgUtil ImageKit URL Endpoint");
}

/**
 * Removes all ImgUtil credentials from Keyring.
 */
export function clearCredentials() {
  deleteSecret(KEY_PUBLIC);
  deleteSecret(KEY_PRIVATE);
  deleteSecret(KEY_ENDPOINT);
}

/**
 * Checks whether full credentials are configured.
 * @returns {boolean}
 */
export function hasCredentials() {
  const creds = getCredentials();
  return Boolean(creds.publicKey && creds.privateKey && creds.urlEndpoint);
}

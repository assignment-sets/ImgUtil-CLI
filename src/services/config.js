import fs from "fs";
import path from "path";
import os from "os";

const CONFIG_DIR = path.join(os.homedir(), ".config", "imgutil");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG = {
  defaultFolder: "/",
  defaultTags: [],
  autoCopy: true,
  autoOpen: false,
};

/**
 * Ensures the config directory exists.
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Reads user preferences from ~/.config/imgutil/config.json.
 * @returns {typeof DEFAULT_CONFIG}
 */
export function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(content);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // If corrupted or unreadable, return default
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * Saves updated preferences to ~/.config/imgutil/config.json.
 * @param {Partial<typeof DEFAULT_CONFIG>} updates 
 */
export function setConfig(updates) {
  ensureConfigDir();
  const current = getConfig();
  const next = { ...current, ...updates };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), {
    mode: 0o600,
  });
  return next;
}

/**
 * Sets a specific config key.
 * @param {keyof typeof DEFAULT_CONFIG} key 
 * @param {any} value 
 */
export function setConfigKey(key, value) {
  return setConfig({ [key]: value });
}

/**
 * Resets config to default.
 */
export function resetConfig() {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), {
    mode: 0o600,
  });
  return DEFAULT_CONFIG;
}

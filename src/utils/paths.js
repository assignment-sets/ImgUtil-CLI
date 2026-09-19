import fs from "fs";
import path from "path";
import os from "os";

/**
 * Expands tilde (~) prefix to the user's home directory.
 * @param {string} filePath 
 * @returns {string}
 */
export function expandHome(filePath) {
  if (!filePath || typeof filePath !== "string") return filePath;
  const trimmed = filePath.trim();
  if (trimmed === "~") {
    return os.homedir();
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return path.join(os.homedir(), trimmed.slice(2));
  }
  return trimmed;
}

/**
 * Resolves and validates a download destination path.
 * - Expands ~ to user home directory
 * - Detects directories and appends defaultFileName
 * - Recursively creates parent directories if needed
 * 
 * @param {string} inputPath 
 * @param {string} defaultFileName 
 * @returns {string} Fully resolved destination file path
 */
export function resolveDownloadPath(inputPath, defaultFileName = "image.png") {
  const safeDefaultName = path.basename(defaultFileName || "image.png");
  const rawPath = (inputPath && inputPath.trim()) ? inputPath.trim() : `./${safeDefaultName}`;
  const expanded = expandHome(rawPath);
  const resolved = path.resolve(expanded);

  let targetFilePath = resolved;

  // If path ends in slash, it is explicitly intended as a directory
  const endsWithSlash = rawPath.endsWith("/") || rawPath.endsWith("\\");

  if (endsWithSlash) {
    targetFilePath = path.join(resolved, safeDefaultName);
  } else if (fs.existsSync(resolved)) {
    try {
      const stats = fs.statSync(resolved);
      if (stats.isDirectory()) {
        targetFilePath = path.join(resolved, safeDefaultName);
      }
    } catch {
      // If stat fails, treat as file path
    }
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(targetFilePath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  return targetFilePath;
}

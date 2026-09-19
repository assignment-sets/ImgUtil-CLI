import clipboardy from "clipboardy";

/**
 * Copies a string to the system clipboard.
 * @param {string} text 
 * @returns {Promise<boolean>} True if successful, false if clipboard is unavailable.
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await clipboardy.write(text.trim());
    return true;
  } catch (err) {
    // In headless or environments without display server, gracefully return false
    return false;
  }
}

/**
 * Reads the current text from the system clipboard.
 * @returns {Promise<string|null>}
 */
export async function readFromClipboard() {
  try {
    const text = await clipboardy.read();
    return text ? text.trim() : null;
  } catch {
    return null;
  }
}

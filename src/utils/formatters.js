/**
 * Formats byte size into human readable string (KB, MB, GB).
 * @param {number} bytes 
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0 || bytes === undefined || bytes === null) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Formats ISO date string into readable local timestamp.
 * @param {string|Date} dateStr 
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return "-";
  }
}

/**
 * Parses options into ImageKit transformation query format (e.g. "w-800,q-80,f-webp").
 * @param {Object} options 
 * @param {number|string} [options.width]
 * @param {number|string} [options.height]
 * @param {number|string} [options.quality]
 * @param {string} [options.format]
 * @param {number|string} [options.blur]
 * @param {string} [options.crop]
 * @param {string} [options.tr]
 * @returns {string} e.g. "w-800,q-80" or ""
 */
export function buildTransformQuery(options = {}) {
  if (options.tr && typeof options.tr === "string" && options.tr.trim()) {
    return options.tr.trim();
  }

  const parts = [];
  if (options.width) parts.push(`w-${options.width}`);
  if (options.height) parts.push(`h-${options.height}`);
  if (options.quality) parts.push(`q-${options.quality}`);
  if (options.format) parts.push(`f-${options.format.toLowerCase()}`);
  if (options.blur) parts.push(`bl-${options.blur}`);
  if (options.crop) parts.push(`c-${options.crop.toLowerCase()}`);

  return parts.join(",");
}

/**
 * Appends transformation parameters to an ImageKit URL.
 * @param {string} url 
 * @param {Object} options 
 * @returns {string}
 */
export function applyTransformToUrl(url, options = {}) {
  if (!url) return "";
  const transform = buildTransformQuery(options);
  if (!transform) return url;

  try {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.set("tr", transform);
    return parsedUrl.toString();
  } catch {
    // If URL parsing fails, append simply
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}tr=${encodeURIComponent(transform)}`;
  }
}

import pc from "picocolors";
import ora from "ora";

/**
 * Creates and starts a terminal spinner.
 * @param {string} text 
 * @returns {ora.Ora}
 */
export function createSpinner(text) {
  return ora({
    text: pc.cyan(text),
    color: "cyan",
  });
}

/**
 * Prints a stylized welcome banner.
 */
export function printWelcomeBanner() {
  console.log();
  console.log(
    pc.bold(
      pc.cyan("╭──────────────────────────────────────────────────────────╮")
    )
  );
  console.log(
    pc.bold(
      pc.cyan("│ ") +
        pc.yellow("🖼️  ImgUtil CLI") +
        pc.dim(" - Lightweight Image Cloud & Keyring Tool   ") +
        pc.cyan("│")
    )
  );
  console.log(
    pc.bold(
      pc.cyan("╰──────────────────────────────────────────────────────────╯")
    )
  );
  console.log();
}

/**
 * Prints a stylized section header.
 * @param {string} title 
 */
export function printHeader(title) {
  console.log();
  console.log(pc.bold(pc.cyan(`==> ${title}`)));
}

/**
 * Prints a success message.
 * @param {string} message 
 */
export function printSuccess(message) {
  console.log(pc.green(`✔ ${message}`));
}

/**
 * Prints an error message.
 * @param {string} message 
 */
export function printError(message) {
  console.error(pc.red(`✖ ${message}`));
}

/**
 * Prints a warning message.
 * @param {string} message 
 */
export function printWarning(message) {
  console.warn(pc.yellow(`⚠ ${message}`));
}

/**
 * Prints an info message.
 * @param {string} message 
 */
export function printInfo(message) {
  console.log(pc.blue(`ℹ ${message}`));
}

/**
 * Prints a formatted key-value summary box.
 * @param {string} title 
 * @param {Array<[string, string]>} pairs 
 */
export function printSummary(title, pairs) {
  console.log();
  console.log(pc.bold(pc.magenta(`┌─ ${title} `) + pc.magenta("".padEnd(50 - title.length, "─"))));
  for (const [key, value] of pairs) {
    const paddedKey = pc.dim(key.padEnd(16));
    console.log(`${pc.magenta("│")} ${paddedKey} ${pc.bold(value)}`);
  }
  console.log(pc.magenta("└─────────────────────────────────────────────────────"));
  console.log();
}

/**
 * Prints a clean aligned table in the terminal without truncating URLs.
 * @param {Array<string>} headers 
 * @param {Array<Array<string>>} rows 
 */
export function printTable(headers, rows) {
  if (!rows || rows.length === 0) {
    console.log(pc.dim("  (no records to display)"));
    return;
  }

  const isUrlCol = (header) =>
    header.toLowerCase().includes("url") || header.toLowerCase().includes("link");

  // Calculate column widths for non-URL columns
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows) {
      const cell = String(row[i] || "");
      if (!isUrlCol(h)) {
        if (cell.length > max) max = cell.length;
      }
    }
    return isUrlCol(h) ? Math.max(h.length, 25) : Math.min(max, 40);
  });

  // Header row
  const headerLine = headers
    .map((h, i) => {
      if (i === headers.length - 1) {
        return pc.bold(pc.cyan(h));
      }
      return pc.bold(pc.cyan(h.padEnd(colWidths[i])));
    })
    .join("  ");
  console.log(`  ${headerLine}`);

  // Divider
  const dividerLine = headers
    .map((h, i) => {
      const w = isUrlCol(h) ? 35 : colWidths[i];
      return "─".repeat(w);
    })
    .join("  ");
  console.log(`  ${pc.dim(dividerLine)}`);

  // Rows
  for (const row of rows) {
    const rowLine = row
      .map((cell, i) => {
        const str = String(cell || "");
        const header = headers[i] || "";

        // If it's a URL column, print in full width without truncation
        if (isUrlCol(header)) {
          return pc.cyan(str);
        }

        // For last column without being URL
        if (i === headers.length - 1) {
          return str;
        }

        // For normal columns, pad according to column width
        const truncated = str.length > 40 ? str.slice(0, 37) + "..." : str;
        return truncated.padEnd(colWidths[i]);
      })
      .join("  ");
    console.log(`  ${rowLine}`);
  }
  console.log();
}

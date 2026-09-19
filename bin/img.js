#!/usr/bin/env node

import { createProgram } from "../src/index.js";
import pc from "picocolors";

const program = createProgram();

program.parseAsync(process.argv).catch((err) => {
  if (err.name === "ExitPromptError") {
    // User gracefully pressed Ctrl+C
    process.exit(0);
  }
  console.error(pc.red(`\nError: ${err.message}`));
  process.exit(1);
});

import { describe, it, expect } from "vitest";
import { createProgram } from "../src/index.js";

describe("CLI Commander Program", () => {
  it("should define the program name as 'img' and version '1.0.0'", () => {
    const program = createProgram();
    expect(program.name()).toBe("img");
    expect(program.version()).toBe("1.0.0");
  });

  it("should have all required core commands registered", () => {
    const program = createProgram();
    const commandNames = program.commands.map((cmd) => cmd.name());

    expect(commandNames).toContain("init");
    expect(commandNames).toContain("auth");
    expect(commandNames).toContain("up");
    expect(commandNames).toContain("find");
    expect(commandNames).toContain("get");
    expect(commandNames).toContain("ls");
    expect(commandNames).toContain("del");
    expect(commandNames).toContain("url");
  });

  it("should have aliases configured for common commands", () => {
    const program = createProgram();
    const upCmd = program.commands.find((c) => c.name() === "up");
    const findCmd = program.commands.find((c) => c.name() === "find");
    const getCmd = program.commands.find((c) => c.name() === "get");
    const lsCmd = program.commands.find((c) => c.name() === "ls");
    const delCmd = program.commands.find((c) => c.name() === "del");
    const initCmd = program.commands.find((c) => c.name() === "init");

    expect(upCmd.alias()).toBe("upload");
    expect(findCmd.aliases()).toContain("search");
    expect(findCmd.aliases()).toContain("f");
    expect(getCmd.aliases()).toContain("fetch");
    expect(getCmd.aliases()).toContain("download");
    expect(lsCmd.alias()).toBe("list");
    expect(delCmd.aliases()).toContain("rm");
    expect(delCmd.aliases()).toContain("delete");
    expect(initCmd.alias()).toBe("setup");
  });

  it("should have expected options on 'up' command", () => {
    const program = createProgram();
    const upCmd = program.commands.find((c) => c.name() === "up");
    const optionFlags = upCmd.options.map((o) => o.flags);

    expect(optionFlags.some((f) => f.includes("-t"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("-n"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("-f"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("--no-copy"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("--open"))).toBe(true);
  });

  it("should have expected options on 'get' command", () => {
    const program = createProgram();
    const getCmd = program.commands.find((c) => c.name() === "get");
    const optionFlags = getCmd.options.map((o) => o.flags);

    expect(optionFlags.some((f) => f.includes("-w"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("-h"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("-q"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("-f"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("--tr"))).toBe(true);
    expect(optionFlags.some((f) => f.includes("--copy-url"))).toBe(true);
  });

  it("should have -a, --all options on 'ls' and 'find' commands", () => {
    const program = createProgram();
    const lsCmd = program.commands.find((c) => c.name() === "ls");
    const findCmd = program.commands.find((c) => c.name() === "find");

    expect(lsCmd.options.some((o) => o.flags.includes("-a"))).toBe(true);
    expect(findCmd.options.some((o) => o.flags.includes("-a"))).toBe(true);
    expect(findCmd.options.some((o) => o.flags.includes("-t"))).toBe(true);
  });
});

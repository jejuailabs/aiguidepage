import { spawn } from "node:child_process";
import { emulatorEnv as env } from "./emulator-env.mjs";
const mode = process.argv.includes("--build")
  ? "build"
  : process.argv.includes("--start")
    ? "start"
    : "dev";
const args =
  mode === "build"
    ? ["build"]
    : [mode, "--hostname", "127.0.0.1", "--port", "3002"];
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", ...args],
  { stdio: "inherit", env },
);
child.on("exit", (code) => process.exit(code || 0));
process.on("SIGTERM", () => child.kill("SIGTERM"));
process.on("SIGINT", () => child.kill("SIGINT"));

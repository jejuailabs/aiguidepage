import { spawn } from "node:child_process";
const env = {
  ...process.env,
  GCLOUD_PROJECT: "demo-aiguide",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  TEST_BASE_URL: "http://127.0.0.1:3002",
  TEST_PORTAL: "1",
};
const run = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Check failed (${code})`)),
    );
  });
let server;
try {
  await run([
    "--conditions=react-server",
    "--experimental-strip-types",
    "--test",
    "tests/portal.node.mjs",
  ]);
  await run(["scripts/dev-emulator.mjs", "--build"]);
  server = spawn(process.execPath, ["scripts/dev-emulator.mjs", "--start"], {
    env,
    stdio: "inherit",
  });
  const deadline = Date.now() + 300000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${env.TEST_BASE_URL}/api/session`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Test app did not become ready");
  await run([
    "node_modules/@playwright/test/cli.js",
    "test",
    "--timeout=180000",
  ]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (server) {
    if (process.platform === "win32")
      spawn("taskkill", ["/PID", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    else server.kill("SIGTERM");
  }
}

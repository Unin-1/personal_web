import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const manifestPath = require.resolve("astro/package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const binary = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.astro;
if (!binary) throw new Error("已安装的 Astro 没有提供 astro CLI 入口，请重新安装依赖。");
const cli = path.resolve(path.dirname(manifestPath), binary);
const child = spawn(process.execPath, [cli, "dev", "--host", "127.0.0.1", "--port", "4321"], {
  stdio: "inherit",
  env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", ASTRO_DEV_BACKGROUND: "1", LOCAL_LAYOUT_EDITOR: "1" },
});
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));

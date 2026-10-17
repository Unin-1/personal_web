import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const targets = [
  "src/editor", "scripts/editor", "tests", "config", "src/components/home",
  "src/config/layout.json", "src/config/siteRuntimeConfig.ts", "src/utils/layout-config.ts", "src/utils/music-source.mjs",
  "src/data/external-data.ts", "src/utils/wallpaper-runtime.mjs", "src/plugins/rehype-site-base.mjs", "scripts/sync-external-data.mjs", "scripts/verify-build.mjs",
];
const result = spawnSync(process.execPath, [
  require.resolve("@biomejs/biome/bin/biome"), "check",
  "--formatter-enabled=false", "--assist-enabled=false", ...targets,
], { stdio: "inherit" });
process.exit(result.status ?? 1);

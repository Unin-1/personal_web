import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createEditorMiddleware } from "./server.mjs";

/** Author tools exist only during an explicit loopback-only `npm run edit`. */
export default function localLayoutEditor() {
  let enabled = false;
  let rootDirectory;
  let base = "/";
  const load = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
  return {
    name: "unin-local-layout-editor",
    hooks: {
      "astro:config:setup": ({ command, config, updateConfig, injectScript }) => {
        enabled = command === "dev" && process.env.LOCAL_LAYOUT_EDITOR === "1";
        if (!enabled) return;
        rootDirectory = fileURLToPath(config.root);
        // Astro's base middleware runs before integration middleware and would
        // reject /__editor under a GitHub project subpath. Local edit mode uses
        // / explicitly; normal dev, build and preview retain the published base.
        base = "/";
        updateConfig({ base: "/", server: { host: "127.0.0.1", port: 4321 }, vite: { server: { strictPort: true, cors: false, allowedHosts: ["127.0.0.1"] } } });
        injectScript("head-inline", load("./preview.js"));
      },
      "astro:server:setup": ({ server, logger }) => {
        if (!enabled) return;
        if (server.config.server.host !== "127.0.0.1" || server.config.server.port !== 4321) {
          throw new Error("作者编辑器只允许绑定 127.0.0.1:4321，请使用 npm run edit，不能传入 --host。");
        }
        server.middlewares.use(createEditorMiddleware({ rootDirectory, origin: "http://127.0.0.1:4321", base,
          html: load("./index.html"), client: load("./client.js"), preview: load("./preview.js") }));
        logger.info("作者布局编辑器：http://127.0.0.1:4321/__editor/（仅本机，保存后需 Git 推送发布）");
      },
    },
  };
}

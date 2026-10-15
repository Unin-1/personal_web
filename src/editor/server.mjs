import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { lstat, readFile, realpath, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateLayout } from "./schema.mjs";

const MAX_BODY = 65536;
const revision = (text) => createHash("sha256").update(text).digest("hex");
export class EditorError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function createLayoutStore(rootDirectory) {
  const file = path.resolve(rootDirectory, "src/config/layout.json");
  let queue = Promise.resolve();
  async function assertSafePath() {
    const root = await realpath(rootDirectory);
    const resolved = await realpath(file);
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative) || (await lstat(file)).isSymbolicLink()
      || resolved !== path.join(root, "src", "config", "layout.json")) {
      throw new EditorError(403, "配置文件必须位于项目 src/config/layout.json，且不能使用符号链接");
    }
  }
  async function load() {
    await assertSafePath();
    const content = await readFile(file, "utf8");
    return { layout: validateLayout(JSON.parse(content)), revision: revision(content) };
  }
  function save(layout, expectedRevision) {
    const operation = async () => {
      validateLayout(layout);
      const current = await load();
      if (typeof expectedRevision !== "string" || expectedRevision !== current.revision) {
        throw new EditorError(409, "配置已被其他编辑器修改。请先重新载入，再应用你的更改。");
      }
      const content = `${JSON.stringify(layout, null, 2)}\n`;
      const temporary = `${file}.${randomBytes(12).toString("hex")}.tmp`;
      try {
        await writeFile(temporary, content, { flag: "wx", mode: 0o600 });
        await assertSafePath();
        // Detect changes made while validation and the temporary write ran.
        if (revision(await readFile(file, "utf8")) !== expectedRevision) {
          throw new EditorError(409, "配置刚刚发生更改，请重新载入后再保存。");
        }
        await rename(temporary, file);
      } finally {
        await unlink(temporary).catch((error) => { if (error.code !== "ENOENT") console.error("清理布局临时文件失败", error.message); });
      }
      return { layout, revision: revision(content) };
    };
    const result = queue.then(operation, operation);
    queue = result.catch(() => {});
    return result;
  }
  return { load, save };
}

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(JSON.stringify(value));
}
function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        if (!tooLarge) reject(new EditorError(413, "布局配置超过 64 KB 限制"));
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new EditorError(400, "请求必须为有效 JSON")); }
    });
    request.on("error", reject);
  });
}
function tokenMatches(provided, token) {
  if (typeof provided !== "string") return false;
  const value = Buffer.from(provided);
  const expected = Buffer.from(`Bearer ${token}`);
  return value.length === expected.length && timingSafeEqual(value, expected);
}

export function createEditorMiddleware({ rootDirectory, origin, html, client, preview, base = "/", token = randomBytes(32).toString("hex") }) {
  const store = createLayoutStore(rootDirectory);
  const expectedHost = new URL(origin).host;
  return async function editorMiddleware(request, response, next) {
    const requestPath = request.url?.split("?")[0];
    if (!requestPath?.startsWith("/__editor")) return next();
    if (request.headers.host !== expectedHost
      || !["127.0.0.1", "::ffff:127.0.0.1", "::1"].includes(request.socket.remoteAddress)
      || (request.headers.origin && request.headers.origin !== origin)
      || request.headers["sec-fetch-site"] === "cross-site") {
      return json(response, 403, { error: "仅允许本机同源访问作者编辑器" });
    }
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    if (["/__editor", "/__editor/"].includes(requestPath) && request.method === "GET") {
      response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; frame-src 'self'; frame-ancestors 'none'; connect-src 'self'");
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return response.end(html.replaceAll("__EDITOR_TOKEN__", token).replaceAll("__PREVIEW_BASE__", base.replace(/[&<>"']/g, "")));
    }
    if (request.method === "GET" && ["/__editor/client.js", "/__editor/preview.js"].includes(requestPath)) {
      response.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
      return response.end(requestPath.endsWith("client.js") ? client : preview);
    }
    if (requestPath !== "/__editor/api/layout") return json(response, 404, { error: "没有此编辑器路径" });
    if (!tokenMatches(request.headers.authorization, token)) return json(response, 401, { error: "编辑器会话失效，请刷新作者编辑器" });
    if (!["GET", "PUT"].includes(request.method)) return json(response, 405, { error: "仅支持 GET 和 PUT" });
    try {
      if (request.method === "GET") return json(response, 200, await store.load());
      if (request.headers.origin !== origin) throw new EditorError(403, "保存请求必须来自作者编辑器页面");
      if (request.headers["content-type"]?.split(";")[0] !== "application/json") throw new EditorError(415, "保存请求必须使用 application/json");
      const input = await readBody(request);
      if (!input || Object.keys(input).some((key) => !["layout", "revision"].includes(key))) throw new EditorError(400, "保存请求字段无效");
      let result;
      try { result = await store.save(input.layout, input.revision); }
      catch (error) { if (error instanceof EditorError || error.code) throw error; throw new EditorError(400, error.message); }
      return json(response, 200, result);
    } catch (error) {
      if (!error.status || error.status >= 500) console.error("布局编辑器：", error.message);
      return json(response, error.status || 500, { error: error.status ? error.message : "无法保存配置。请检查文件权限及项目中的布局 JSON。" });
    }
  };
}

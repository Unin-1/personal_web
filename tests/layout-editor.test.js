import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { createServer, request } from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { validateLayout } from "../src/editor/schema.mjs";
import { createEditorMiddleware, createLayoutStore } from "../src/editor/server.mjs";
import localLayoutEditor from "../src/editor/integration.mjs";

const original = JSON.parse(await readFile(new URL("../src/config/layout.json", import.meta.url), "utf8"));
const copy = () => structuredClone(original);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "unin-layout-test-"));
  await mkdir(path.join(root, "src/config"), { recursive: true });
  await writeFile(path.join(root, "src/config/layout.json"), JSON.stringify(original));
  t.after(async () => {
    const absolute = path.resolve(root);
    assert(absolute.startsWith(`${path.resolve(os.tmpdir())}${path.sep}`) && path.basename(absolute).startsWith("unin-layout-test-"));
    await rm(absolute, { recursive: true, force: true });
  });
  return root;
}

test("layout schema accepts the site's layout and rejects unsafe or incomplete data", () => {
  assert.deepEqual(validateLayout(copy()), original);
  const chineseImage = copy(); chineseImage.visual.desktopImage = "/assets/images/夏日海边.webp";
  assert.equal(validateLayout(chineseImage).visual.desktopImage, "/assets/images/夏日海边.webp");
  for (const mutate of [
    (layout) => { layout.homeModules[0].id = "__proto__"; },
    (layout) => { layout.homeModules[1] = layout.homeModules[0]; },
    (layout) => { layout.sidebar.left.push(layout.sidebar.right[0]); },
    (layout) => { layout.visual.desktopImage = "javascript:alert(1)"; },
    (layout) => { layout.visual.desktopImage = "/assets/../../.env"; },
    (layout) => { layout.visual.desktopImage = "/assets/%2e%2e/image.png"; },
    (layout) => { layout.visual.desktopImage = "https://name:password@example.com/a.jpg"; },
    (layout) => { layout.visual.hue = Number.NaN; },
    (layout) => { layout.visual.pageWidth = 999; },
    (layout) => { layout.visual.extraCode = "alert(1)"; },
  ]) {
    const value = copy(); mutate(value); assert.throws(() => validateLayout(value));
  }
});

test("saving is atomic, survives a new store, and refuses stale external edits", async (t) => {
  const root = await fixture(t);
  const store = createLayoutStore(root);
  const first = await store.load();
  const updated = copy(); updated.visual.title = "保存后的标题"; updated.homeModules.reverse();
  const saved = await store.save(updated, first.revision);
  assert.notEqual(saved.revision, first.revision);
  assert.deepEqual((await createLayoutStore(root).load()).layout, updated);
  assert.equal((await readdir(path.join(root, "src/config"))).length, 1);
  await assert.rejects(store.save(original, first.revision), { status: 409 });
  const external = copy(); external.visual.title = "外部编辑";
  await writeFile(path.join(root, "src/config/layout.json"), JSON.stringify(external));
  await assert.rejects(store.save(updated, saved.revision), { status: 409 });
  assert.deepEqual((await store.load()).layout, external);
});

test("parallel saves with the same revision do not silently overwrite one another", async (t) => {
  const store = createLayoutStore(await fixture(t));
  const initial = await store.load();
  const a = copy(); a.visual.title = "A";
  const b = copy(); b.visual.title = "B";
  const results = await Promise.allSettled([store.save(a, initial.revision), store.save(b, initial.revision)]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.find((result) => result.status === "rejected").reason.status, 409);
  assert.equal((await store.load()).layout.visual.title, "A");
});

test("local editor API enforces host, origin, session token, schema, and body size", async (t) => {
  const rootDirectory = await fixture(t);
  let middleware;
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end(); }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  middleware = createEditorMiddleware({ rootDirectory, origin, html: '<meta content="__EDITOR_TOKEN__">', client: "", preview: "", token: "test-session" });
  function call({ method = "GET", pathname = "/__editor/api/layout", body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const req = request(`${origin}${pathname}`, { method, headers: { Authorization: "Bearer test-session", ...headers } }, (res) => {
        let output = ""; res.setEncoding("utf8"); res.on("data", (chunk) => { output += chunk; });
        res.on("end", () => resolve({ status: res.statusCode, output, headers: res.headers }));
      });
      req.on("error", reject); if (body) req.write(typeof body === "string" ? body : JSON.stringify(body)); req.end();
    });
  }
  const loaded = await call(); assert.equal(loaded.status, 200);
  const current = JSON.parse(loaded.output);
  const put = { method: "PUT", body: { layout: original, revision: current.revision }, headers: { Origin: origin, "Content-Type": "application/json" } };
  assert.equal((await call({ headers: { Authorization: "Bearer wrong" } })).status, 401);
  assert.equal((await call({ headers: { Host: "evil.example" } })).status, 403);
  assert.equal((await call({ ...put, headers: { ...put.headers, Origin: "https://evil.example" } })).status, 403);
  assert.equal((await call({ ...put, headers: { "Content-Type": "application/json" } })).status, 403);
  assert.equal((await call({ ...put, headers: { ...put.headers, "Sec-Fetch-Site": "cross-site" } })).status, 403);
  assert.equal((await call({ ...put, body: { ...put.body, path: "../../.env" } })).status, 400);
  assert.equal((await call({ ...put, body: "not-json" })).status, 400);
  assert.equal((await call({ ...put, body: "x".repeat(65537) })).status, 413);
  const invalid = copy(); invalid.visual.wallpaperMode = "script";
  assert.equal((await call({ ...put, body: { ...put.body, layout: invalid } })).status, 400);
  assert.equal((await call(put)).status, 200);
  assert.equal((await call(put)).status, 409);
  const page = await call({ pathname: "/__editor/" });
  assert.equal(page.status, 200); assert.match(page.output, /test-session/);
  assert.match(page.headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.equal(page.headers["access-control-allow-origin"], undefined);
  assert.equal((await call({ pathname: "/__editor/api/anything" })).status, 404);
});

test("production and ordinary dev never register editor assets or write endpoints", () => {
  const previous = process.env.LOCAL_LAYOUT_EDITOR;
  try {
    for (const [command, flag] of [["build", "1"], ["preview", "1"], ["dev", "0"]]) {
      process.env.LOCAL_LAYOUT_EDITOR = flag;
      const integration = localLayoutEditor();
      const forbidden = () => { throw new Error(`editor unexpectedly activated during ${command}`); };
      integration.hooks["astro:config:setup"]({ command, config: {}, updateConfig: forbidden, injectScript: forbidden });
      integration.hooks["astro:server:setup"]({ server: { middlewares: { use: forbidden } }, logger: { info: forbidden } });
    }
  } finally {
    if (previous === undefined) delete process.env.LOCAL_LAYOUT_EDITOR; else process.env.LOCAL_LAYOUT_EDITOR = previous;
  }
});

test("explicit editor dev uses a root-only loopback server without changing the production base", () => {
  const previous = process.env.LOCAL_LAYOUT_EDITOR;
  try {
    process.env.LOCAL_LAYOUT_EDITOR = "1";
    const integration = localLayoutEditor();
    let update;
    let injected;
    integration.hooks["astro:config:setup"]({ command: "dev", config: { root: new URL("../", import.meta.url), base: "/personal_web/" },
      updateConfig(value) { update = value; }, injectScript(stage, source) { injected = { stage, source }; } });
    assert.equal(update.base, "/"); assert.equal(update.server.host, "127.0.0.1"); assert.equal(update.vite.server.strictPort, true);
    assert.equal(update.vite.server.cors, false); assert.equal(injected.stage, "head-inline"); assert.match(injected.source, /unin-layout-draft/);
    assert.throws(() => integration.hooks["astro:server:setup"]({ server: { config: { server: { host: "0.0.0.0", port: 4321 } } } }), /127\.0\.0\.1/);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_LAYOUT_EDITOR; else process.env.LOCAL_LAYOUT_EDITOR = previous;
  }
});

test("preview restores hidden home modules, reorders them, and ignores foreign senders", async () => {
  const listeners = new Map();
  const parent = { postMessage() {} };
  const rootStyles = new Map();
  const container = { children: [], append(element) { this.children = this.children.filter((child) => child !== element); this.children.push(element); } };
  const elements = new Map(original.homeModules.map(({ id }) => {
    const classes = new Set(["hidden"]);
    const element = { id, parentElement: container, hidden: true, style: { display: "none" }, classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } } };
    container.children.push(element); return [id, element];
  }));
  const document = { readyState: "complete", documentElement: { style: { setProperty(key, value) { rootStyles.set(key, value); } } },
    querySelector(selector) { const match = /^\[data-home-module="([a-z]+)"\]$/.exec(selector); return match ? elements.get(match[1]) : null; },
    querySelectorAll() { return []; }, addEventListener() {} };
  const window = { parent, innerWidth: 1280, addEventListener(name, callback) { listeners.set(name, callback); } };
  vm.runInNewContext(await readFile(new URL("../src/editor/preview.js", import.meta.url), "utf8"), { window, document, location: { origin: "http://127.0.0.1:4321", search: "?editor-preview=1" }, URLSearchParams });
  const layout = copy(); layout.homeModules.reverse(); layout.homeModules[0].enabled = false;
  const event = { origin: "http://127.0.0.1:4321", source: parent, data: { type: "unin-layout-draft", layout, base: "/personal_web/" } };
  listeners.get("message")({ ...event, origin: "https://evil.example" });
  assert.equal(rootStyles.size, 0);
  listeners.get("message")({ ...event, source: {} });
  assert.equal(rootStyles.size, 0);
  listeners.get("message")(event);
  assert.deepEqual(container.children.map((element) => element.id), layout.homeModules.map((item) => item.id));
  const hidden = elements.get(layout.homeModules[0].id);
  assert.equal(hidden.hidden, true); assert.equal(hidden.style.display, "none");
  layout.homeModules[0].enabled = true; listeners.get("message")(event);
  assert.equal(hidden.hidden, false); assert.equal(hidden.style.display, ""); assert.equal(hidden.classList.contains("hidden"), false);
  assert.equal(rootStyles.get("--hue"), String(layout.visual.hue));
  assert.equal(rootStyles.get("--card-transparent-opacity"), String(layout.visual.cardOpacity));
});

test("sidebar preview moves desktop widgets without stealing mobile copies and can restore disabled widgets", async () => {
  const callbacks = new Map();
  const parent = { postMessage() {} };
  function widget(id, enabled = true) {
    const classes = new Set();
    return { id, dataset: { editorWidget: id, editorPostOnly: id === "sidebarToc" ? "true" : "false" }, hidden: !enabled, style: {},
      classList: { toggle(name, value) { if (value) classes.add(name); else classes.delete(name); } } };
  }
  function container(widgets) {
    const element = { children: widgets, style: {}, hidden: false,
      querySelectorAll() { return this.children; },
      append(child) { if (child.parentElement) child.parentElement.children = child.parentElement.children.filter((entry) => entry !== child); child.parentElement = this; this.children.push(child); } };
    for (const child of widgets) child.parentElement = element;
    return element;
  }
  const profile = widget("profile"); const tags = widget("tags"); const toc = widget("sidebarToc");
  const stats = widget("stats", false); const calendar = widget("calendar", false);
  const left = container([profile, tags, toc]); const right = container([stats, calendar]);
  const mobileStats = widget("stats", false);
  const bottom = container([widget("profile"), widget("tags"), widget("sidebarToc"), mobileStats, widget("calendar", false)]);
  const attributes = new Map(); const geometry = new Map();
  const selectors = new Map([
    ['[data-editor-sidebar="left"]', left], ['[data-editor-sidebar="right"]', right], ['[data-editor-sidebar="bottom"]', bottom],
    ["#main-grid", { setAttribute(key, value) { attributes.set(key, value); } }],
    ["#content-panel-inner", { style: { setProperty(key, value) { geometry.set(key, value); } } }],
  ]);
  const document = { readyState: "complete", documentElement: { style: { setProperty() {} } }, querySelector(selector) { return selectors.get(selector) || null; }, querySelectorAll() { return []; }, addEventListener() {} };
  const window = { parent, innerWidth: 1280, addEventListener(name, callback) { callbacks.set(name, callback); } };
  const location = { origin: "http://127.0.0.1:4321", search: "?editor-preview=1", pathname: "/personal_web/" };
  vm.runInNewContext(await readFile(new URL("../src/editor/preview.js", import.meta.url), "utf8"), { window, document, location, URLSearchParams });
  const layout = copy(); layout.sidebar.position = "both";
  const event = { origin: location.origin, source: parent, data: { type: "unin-layout-draft", layout } };
  callbacks.get("message")(event);
  assert.equal(stats.hidden, true); assert.equal(toc.hidden, true);
  const profileIndex = layout.sidebar.left.findIndex((item) => item.id === "profile");
  layout.sidebar.right.push(...layout.sidebar.left.splice(profileIndex, 1));
  const statsIndex = layout.sidebar.right.findIndex((item) => item.id === "stats");
  layout.sidebar.left.push(...layout.sidebar.right.splice(statsIndex, 1));
  layout.sidebar.left.find((item) => item.id === "stats").enabled = true;
  callbacks.get("message")(event);
  assert.equal(profile.parentElement, right); assert.equal(stats.parentElement, left); assert.equal(stats.hidden, false);
  assert.equal(mobileStats.parentElement, bottom); assert.equal(mobileStats.hidden, false);
  assert.equal(geometry.get("--right-display-xl"), "contents");
  assert.equal(attributes.get("data-sidebar-position"), "both");
  layout.sidebar.left.find((item) => item.id === "stats").enabled = false; callbacks.get("message")(event);
  assert.equal(stats.hidden, true); assert.equal(mobileStats.hidden, true);
  layout.sidebar.left.find((item) => item.id === "stats").enabled = true; callbacks.get("message")(event);
  assert.equal(stats.hidden, false);
  location.pathname = "/personal_web/posts/hello/"; callbacks.get("message")(event); assert.equal(toc.hidden, false);
  layout.sidebar.enabled = false; callbacks.get("message")(event);
  assert.equal(geometry.get("--left-display-xl"), "none"); assert.equal(geometry.get("--right-display-xl"), "none"); assert.equal(bottom.hidden, true);
});

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const base = `${(process.env.SITE_BASE || "/personal_web/").replace(/\/$/, "")}/`;
// Album routes are checked from the links in the generated gallery index below.
const required = ["index.html", "archive/index.html", "tags/index.html", "about/index.html", "friends/index.html", "gallery/index.html", "projects/index.html", "bilibili/index.html", "rss.xml", "pagefind/pagefind.js", "search-index.json"];
const errors = [];
for (const name of required) {
  try { await stat(path.join(root, name)); } catch { errors.push(`Missing required output: ${name}`); }
}
async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { await inspect(filename); continue; }
    if (!entry.name.endsWith(".html")) continue;
    const html = await readFile(filename, "utf8");
    if (/unin-layout-draft|unin-layout-editor|X-Editor-Token|\/__editor\//i.test(html)) {
      errors.push(`Author editor leaked into ${path.relative(root, filename)}`);
    }
    for (const match of html.matchAll(/(?:src|poster|href)="(\/[^"#?]+)(?:[^"]*)"/g)) {
      const resource = match[1];
      if (resource.startsWith("//")) continue;
      if (!resource.startsWith(base)) { errors.push(`Missing base prefix in ${path.relative(root, filename)}: ${resource}`); continue; }
      const relative = decodeURIComponent(resource.slice(base.length));
      const target = path.resolve(root, relative);
      if (target !== root && !target.startsWith(root + path.sep)) { errors.push(`Invalid resource path: ${resource}`); continue; }
      try {
        const info = await stat(target);
        if (info.isDirectory()) await stat(path.join(target, "index.html"));
      } catch {
        // Astro emits its special 404 page as 404.html rather than 404/index.html.
        if (relative.replace(/\/$/, "") !== "404") errors.push(`Missing local resource or page: ${resource}`);
      }
    }
  }
}
await inspect(root);
if (errors.length) {
  console.error([...new Set(errors)].slice(0, 30).join("\n"));
  process.exitCode = 1;
} else console.log(`Build verified: required pages, local assets under ${base}, and author-editor exclusion.`);

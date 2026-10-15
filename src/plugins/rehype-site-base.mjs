/** Keep root-relative Markdown assets and links working on GitHub project Pages. */
export default function rehypeSiteBase({ base = "/" } = {}) {
  const prefix = `/${base.replace(/^\/+|\/+$/g, "")}`;
  return function transform(tree) {
    function walk(node) {
      if (node.type === "element" && node.properties) {
        for (const key of ["src", "href", "poster"]) {
          const value = node.properties[key];
          if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || prefix === "/") continue;
          if (value !== prefix && !value.startsWith(`${prefix}/`)) node.properties[key] = `${prefix}${value}`;
        }
      }
      for (const child of node.children || []) walk(child);
    }
    walk(tree);
  };
}

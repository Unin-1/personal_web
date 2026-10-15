import assert from "node:assert/strict";
import test from "node:test";
import rehypeSiteBase from "../src/plugins/rehype-site-base.mjs";

test("Markdown images, links, and posters retain the project base without doubling it", () => {
  const paths = ["/assets/photo.webp", "/personal_web/about/", "https://example.com/photo.webp", "//example.com/photo.webp", "./photo.webp", "#heading", "mailto:hello@example.com"];
  const tree = { type: "root", children: paths.map((src) => ({ type: "element", properties: { src, href: src, poster: src }, children: [] })) };
  rehypeSiteBase({ base: "/personal_web/" })(tree);
  for (const key of ["src", "href", "poster"]) {
    assert.equal(tree.children[0].properties[key], "/personal_web/assets/photo.webp");
    for (let index = 1; index < paths.length; index += 1) assert.equal(tree.children[index].properties[key], paths[index]);
  }
  rehypeSiteBase({ base: "/personal_web/" })(tree);
  assert.equal(tree.children[0].properties.src, "/personal_web/assets/photo.webp");
});

test("root deployment and local author previews preserve root-relative images", () => {
  const tree = { type: "element", properties: { src: "/assets/photo.webp" } };
  rehypeSiteBase({ base: "/" })(tree);
  assert.equal(tree.properties.src, "/assets/photo.webp");
});

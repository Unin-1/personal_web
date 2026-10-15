// This bridge is injected only by `npm run edit`, never into production output.
(() => {
  if (window.parent === window || !new URLSearchParams(location.search).has("editor-preview")) return;
  let draft;
  let base = "/";
  const imageUrl = (source) => source?.startsWith("assets/") ? `${base}src/${source}` : source?.startsWith("/") ? `${base}${source.slice(1)}` : source;
  function apply() {
    if (!draft) return;
    const { visual, homeModules, sidebar } = draft;
    document.documentElement.style.setProperty("--hue", String(visual.hue));
    document.documentElement.style.setProperty("--page-width", `${visual.pageWidth}rem`);
    document.documentElement.style.setProperty("--card-transparent-opacity", String(visual.cardOpacity));
    document.documentElement.style.setProperty("--overlay-blur", `${visual.blur}px`);
    document.documentElement.style.setProperty("--fullscreen-blur", `${visual.blur}px`);
    for (const item of homeModules) {
      const module = document.querySelector(`[data-home-module="${item.id}"]`);
      if (!module) continue;
      module.hidden = !item.enabled;
      module.style.display = item.enabled ? "" : "none";
      module.classList.toggle("hidden", !item.enabled);
      module.parentElement?.append(module);
    }
    const title = document.querySelector("#banner-title, .banner-title, [data-banner-title]");
    const subtitle = document.querySelector("#banner-subtitle, .banner-subtitle, [data-banner-subtitle]");
    if (title) title.textContent = visual.title;
    if (subtitle) subtitle.textContent = visual.subtitle;
    const background = imageUrl(window.innerWidth < 768 ? visual.mobileImage : visual.desktopImage);
    for (const image of document.querySelectorAll("#wallpaper-wrapper img, #banner img, #banner-wrapper img, #wallpaper-container img")) {
      if (background) { image.removeAttribute("srcset"); image.src = background; }
    }
    for (const dim of document.querySelectorAll(".banner-dim-overlay")) dim.style.background = `rgba(0, 0, 0, ${visual.dimOpacity})`;
    const posts = document.querySelector("#post-list-container");
    if (posts) {
      const grid = visual.postListMode === "grid";
      posts.classList.remove("list-mode", "grid-mode", "post-grid-auto", "flex", "flex-col", "gap-4", "md:gap-4");
      posts.classList.add(...(grid ? ["grid-mode", "post-grid-auto"] : ["list-mode", "flex", "flex-col", "gap-4", "md:gap-4"]));
    }
    const isArticle = /\/(?:posts?|projects)\/[^/]+/.test(location.pathname);
    const containers = Object.fromEntries(["left", "right", "bottom"].map((side) => [side, document.querySelector(`[data-editor-sidebar="${side}"]`)]));
    const desktopWidgets = new Map();
    for (const side of ["left", "right"]) {
      for (const widget of containers[side]?.querySelectorAll("[data-editor-widget]") || []) desktopWidgets.set(widget.dataset.editorWidget, widget);
    }
    function showWidget(widget, item) {
      const visible = item.enabled && (widget.dataset.editorPostOnly !== "true" || isArticle);
      widget.hidden = !visible;
      widget.style.display = visible ? "" : "none";
      widget.classList.toggle("hidden", !visible);
    }
    for (const side of ["left", "right"]) {
      for (const item of sidebar[side]) {
        const widget = desktopWidgets.get(item.id);
        if (widget && containers[side]) { showWidget(widget, item); containers[side].append(widget); }
      }
    }
    const bottom = containers.bottom;
    if (bottom) {
      const mobileWidgets = new Map([...bottom.querySelectorAll("[data-editor-widget]")].map((widget) => [widget.dataset.editorWidget, widget]));
      for (const item of [...sidebar.left, ...sidebar.right]) {
        const widget = mobileWidgets.get(item.id);
        if (widget) { showWidget(widget, item); bottom.append(widget); }
      }
      bottom.hidden = !sidebar.enabled;
      bottom.style.display = sidebar.enabled ? "" : "none";
    }
    const mainGrid = document.querySelector("#main-grid");
    const geometryHost = document.querySelector("#content-panel-inner");
    if (mainGrid && geometryHost) {
      const hasWidgets = (side, article) => sidebar[side].some((item) => item.enabled && (item.id !== "sidebarToc" || article));
      const left = sidebar.enabled && sidebar.position !== "right" && hasWidgets("left", isArticle);
      const right = sidebar.enabled && sidebar.position !== "left" && hasWidgets("right", isArticle);
      const mdLeft = left;
      const mdRight = right && sidebar.position === "right";
      const columns = (showLeft, showRight) => [showLeft ? "var(--grid-sidebar-width)" : "", "minmax(0, 1fr)", showRight ? "var(--grid-sidebar-width)" : ""].filter(Boolean).join(" ");
      const vars = { "--cols-md": columns(mdLeft, mdRight), "--cols-xl": columns(left, right),
        "--left-display-md": mdLeft ? "contents" : "none", "--right-display-md": mdRight ? "contents" : "none",
        "--left-display-xl": left ? "contents" : "none", "--right-display-xl": right ? "contents" : "none",
        "--grid-sidebar-width": "17.5rem", "--content-ratio-md": "1", "--content-ratio-xl": "1" };
      for (const [name, value] of Object.entries(vars)) geometryHost.style.setProperty(name, value);
      mainGrid.setAttribute("data-sidebar-enable", String(sidebar.enabled));
      mainGrid.setAttribute("data-sidebar-position", sidebar.position);
      mainGrid.setAttribute("data-tablet-sidebar", sidebar.position === "right" ? "right" : "left");
      for (const side of ["left", "right"]) {
        mainGrid.setAttribute(`data-has-${side}-on-post`, String(hasWidgets(side, true)));
        mainGrid.setAttribute(`data-has-${side}-on-non-post`, String(hasWidgets(side, false)));
      }
    }
  }
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== "unin-layout-draft") return;
    draft = event.data.layout;
    if (typeof event.data.base === "string" && /^\/[a-zA-Z0-9_/-]*$/.test(event.data.base)) base = event.data.base;
    if (draft?.version === 1 && Array.isArray(draft.homeModules) && draft.visual && draft.sidebar) apply();
  });
  window.addEventListener("resize", apply);
  document.addEventListener("astro:page-load", apply);
  const ready = () => window.parent.postMessage({ type: "unin-preview-ready" }, location.origin);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true }); else ready();
})();

/** One timer per wallpaper; stopped while hidden, disabled or motion is reduced. */
export function createCarouselScheduler({ canPlay, advance, interval, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer;
  const stop = () => { if (timer !== undefined) clearTimer(timer); timer = undefined; };
  const sync = () => {
    stop();
    if (!canPlay()) return;
    timer = setTimer(() => { timer = undefined; if (canPlay()) advance(); sync(); }, interval());
  };
  return { sync, stop, isScheduled: () => timer !== undefined };
}

export function getWallpaperSources(visual, device) {
  const list = visual[`${device}Images`];
  return Array.isArray(list) && list.length ? list : [visual[`${device}Image`]];
}

export function createWallpaperController(container, browser = window) {
  const document = browser.document;
  const desktop = browser.matchMedia("(min-width: 1024px)");
  const motion = browser.matchMedia("(prefers-reduced-motion: reduce)");
  const subscriptions = [];
  let destroyed = false;
  let paused = false;
  let generation = 0;
  let options = {
    enabled: container.dataset.carouselEnabled === "true",
    interval: Number(container.dataset.carouselInterval) || 5000,
    effect: container.dataset.carouselEffect || "fade",
  };
  if (container.dataset.carouselSwitchable === "true") {
    try {
      const stored = browser.localStorage.getItem("bannerCarouselEnabled");
      if (stored === "true" || stored === "false") options.enabled = stored === "true";
    } catch { /* Storage can be disabled; the author's default still applies. */ }
  }
  let imageSignature;
  const listen = (target, event, handler) => {
    target.addEventListener(event, handler);
    subscriptions.push(() => target.removeEventListener(event, handler));
  };
  const slides = () => [...container.querySelectorAll(".slide-item")].filter((slide) => slide.dataset.device === (desktop.matches ? "desktop" : "mobile"));
  const currentIndex = (items) => Math.max(0, items.findIndex((slide) => slide.classList.contains("active")));
  const mode = () => document.documentElement.dataset.wallpaperMode;
  const canPlay = () => !destroyed && !paused && options.enabled && mode() !== "none" && !document.hidden && !motion.matches && slides().filter((slide) => !slide.dataset.failed).length > 1;
  const scheduler = createCarouselScheduler({ canPlay, advance: () => change(1), interval: () => options.interval,
    setTimer: browser.setTimeout.bind(browser), clearTimer: browser.clearTimeout.bind(browser) });

  function materialize(slide) {
    const template = slide.querySelector("template");
    if (template) { slide.append(template.content.cloneNode(true)); template.remove(); }
    const image = slide.querySelector("img");
    if (image) {
      image.style.opacity = "1";
      image.classList.remove("opacity-0");
    }
    return image;
  }
  function activate(target, items, version) {
    if (destroyed || version !== generation || !container.contains(target)) return;
    if (target.dataset.device !== (desktop.matches ? "desktop" : "mobile")) return;
    const firstUsable = items.findIndex((slide) => !slide.dataset.failed);
    if ((!options.enabled || motion.matches) && items.indexOf(target) !== firstUsable) return;
    for (const [index, slide] of items.entries()) {
      slide.classList.toggle("active", slide === target);
      slide.classList.toggle("prev-waiting", index < items.indexOf(target));
    }
    target.querySelector(".lqip-placeholder")?.classList.add("loaded");
    container.dataset.activeIndex = String(items.indexOf(target));
    if (options.enabled && !motion.matches && mode() !== "none") {
      const next = items[(items.indexOf(target) + 1) % items.length];
      if (next && next !== target && !next.dataset.failed) materialize(next);
    }
  }
  function show(index, attempted = new Set()) {
    const items = slides();
    if (!items.length || mode() === "none") return;
    const normalized = (index + items.length) % items.length;
    const slide = items[normalized];
    if (attempted.has(slide)) return;
    attempted.add(slide);
    if (slide.dataset.failed) { show(normalized + 1, attempted); return; }
    const image = materialize(slide);
    if (!image) return;
    const version = generation;
    const failed = () => {
      if (destroyed || version !== generation) return;
      slide.dataset.failed = "true";
      show(normalized + 1, attempted);
      scheduler.sync();
    };
    if (image.complete && image.naturalWidth > 0) activate(slide, items, version);
    else if (image.complete && image.getAttribute("src")) failed();
    else {
      image.addEventListener("load", () => activate(slide, items, version), { once: true });
      image.addEventListener("error", failed, { once: true });
    }
  }
  function change(direction) {
    const items = slides();
    if (items.length > 1) show(currentIndex(items) + direction);
  }
  function sync() {
    if (mode() !== "none") show(options.enabled && !motion.matches ? currentIndex(slides()) : 0);
    scheduler.sync();
    container.dataset.carouselPlaying = String(canPlay());
  }
  function configure(next) {
    const signature = JSON.stringify([next.desktop, next.mobile]);
    if (next.desktop && next.mobile && signature !== imageSignature) {
      generation++;
      imageSignature = signature;
      const fragment = document.createDocumentFragment();
      for (const device of ["desktop", "mobile"]) {
        next[device].forEach((source, index) => {
          const slide = document.createElement("div");
          slide.className = `slide-item ${device === "desktop" ? "hidden lg:block" : "block lg:hidden"}${index === 0 ? " active" : ""}`;
          slide.dataset.device = device;
          slide.dataset.index = String(index);
          const template = document.createElement("template");
          const image = template.content.ownerDocument.createElement("img");
          image.src = source; image.alt = ""; image.className = "h-full w-full object-cover";
          image.loading = "eager"; image.decoding = "async";
          // Inert template prevents fetching every image in both device lists.
          template.content.append(image); slide.append(template); fragment.append(slide);
        });
      }
      container.replaceChildren(fragment);
    }
    options = { ...options, enabled: Boolean(next.enabled), interval: Math.min(600000, Math.max(3000, Number(next.interval) || 5000)), effect: ["fade", "slide", "kenburns"].includes(next.effect) ? next.effect : "fade" };
    for (const effect of ["fade", "slide", "kenburns", "zoom"]) container.classList.toggle(`effect-${effect}`, effect === options.effect);
    container.style.setProperty("--carousel-interval", `${options.interval}ms`);
    container.dataset.carouselEnabled = String(options.enabled);
    container.dataset.carouselInterval = String(options.interval);
    container.dataset.carouselEffect = options.effect;
    paused = false;
    sync();
  }
  listen(desktop, "change", sync);
  listen(motion, "change", sync);
  listen(document, "visibilitychange", sync);
  listen(browser, "wallpaperModeChange", sync);
  listen(browser, "unin-wallpaper-config", (event) => configure(event.detail));
  listen(browser, "bannerCarouselChange", (event) => { options.enabled = Boolean(event.detail?.enabled); sync(); });
  listen(browser, "pagehide", () => scheduler.stop());
  listen(browser, "pageshow", sync);
  // Keyboard input elsewhere on the blog remains available for reading/forms.
  listen(container, "keydown", (event) => {
    if (event.target.closest("input,textarea,select,button,a") || mode() === "none") return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); change(event.key === "ArrowRight" ? 1 : -1); scheduler.sync(); }
    if (event.key === " ") { event.preventDefault(); paused = !paused; scheduler.sync(); }
  });
  sync();
  return { configure, destroy() { destroyed = true; generation++; scheduler.stop(); for (const unsubscribe of subscriptions) unsubscribe(); } };
}

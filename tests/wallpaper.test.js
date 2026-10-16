import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateLayout } from "../src/editor/schema.mjs";
import { createCarouselScheduler, createWallpaperController, getWallpaperSources } from "../src/utils/wallpaper-runtime.mjs";

const original = JSON.parse(await readFile(new URL("../src/config/layout.json", import.meta.url), "utf8"));

test("old layouts retain single wallpapers with automatic rotation disabled", () => {
  const legacy = structuredClone(original);
  for (const key of ["desktopImages", "mobileImages", "carouselEnabled", "carouselInterval", "carouselEffect"]) delete legacy.visual[key];
  const before = structuredClone(legacy);
  const normalized = validateLayout(legacy);
  assert.deepEqual(legacy, before);
  assert.deepEqual(normalized.visual.desktopImages, []);
  assert.deepEqual(normalized.visual.mobileImages, []);
  assert.equal(normalized.visual.carouselEnabled, false);
  assert.equal(normalized.visual.carouselInterval, 5000);
  assert.equal(normalized.visual.carouselEffect, "fade");
  assert.deepEqual(getWallpaperSources(normalized.visual, "desktop"), [legacy.visual.desktopImage]);
});

test("device lists override only their own legacy image and accept Chinese paths", () => {
  const layout = structuredClone(original);
  layout.visual.desktopImages = ["/assets/春天.webp", "https://example.com/summer.webp"];
  layout.visual.mobileImages = [];
  const visual = validateLayout(layout).visual;
  assert.deepEqual(getWallpaperSources(visual, "desktop"), layout.visual.desktopImages);
  assert.deepEqual(getWallpaperSources(visual, "mobile"), [visual.mobileImage]);
});

test("wallpaper lists reject traversal, credentials, duplicates and excessive entries", () => {
  for (const images of [null, "a.webp", ["javascript:alert(1)"], ["/assets/../secret.webp"], ["/assets/%2e%2e/secret.webp"], ["https://user:secret@example.com/a.webp"], ["/assets/a.webp", "/assets/a.webp"], Array.from({ length: 21 }, (_, index) => `/assets/${index}.webp`)]) {
    const layout = structuredClone(original);
    layout.visual.desktopImages = images;
    assert.throws(() => validateLayout(layout));
  }
});

test("carousel interval and effects have strict bounded types", () => {
  for (const [key, values] of Object.entries({ carouselEnabled: [null, "true", 1], carouselInterval: [null, "5000", 2999, 600001, 3500.5, Number.NaN], carouselEffect: [null, "zoom", "alert(1)"] })) {
    for (const value of values) {
      const layout = structuredClone(original); layout.visual[key] = value;
      assert.throws(() => validateLayout(layout));
    }
  }
  for (const effect of ["fade", "slide", "kenburns"]) {
    const layout = structuredClone(original); layout.visual.carouselEffect = effect;
    assert.equal(validateLayout(layout).visual.carouselEffect, effect);
  }
});

test("rotation rescheduling keeps one timer and pauses immediately when policy changes", () => {
  const timers = new Map();
  let nextId = 0;
  let enabled = true;
  let interval = 8000;
  let advances = 0;
  const scheduler = createCarouselScheduler({
    canPlay: () => enabled, advance: () => { advances++; }, interval: () => interval,
    setTimer: (callback, delay) => { const id = ++nextId; timers.set(id, { callback, delay }); return id; },
    clearTimer: (id) => timers.delete(id),
  });
  scheduler.sync(); scheduler.sync(); scheduler.sync();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 8000);
  interval = 3000; scheduler.sync();
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 3000);
  const [id, timer] = [...timers.entries()][0]; timers.delete(id); timer.callback();
  assert.equal(advances, 1);
  assert.equal(timers.size, 1);
  enabled = false; scheduler.sync();
  assert.equal(timers.size, 0);
  assert.equal(scheduler.isScheduled(), false);
  enabled = true; scheduler.sync(); scheduler.stop();
  assert.equal(timers.size, 0);
});

test("a hidden-page policy checked before an already-queued tick prevents advancing", () => {
  let visible = true;
  let tick;
  let advances = 0;
  const scheduler = createCarouselScheduler({ canPlay: () => visible, advance: () => { advances++; }, interval: () => 3000,
    setTimer: (callback) => { tick = callback; return 1; }, clearTimer: () => {} });
  scheduler.sync(); visible = false; tick();
  assert.equal(advances, 0);
  assert.equal(scheduler.isScheduled(), false);
});

function runtimeFixture() {
  const classes = (...initial) => {
    const set = new Set(initial);
    return { contains: (name) => set.has(name), remove: (...names) => { for (const name of names) set.delete(name); },
      toggle: (name, enabled) => enabled ? set.add(name) : set.delete(name) };
  };
  const makeSlide = (device, index, loaded = true) => {
    const image = Object.assign(new EventTarget(), { complete: true, naturalWidth: loaded ? 100 : 0, style: {}, classList: classes(), getAttribute: () => "/assets/test.webp" });
    return { dataset: { device, index: String(index) }, classList: classes(...(index === 0 ? ["active"] : [])), querySelector: (selector) => selector === "img" ? image : null };
  };
  const items = [makeSlide("desktop", 0), makeSlide("desktop", 1, false), makeSlide("desktop", 2), makeSlide("mobile", 0), makeSlide("mobile", 1)];
  const container = Object.assign(new EventTarget(), { dataset: { carouselEnabled: "true", carouselInterval: "3000", carouselEffect: "fade" },
    querySelectorAll: () => items, contains: (slide) => items.includes(slide), classList: classes(), style: { setProperty() {} } });
  const document = Object.assign(new EventTarget(), { hidden: false, documentElement: { dataset: { wallpaperMode: "fullscreen" } } });
  const desktop = Object.assign(new EventTarget(), { matches: true });
  const motion = Object.assign(new EventTarget(), { matches: false });
  const timers = new Map(); let nextId = 0;
  const browser = Object.assign(new EventTarget(), { document, matchMedia: (query) => query.includes("1024") ? desktop : motion,
    setTimeout: (callback) => { const id = ++nextId; timers.set(id, callback); return id; }, clearTimeout: (id) => timers.delete(id) });
  const tick = () => { const [id, callback] = [...timers.entries()][0]; timers.delete(id); callback(); };
  return { container, document, desktop, motion, timers, browser, items, tick };
}

test("runtime skips a failed image while retaining a visible valid wallpaper", () => {
  const fixture = runtimeFixture();
  const controller = createWallpaperController(fixture.container, fixture.browser);
  assert.equal(fixture.items[0].classList.contains("active"), true);
  fixture.tick();
  assert.equal(fixture.items[1].dataset.failed, "true");
  assert.equal(fixture.items[1].classList.contains("active"), false);
  assert.equal(fixture.items[2].classList.contains("active"), true);
  assert.equal(fixture.timers.size, 1);
  controller.destroy(); assert.equal(fixture.timers.size, 0);
});

test("a failed first image falls back even when automatic rotation is disabled", () => {
  const fixture = runtimeFixture();
  fixture.container.dataset.carouselEnabled = "false";
  fixture.items[0].querySelector("img").naturalWidth = 0;
  fixture.motion.matches = true;
  const controller = createWallpaperController(fixture.container, fixture.browser);
  assert.equal(fixture.items[0].dataset.failed, "true");
  assert.equal(fixture.items[1].dataset.failed, "true");
  assert.equal(fixture.items[2].classList.contains("active"), true);
  assert.equal(fixture.timers.size, 0);
  controller.destroy();
});

test("runtime pauses for none, hidden pages and reduced motion, then resumes each device safely", () => {
  const fixture = runtimeFixture();
  const controller = createWallpaperController(fixture.container, fixture.browser);
  fixture.document.documentElement.dataset.wallpaperMode = "none";
  fixture.browser.dispatchEvent(new Event("wallpaperModeChange")); assert.equal(fixture.timers.size, 0);
  fixture.document.documentElement.dataset.wallpaperMode = "overlay";
  fixture.browser.dispatchEvent(new Event("wallpaperModeChange")); assert.equal(fixture.timers.size, 1);
  fixture.document.hidden = true; fixture.document.dispatchEvent(new Event("visibilitychange")); assert.equal(fixture.timers.size, 0);
  fixture.document.hidden = false; fixture.document.dispatchEvent(new Event("visibilitychange")); assert.equal(fixture.timers.size, 1);
  fixture.motion.matches = true; fixture.motion.dispatchEvent(new Event("change")); assert.equal(fixture.timers.size, 0);
  fixture.motion.matches = false; fixture.motion.dispatchEvent(new Event("change")); assert.equal(fixture.timers.size, 1);
  fixture.desktop.matches = false; fixture.desktop.dispatchEvent(new Event("change")); fixture.tick();
  assert.equal(fixture.items[4].classList.contains("active"), true);
  controller.configure({ enabled: false, interval: 8000, effect: "slide" });
  assert.equal(fixture.items[3].classList.contains("active"), true); assert.equal(fixture.timers.size, 0);
  controller.destroy(); fixture.browser.dispatchEvent(new Event("wallpaperModeChange"));
  assert.equal(fixture.timers.size, 0);
});

test("optional visitor rotation preferences survive reload while locked author defaults remain authoritative", () => {
  for (const { switchable, stored, defaultEnabled, expected } of [
    { switchable: true, stored: "false", defaultEnabled: true, expected: false },
    { switchable: true, stored: "true", defaultEnabled: false, expected: true },
    { switchable: false, stored: "false", defaultEnabled: true, expected: true },
    { switchable: true, stored: "invalid", defaultEnabled: true, expected: true },
  ]) {
    const fixture = runtimeFixture();
    fixture.container.dataset.carouselSwitchable = String(switchable);
    fixture.container.dataset.carouselEnabled = String(defaultEnabled);
    fixture.browser.localStorage = { getItem: (key) => { assert.equal(key, "bannerCarouselEnabled"); return stored; } };
    const controller = createWallpaperController(fixture.container, fixture.browser);
    assert.equal(fixture.timers.size > 0, expected);
    controller.destroy();
  }
  const fixture = runtimeFixture();
  fixture.container.dataset.carouselSwitchable = "true";
  fixture.browser.localStorage = { getItem: () => { throw new Error("storage disabled"); } };
  const controller = createWallpaperController(fixture.container, fixture.browser);
  assert.equal(fixture.timers.size, 1);
  controller.destroy();
});

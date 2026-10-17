import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator } from "@playwright/test";

const editor = "http://127.0.0.1:4321/__editor/";
const site = "http://127.0.0.1:4322/personal_web/";
const layoutFile = path.resolve("src/config/layout.json");
const screenshots = path.resolve(".cache/site-update-20261016/screenshots");

type WallpaperVisual = {
  desktopImage: string;
  mobileImage: string;
  desktopImages?: string[];
  mobileImages?: string[];
  carouselInterval: number;
};

function deviceImages(visual: WallpaperVisual, device: "desktop" | "mobile") {
  const images = visual[`${device}Images`];
  return images?.length ? images : [visual[`${device}Image`]];
}

async function expectWallpaperImage(image: Locator, source: string) {
  await expect.poll(async () => (await image.getAttribute("src"))?.endsWith(source), {
    message: `当前壁纸应使用配置中的图片 ${source}`,
  }).toBe(true);
  await expect.poll(() => image.evaluate((element) => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  })).toBe(true);
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  (page as unknown as { scriptErrors: string[] }).scriptErrors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as unknown as { scriptErrors: string[] }).scriptErrors).toEqual([]);
});

test("生产壁纸自动轮换，并在站内导航后保持同一个控制器", async ({ page }) => {
  const { visual } = JSON.parse(await readFile(layoutFile, "utf8")) as { visual: WallpaperVisual };
  const desktop = deviceImages(visual, "desktop");
  expect(desktop.length).toBeGreaterThan(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(site);
  const container = page.locator("#banner-images-container");
  await expect(container).toHaveAttribute("data-carousel-playing", "true");
  await expect.poll(() => container.getAttribute("data-active-index"), { timeout: visual.carouselInterval + 15_000 }).toBe("1");
  await expectWallpaperImage(page.locator('.slide-item[data-device="desktop"].active img'), desktop[1]);
  await page.evaluate(() => {
    const host = window as typeof window & { __uninWallpaperRuntime?: unknown; __wallpaperBeforeNavigation?: unknown };
    host.__wallpaperBeforeNavigation = host.__uninWallpaperRuntime;
  });
  await page.getByRole("link", { name: "文章", exact: true }).first().click();
  await expect(page).toHaveURL(`${site}archive/`);
  expect(await page.evaluate(() => {
    const host = window as typeof window & { __uninWallpaperRuntime?: unknown; __wallpaperBeforeNavigation?: unknown };
    return Boolean(host.__wallpaperBeforeNavigation) && host.__uninWallpaperRuntime === host.__wallpaperBeforeNavigation;
  })).toBe(true);
  await expect(container).toHaveAttribute("data-carousel-playing", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(container).toHaveAttribute("data-carousel-playing", "false");
  await expect(container).toHaveAttribute("data-active-index", "0");
});

test("壁纸四模式无需保存即可改变真实布局，纯色保存后仍能恢复全屏预览", async ({ page }) => {
  const original = await readFile(layoutFile);
  try {
    await page.goto(editor);
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    const preview = page.frameLocator("#preview");
    const mode = page.locator('[data-config="visual.wallpaperMode"]');
    const root = preview.locator("html");
    const wallpaper = preview.locator("#wallpaper-wrapper");
    const content = preview.locator("#content-panel");
    await mode.selectOption("fullscreen");
    await expect(root).toHaveAttribute("data-wallpaper-mode", "fullscreen");
    await expect(wallpaper).toHaveCSS("position", "fixed");
    await expect.poll(() => wallpaper.evaluate((element) => element.getBoundingClientRect().height / innerHeight)).toBeGreaterThan(0.95);
    await expect.poll(() => content.evaluate((element) => element.getBoundingClientRect().top / innerHeight)).toBeGreaterThan(0.9);
    await mkdir(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, "mode-fullscreen.png") });

    await mode.selectOption("banner");
    await expect(root).toHaveAttribute("data-wallpaper-mode", "banner");
    await expect.poll(() => wallpaper.evaluate((element) => element.getBoundingClientRect().height / innerHeight)).toBeLessThan(0.8);
    await expect.poll(() => wallpaper.evaluate((element) => element.getBoundingClientRect().height / innerHeight)).toBeGreaterThan(0.4);
    await page.screenshot({ path: path.join(screenshots, "mode-banner.png") });

    await mode.selectOption("overlay");
    await expect(root).toHaveAttribute("data-wallpaper-mode", "overlay");
    await expect(wallpaper).toHaveCSS("position", "fixed");
    await expect(preview.locator(".banner-home-text-overlay")).toBeHidden();
    await expect.poll(() => content.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(180);
    await page.screenshot({ path: path.join(screenshots, "mode-overlay.png") });

    await mode.selectOption("none");
    await expect(root).toHaveAttribute("data-wallpaper-mode", "none");
    await expect(wallpaper).toBeHidden();
    await expect.poll(() => content.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(180);
    expect(await readFile(layoutFile)).toEqual(original);
    await page.screenshot({ path: path.join(screenshots, "mode-none.png") });
    await page.getByRole("button", { name: "保存到本地", exact: true }).click();
    await expect(page.locator("#status")).toHaveText("已保存到本地 · Git 推送后上线");
    await page.reload();
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    await expect(mode).toHaveValue("none");
    await expect(wallpaper).toBeHidden();
    await mode.selectOption("fullscreen");
    await expect(wallpaper).toBeVisible();
    await expect(preview.locator(".banner-title")).toBeVisible();
    await expect.poll(() => content.evaluate((element) => element.getBoundingClientRect().top / innerHeight)).toBeGreaterThan(0.9);
    expect(JSON.parse(await readFile(layoutFile, "utf8")).visual.wallpaperMode).toBe("none");
  } finally {
    await writeFile(layoutFile, original);
    expect(await readFile(layoutFile)).toEqual(original);
  }
});

test("桌面手机轮播可实时设置、自动前进、暂停及保存，减少动态时停在首张", async ({ page }) => {
  test.setTimeout(120_000);
  const original = await readFile(layoutFile);
  const { visual } = JSON.parse(original.toString()) as { visual: WallpaperVisual };
  const desktop = deviceImages(visual, "desktop").slice(0, 2);
  const mobile = deviceImages(visual, "mobile").slice(0, 2);
  expect(desktop).toHaveLength(2);
  expect(mobile).toHaveLength(2);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  try {
    await page.goto(editor);
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    const preview = page.frameLocator("#preview");
    const container = preview.locator("#banner-images-container");
    const mode = page.locator('[data-config="visual.wallpaperMode"]');
    const enabled = page.locator('[data-config="visual.carouselEnabled"]');
    await mode.selectOption("overlay");
    await page.locator('[data-config="visual.desktopImages"]').fill(desktop.join("\n"));
    await page.locator('[data-config="visual.mobileImages"]').fill(mobile.join("\n"));
    await page.locator('[data-config="visual.carouselInterval"]').fill("3");
    await page.locator('[data-config="visual.carouselEffect"]').selectOption("slide");
    await enabled.check();
    await expect(container).toHaveAttribute("data-carousel-playing", "true");
    await expect(container).toHaveAttribute("data-carousel-interval", "3000");
    await expect(container).toHaveClass(/effect-slide/);
    await expect.poll(() => container.getAttribute("data-active-index"), { timeout: 12_000 }).toBe("1");
    await expectWallpaperImage(preview.locator('.slide-item[data-device="desktop"].active img'), desktop[1]);
    await enabled.uncheck();
    await expect(container).toHaveAttribute("data-carousel-playing", "false");
    await expect(container).toHaveAttribute("data-active-index", "0");

    await page.getByRole("button", { name: "手机", exact: true }).click();
    await expectWallpaperImage(preview.locator('.slide-item[data-device="mobile"].active img'), mobile[0]);
    await enabled.check();
    await expect.poll(() => container.getAttribute("data-active-index"), { timeout: 12_000 }).toBe("1");
    await expectWallpaperImage(preview.locator('.slide-item[data-device="mobile"].active img'), mobile[1]);
    await mode.selectOption("none");
    await expect(container).toHaveAttribute("data-carousel-playing", "false");
    await mode.selectOption("overlay");
    await expect(container).toHaveAttribute("data-carousel-playing", "true");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(container).toHaveAttribute("data-carousel-playing", "false");
    await expect(container).toHaveAttribute("data-active-index", "0");
    await page.getByRole("button", { name: "保存到本地", exact: true }).click();
    await expect(page.locator("#status")).toHaveText("已保存到本地 · Git 推送后上线");
    const saved = JSON.parse(await readFile(layoutFile, "utf8"));
    expect(saved.visual.carouselEnabled).toBe(true);
    expect(saved.visual.carouselInterval).toBe(3000);
    expect(saved.visual.carouselEffect).toBe("slide");
    expect(saved.visual.mobileImages).toHaveLength(2);
    await page.reload();
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    await expect(page.locator('[data-config="visual.carouselInterval"]')).toHaveValue("3");
    await expect(preview.locator("#banner-images-container")).toHaveAttribute("data-carousel-playing", "false");
  } finally {
    await writeFile(layoutFile, original);
    expect(await readFile(layoutFile)).toEqual(original);
  }
});

test("有同步追番时，深浅色文字可辨、海报完整且加载失败有占位", async ({ page }) => {
  const posterSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="#b7dfd0"/><rect x="8" y="8" width="344" height="624" rx="12" fill="none" stroke="#225744" stroke-width="12"/><circle cx="180" cy="320" r="80" fill="#faf0c9"/></svg>';
  await page.route("**/*", (route) => {
    const request = route.request();
    if (request.resourceType() === "image" && !request.url().startsWith("http://127.0.0.1")) {
      return route.fulfill({ contentType: "image/svg+xml", body: posterSvg });
    }
    return route.continue();
  });
  await page.goto(`${site}bilibili/`);
  const cards = page.locator(".anime-card");
  expect(await cards.count(), "已发布的追番快照应包含作品").toBeGreaterThan(0);
  const card = cards.first();
  const title = card.locator("h3");
  const cover = card.locator(".anime-poster-image");
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => cover.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(cover).toHaveCSS("object-fit", "contain");
  const frame = card.locator("[data-anime-poster]");
  await expect.poll(() => frame.evaluate((element) => {
    const rect = element.getBoundingClientRect(); return rect.width / rect.height;
  })).toBeCloseTo(2 / 3, 2);
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expect(title).toHaveCSS("color", "rgb(34, 43, 41)");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(title).toHaveCSS("color", "rgb(241, 245, 244)");
  await expect(card.locator("dd").first()).toHaveCSS("color", "rgb(241, 245, 244)");
  await expect(page.locator("#anime-search")).toHaveCSS("color", "rgb(241, 245, 244)");
  await mkdir(screenshots, { recursive: true });
  await page.screenshot({ path: path.join(screenshots, "anime-dark.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await card.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await expect(cover).toHaveCSS("object-fit", "contain");
  const search = page.locator("#anime-search");
  await search.fill("there-is-no-anime-with-this-name-12345");
  await expect(page.locator(".anime-card:visible")).toHaveCount(0);
  await expect(page.locator("[data-anime-empty]")).toBeVisible();
  await search.fill("");
  await expect(card).toBeVisible();
  const posterUrl = await cover.getAttribute("src");
  if (posterUrl) {
    await page.route(posterUrl, (route) => route.abort(), { times: 1 });
    await page.reload();
    await card.scrollIntoViewIfNeeded();
    await expect(cover).toBeHidden();
    await expect(card.locator("[data-anime-poster-fallback]")).toBeVisible();
  }
});

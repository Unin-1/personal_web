import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const site = "http://127.0.0.1:4322/personal_web/";
const editor = "http://127.0.0.1:4321/__editor/";
const layoutFile = path.resolve("src/config/layout.json");

async function terminalTheme(page: Page) {
  return page.locator("typing-terminal").evaluate((terminal) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable for color contrast checks");
    const sample = (background: string, foreground?: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = background;
      context.fillRect(0, 0, 1, 1);
      if (foreground) {
        context.fillStyle = foreground;
        context.fillRect(0, 0, 1, 1);
      }
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return [red, green, blue];
    };
    const luminance = (rgb: number[]) => {
      const channels = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const contrast = (background: number[], foreground: number[]) => {
      const levels = [luminance(background), luminance(foreground)];
      return (Math.max(...levels) + 0.05) / (Math.min(...levels) + 0.05);
    };
    const background = getComputedStyle(terminal).backgroundColor;
    const output = terminal.querySelector("[data-typing-text]");
    const bar = terminal.querySelector(".terminal-bar");
    if (!output || !bar) throw new Error("Terminal text or title bar is missing");
    const text = getComputedStyle(output).color;
    const barBackground = getComputedStyle(bar).backgroundColor;
    const barText = getComputedStyle(bar).color;
    const panelRgb = sample(background);
    const textRgb = sample(background, text);
    const barRgb = sample(background, barBackground);
    const barTextRgb = sample(barBackground, barText);
    return {
      background: panelRgb,
      text: textRgb,
      barBackground: barRgb,
      textContrast: contrast(panelRgb, textRgb),
      barContrast: contrast(barRgb, barTextRgb),
    };
  });
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

test("生产壁纸遮罩在首页、归档、关于与文章页共用，并在站内导航后保留", async ({ page }) => {
  const layout = JSON.parse(await readFile(layoutFile, "utf8"));
  const alpha = layout.visual.dimOpacity;
  for (const route of ["", "archive/", "about/", "posts/markdown/"]) {
    await page.goto(`${site}${route}`);
    const dim = page.locator(".banner-dim-overlay");
    await expect(dim).toBeVisible();
    await expect.poll(() => dim.evaluate(element => getComputedStyle(element).backgroundColor)).toBe(`rgba(0, 0, 0, ${alpha})`);
  }
  await page.getByRole("link", { name: "文章", exact: true }).first().click();
  await expect(page).toHaveURL(`${site}archive/`);
  await expect(page.locator(".banner-dim-overlay")).toBeVisible();
  await expect(page.locator(".banner-dim-overlay")).toHaveCSS("background-color", `rgba(0, 0, 0, ${alpha})`);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".banner-dim-overlay")).toBeVisible();
});

test("遮罩草稿在内页切换与无查询参数刷新后仍生效，保存后重载可恢复", async ({ page }) => {
  test.setTimeout(120_000);
  const original = await readFile(layoutFile);
  try {
    await page.goto(editor);
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    const frame = page.frames().find(frame => frame.url().includes("editor-preview"));
    expect(frame).toBeTruthy();
    if (!frame) return;
    const mode = page.locator('[data-config="visual.wallpaperMode"]');
    const dimOpacity = page.locator('[data-config="visual.dimOpacity"]');
    await mode.selectOption("fullscreen");
    const setDimOpacity = async (value: string) => dimOpacity.evaluate((element, next) => {
      (element as HTMLInputElement).value = next;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await setDimOpacity("0.75");
    await frame.getByRole("link", { name: "文章", exact: true }).first().click();
    await expect.poll(() => frame.url()).toBe("http://127.0.0.1:4321/archive/");
    await expect(frame.locator(".banner-dim-overlay")).toBeVisible();
    await expect(frame.locator(".banner-dim-overlay")).toHaveCSS("background-color", "rgba(0, 0, 0, 0.75)");
    await frame.goto("http://127.0.0.1:4321/about/");
    for (const value of ["fullscreen", "overlay", "banner"]) {
      await mode.selectOption(value);
      await expect(frame.locator("html")).toHaveAttribute("data-wallpaper-mode", value);
      await expect(frame.locator(".banner-dim-overlay")).toBeVisible();
      await expect(frame.locator(".banner-dim-overlay")).toHaveCSS("background-color", "rgba(0, 0, 0, 0.75)");
    }
    await setDimOpacity("0.45");
    await expect(frame.locator(".banner-dim-overlay")).toHaveCSS("background-color", "rgba(0, 0, 0, 0.45)");
    expect(await readFile(layoutFile)).toEqual(original);
    await page.getByRole("button", { name: "保存到本地", exact: true }).click();
    await expect(page.locator("#status")).toHaveText("已保存到本地 · Git 推送后上线");
    await page.reload();
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    expect(JSON.parse(await readFile(layoutFile, "utf8")).visual.dimOpacity).toBe(0.45);
    const reloadedFrame = page.frames().find(frame => frame.url().includes("editor-preview"));
    expect(reloadedFrame).toBeTruthy();
    if (!reloadedFrame) return;
    await reloadedFrame.goto("http://127.0.0.1:4321/about/");
    await expect(reloadedFrame.locator(".banner-dim-overlay")).toHaveCSS("background-color", "rgba(0, 0, 0, 0.45)");
    await mode.selectOption("none");
    await expect(reloadedFrame.locator(".banner-dim-overlay")).toBeHidden();
  } finally {
    await writeFile(layoutFile, original);
    expect(await readFile(layoutFile)).toEqual(original);
  }
});

test("关于页终端从左到右输入，离开后返回可重新播放且无重复终端", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const host = window as typeof window & { terminalSamples: string[]; terminalCursorWasVisible: boolean };
    host.terminalSamples = [];
    host.terminalCursorWasVisible = false;
    new MutationObserver(() => {
      const terminal = document.querySelector('typing-terminal[data-state="typing"]');
      const value = terminal?.querySelector("[data-typing-text]")?.textContent;
      if (value) host.terminalSamples.push(value);
      const cursor = terminal?.querySelector(".terminal-cursor");
      if (cursor && getComputedStyle(cursor).display !== "none") host.terminalCursorWasVisible = true;
    }).observe(document, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["data-state"] });
  });
  await page.goto(`${site}about/`, { waitUntil: "domcontentloaded" });
  const terminal = page.locator("typing-terminal");
  const code = 'print("Welcome!")';
  const hasIntermediatePrefix = async () => page.evaluate((full) => {
    const host = window as typeof window & { terminalSamples: string[] };
    return host.terminalSamples.some(value => value.length < full.length && full.startsWith(value));
  }, code);
  await expect(terminal).toHaveCount(1);
  await expect.poll(hasIntermediatePrefix).toBe(true);
  await expect(terminal).toHaveAttribute("data-state", "complete");
  await expect(terminal.locator("[data-typing-text]")).toHaveText(code);
  await expect(terminal.locator(".terminal-cursor")).toBeHidden();
  expect(await page.evaluate(() => (window as typeof window & { terminalCursorWasVisible: boolean }).terminalCursorWasVisible)).toBe(true);
  await expect(terminal.locator("code")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.getByRole("link", { name: "文章", exact: true }).first().click();
  await expect(page).toHaveURL(`${site}archive/`);
  await page.evaluate(() => { (window as typeof window & { terminalSamples: string[] }).terminalSamples = []; });
  await page.goBack();
  await expect(page).toHaveURL(`${site}about/`);
  await expect(terminal).toHaveCount(1);
  await expect.poll(hasIntermediatePrefix).toBe(true);
  await expect(terminal).toHaveAttribute("data-state", "complete");
  await expect(terminal.locator(".terminal-cursor")).toBeHidden();
});

test("终端随明暗主题切换且代码清晰，减少动态或禁用 JavaScript 时隐藏光标，手机无横向溢出", async ({ page, browser }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${site}about/`);
  const terminal = page.locator("typing-terminal");
  await expect(terminal).toHaveAttribute("data-state", "complete");
  await expect(page.locator("[data-typing-text]")).toHaveText('print("Welcome!")');
  await expect(terminal.locator(".terminal-cursor")).toBeHidden();
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expect.poll(async () => (await terminalTheme(page)).textContrast).toBeGreaterThanOrEqual(4.5);
  const light = await terminalTheme(page);
  expect(light.barContrast).toBeGreaterThanOrEqual(4.5);
  await mkdir(".cache/terminal-theme", { recursive: true });
  await terminal.screenshot({ path: ".cache/terminal-theme/about-terminal-light.png" });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect.poll(async () => (await terminalTheme(page)).background).not.toEqual(light.background);
  await expect.poll(async () => (await terminalTheme(page)).text).not.toEqual(light.text);
  await expect.poll(async () => (await terminalTheme(page)).textContrast).toBeGreaterThanOrEqual(4.5);
  const dark = await terminalTheme(page);
  expect(dark.background).not.toEqual(light.background);
  expect(dark.text).not.toEqual(light.text);
  expect(dark.barBackground).not.toEqual(light.barBackground);
  expect(dark.barContrast).toBeGreaterThanOrEqual(4.5);
  await expect(terminal.locator("code")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(terminal.locator(".terminal-cursor")).toBeHidden();
  await terminal.screenshot({ path: ".cache/terminal-theme/about-terminal-dark.png" });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  await expect.poll(async () => (await terminalTheme(page)).background).toEqual(light.background);
  await expect.poll(async () => (await terminalTheme(page)).text).toEqual(light.text);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${site}about/`);
    await expect(staticPage.locator("typing-terminal")).toBeVisible();
    await expect(staticPage.locator("[data-typing-text]")).toHaveText('print("Welcome!")');
    await expect(staticPage.locator(".terminal-cursor")).toBeHidden();
  } finally {
    await noScript.close();
  }
});

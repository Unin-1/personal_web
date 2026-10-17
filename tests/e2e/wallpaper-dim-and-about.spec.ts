import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const site = "http://127.0.0.1:4322/personal_web/";
const editor = "http://127.0.0.1:4321/__editor/";
const layoutFile = path.resolve("src/config/layout.json");

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
  for (const route of ["", "archive/", "about/", "posts/markdown-and-math/"]) {
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
    const host = window as typeof window & { terminalSamples: string[] };
    host.terminalSamples = [];
    new MutationObserver(() => {
      const terminal = document.querySelector('typing-terminal[data-state="typing"]');
      const value = terminal?.querySelector("[data-typing-text]")?.textContent;
      if (value) host.terminalSamples.push(value);
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
  await expect(terminal.locator("code")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(terminal.locator("[data-typing-text]")).toHaveCSS("color", "rgb(229, 238, 240)");
  await mkdir(".cache/site-update-20261017/screenshots", { recursive: true });
  await terminal.screenshot({ path: ".cache/site-update-20261017/screenshots/about-terminal.png" });
  await page.getByRole("link", { name: "文章", exact: true }).first().click();
  await expect(page).toHaveURL(`${site}archive/`);
  await page.evaluate(() => { (window as typeof window & { terminalSamples: string[] }).terminalSamples = []; });
  await page.goBack();
  await expect(page).toHaveURL(`${site}about/`);
  await expect(terminal).toHaveCount(1);
  await expect.poll(hasIntermediatePrefix).toBe(true);
  await expect(terminal).toHaveAttribute("data-state", "complete");
});

test("终端在减少动态或禁用 JavaScript 时仍显示完整代码，手机无横向溢出", async ({ page, browser }) => {
  await page.goto(`${site}about/`);
  await expect(page.locator("typing-terminal")).toHaveAttribute("data-state", "complete");
  await expect(page.locator("[data-typing-text]")).toHaveText('print("Welcome!")');
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.locator("typing-terminal code")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator("[data-typing-text]")).toHaveCSS("color", "rgb(229, 238, 240)");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  try {
    const staticPage = await noScript.newPage();
    await staticPage.goto(`${site}about/`);
    await expect(staticPage.locator("typing-terminal")).toBeVisible();
    await expect(staticPage.locator("[data-typing-text]")).toHaveText('print("Welcome!")');
  } finally {
    await noScript.close();
  }
});

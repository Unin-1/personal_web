import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const site = "http://127.0.0.1:4322/personal_web/";
const editor = "http://127.0.0.1:4321/__editor/";
const layoutFile = path.resolve("src/config/layout.json");
const cacheDirectory = path.resolve(".cache");
const screenshotDirectory = path.join(cacheDirectory, "screenshots");
type Diagnostic = { kind: string; message: string; url?: string };
type PlayerWindow = Window & {
  __fireflyMusic?: { getState(): { initialized: boolean; playlist: unknown[]; isPlaying: boolean } };
  __musicBeforeNavigation?: unknown;
};
let diagnostics: Diagnostic[] = [];

test.describe.configure({ mode: "default" });

test.beforeEach(async ({ page }) => {
  diagnostics = [];
  page.on("pageerror", (error) => diagnostics.push({ kind: "pageerror", message: error.message }));
  page.on("console", (message) => {
    if (["warning", "error"].includes(message.type())) {
      diagnostics.push({ kind: `console.${message.type()}`, message: message.text(), url: message.location().url });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) diagnostics.push({ kind: "http", message: String(response.status()), url: response.url() });
  });
  page.on("requestfailed", (request) => {
    diagnostics.push({ kind: "requestfailed", message: request.failure()?.errorText || "Request failed", url: request.url() });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  await mkdir(cacheDirectory, { recursive: true });
  const report = { test: testInfo.title, status: testInfo.status, url: page.url(), diagnostics };
  await appendFile(path.join(cacheDirectory, "browser-diagnostics.jsonl"), `${JSON.stringify(report)}\n`);
  await testInfo.attach("browser-diagnostics", { body: JSON.stringify(report, null, 2), contentType: "application/json" });
  const failures = diagnostics.filter((entry) => entry.kind === "pageerror"
    || (entry.kind === "http" && /^http:\/\/127\.0\.0\.1:432[12]\//.test(entry.url || "")
      && !entry.url?.includes("/__editor")));
  expect(failures, "浏览器应无脚本异常或本地资源加载失败").toEqual([]);
});

async function visit(page: Page, route = "") {
  const response = await page.goto(`${site}${route}`);
  expect(response?.status()).toBe(200);
}

async function expectLoadedImage(page: Page, selector: string) {
  await expect(page.locator(selector).first()).toBeVisible();
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator(selector).first().evaluate((element) => {
    const image = element as HTMLImageElement;
    return image.complete && image.naturalWidth > 0;
  })).toBe(true);
}

test("首页、桌面与手机导航及代表视口截图", async ({ page }) => {
  await visit(page);
  await expect(page).toHaveTitle(/Unin/);
  await expect(page.locator('[data-home-module="posts"]')).toBeVisible();
  await expect(page.locator('[data-home-module="projects"]')).toBeVisible();
  await expectLoadedImage(page, '#banner-images-container .slide-item.active img:visible');
  const invalidLocalLinks = await page.locator('a[href^="/"]').evaluateAll((links) => links
    .map((link) => link.getAttribute("href"))
    .filter((href) => href && !href.startsWith("/personal_web/") && !href.startsWith("//")));
  expect(invalidLocalLinks).toEqual([]);
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe("BODY");
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDirectory, "home-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expectLoadedImage(page, '#banner-images-container .slide-item.active img:visible');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: path.join(screenshotDirectory, "home-mobile.png") });
  await page.locator("#nav-menu-switch").click();
  const menu = page.getByRole("dialog", { name: "导航菜单" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "文章", exact: true }).click();
  await expect(page).toHaveURL(`${site}archive/`);
  await expect(page.locator("archive-panel")).toBeVisible();
});

test("文章渲染 Markdown、行内与块公式、图片和标签筛选", async ({ page }) => {
  await visit(page, "posts/markdown/");
  await expect(page.locator(".custom-md table")).toBeVisible();
  await expect(page.locator(".custom-md .katex").first()).toBeVisible();
  await expect(page.locator(".custom-md .katex-display")).toHaveCount(2);
  await expect(page.locator(".custom-md pre")).toBeVisible();
  await expectLoadedImage(page, ".custom-md img");
  await page.locator('a[href*="archive/?tag=Markdown"]').first().click();
  await expect(page).toHaveURL(/archive\/\?tag=Markdown/);
  await expect(page.locator("#archive-filter-header")).toBeVisible();
  const visiblePosts = page.locator(".archive-post:visible");
  await expect(visiblePosts).toHaveCount(1);
  await expect(visiblePosts).toHaveAttribute("href", /posts\/markdown\//);
  await visit(page, "tags/");
  await expect(page.locator('a[href*="archive/?tag=LaTeX"]').first()).toBeVisible();
});

test("生产搜索返回可访问且包含项目基础路径的文章结果", async ({ page }) => {
  await visit(page, "search/?q=Markdown");
  const result = page.locator('#content-wrapper a[href*="/posts/markdown/"]').first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("href", /^\/personal_web\/posts\/markdown\//);
  await result.click();
  await expect(page).toHaveURL(`${site}posts/markdown/`);
  await expect(page.locator(".custom-md .katex").first()).toBeVisible();
});

test("访客可切换文章列表与网格，刷新后保持浏览器偏好", async ({ page }) => {
  await visit(page);
  const posts = page.locator("#post-list-container");
  await expect(posts).toHaveClass(/list-mode/);
  await page.locator("#display-settings-switch").click();
  const settings = page.locator("#display-setting");
  await expect(settings).toBeVisible();
  await settings.getByRole("button", { name: "网格", exact: true }).click();
  await expect(posts).toHaveClass(/grid-mode/);
  expect(await page.evaluate(() => localStorage.getItem("postListLayout"))).toBe("grid");
  await page.reload();
  await expect(posts).toHaveClass(/grid-mode/);
  await page.locator("#display-settings-switch").click();
  await page.locator("#display-setting").getByRole("button", { name: "列表", exact: true }).click();
  await expect(posts).toHaveClass(/list-mode/);
});

test("相册图片可放大并通过 Escape 关闭", async ({ page }) => {
  await visit(page, "gallery/");
  const album = page.locator(".album-card .album-card-image").first();
  const albumHref = await album.getAttribute("href");
  if (!albumHref) throw new Error("Album link is missing");
  expect(albumHref).toMatch(/^\/personal_web\/gallery\/[^/]+\/$/);
  await album.click();
  await expect(page).toHaveURL(new URL(albumHref, site).href);
  const photo = page.locator('.gallery-photo-card [data-fancybox]').first();
  await expect(photo).toBeVisible();
  await expectLoadedImage(page, ".gallery-photo-card img");
  await expect(photo).toHaveAttribute("aria-label", /放大查看/);
  await photo.focus();
  await page.keyboard.press("Enter");
  const lightbox = page.locator(".fancybox__container");
  await expect(lightbox).toBeVisible();
  await expectLoadedImage(page, ".fancybox__container .fancybox__slide img:visible");
  await page.keyboard.press("Escape");
  await expect(lightbox).toHaveCount(0);
});

test("GitHub 项目状态筛选及搜索空态", async ({ page }) => {
  await visit(page, "projects/");
  await expect(page.locator(".project-card").first()).toBeVisible();
  await expect(page.locator('project-filter button[data-status="in-progress"]')).toContainText("进行中");
  const statuses = await page.locator('project-filter button[data-status]:not([data-status="all"])').evaluateAll((buttons) => buttons.map((button) => (button as HTMLElement).dataset.status || ""));
  expect(statuses.length).toBeGreaterThan(0);
  for (const status of statuses) {
    await page.locator(`project-filter button[data-status="${status}"]`).click();
    const visible = page.locator(".project-card:visible");
    expect(await visible.count()).toBeGreaterThan(0);
    expect(await visible.evaluateAll((cards, selected) => cards.every((card) => (card as HTMLElement).dataset.status === selected), status)).toBe(true);
  }
  await page.locator('project-filter button[data-status="all"]').click();
  await page.locator("project-filter [data-search]").fill("there-is-no-such-project-123456");
  await expect(page.locator(".project-card:visible")).toHaveCount(0);
  await expect(page.locator(".projects-empty")).toBeVisible();
  await page.locator("project-filter [data-search]").fill("");
  await expect(page.locator(".project-card").first()).toBeVisible();
});

test("追番列表与模拟 Meting 歌单可用，播放器在站内切页保持单实例且不自动播放", async ({ page }) => {
  const track = {
    name: "浏览器验收歌曲",
    artist: "测试音源",
    url: "https://music-fixture.invalid/track.wav",
    pic: "https://music-fixture.invalid/cover.svg",
    lrc: "[00:00.00]这是本地模拟的歌词",
  };
  let playlistRequests = 0;
  await page.route((url) => url.pathname.includes("/meting"), async (route) => {
    playlistRequests += 1;
    await route.fulfill({ json: [track] });
  });
  await page.route("https://music-fixture.invalid/**", (route) => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#b7dfd0"/></svg>',
  }));
  await visit(page, "bilibili/");
  await expect(page.getByRole("heading", { name: "我的追番", exact: true })).toBeVisible();
  await expect(page.locator("#anime-search")).toBeVisible();
  await expect(page.locator(".anime-card").first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean((window as PlayerWindow).__fireflyMusic))).toBe(true);
  await page.locator("#music-player-switch").click();
  const player = page.locator("#music-nav-panel");
  await expect(player).toBeVisible();
  await expect(player.locator(".music-title")).toContainText(track.name);
  await expect.poll(() => page.evaluate(() => (window as PlayerWindow).__fireflyMusic?.getState().initialized)).toBe(true);
  await page.evaluate(() => { (window as PlayerWindow).__musicBeforeNavigation = (window as PlayerWindow).__fireflyMusic; });
  await expect(page.locator("body > audio")).toHaveCount(1);
  const before = await page.evaluate(() => (window as PlayerWindow).__fireflyMusic?.getState());
  expect(playlistRequests).toBe(1);
  expect(before?.playlist).toEqual([track]);
  expect(before?.isPlaying).toBe(false);
  await page.locator("#music-player-switch").click();
  await page.locator('a[href$="/projects/"]:visible').first().click();
  await expect(page).toHaveURL(`${site}projects/`);
  await expect(page.locator(".project-card").first()).toBeVisible();
  expect(await page.evaluate(() => (window as PlayerWindow).__musicBeforeNavigation === (window as PlayerWindow).__fireflyMusic)).toBe(true);
  await expect(page.locator("body > audio")).toHaveCount(1);
  expect(await page.evaluate(() => (window as PlayerWindow).__fireflyMusic?.getState().isPlaying)).toBe(false);
});

test("生产站点不公开作者页面、脚本或保存接口", async ({ request }) => {
  for (const route of ["__editor/", "__editor/client.js", "__editor/api/layout"]) {
    expect((await request.get(`http://127.0.0.1:4322/${route}`)).status()).toBe(404);
    expect((await request.get(`${site}${route}`)).status()).toBe(404);
  }
  const response = await request.get(site);
  expect(await response.text()).not.toContain("unin-layout-draft");
});

test("作者工作台拖拽、键盘排序、显隐、双尺寸预览及保存后刷新恢复", async ({ page }) => {
  test.setTimeout(180_000);
  const original = await readFile(layoutFile);
  page.on("dialog", (dialog) => dialog.accept());
  try {
    await page.goto(editor);
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    await expect(page.locator("#home-list > li")).toHaveCount(7);
    const preview = page.frameLocator("#preview");
    await expect(preview.locator('[data-home-module="intro"]')).toBeVisible();
    await mkdir(screenshotDirectory, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDirectory, "layout-editor.png") });
    const order = () => page.locator("#home-list > li").evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.id));
    const originalOrder = await order();

    await page.locator('#home-list [data-id="links"] .label').dragTo(page.locator('#home-list [data-id="intro"] .label'), { targetPosition: { x: 5, y: 2 } });
    await expect.poll(async () => (await order())[0]).toBe("links");
    await expect.poll(() => preview.locator("[data-home-module]").evaluateAll((modules) => (modules[0] as HTMLElement).dataset.homeModule)).toBe("links");
    await page.getByRole("button", { name: "下移友链入口", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await order())[1]).toBe("links");

    await page.getByRole("checkbox", { name: "显示欢迎与介绍", exact: true }).uncheck();
    await expect(preview.locator('[data-home-module="intro"]')).toBeHidden();
    await page.getByRole("checkbox", { name: "显示欢迎与介绍", exact: true }).check();
    await expect(preview.locator('[data-home-module="intro"]')).toBeVisible();
    const profile = preview.locator('[data-editor-sidebar="left"] [data-editor-widget="profile"]');
    await expect(profile).toBeVisible();
    await page.getByRole("checkbox", { name: "显示个人资料", exact: true }).uncheck();
    await expect(profile).toBeHidden();
    await page.getByRole("checkbox", { name: "显示个人资料", exact: true }).check();
    await expect(profile).toBeVisible();
    await page.locator('[data-config="sidebar.position"]').selectOption("both");
    await page.getByRole("combobox", { name: "个人资料所在侧栏", exact: true }).selectOption("right");
    await expect(page.locator('#right-list [data-id="profile"]')).toBeVisible();
    await expect(preview.locator('[data-editor-sidebar="right"] [data-editor-widget="profile"]')).toBeVisible();
    await expect(preview.locator('[data-editor-sidebar="left"] [data-editor-widget="profile"]')).toHaveCount(0);
    await page.getByRole("button", { name: "手机", exact: true }).click();
    await expect(page.locator("#mobile")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.locator("#preview").evaluate((frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth)).toBe(390);
    await expect(preview.locator('[data-editor-sidebar="bottom"] [data-editor-widget="profile"]')).toBeVisible();
    await page.getByRole("button", { name: "桌面", exact: true }).click();
    await expect.poll(() => page.locator("#preview").evaluate((frame) => (frame as HTMLIFrameElement).contentWindow?.innerWidth)).toBe(1280);

    const title = "浏览器验证 · 布局保存后恢复";
    await page.locator('[data-config="visual.title"]').fill(title);
    const savedOrder = await order();
    expect(savedOrder).not.toEqual(originalOrder);
    await page.getByRole("button", { name: "保存到本地", exact: true }).click();
    await expect(page.locator("#status")).toHaveText("已保存到本地 · Git 推送后上线");
    const saved = JSON.parse(await readFile(layoutFile, "utf8"));
    expect(saved.visual.title).toBe(title);
    expect(saved.homeModules.map((module: { id: string }) => module.id)).toEqual(savedOrder);
    await page.reload();
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    await expect(page.locator('[data-config="visual.title"]')).toHaveValue(title);
    expect(await order()).toEqual(savedOrder);
    await expect(preview.locator('[data-home-module="intro"]')).toBeVisible();
    await expect.poll(() => preview.locator("[data-home-module]").evaluateAll((modules) => modules.map((module) => (module as HTMLElement).dataset.homeModule))).toEqual(savedOrder);
  } finally {
    await writeFile(layoutFile, original);
    expect(await readFile(layoutFile)).toEqual(original);
  }
});

function hexRgb(hex: string) {
  return `rgb(${[1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16)).join(", ")})`;
}

test("侧栏配色在生产站点浅深色、透明壁纸和手机下保持不透明", async ({ page }) => {
  const config = JSON.parse(await readFile(layoutFile, "utf8"));
  await visit(page);
  const profile = page.locator('[data-editor-sidebar="left"] [data-editor-widget="profile"] > .card-base');
  await expect(profile).toBeVisible();
  await page.evaluate(() => { document.documentElement.classList.remove("dark"); });
  await expect(profile).toHaveCSS("background-color", hexRgb(config.visual.sidebarCardColorLight));
  const sidebarCards = page.locator('[data-editor-sidebar="left"] [data-editor-widget] > .card-base:visible');
  expect(await sidebarCards.count()).toBeGreaterThan(1);
  for (const card of await sidebarCards.all()) {
    await expect(card).toHaveCSS("background-color", hexRgb(config.visual.sidebarCardColorLight));
    await expect(card).toHaveCSS("display", "block");
  }
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--card-transparent-opacity", "0.35");
    document.body.classList.add("wallpaper-transparent");
  });
  await expect(profile).toHaveCSS("background-color", hexRgb(config.visual.sidebarCardColorLight));
  const post = page.locator("#post-list-container .card-base").first();
  await expect(post).toHaveCSS("background-color", /rgba\(.+, 0\.35\)/);
  await page.evaluate(() => { document.documentElement.classList.add("dark"); });
  await expect(profile).toHaveCSS("background-color", hexRgb(config.visual.sidebarCardColorDark));
  await page.evaluate(() => { document.body.classList.remove("wallpaper-transparent"); });
  await expect(profile).toHaveCSS("background-color", hexRgb(config.visual.sidebarCardColorDark));
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileProfile = page.locator('[data-editor-sidebar="bottom"] [data-editor-widget="profile"] > .card-base');
  await expect(mobileProfile).toBeVisible();
  await expect(mobileProfile).toHaveCSS("background-color", hexRgb(config.visual.sidebarCardColorDark));
});

test("作者工作台侧栏配色即时预览、校验和保存后重载", async ({ page }) => {
  const original = await readFile(layoutFile);
  page.on("dialog", (dialog) => dialog.accept());
  try {
    await page.goto(editor);
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    const preview = page.frameLocator("#preview");
    const profile = preview.locator('[data-editor-sidebar="left"] [data-editor-widget="profile"] > .card-base');
    await expect(profile).toBeVisible();
    await preview.locator("html").evaluate((element) => element.classList.remove("dark"));
    const light = page.locator('[data-config="visual.sidebarCardColorLight"]');
    const dark = page.locator('[data-config="visual.sidebarCardColorDark"]');
    const picker = page.locator('[data-color-picker="sidebarCardColorLight"]');
    const save = page.getByRole("button", { name: "保存到本地", exact: true });
    await light.fill("#f2f7f4");
    await expect(picker).toHaveValue("#f2f7f4");
    await expect(profile).toHaveCSS("background-color", "rgb(242, 247, 244)");
    await light.fill("#zzzzzz");
    await expect(page.locator("#sidebar-card-color-light-error")).toContainText("请输入 #RRGGBB");
    await expect(save).toBeDisabled();
    await expect(profile).toHaveCSS("background-color", "rgb(242, 247, 244)");
    await page.locator('[data-config="visual.title"]').fill("配色保存验证");
    await expect(save).toBeDisabled();
    await picker.evaluate((element) => {
      (element as HTMLInputElement).value = "#e9f5ee";
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await expect(light).toHaveValue("#e9f5ee");
    await expect(save).toBeEnabled();
    await expect(profile).toHaveCSS("background-color", "rgb(233, 245, 238)");
    await dark.fill("#24332b");
    await preview.locator("html").evaluate((element) => element.classList.add("dark"));
    await expect(profile).toHaveCSS("background-color", "rgb(36, 51, 43)");
    await page.getByRole("button", { name: "手机", exact: true }).click();
    await expect(preview.locator('[data-editor-sidebar="bottom"] [data-editor-widget="profile"] > .card-base')).toHaveCSS("background-color", "rgb(36, 51, 43)");
    await page.getByRole("button", { name: "桌面", exact: true }).click();
    await save.click();
    await expect(page.locator("#status")).toHaveText("已保存到本地 · Git 推送后上线");
    const persisted = JSON.parse(await readFile(layoutFile, "utf8"));
    expect(persisted.visual.sidebarCardColorLight).toBe("#e9f5ee");
    expect(persisted.visual.sidebarCardColorDark).toBe("#24332b");
    await page.reload();
    await expect(page.locator("#status")).toHaveText("已载入本地配置");
    await expect(light).toHaveValue("#e9f5ee");
    await expect(dark).toHaveValue("#24332b");
    await preview.locator("html").evaluate((element) => element.classList.remove("dark"));
    await expect(profile).toHaveCSS("background-color", "rgb(233, 245, 238)");
    await profile.scrollIntoViewIfNeeded();
    await light.scrollIntoViewIfNeeded();
    await expect(preview.locator("#left-sidebar")).toHaveCSS("opacity", "1");
    await expect(profile).toHaveCSS("opacity", "1");
    for (const card of await preview.locator('[data-editor-sidebar="left"] [data-editor-widget]:visible > .card-base').all()) {
      await expect(card).toHaveCSS("display", "block");
      await expect(card).toHaveCSS("opacity", "1");
    }
    await mkdir(path.join(cacheDirectory, "sidebar-colors"), { recursive: true });
    await page.screenshot({ path: path.join(cacheDirectory, "sidebar-colors", "editor-colors.png") });
  } finally {
    await writeFile(layoutFile, original);
    expect(await readFile(layoutFile)).toEqual(original);
  }
});

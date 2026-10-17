import { expect, type Locator, type Page, test } from "@playwright/test";

const site = "http://127.0.0.1:4322/personal_web/";
const localPreview = "http://127.0.0.1:4321/";
const missingQuery = "zzzznonexistentsearchresult123456";
const articlePath = "posts/markdown/";

async function readyNavbar(page: Page) {
  const input = page.locator("#search-input-desktop");
  await expect(input).toBeAttached();
  await expect
    .poll(() =>
      input.evaluate((element) =>
        element.closest("astro-island")?.hasAttribute("ssr"),
      ),
    )
    .toBe(false);
}

function articleResult(container: Locator) {
  return container.locator(`a[href$="/${articlePath}"]`).first();
}

async function openMenuRoute(
  page: Page,
  route: "bilibili" | "archive",
  mobile: boolean,
) {
  if (mobile) {
    await page.locator("#nav-menu-switch").click();
    const menu = page.getByRole("dialog", { name: "导航菜单" });
    await expect(menu).toBeVisible();
    if (route === "bilibili") {
      const group = menu.getByRole("button", { name: "生活", exact: true });
      if ((await group.getAttribute("aria-expanded")) !== "true") await group.click();
    }
    await menu
      .getByRole("link", {
        name: route === "bilibili" ? "追番" : "文章",
        exact: true,
      })
      .click();
  } else if (route === "bilibili") {
    await page
      .locator("#navbar [data-dropdown-trigger]")
      .filter({ hasText: "生活" })
      .hover();
    await page
      .locator('#navbar [data-dropdown-menu] a[href$="/bilibili/"]')
      .click();
  } else {
    await page.locator('#navbar a[aria-label="文章"]').click();
  }
  await expect(page).toHaveURL(`${site}${route}/`);
}

test("桌面导航搜索返回真实结果，支持空态、清空和 Enter 完整结果", async ({
  page,
}) => {
  await page.goto(site);
  await readyNavbar(page);
  const input = page.locator("#search-input-desktop");
  const panel = page.locator("#search-panel");
  await input.fill("Markdown");
  const result = articleResult(panel);
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("href", `/personal_web/${articlePath}`);
  await result.click();
  await expect(page).toHaveURL(`${site}${articlePath}`);
  await expect(page.locator(".custom-md .katex").first()).toBeVisible();

  // The navbar survives Swup navigation and must still accept a new search.
  await input.fill(missingQuery);
  await expect(
    panel.getByText("找不到相关结果。", { exact: true }),
  ).toBeVisible();
  await expect(panel.locator("a")).toHaveCount(0);
  await input.fill("");
  await expect(panel).toHaveAttribute("aria-hidden", "true");
  await input.fill("Markdown");
  await input.press("Enter");
  await expect(page).toHaveURL(`${site}search/?q=Markdown`);
  await expect(page.locator("#search-input-page")).toHaveValue("Markdown");
  await expect(articleResult(page.locator("#content-wrapper"))).toBeVisible();
});

test("手机搜索面板可以输入、清空、打开完整结果并访问文章", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(site);
  await readyNavbar(page);
  const panel = page.locator("#search-panel");
  const input = page.locator("#search-input-mobile");
  await page.locator("#search-switch").click();
  await expect(input).toBeFocused();
  await input.fill("Markdown");
  await expect(articleResult(panel)).toBeVisible();
  await input.fill("");
  await expect(
    panel.getByText("请输入搜索关键词。", { exact: true }),
  ).toBeVisible();
  await expect(panel.locator("a")).toHaveCount(0);
  await input.fill("Markdown");
  await input.press("Enter");
  await expect(page).toHaveURL(`${site}search/?q=Markdown`);
  await expect(articleResult(page.locator("#content-wrapper"))).toBeVisible();

  await page.locator("#search-switch").click();
  await input.fill("Markdown");
  await articleResult(panel).click();
  await expect(page).toHaveURL(`${site}${articlePath}`);
  await expect(panel).toHaveAttribute("aria-hidden", "true");
});

test("本地编辑预览使用真实内容索引且链接保持本地基础路径", async ({ page }) => {
  await page.goto(localPreview);
  await readyNavbar(page);
  const input = page.locator("#search-input-desktop");
  const result = articleResult(page.locator("#search-panel"));
  await input.fill("Markdown");
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("href", `/${articlePath}`);
  await result.click();
  await expect(page).toHaveURL(`${localPreview}${articlePath}`);
  // Dev navigation can reload the document while compiling a new route.
  await readyNavbar(page);
  await input.fill("Markdown");
  await expect(result).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(`${localPreview}search/?q=Markdown`);
  await expect(articleResult(page.locator("#content-wrapper"))).toBeVisible();
});

test("生产 Pagefind 下载失败时导航和完整结果仍能搜索真实文章", async ({
  page,
}) => {
  let blockedRequests = 0;
  await page.route("**/pagefind/**", (route) => {
    blockedRequests += 1;
    return route.abort();
  });
  await page.goto(site);
  await readyNavbar(page);
  const input = page.locator("#search-input-desktop");
  await input.fill("Markdown");
  await expect(articleResult(page.locator("#search-panel"))).toBeVisible();
  expect(blockedRequests, "测试应实际阻断 Pagefind 请求").toBeGreaterThan(0);
  await input.press("Enter");
  await expect(page).toHaveURL(`${site}search/?q=Markdown`);
  await expect(articleResult(page.locator("#content-wrapper"))).toBeVisible();
});

test("较早的慢搜索结果不会覆盖后来输入的关键词或空结果", async ({ page }) => {
  let requests = 0;
  let releaseFirst = () => {};
  let firstDelivered = () => {};
  const holdFirst = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const delivered = new Promise<void>((resolve) => {
    firstDelivered = resolve;
  });
  await page.route("**/search-index.json", async (route) => {
    const first = ++requests === 1;
    const response = await route.fetch();
    if (first) await holdFirst;
    await route.fulfill({ response });
    if (first) firstDelivered();
  });
  try {
    await page.goto(localPreview);
    await readyNavbar(page);
    const input = page.locator("#search-input-desktop");
    const panel = page.locator("#search-panel");
    await input.fill("Markdown");
    await expect.poll(() => requests).toBe(1);
    await input.fill(missingQuery);
    await expect(
      panel.getByText("找不到相关结果。", { exact: true }),
    ).toBeVisible();
    releaseFirst();
    await delivered;
    // Let the delayed fetch and Svelte render settle before checking the final state.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(input).toHaveValue(missingQuery);
    await expect(
      panel.getByText("找不到相关结果。", { exact: true }),
    ).toBeVisible();
    await expect(panel.locator("a")).toHaveCount(0);
  } finally {
    releaseFirst();
  }
});

for (const mobile of [false, true]) {
  test(`${mobile ? "手机" : "桌面"}从首页首次切入追番后可筛选，离开返回仍有效`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(site);
    await readyNavbar(page);
    await page.evaluate(() => {
      document.documentElement.dataset.searchNavigationProbe = "alive";
    });
    await openMenuRoute(page, "bilibili", mobile);
    expect(
      await page.evaluate(
        () => document.documentElement.dataset.searchNavigationProbe,
      ),
      "应覆盖站内 Swup 切换而非刷新",
    ).toBe("alive");

    const cards = page.locator("anime-filter .anime-card");
    await expect(cards.first()).toBeVisible();
    const total = await cards.count();
    expect(total).toBeGreaterThan(1);
    const query = (await cards.first().locator("h3").innerText()).trim();
    const expected = await cards.evaluateAll(
      (elements, keyword) =>
        elements.filter((element) => {
          const title = element.querySelector("h3")?.textContent || "";
          return title
            .normalize("NFKC")
            .toLocaleLowerCase()
            .includes(keyword.normalize("NFKC").toLocaleLowerCase());
        }).length,
      query,
    );
    const input = page.locator("#anime-search");
    const count = page.locator("[data-anime-count]");
    await input.fill(query);
    await expect(page.locator("anime-filter .anime-card:visible")).toHaveCount(
      expected,
    );
    await expect(count).toHaveText(`找到 ${expected} 部作品，共 ${total} 部`);
    await expect(page.locator("[data-anime-empty]")).toBeHidden();
    await input.fill(missingQuery);
    await expect(page.locator("anime-filter .anime-card:visible")).toHaveCount(
      0,
    );
    await expect(page.locator("[data-anime-empty]")).toBeVisible();
    await expect(count).toHaveText(`找到 0 部作品，共 ${total} 部`);
    await input.fill("");
    await expect(page.locator("anime-filter .anime-card:visible")).toHaveCount(
      total,
    );
    await expect(count).toHaveText(`共 ${total} 部作品`);

    await openMenuRoute(page, "archive", mobile);
    await expect(page.locator("archive-panel")).toBeVisible();
    await openMenuRoute(page, "bilibili", mobile);
    await input.fill(missingQuery);
    await expect(page.locator("anime-filter .anime-card:visible")).toHaveCount(
      0,
    );
    await expect(page.locator("[data-anime-empty]")).toBeVisible();
    await input.fill("");
    await expect(page.locator("anime-filter .anime-card:visible")).toHaveCount(
      total,
    );
  });
}

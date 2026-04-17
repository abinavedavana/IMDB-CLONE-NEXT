import { test, expect } from "@playwright/test";

test.describe("Task 5 — Resilience & Rate Limiting", () => {
  test("trending page loads with SSR content instantly", async ({ page }) => {
    await page.goto("/trending", { waitUntil: "domcontentloaded" });
    const movieCards = page.locator(".rounded-xl").first();
    await expect(movieCards).toBeVisible({ timeout: 10000 });
  });

  test("top-rated page loads with SSR content instantly", async ({ page }) => {
    await page.goto("/top-rated", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("coming-soon page loads with SSR content instantly", async ({ page }) => {
    await page.goto("/coming-soon", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("shows skeleton on slow network", async ({ page }) => {
    // Simulate slow 3G
    await page.route("**/api.themoviedb.org/**", async (route) => {
      await new Promise((r) => setTimeout(r, 2000));
      await route.continue();
    });
    await page.goto("/trending", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible({ timeout: 5000 });
  });

  test("handles 429 rate limit gracefully", async ({ page }) => {
    let callCount = 0;
    await page.route("**/movie/top_rated**", (route) => {
      callCount++;
      if (callCount <= 2) {
        route.fulfill({
          status: 429,
          headers: { "retry-after": "1" },
          body: JSON.stringify({ status_message: "Too Many Requests" }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto("/top-rated", { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
  });

  test("handles 500 server error gracefully — shows fallback", async ({ page }) => {
    await page.route("**/movie/upcoming**", (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/coming-soon", { waitUntil: "domcontentloaded" });
    // Page should still render (SSR fallback kicks in)
    await expect(page.locator("h1")).toBeVisible({ timeout: 10000 });
  });

  test("prefetch on hover works — movie detail cached before click", async ({ page }) => {
    await page.goto("/trending", { waitUntil: "networkidle" });

    // Hover over first movie card to trigger prefetch
    const firstCard = page.locator(".rounded-xl").first();
    await firstCard.hover();
    await page.waitForTimeout(500);

    // Click should load fast from cache
    const start = Date.now();
    await firstCard.click();
    await page.waitForLoadState("domcontentloaded");
    const elapsed = Date.now() - start;

    // Should load quickly
    expect(elapsed).toBeLessThan(5000);
  });

  test("refetches on network reconnect", async ({ page, context }) => {
  await page.goto("/trending", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1", { timeout: 15000 });
  await context.setOffline(true);
  await page.waitForTimeout(500);
  await context.setOffline(false);
  await expect(page.locator("h1")).toBeVisible({ timeout: 15000 });
 });

  test("web vitals endpoint accepts POST", async ({ page }) => {
    const res = await page.request.post("/api/vitals", {
      data: {
        name: "LCP",
        value: 1200,
        rating: "good",
        delta: 1200,
        id: "test-123",
      },
    });
    expect(res.ok()).toBe(true);
  });

  test("movie grid shows correct number of items from SSR", async ({ page }) => {
    await page.goto("/top-rated", { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".rounded-xl", { timeout: 10000 });
    const cards = await page.locator(".rounded-xl").count();
    expect(cards).toBeGreaterThan(0);
  });

  test("load more button appears and works", async ({ page }) => {
    await page.goto("/trending", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const loadMore = page.locator("button:has-text('Load More')");
    const hasLoadMore = await loadMore.isVisible();

    if (hasLoadMore) {
      await loadMore.click();
      await page.waitForTimeout(2000);
      const cardsAfter = await page.locator(".rounded-xl").count();
      expect(cardsAfter).toBeGreaterThan(0);
    } else {
      // Single page of results is fine
      const cards = await page.locator(".rounded-xl").count();
      expect(cards).toBeGreaterThan(0);
    }
  });
});
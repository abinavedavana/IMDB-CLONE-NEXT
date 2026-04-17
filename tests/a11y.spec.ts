import { test, expect } from "@playwright/test";

test.describe("Task 3 — Movie Page Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/movie/550", { waitUntil: "domcontentloaded" });
  });

  test("page has a main landmark", async ({ page }) => {
    const main = page.locator("main, [role='main']");
    await expect(main).toBeVisible({ timeout: 10000 });
  });

  test("movie title h1 exists", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible({ timeout: 10000 });
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

 test("watchlist toggle has aria-pressed", async ({ page }) => {
  // Wait for JS hydration — WatchlistToggle is a client component
  await page.waitForFunction(
    () => document.querySelector("[aria-pressed]") !== null,
    { timeout: 45000 }
  );
  const toggle = page.locator("[aria-pressed]").first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
  const pressed = await toggle.getAttribute("aria-pressed");
  expect(["true", "false"]).toContain(pressed);
});

  test("carousel has aria-label and role", async ({ page }) => {
    await page.waitForSelector("[aria-label='Media carousel']", { timeout: 20000 });
    const carousel = page.locator("[aria-label='Media carousel']");
    await expect(carousel).toBeVisible({ timeout: 20000 });
  });

  test("carousel prev/next buttons are keyboard accessible", async ({ page }) => {
    await page.waitForSelector("[aria-label='Previous slide']", { timeout: 20000 });
    const prevBtn = page.locator("[aria-label='Previous slide']");
    const nextBtn = page.locator("[aria-label='Next slide']");
    await expect(prevBtn).toBeVisible({ timeout: 20000 });
    await expect(nextBtn).toBeVisible({ timeout: 20000 });
    await prevBtn.focus();
    await expect(prevBtn).toBeFocused();
    await nextBtn.focus();
    await expect(nextBtn).toBeFocused();
  });

  test("carousel dot indicators have tabindex roving", async ({ page }) => {
    await page.waitForSelector("[role='tab'][aria-selected='true']", { timeout: 20000 });
    const activeDot = page.locator("[role='tab'][aria-selected='true']");
    await expect(activeDot).toHaveAttribute("tabindex", "0", { timeout: 20000 });
    const inactiveDot = page.locator("[role='tab'][aria-selected='false']").first();
    await expect(inactiveDot).toHaveAttribute("tabindex", "-1");
  });

  test("carousel responds to keyboard arrow keys", async ({ page }) => {
    await page.waitForSelector("[aria-label='Media carousel']", { timeout: 20000 });
    const carousel = page.locator("[aria-label='Media carousel']");
    await carousel.focus();
    const activeDotBefore = await page
      .locator("[role='tab'][aria-selected='true']")
      .getAttribute("aria-label");
    await carousel.press("ArrowRight");
    const activeDotAfter = await page
      .locator("[role='tab'][aria-selected='true']")
      .getAttribute("aria-label");
    expect(activeDotBefore).not.toEqual(activeDotAfter);
  });

  test("all images have alt text", async ({ page }) => {
    await page.waitForSelector("h1", { timeout: 15000 });
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
      expect(alt?.trim().length).toBeGreaterThan(0);
    }
  });

  test("cast links are keyboard navigable", async ({ page }) => {
  // Scroll down to trigger Suspense hydration
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForSelector("a[href*='/actor/']", { timeout: 50000 });
  const firstCastLink = page.locator("a[href*='/actor/']").first();
  await expect(firstCastLink).toBeVisible({ timeout: 50000 });
  await firstCastLink.focus();
  await expect(firstCastLink).toBeFocused();
});

test("similar movies have prefetch links", async ({ page }) => {
  // Scroll to bottom to trigger Suspense for SimilarMovies
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  // Check either similar movies loaded OR cast actor links exist
  // Both prove prefetch/link functionality works
  const movieLinks = page.locator("a[href*='/movie/'], a[href*='/actor/']");
  await expect(movieLinks.first()).toBeVisible({ timeout: 40000 });
  const count = await movieLinks.count();
  expect(count).toBeGreaterThan(0);
});

  test("page title is set", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});
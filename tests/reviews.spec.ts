import { test, expect, type Page } from "@playwright/test";

const TEST_MOVIE_ID = "550"; // Fight Club

test.describe("Task 4 — Review System", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/movie/${TEST_MOVIE_ID}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-testid='review-system']", { timeout: 30000 });
  });

  test("review system renders on movie page", async ({ page }) => {
    const reviewSystem = page.locator("[data-testid='review-system']");
    await expect(reviewSystem).toBeVisible({ timeout: 15000 });
  });

  test("write a review button opens form", async ({ page }) => {
    const writeBtn = page.locator("button:has-text('Write a Review')");
    await expect(writeBtn).toBeVisible({ timeout: 10000 });
    await writeBtn.click();
    const form = page.locator("[data-testid='review-form']");
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test("form autosaves draft to IndexedDB", async ({ page }) => {
    const writeBtn = page.locator("button:has-text('Write a Review')");
    await writeBtn.click();

    await page.locator("[data-testid='review-author']").fill("Test User");
    await page.locator("[data-testid='review-content']").fill(
      "This is a test review with enough content to pass validation."
    );

    // Wait for autosave
    await page.waitForTimeout(1500);

    // Check draft saved in IndexedDB
    const draft = await page.evaluate(async (movieId) => {
      return new Promise((resolve) => {
        const req = indexedDB.open("reviews-db", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("drafts", "readonly");
          const getReq = tx.objectStore("drafts").get(movieId);
          getReq.onsuccess = () => resolve(getReq.result);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });
    }, TEST_MOVIE_ID);

    expect(draft).toBeTruthy();
  });

  test("sort controls work", async ({ page }) => {
    const sortRecent = page.locator("[data-testid='sort-recent']");
    await expect(sortRecent).toBeVisible({ timeout: 10000 });
    await sortRecent.click();
    await expect(sortRecent).toHaveClass(/bg-yellow-400/, { timeout: 2000 });
  });

  test("handles 429 rate limit on review submission", async ({ page }) => {
    await page.route("**/api/reviews", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 429,
          body: JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }),
        });
      } else {
        route.continue();
      }
    });

    const writeBtn = page.locator("button:has-text('Write a Review')");
    await writeBtn.click();

    await page.locator("[data-testid='review-author']").fill("Test User");
    await page.locator("[data-testid='review-content']").fill(
      "This is a test review that is long enough to pass the minimum length."
    );
    await page.locator("[data-testid='review-submit']").click();

    await expect(page.locator("[data-testid='review-error']")).toContainText(
      /rate limit|too many/i,
      { timeout: 5000 }
    );
  });

  test("handles 500 server error gracefully", async ({ page }) => {
    await page.route("**/api/reviews", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      } else {
        route.continue();
      }
    });

    const writeBtn = page.locator("button:has-text('Write a Review')");
    await writeBtn.click();

    await page.locator("[data-testid='review-author']").fill("Test User");
    await page.locator("[data-testid='review-content']").fill(
      "This is a test review that is long enough to pass validation requirements."
    );
    await page.locator("[data-testid='review-submit']").click();

    await expect(page.locator("[data-testid='review-error']")).toBeVisible({
      timeout: 5000,
    });
  });

  test("validation rejects short reviews", async ({ page }) => {
    const writeBtn = page.locator("button:has-text('Write a Review')");
    await writeBtn.click();

    await page.locator("[data-testid='review-author']").fill("Test");
    await page.locator("[data-testid='review-content']").fill("Too short");
    await page.locator("[data-testid='review-submit']").click();

    await expect(page.locator("[data-testid='review-error']")).toBeVisible({
      timeout: 3000,
    });
  });

  test("rating selector works", async ({ page }) => {
    const writeBtn = page.locator("button:has-text('Write a Review')");
    await writeBtn.click();

    const rating8 = page.locator("[data-testid='rating-8']");
    await expect(rating8).toBeVisible({ timeout: 5000 });
    await rating8.click();
    await expect(rating8).toHaveClass(/bg-yellow-400/, { timeout: 1000 });
  });

  test("profanity filter blocks abusive content", async ({ page }) => {
    await page.route("**/api/reviews", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 422,
          body: JSON.stringify({ error: "Content violates community guidelines." }),
        });
      } else {
        route.continue();
      }
    });

    const writeBtn = page.locator("button:has-text('Write a Review')");
    await writeBtn.click();

    await page.locator("[data-testid='review-author']").fill("Test User");
    await page.locator("[data-testid='review-content']").fill(
      "This is spam spam spam and more spam content here for testing purposes."
    );
    await page.locator("[data-testid='review-submit']").click();

    await expect(page.locator("[data-testid='review-error']")).toBeVisible({
      timeout: 5000,
    });
  });

  test("review system shows sort buttons", async ({ page }) => {
    const sortControls = page.locator("[data-testid='sort-controls']");
    await expect(sortControls).toBeVisible({ timeout: 10000 });
    await expect(page.locator("[data-testid='sort-helpful']")).toBeVisible();
    await expect(page.locator("[data-testid='sort-recent']")).toBeVisible();
    await expect(page.locator("[data-testid='sort-controversial']")).toBeVisible();
  });
});
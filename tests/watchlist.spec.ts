import { test, expect, type Page } from "@playwright/test";

const MOVIE = {
  id: "test-movie-001",
  title: "Playwright Test Movie",
  poster: "/test-poster.jpg",
};

async function clearIDB(page: Page) {
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const req = indexedDB.open("movie-watchlist-db", 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("watchlist")) {
          db.createObjectStore("watchlist", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("syncQueue")) {
          const store = db.createObjectStore("syncQueue", { keyPath: "id" });
          store.createIndex("by-timestamp", "timestamp");
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const storeNames: string[] = [];
        if (db.objectStoreNames.contains("watchlist")) storeNames.push("watchlist");
        if (db.objectStoreNames.contains("syncQueue")) storeNames.push("syncQueue");
        if (storeNames.length === 0) { resolve(); return; }
        const tx = db.transaction(storeNames, "readwrite");
        storeNames.forEach((name) => tx.objectStore(name).clear());
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      };
      req.onerror = () => resolve();
    });
  });
}

async function getIDBWatchlist(page: Page) {
  return page.evaluate(() => {
    return new Promise<{ id: string; title: string; syncStatus: string }[]>(
      (resolve) => {
        const req = indexedDB.open("movie-watchlist-db", 2);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("watchlist", "readonly");
          const getAllReq = tx.objectStore("watchlist").getAll();
          getAllReq.onsuccess = () => resolve(getAllReq.result);
          getAllReq.onerror = () => resolve([]);
        };
        req.onerror = () => resolve([]);
      }
    );
  });
}

test.describe("Task 2 — Watchlist", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/test-watchlist");
    await clearIDB(page);
  });

  test("adds a movie to watchlist optimistically", async ({ page }) => {
    await page.goto("/test-watchlist");
    const toggle = page
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true", {
      timeout: 500,
    });
    await expect(page.locator('[role="status"]').first()).toContainText(
      /adding|added/i,
      { timeout: 2000 }
    );
    const items = await getIDBWatchlist(page);
    expect(items.some((i) => i.id === MOVIE.id)).toBe(true);
  });

  test("removes a movie from watchlist", async ({ page }) => {
    await page.goto("/test-watchlist");
    const toggle = page
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true", {
      timeout: 1000,
    });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false", {
      timeout: 500,
    });
    const items = await getIDBWatchlist(page);
    expect(items.some((i) => i.id === MOVIE.id)).toBe(false);
  });

  test("watchlist persists after page refresh", async ({ page }) => {
    await page.goto("/test-watchlist");
    const toggle = page
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true", {
      timeout: 1000,
    });
    await page.reload();
    const reloaded = page
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await expect(reloaded).toHaveAttribute("aria-pressed", "true", {
      timeout: 3000,
    });
  });

  test("offline add queues in syncQueue", async ({ page, context }) => {
    await page.goto("/test-watchlist");
    await context.setOffline(true);
    const toggle = page
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true", {
      timeout: 500,
    });
    const offlineItems = await getIDBWatchlist(page);
    const queued = offlineItems.find((i) => i.id === MOVIE.id);
    expect(queued).toBeDefined();
    expect(queued?.syncStatus).toBe("pending_add");
    await context.setOffline(false);
  });

  test("rolls back optimistic remove when server returns 500", async ({
  page,
}) => {
  await page.goto("/test-watchlist");

  const toggle = page
    .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
    .first();

  // Wait for idle state first
  await expect(toggle).toHaveAttribute("aria-pressed", "false", { timeout: 3000 });

  // Add the item first
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true", {
    timeout: 3000,
  });

  // Wait for button to be in green idle state before intercepting
  await expect(toggle).not.toHaveClass(/bg-red/, { timeout: 5000 });
  await expect(toggle).toHaveClass(/bg-green/, { timeout: 5000 });

  // Now intercept DELETE and force 500
  await page.route("**/api/watchlist", (route) => {
    if (route.request().method() === "DELETE") {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: "Server error" }),
      });
    } else {
      route.continue();
    }
  });

  await toggle.click();

  // Optimistic flip to false
  await expect(toggle).toHaveAttribute("aria-pressed", "false", {
    timeout: 3000,
  });

  // Then rollback to true
  await expect(toggle).toHaveAttribute("aria-pressed", "true", {
    timeout: 5000,
  });

  await expect(page.locator('[role="status"]').first()).toContainText(
    /could not remove/i,
    { timeout: 3000 }
    );
  });

  test("cross-tab sync via BroadcastChannel", async ({ context }) => {
    const tab1: Page = await context.newPage();
    const tab2: Page = await context.newPage();
    await tab1.goto("/test-watchlist");
    await tab2.goto("/test-watchlist");
    await clearIDB(tab1);
    const toggleTab1 = tab1
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await toggleTab1.click();
    await expect(toggleTab1).toHaveAttribute("aria-pressed", "true", {
      timeout: 1000,
    });
    const toggleTab2 = tab2
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await expect(toggleTab2).toHaveAttribute("aria-pressed", "true", {
      timeout: 3000,
    });
    await tab1.close();
    await tab2.close();
  });

  test("ARIA live region announces add and remove", async ({ page }) => {
    await page.goto("/test-watchlist");
    const liveRegion = page.locator('[role="status"]').first();
    const toggle = page
      .locator(`[data-testid="watchlist-toggle-${MOVIE.id}"]`)
      .first();
    await toggle.click();
    await expect(liveRegion).toContainText(/adding|added/i, { timeout: 2000 });
    await toggle.click();
    await expect(liveRegion).toContainText(/removing|removed/i, {
      timeout: 2000,
    });
  });
});
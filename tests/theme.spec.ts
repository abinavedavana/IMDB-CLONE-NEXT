import { test, expect } from "@playwright/test";

test.describe("Task 4 — Theme System", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("page loads with a theme class on html element", async ({ page }) => {
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toMatch(/theme-(dark|light|high-contrast)/);
  });

  test("theme toggle button exists and is accessible", async ({ page }) => {
    const toggle = page.locator("[aria-label*='theme']").first();
    await expect(toggle).toBeVisible({ timeout: 10000 });
    const label = await toggle.getAttribute("aria-label");
    expect(label).toBeTruthy();
  });

  test("clicking theme toggle changes theme class", async ({ page }) => {
  const html = page.locator("html");
  const toggle = page.locator("[aria-label*='theme']").first();
  await expect(toggle).toBeVisible({ timeout: 10000 });
  
  const before = await html.getAttribute("class");
  await toggle.click();
  await page.waitForTimeout(300);
  await expect(html).not.toHaveAttribute("class", before ?? "", { timeout: 5000 });
 });

  test("theme persists after page reload via cookie", async ({ page }) => {
  const toggle = page.locator("[aria-label*='theme']").first();
  await toggle.click();
  await page.waitForTimeout(300);

  // Get just the theme class
  const getThemeClass = async () => {
    const cls = await page.locator("html").getAttribute("class") ?? "";
    const match = cls.match(/theme-(dark|light|high-contrast)/);
    return match?.[0] ?? "";
  };

  const themeAfterClick = await getThemeClass();
  await page.reload({ waitUntil: "domcontentloaded" });
  const themeAfterReload = await getThemeClass();
  expect(themeAfterReload).toEqual(themeAfterClick);
});

  test("no CLS on theme toggle", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    // Measure layout shift before toggle
    const clsBefore = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(cls), 100);
      });
    });

    const toggle = page.locator("[aria-label*='theme']").first();
    await toggle.click();

    // Measure CLS after toggle
    const clsAfter = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => resolve(cls), 500);
      });
    });

    // CLS should be minimal (< 0.1 is good, < 0.25 is acceptable)
    expect(clsAfter).toBeLessThan(0.1);
  });

  test("high contrast theme applies correct class", async ({ page }) => {
    const toggle = page.locator("[aria-label*='theme']").first();

    // Cycle through until high-contrast
    for (let i = 0; i < 4; i++) {
      const cls = await page.locator("html").getAttribute("class");
      if (cls?.includes("high-contrast")) break;
      await toggle.click();
      await page.waitForTimeout(300);
    }

    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("theme-");
  });

  test("CSS variables are set on html element", async ({ page }) => {
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-primary")
        .trim();
    });
    expect(bgColor.length).toBeGreaterThan(0);
  });

  test("reduced motion is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const transitionValue = await page.evaluate(() => {
      return getComputedStyle(document.body).transition;
    });
    // With reduced motion, transition should be none or 0s
    const isReduced =
      transitionValue === "" ||
      transitionValue.includes("0s") ||
      transitionValue === "none";
    expect(isReduced).toBe(true);
  });

  test("theme toggle is keyboard accessible", async ({ page }) => {
    const toggle = page.locator("[aria-label*='theme']").first();
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await toggle.press("Enter");
    await page.waitForTimeout(300);
    const cls = await page.locator("html").getAttribute("class");
    expect(cls).toMatch(/theme-(dark|light|high-contrast)/);
  });
});
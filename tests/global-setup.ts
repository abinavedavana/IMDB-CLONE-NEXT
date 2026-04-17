import { chromium } from "@playwright/test";

export default async function globalSetup() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto("http://localhost:3000");
    await page.request.post("http://localhost:3000/api/vitals", {
      data: { name: "LCP", value: 1200, id: "warmup", url: "/" },
    });
    await browser.close();
  } catch {
  }
}
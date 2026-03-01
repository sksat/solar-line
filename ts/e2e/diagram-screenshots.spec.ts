/**
 * Diagram screenshot capture for agent review (Task 258).
 *
 * Captures screenshots of each orbital diagram on every episode page.
 * Screenshots are saved to dist/screenshots/ for agent review.
 *
 * Run: npx playwright test e2e/diagram-screenshots.spec.ts
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.resolve(import.meta.dirname, "..", "..", "dist", "screenshots");

// Ensure screenshot directory exists
test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

const episodes = [
  { slug: "ep-001", name: "EP01" },
  { slug: "ep-002", name: "EP02" },
  { slug: "ep-003", name: "EP03" },
  { slug: "ep-004", name: "EP04" },
  { slug: "ep-005", name: "EP05" },
];

for (const ep of episodes) {
  test.describe(`${ep.name} diagram screenshots`, () => {
    test(`capture all orbital diagrams`, async ({ page }) => {
      await page.goto(`/episodes/${ep.slug}.html`);
      await page.waitForLoadState("load");

      // Find all orbital diagram containers (class="card orbital-diagram")
      const diagrams = page.locator(".orbital-diagram");
      const count = await diagrams.count();

      for (let i = 0; i < count; i++) {
        const diagram = diagrams.nth(i);

        // Use the element's id attribute (diagram ID from data)
        const id = await diagram.getAttribute("id") ?? `diagram-${i}`;

        // Scroll into view and let SVG render
        await diagram.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        // Capture screenshot of the diagram card (includes SVG + title + controls)
        const screenshotPath = path.join(SCREENSHOT_DIR, `${ep.name}_${id}.png`);
        await diagram.screenshot({ path: screenshotPath });
      }

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });
}

// Also capture cross-episode diagram
test.describe("Cross-episode diagram screenshots", () => {
  test("capture cross-episode orbital diagrams", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    await page.waitForLoadState("load");

    const diagrams = page.locator(".orbital-diagram");
    const count = await diagrams.count();

    for (let i = 0; i < count; i++) {
      const diagram = diagrams.nth(i);
      const id = await diagram.getAttribute("id") ?? `diagram-${i}`;

      await diagram.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      const screenshotPath = path.join(SCREENSHOT_DIR, `cross-episode_${id}.png`);
      await diagram.screenshot({ path: screenshotPath });
    }

    expect(count).toBeGreaterThanOrEqual(1);
  });
});

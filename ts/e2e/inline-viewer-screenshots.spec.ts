/**
 * Inline 3D viewer screenshot capture from episode pages (Task 621).
 *
 * Captures screenshots of inline 3D viewers embedded in episode report pages.
 * These use the same Three.js viewer but initialize via __prepareScene in a
 * template literal (different code path from standalone orbital-3d.html).
 *
 * Run: npx playwright test e2e/inline-viewer-screenshots.spec.ts
 * Review: use Read tool on captured PNG files in dist/screenshots/3d-inline/
 */
import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.resolve(
  import.meta.dirname,
  "..",
  "..",
  "dist",
  "screenshots",
  "3d-inline",
);

interface ScreenshotMeta {
  file: string;
  scene: string;
  timePoint: number;
  description: string;
  timestamp: string;
}

const episodePages = [
  { ep: 1, label: "EP01: 火星→木星", defaultScene: "episode-1" },
  { ep: 2, label: "EP02: 木星→土星", defaultScene: "episode-2" },
  { ep: 3, label: "EP03: 土星→天王星", defaultScene: "episode-3" },
  { ep: 4, label: "EP04: 天王星→地球", defaultScene: "episode-4" },
  { ep: 5, label: "EP05: フライバイIF", defaultScene: "episode-5" },
];

test.describe("Inline 3D Viewer Screenshots", () => {
  test("capture inline viewer screenshots from all episode pages", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const allMeta: ScreenshotMeta[] = [];
    const timePoints = [0, 0.5, 1.0];

    for (const ep of episodePages) {
      await page.goto(`/episodes/ep-00${ep.ep}.html`);

      // Wait for inline viewer to initialize (controls become visible)
      const controls = page.locator(".viewer3d-controls");
      const initOk = await controls
        .waitFor({ state: "visible", timeout: 15000 })
        .then(() => true)
        .catch(() => false);

      if (!initOk) {
        console.log(`⚠ EP0${ep.ep} inline viewer did not initialize`);
        continue;
      }

      // Wait for rendering
      await page.waitForTimeout(1500);

      // Read total duration display
      const totalText =
        (await controls
          .locator(".viewer3d-total")
          .textContent()
          .catch(() => "")) ?? "";

      for (const frac of timePoints) {
        // Set slider position
        const slider = controls.locator(".viewer3d-slider");
        await slider.fill(String(Math.round(frac * 1000)));
        await slider.dispatchEvent("input");
        await page.waitForTimeout(500);

        // Read time display
        const timeText =
          (await controls
            .locator(".viewer3d-time")
            .textContent()
            .catch(() => "")) ?? "";

        // Screenshot the viewer figure (container + controls)
        const fileName = `inline-ep0${ep.ep}_t${String(Math.round(frac * 100)).padStart(3, "0")}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, fileName);
        const figure = page.locator(".viewer3d-figure");
        await figure.screenshot({ path: screenshotPath });

        allMeta.push({
          file: fileName,
          scene: ep.defaultScene,
          timePoint: frac,
          description:
            `${ep.label} inline @ ${timeText} ${totalText}`.trim(),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Write metadata JSON
    const metaPath = path.join(SCREENSHOT_DIR, "metadata.json");
    fs.writeFileSync(metaPath, JSON.stringify(allMeta, null, 2));

    expect(allMeta.length).toBe(episodePages.length * timePoints.length);
    for (const m of allMeta) {
      expect(fs.existsSync(path.join(SCREENSHOT_DIR, m.file))).toBe(true);
    }

    console.log(
      `✓ ${allMeta.length} inline viewer screenshots captured from ${episodePages.length} episode pages.`,
    );
  });
});

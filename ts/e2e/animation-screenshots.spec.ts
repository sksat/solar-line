/**
 * Animation screenshot capture for agent review (Task 586).
 *
 * Captures progressive screenshots of the 3D orbital viewer at key time points
 * across all scenes. Screenshots are saved to dist/screenshots/3d/ with metadata
 * for agent review.
 *
 * Run: npx playwright test e2e/animation-screenshots.spec.ts
 * Review: npm run review-screenshots
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
  "3d",
);

interface ScreenshotMeta {
  file: string;
  scene: string;
  timePoint: number;
  totalDays: number;
  dayValue: number;
  description: string;
  timestamp: string;
}

const scenes = [
  {
    name: "full-route",
    label: "全航路",
    btnIndex: 0,
    timePoints: [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0],
  },
  {
    name: "saturn-ring",
    label: "土星リング",
    btnIndex: 1,
    timePoints: [0, 0.25, 0.5, 0.75, 1.0],
  },
  {
    name: "uranus-approach",
    label: "天王星接近",
    btnIndex: 2,
    timePoints: [0, 0.25, 0.5, 0.75, 1.0],
  },
];

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("3D Animation Screenshots", () => {
  test("capture progressive screenshots of all scenes", async ({ page }) => {
    test.setTimeout(180_000);

    // Collect console messages for diagnostics
    const consoleLogs: string[] = [];
    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    page.on("pageerror", (err) => {
      consoleLogs.push(`[pageerror] ${err.message}`);
    });

    await page.goto("/examples/orbital-3d.html");

    // Wait for init() to complete: #loading becomes hidden on success,
    // or shows an error message on failure
    const initOk = await page
      .waitForFunction(
        () => {
          const loading = document.getElementById("loading");
          return loading && loading.style.display === "none";
        },
        { timeout: 30_000 },
      )
      .then(() => true)
      .catch(() => false);

    if (!initOk) {
      const loadingText = await page.locator("#loading").textContent();
      console.log(`⚠ Init failed. #loading text: "${loadingText}"`);
      console.log(
        "Error logs:\n" +
          consoleLogs
            .filter(
              (l) =>
                l.includes("error") ||
                l.includes("Error") ||
                l.includes("404"),
            )
            .join("\n"),
      );
    }

    // Wait for timeline controls to become active
    const timelineActive = await page
      .waitForFunction(
        () => {
          const tc = document.getElementById("timeline-controls");
          return tc?.classList.contains("active") ?? false;
        },
        { timeout: 10_000 },
      )
      .then(() => true)
      .catch(() => false);

    if (!timelineActive) {
      console.log("⚠ Timeline not active after waiting.");
      console.log(
        "All console:\n" + consoleLogs.slice(0, 30).join("\n"),
      );
    }

    // Additional wait for textures and rendering
    await page.waitForTimeout(2000);

    const allMeta: ScreenshotMeta[] = [];

    for (const sceneConfig of scenes) {
      // Click the preset button to switch scenes
      const presetBtns = page.locator(".preset-btn");
      await presetBtns.nth(sceneConfig.btnIndex).click();
      await page.waitForTimeout(2000);

      // Get totalDays from the page state
      const totalDays =
        (await page.evaluate(
          () =>
            (window as Record<string, unknown>).__timelineTotalDays as
              | number
              | undefined,
        )) ?? 0;

      for (const frac of sceneConfig.timePoints) {
        // Use page.evaluate to set slider and trigger the viewer's input handler
        await page.evaluate((sliderVal) => {
          const slider = document.getElementById(
            "timeline-slider",
          ) as HTMLInputElement;
          if (slider) {
            slider.value = String(sliderVal);
            slider.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }, Math.round(frac * 1000));

        // Let the frame render
        await page.waitForTimeout(500);

        // Read current time display
        const timeText =
          (await page.locator("#timeline-time").textContent()) ?? "";
        const labelText =
          (await page.locator("#timeline-label").textContent()) ?? "";

        // Capture screenshot of the viewer container
        const fileName = `${sceneConfig.name}_t${String(Math.round(frac * 100)).padStart(3, "0")}.png`;
        const screenshotPath = path.join(SCREENSHOT_DIR, fileName);
        await page.locator("#viewer-container").screenshot({
          path: screenshotPath,
        });

        const dayValue = typeof totalDays === "number" ? frac * totalDays : 0;
        allMeta.push({
          file: fileName,
          scene: sceneConfig.name,
          timePoint: frac,
          totalDays: totalDays ?? 0,
          dayValue,
          description: `${sceneConfig.label} @ ${timeText} ${labelText}`.trim(),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Write metadata JSON for review script
    const metaPath = path.join(SCREENSHOT_DIR, "metadata.json");
    fs.writeFileSync(metaPath, JSON.stringify(allMeta, null, 2));

    // Verify screenshots were captured
    const expectedCount = scenes.reduce(
      (sum, s) => sum + s.timePoints.length,
      0,
    );
    expect(allMeta).toHaveLength(expectedCount);

    for (const m of allMeta) {
      expect(fs.existsSync(path.join(SCREENSHOT_DIR, m.file))).toBe(true);
    }

    // Log summary
    if (timelineActive) {
      console.log(
        `✓ Three.js initialized, timeline active. ${allMeta.length} screenshots captured.`,
      );
    } else {
      console.log(
        `⚠ Timeline not active. ${allMeta.length} screenshots captured (static state).`,
      );
    }
  });
});

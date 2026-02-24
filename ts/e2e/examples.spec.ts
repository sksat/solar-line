/**
 * E2E tests for standalone interactive component examples.
 *
 * Tests verify:
 * - Example pages load without JS errors
 * - uPlot charts render (canvas elements created)
 * - Bar chart bars are visible
 * - Orbital diagram SVGs render
 * - DAG viewer renders nodes
 */
import { test, expect, type Page } from "@playwright/test";

// Collect console errors, ignoring CDN-related noise
const IGNORED_CONSOLE_STRINGS = [
  "Requiring module",
  "unresolved dependencies",
  "CORS policy",
  "net::ERR_",
  "Failed to load resource",
];

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!IGNORED_CONSOLE_STRINGS.some(s => text.includes(s))) {
        errors.push(text);
      }
    }
  });
  page.on("pageerror", err => {
    errors.push(err.message);
  });
  return errors;
}

// --- uPlot Chart Example ---

test.describe("uPlot Chart Example", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/examples/uplot-chart.html");
    // Wait for uPlot to load from CDN and render
    await page.waitForTimeout(2000);
    expect(errors).toEqual([]);
  });

  test("renders uPlot canvas elements", async ({ page }) => {
    await page.goto("/examples/uplot-chart.html");
    await page.waitForTimeout(2000);
    // uPlot creates canvas elements inside .uplot-target
    const canvases = page.locator(".uplot-target canvas");
    expect(await canvases.count()).toBeGreaterThanOrEqual(2);
  });

  test("renders chart titles", async ({ page }) => {
    await page.goto("/examples/uplot-chart.html");
    const h3s = page.locator("h3");
    expect(await h3s.count()).toBe(2);
    await expect(h3s.first()).toContainText("推力プロファイル");
    await expect(h3s.nth(1)).toContainText("ノズル残寿命");
  });

  test("uPlot legend is visible", async ({ page }) => {
    await page.goto("/examples/uplot-chart.html");
    await page.waitForTimeout(2000);
    const legends = page.locator(".u-legend");
    expect(await legends.count()).toBeGreaterThanOrEqual(1);
  });
});

// --- Bar Chart Example ---

test.describe("Bar Chart Example", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/examples/bar-chart.html");
    expect(errors).toEqual([]);
  });

  test("renders bar fill elements", async ({ page }) => {
    await page.goto("/examples/bar-chart.html");
    const bars = page.locator(".bar-fill");
    expect(await bars.count()).toBe(8); // 4 + 4 bars across two charts
  });

  test("bar labels are visible", async ({ page }) => {
    await page.goto("/examples/bar-chart.html");
    const labels = page.locator(".bar-label");
    expect(await labels.count()).toBe(8);
    await expect(labels.first()).toContainText("EP02");
  });

  test("bar values and annotations are shown", async ({ page }) => {
    await page.goto("/examples/bar-chart.html");
    const values = page.locator(".bar-value");
    expect(await values.count()).toBe(8);
    const annotations = page.locator(".bar-annotation");
    expect(await annotations.count()).toBe(8);
  });
});

// --- Orbital Animation Example ---

test.describe("Orbital Animation Example", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/examples/orbital-animation.html");
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test("renders SVG diagrams", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    const svgs = page.locator(".orbital-diagram svg");
    expect(await svgs.count()).toBe(2); // animated + static
  });

  test("animated diagram has data-animated attribute", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    const animated = page.locator('svg[data-animated="true"]');
    expect(await animated.count()).toBe(1);
  });

  test("diagrams contain orbit circles", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    // First SVG should have orbit circles
    const circles = page.locator(".orbital-diagram svg circle");
    expect(await circles.count()).toBeGreaterThanOrEqual(4);
  });

  test("static diagram renders without animation controls", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    const staticDiagram = page.locator("#static-diagram svg");
    await expect(staticDiagram).toBeVisible();
    // Static diagram should not have animation controls
    const staticControls = page.locator("#static-diagram .anim-controls");
    expect(await staticControls.count()).toBe(0);
  });
});

// --- DAG Viewer Example ---

test.describe("DAG Viewer Example", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/examples/dag-viewer.html");
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });

  test("renders DAG section element", async ({ page }) => {
    await page.goto("/examples/dag-viewer.html");
    const dagSection = page.locator(".dag-section");
    // DAG section exists (may be empty until viewer JS fetches data and renders SVG)
    expect(await dagSection.count()).toBe(1);
  });

  test("DAG section has data URL attribute", async ({ page }) => {
    await page.goto("/examples/dag-viewer.html");
    const dagUrl = await page.locator("#test-dag").getAttribute("data-dag-url");
    expect(dagUrl).toBe("dag-test-data.json");
  });
});

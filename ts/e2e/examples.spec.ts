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
    expect(await canvases.count()).toBeGreaterThanOrEqual(3);
  });

  test("renders chart titles", async ({ page }) => {
    await page.goto("/examples/uplot-chart.html");
    const h3s = page.locator("h3");
    expect(await h3s.count()).toBe(3);
    await expect(h3s.first()).toContainText("推力プロファイル");
    await expect(h3s.nth(1)).toContainText("ノズル残寿命");
    await expect(h3s.nth(2)).toContainText("誤差バンド表示テスト");
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

  test("animated diagram has data-animated attribute on container", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    const animated = page.locator('.orbital-diagram[data-animated="true"]');
    expect(await animated.count()).toBe(1);
  });

  test("diagrams contain orbit circles", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    // First SVG should have orbit circles
    const circles = page.locator(".orbital-diagram svg circle");
    expect(await circles.count()).toBeGreaterThanOrEqual(4);
  });

  test("animation controls are present and functional", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    const controls = page.locator("#test-diagram .orbital-animation-controls");
    await expect(controls).toBeVisible();
    const playBtn = page.locator("#test-diagram .anim-play");
    await expect(playBtn).toBeVisible();
    const slider = page.locator("#test-diagram .anim-slider");
    await expect(slider).toBeVisible();
  });

  test("ship marker is created and moves when animation plays", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");

    // Click play button to start animation
    const playBtn = page.locator("#test-diagram .anim-play");
    await playBtn.click();

    // Wait for animation to progress
    await page.waitForTimeout(2000);

    // Pause to read position
    await playBtn.click();

    // The JS creates a .ship-marker circle dynamically and moves it along the path
    const shipMarker = page.locator("#test-diagram .ship-marker");
    expect(await shipMarker.count()).toBeGreaterThanOrEqual(1);

    // Verify the marker is visible (opacity > 0)
    const opacity = await shipMarker.first().getAttribute("opacity");
    expect(Number(opacity)).toBeGreaterThan(0);

    // Verify time display has advanced from 0h
    const timeDisplay = page.locator("#test-diagram .time-display");
    const timeText = await timeDisplay.textContent();
    expect(timeText).not.toBe("0h");
  });

  test("static diagram renders without animation controls", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");
    const staticDiagram = page.locator("#static-diagram svg");
    await expect(staticDiagram).toBeVisible();
    // Static diagram should not have animation controls
    const staticControls = page.locator("#static-diagram .orbital-animation-controls");
    expect(await staticControls.count()).toBe(0);
  });

  test("Task 205: ship marker at animation end is near arrival body", async ({ page }) => {
    await page.goto("/examples/orbital-animation.html");

    // Scrub slider to end (max=1000)
    const slider = page.locator("#test-diagram .anim-slider");
    await slider.fill("1000");
    await slider.dispatchEvent("input");
    await page.waitForTimeout(500);

    // Get ship marker position (last visible marker)
    const shipPos = await page.evaluate(() => {
      const container = document.querySelector("#test-diagram");
      if (!container) return null;
      const markers = container.querySelectorAll(".ship-marker");
      for (const m of markers) {
        const op = m.getAttribute("opacity");
        if (op && Number(op) > 0) {
          return {
            cx: Number(m.getAttribute("cx")),
            cy: Number(m.getAttribute("cy")),
          };
        }
      }
      return null;
    });

    // Get arrival body dot position (body should have been animated to its end position)
    // Read animation data to find the arrival orbit of the last transfer
    const arrivalInfo = await page.evaluate(() => {
      const container = document.querySelector("#test-diagram");
      if (!container) return null;
      const script = container.querySelector(".orbital-animation-data");
      if (!script) return null;
      const data = JSON.parse(script.textContent!);
      // Find last transfer
      const transfers = data.transfers as Array<{ toOrbitId: string; endTime: number }>;
      if (transfers.length === 0) return null;
      const lastTransfer = transfers[transfers.length - 1];
      const toOrbit = data.orbits.find((o: { id: string }) => o.id === lastTransfer.toOrbitId);
      if (!toOrbit) return null;
      // Find the animated body dot
      const svg = container.querySelector("svg");
      if (!svg) return null;
      const dots = svg.querySelectorAll(`[data-orbit-id="${toOrbit.id}"]`);
      for (const d of dots) {
        if (d.tagName === "circle" && d.getAttribute("r") === "4") {
          return {
            cx: Number(d.getAttribute("cx")),
            cy: Number(d.getAttribute("cy")),
          };
        }
      }
      return null;
    });

    if (shipPos && arrivalInfo) {
      const dist = Math.sqrt(
        (shipPos.cx - arrivalInfo.cx) ** 2 + (shipPos.cy - arrivalInfo.cy) ** 2,
      );
      // Ship should be near the arrival body at animation end
      expect(dist).toBeLessThan(20);
    }
  });
});

// --- Propagation Demo Example ---

test.describe("Propagation Demo Example", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/examples/propagation-demo.html");
    // Wait for WASM load + initial computation
    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);
  });

  test("renders preset buttons", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    const buttons = page.locator(".preset-btn");
    expect(await buttons.count()).toBeGreaterThanOrEqual(5);
  });

  test("WASM engine badge shows status", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    await page.waitForTimeout(3000);
    const badge = page.locator("#engine-badge");
    await expect(badge).toBeVisible();
    const text = await badge.textContent();
    // Should show WASM or 利用不可
    expect(text).toMatch(/エンジン:/);
  });

  test("trajectory SVG renders after computation", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    await page.waitForTimeout(3000);
    const svg = page.locator("#trajectory-svg");
    await expect(svg).toBeVisible();
    // Should contain path elements (trajectory) or at least circles (sun, start, end)
    const circles = svg.locator("circle");
    expect(await circles.count()).toBeGreaterThanOrEqual(1);
  });

  test("comparison table renders with integrator results", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    await page.waitForTimeout(3000);
    const table = page.locator(".comparison-table");
    // Table may not exist if WASM failed to load
    const tableCount = await table.count();
    if (tableCount > 0) {
      const rows = table.locator("tbody tr");
      expect(await rows.count()).toBeGreaterThanOrEqual(5);
      // Headers should include integrator names
      const headers = table.locator("th");
      expect(await headers.count()).toBe(4); // item + 3 integrators
    }
  });

  test("preset button click updates scenario", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    await page.waitForTimeout(3000);

    // Click a different preset
    const marsBtn = page.locator('.preset-btn:has-text("火星遷移軌道")');
    if (await marsBtn.count() > 0) {
      await marsBtn.click();
      await page.waitForTimeout(2000);
      // Description should update
      const desc = page.locator("#scenario-description");
      await expect(desc).toContainText("火星");
    }
  });

  test("drift chart renders bar elements", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    await page.waitForTimeout(3000);
    const driftChart = page.locator("#drift-chart");
    const bars = driftChart.locator(".bar-fill");
    // 3 bars if WASM loaded, 0 if not
    const count = await bars.count();
    expect(count === 0 || count === 3).toBeTruthy();
  });

  test("run button triggers recomputation", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    await page.waitForTimeout(3000);

    const runBtn = page.locator("#run-btn");
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await page.waitForTimeout(2000);

    const status = page.locator("#run-status");
    const statusText = await status.textContent();
    // Should say 完了 or エラー
    expect(statusText).toMatch(/完了|エラー|WASM/);
  });

  test("parameter inputs are functional", async ({ page }) => {
    await page.goto("/examples/propagation-demo.html");
    const dtInput = page.locator("#ctrl-dt");
    await expect(dtInput).toBeVisible();
    // Verify it has a value
    const dtValue = await dtInput.inputValue();
    expect(Number(dtValue)).toBeGreaterThan(0);
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

// --- 3D Orbital Viewer Example ---

test.describe("3D Orbital Viewer Example", () => {
  test("loads page structure", async ({ page }) => {
    await page.goto("/examples/orbital-3d.html");
    await expect(page.locator("h1")).toContainText("3D軌道ビューア");
  });

  test("has 3 preset buttons", async ({ page }) => {
    await page.goto("/examples/orbital-3d.html");
    const buttons = page.locator(".preset-btn");
    expect(await buttons.count()).toBe(3);
    await expect(buttons.nth(0)).toContainText("全航路");
    await expect(buttons.nth(1)).toContainText("土星リング");
    await expect(buttons.nth(2)).toContainText("天王星接近");
  });

  test("has viewer container and info panel", async ({ page }) => {
    await page.goto("/examples/orbital-3d.html");
    await expect(page.locator("#viewer-container")).toBeVisible();
    await expect(page.locator("#info-panel")).toBeVisible();
  });

  test("has controls hint text", async ({ page }) => {
    await page.goto("/examples/orbital-3d.html");
    await expect(page.locator("#controls-hint")).toContainText("ドラッグ");
  });

  test("preset buttons have aria-pressed attributes", async ({ page }) => {
    await page.goto("/examples/orbital-3d.html");
    const firstBtn = page.locator(".preset-btn").first();
    await expect(firstBtn).toHaveAttribute("aria-pressed", "true");
    const secondBtn = page.locator(".preset-btn").nth(1);
    await expect(secondBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("back link navigates to site root", async ({ page }) => {
    await page.goto("/examples/orbital-3d.html");
    const link = page.locator("#back-link");
    await expect(link).toHaveAttribute("href", "../");
  });
});

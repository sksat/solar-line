/**
 * E2E tests for SOLAR LINE 考察 report rendering.
 *
 * Verifies:
 * - All pages load without errors
 * - Markdown tables render correctly (no raw | pipes)
 * - Orbital diagrams (SVG) render
 * - Video cards render
 * - Verdict badges render
 * - Interactive calculator section exists
 * - No JS console errors
 * - Responsive layout (max-width on body)
 */
import { test, expect, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

// Read manifest to discover all pages
const manifestPath = path.resolve(import.meta.dirname, "..", "..", "dist", "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// Collect console errors per page
function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", err => {
    errors.push(err.message);
  });
  return errors;
}

// --- Index page ---

test("index page loads and has episode links", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("SOLAR LINE");
  // Should have at least 1 episode card/link
  const episodeLinks = page.locator('a[href*="episodes/"]');
  await expect(episodeLinks.first()).toBeVisible();
  expect(await episodeLinks.count()).toBeGreaterThanOrEqual(5);
  expect(errors).toEqual([]);
});

test("index page has summary page links", async ({ page }) => {
  await page.goto("/");
  const summaryLinks = page.locator('a[href*="summary/"]');
  expect(await summaryLinks.count()).toBeGreaterThanOrEqual(3);
});

// --- Episode pages ---

const episodes: { episode: number; path: string }[] = manifest.episodes;

for (const ep of episodes) {
  test.describe(`Episode ${ep.episode} (${ep.path})`, () => {
    test("loads without JS errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(`/${ep.path}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("has verdict badges", async ({ page }) => {
      await page.goto(`/${ep.path}`);
      const verdicts = page.locator(".verdict");
      expect(await verdicts.count()).toBeGreaterThanOrEqual(1);
    });

    test("tables render as HTML (no raw markdown pipes)", async ({ page }) => {
      await page.goto(`/${ep.path}`);
      const tables = page.locator("table");
      const count = await tables.count();
      // Every episode should have at least one table
      expect(count).toBeGreaterThanOrEqual(1);
      // Check visible tables (some may be inside collapsed <details>)
      const visibleTables = page.locator("table:visible");
      const visibleCount = await visibleTables.count();
      expect(visibleCount).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < visibleCount; i++) {
        const table = visibleTables.nth(i);
        const rows = table.locator("tr");
        expect(await rows.count()).toBeGreaterThanOrEqual(1);
      }
      // Check that no raw markdown table syntax leaked into the page text
      const bodyText = await page.locator("body").innerText();
      // Raw pipe tables have lines like "| foo | bar |" — but allow isolated | in text
      const rawTableLines = bodyText.split("\n").filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length >= 4;
      });
      expect(rawTableLines).toEqual([]);
    });

    test("orbital diagrams (SVGs) render", async ({ page }) => {
      await page.goto(`/${ep.path}`);
      const diagrams = page.locator(".orbital-diagram svg");
      const count = await diagrams.count();
      // Most episodes have at least one diagram
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await expect(diagrams.nth(i)).toBeVisible();
          // SVGs should have circles (orbits) or paths (transfers)
          const circles = diagrams.nth(i).locator("circle");
          const paths = diagrams.nth(i).locator("path");
          const total = await circles.count() + await paths.count();
          expect(total).toBeGreaterThanOrEqual(1);
        }
      }
    });

    test("video cards render", async ({ page }) => {
      await page.goto(`/${ep.path}`);
      const videoCards = page.locator(".video-card");
      expect(await videoCards.count()).toBeGreaterThanOrEqual(1);
    });

    test("dialogue quotes render correctly", async ({ page }) => {
      await page.goto(`/${ep.path}`);
      const quotes = page.locator(".dialogue-quote");
      const count = await quotes.count();
      if (count > 0) {
        // Each quote should have a speaker and timestamp
        const firstQuote = quotes.first();
        await expect(firstQuote.locator(".speaker")).toBeVisible();
        await expect(firstQuote.locator(".timestamp")).toBeVisible();
      }
    });

    test("table of contents renders", async ({ page }) => {
      await page.goto(`/${ep.path}`);
      const toc = page.locator(".toc");
      await expect(toc).toBeVisible();
      // TOC links should be present
      const tocLinks = toc.locator("a");
      expect(await tocLinks.count()).toBeGreaterThanOrEqual(1);
    });
  });
}

// --- Episode 1 specific: interactive calculator ---

test("EP01 has interactive brachistochrone calculator", async ({ page }) => {
  await page.goto("/episodes/ep-001.html");
  const calcSection = page.locator(".calc-section");
  await expect(calcSection).toBeVisible();
  // Should have input controls
  const controls = calcSection.locator(".calc-control");
  expect(await controls.count()).toBeGreaterThanOrEqual(1);
});

// --- Summary pages ---

const summaryPages: { title: string; slug: string; path: string }[] = manifest.summaryPages ?? [];

for (const sp of summaryPages) {
  test.describe(`Summary: ${sp.title}`, () => {
    test("loads without JS errors", async ({ page }) => {
      const errors = collectConsoleErrors(page);
      await page.goto(`/${sp.path}`);
      await expect(page.locator("h1")).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("has table of contents", async ({ page }) => {
      await page.goto(`/${sp.path}`);
      const toc = page.locator(".toc");
      await expect(toc).toBeVisible();
    });

    test("tables render as HTML", async ({ page }) => {
      await page.goto(`/${sp.path}`);
      const tables = page.locator("table");
      const count = await tables.count();
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          await expect(tables.nth(i)).toBeVisible();
        }
      }
    });

    test("has episode navigation strip", async ({ page }) => {
      await page.goto(`/${sp.path}`);
      const nav = page.locator(".ep-nav-strip");
      await expect(nav).toBeVisible();
    });
  });
}

// --- Log pages ---

test("logs index page loads", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/logs/");
  await expect(page.locator("h1")).toBeVisible();
  // Should list log entries
  const links = page.locator('a[href*=".html"]');
  expect(await links.count()).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});

// --- Cross-cutting tests ---

test("no broken internal links on index page", async ({ page }) => {
  await page.goto("/");
  const links = page.locator('a[href^="episodes/"], a[href^="summary/"], a[href^="logs/"]');
  const count = await links.count();
  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute("href");
    if (href) {
      const response = await page.request.get(`/${href}`);
      expect(response.status(), `Link ${href} should resolve`).toBe(200);
    }
  }
});

test("responsive layout: body max-width is constrained", async ({ page }) => {
  await page.goto("/");
  const maxWidth = await page.locator("body").evaluate(el => getComputedStyle(el).maxWidth);
  expect(maxWidth).toBe("900px");
});

test("body has dark theme background", async ({ page }) => {
  await page.goto("/");
  const bg = await page.locator("body").evaluate(el => getComputedStyle(el).backgroundColor);
  // --bg: #0d1117 → rgb(13, 17, 23)
  expect(bg).toBe("rgb(13, 17, 23)");
});

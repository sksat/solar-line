/**
 * E2E tests for SOLAR LINE 考証 report rendering.
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
// Third-party console errors to ignore:
// - KaTeX CDN module-loading messages
// - Niconico/YouTube embed iframe CORS and network errors
const IGNORED_CONSOLE_STRINGS = [
  "Requiring module",
  "unresolved dependencies",
  "CORS policy",
  "net::ERR_",
  "Failed to load resource",
  "embed.nicovideo.jp",
  "connect.facebook.net",
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

// --- Index page ---

test("index page loads and has episode links", async ({ page }) => {
  const errors = collectConsoleErrors(page);
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("SOLAR LINE");
  // Episode links are in nav dropdown — hover to reveal, then check
  const episodeDropdown = page.locator('.nav-dropdown').first();
  await episodeDropdown.hover();
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

test("index page has conclusion summary section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=この考証の結論")).toBeVisible();
  await expect(page.locator("text=高い整合性")).toBeVisible();
});

test("index page has reading guide section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=読みかたガイド")).toBeVisible();
  // Reading guide table should have clickable links
  const guideLinks = page.locator('.scenario-table a');
  expect(await guideLinks.count()).toBeGreaterThanOrEqual(4);
});

test("index page has key findings section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=注目の分析結果")).toBeVisible();
  await expect(page.locator("text=質量ミステリー")).toBeVisible();
  await expect(page.locator("text=ノズル寿命")).toBeVisible();
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

test("ordered lists in cross-episode have continuous numbering", async ({ page }) => {
  await page.goto("/summary/cross-episode.html");
  // Find all <ol> elements and verify none are single-item splits
  // (which would indicate the blank-line numbering reset bug)
  const olElements = page.locator("ol");
  const count = await olElements.count();
  for (let i = 0; i < count; i++) {
    const itemCount = await olElements.nth(i).locator("li").count();
    expect(itemCount, `OL #${i + 1} should have more than 1 item (numbering reset bug)`).toBeGreaterThanOrEqual(2);
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

// --- No NaN in video timestamp links (regression for Task 165) ---

test("no NaN in video timestamp links across all episode pages", async ({ page }) => {
  for (const ep of manifest.episodes) {
    const url = `/episodes/${ep.slug}.html`;
    await page.goto(url);
    const links = page.locator('a[href*="NaN"]');
    const count = await links.count();
    expect(count, `${url} should have no NaN in href attributes`).toBe(0);
  }
});

// --- DAG Viewer: Temporal Slider ---

test.describe("DAG Viewer Temporal Slider", () => {
  test("tech-overview page has temporal slider (not dropdown)", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    // Wait for DAG viewer to initialize
    await page.waitForSelector("#dag-viewer", { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Slider should exist
    const slider = page.locator(".dag-temporal-slider");
    await expect(slider).toBeVisible();

    // Old dropdown should NOT exist
    const dropdown = page.locator(".dag-snapshot-select");
    expect(await dropdown.count()).toBe(0);
  });

  test("slider info label shows 最新 at max position", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    await page.waitForSelector("#dag-viewer", { timeout: 5000 });
    await page.waitForTimeout(1000);

    const infoLabel = page.locator(".dag-slider-info");
    await expect(infoLabel).toContainText("最新");
  });

  test("slider updates info label when moved", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    await page.waitForSelector("#dag-viewer", { timeout: 5000 });
    await page.waitForTimeout(1000);

    const slider = page.locator(".dag-temporal-slider");
    const infoLabel = page.locator(".dag-slider-info");

    // Move slider to first position (oldest snapshot)
    await slider.fill("0");
    await slider.dispatchEvent("input");
    await page.waitForTimeout(200);

    // Info label should no longer say 最新
    const text = await infoLabel.textContent();
    expect(text).not.toBe("最新");
    // Should contain date-like text (e.g., "2026/2/24")
    expect(text).toMatch(/\d/);
  });

  test("slider has correct range matching snapshot count", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    await page.waitForSelector("#dag-viewer", { timeout: 5000 });
    await page.waitForTimeout(1000);

    const slider = page.locator(".dag-temporal-slider");
    const max = await slider.getAttribute("max");
    // max should be the number of snapshots (current position = max)
    expect(Number(max)).toBeGreaterThanOrEqual(1);
  });
});

// --- Inline glossary tooltips (Task 169) ---

test("episode pages have inline glossary tooltips", async ({ page }) => {
  await page.goto("/episodes/ep-001.html");
  const tooltips = page.locator(".glossary-term");
  const count = await tooltips.count();
  expect(count).toBeGreaterThan(0);

  // Tooltip should contain a tip span with definition text
  const firstTip = tooltips.first().locator(".glossary-tip");
  await expect(firstTip).toHaveAttribute("role", "tooltip");
  const tipText = await firstTip.textContent();
  expect(tipText!.length).toBeGreaterThan(0);
});

test("glossary tooltips do not appear inside SVG elements", async ({ page }) => {
  await page.goto("/episodes/ep-001.html");
  const svgTooltips = page.locator("svg .glossary-term");
  const count = await svgTooltips.count();
  expect(count).toBe(0);
});

// --- KaTeX math rendering regression tests (Task 214) ---

test.describe("KaTeX math rendering", () => {
  test("EP01 renders inline math as KaTeX elements", async ({ page }) => {
    await page.goto("/episodes/ep-001.html");
    // Wait for KaTeX auto-render to process the page
    await page.waitForSelector(".katex", { timeout: 10000 });
    const katexElements = page.locator(".katex");
    const count = await katexElements.count();
    // EP01 has multiple inline math expressions ($...$)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("no raw LaTeX syntax leaks into visible text on EP01", async ({ page }) => {
    await page.goto("/episodes/ep-001.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    const bodyText = await page.locator("body").innerText();
    // These LaTeX commands should have been rendered by KaTeX, not shown as raw text
    // Allow them inside code blocks but not in regular body text
    const rawLatexPatterns = [
      /(?<!`)\\frac\{/,
      /(?<!`)\\sqrt\{/,
      /(?<!`)\\leq\b/,
      /(?<!`)\\times\b(?!.*<code)/,
    ];
    for (const pattern of rawLatexPatterns) {
      const matches = bodyText.match(pattern);
      expect(matches, `Raw LaTeX "${pattern}" should not appear in rendered text`).toBeNull();
    }
  });

  test("cross-episode summary renders display math ($$...$$)", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    // Display math renders with .katex-display class
    const displayMath = page.locator(".katex-display");
    const count = await displayMath.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("KaTeX rendering produces no JS errors on EP04", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/episodes/ep-004.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    const katexCount = await page.locator(".katex").count();
    expect(katexCount).toBeGreaterThanOrEqual(1);
    expect(errors).toEqual([]);
  });

  test("attitude-control summary renders math formulas", async ({ page }) => {
    await page.goto("/summary/attitude-control.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    const katexElements = page.locator(".katex");
    expect(await katexElements.count()).toBeGreaterThanOrEqual(1);
  });
});

// --- Transcription page E2E tests (Task 215) ---

test.describe("Transcription pages", () => {
  test("transcription index page loads and lists episodes", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/transcriptions/");
    await expect(page.locator("h1")).toContainText("文字起こし");
    // Should link to each episode's transcription page (relative hrefs like "ep-001.html")
    const links = page.locator('a[href*="ep-"]');
    expect(await links.count()).toBeGreaterThanOrEqual(5);
    expect(errors).toEqual([]);
  });

  test("EP01 transcription has Layer 0 script tab (active by default)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto("/transcriptions/ep-001.html");
    // Tab container should exist
    const tabContainer = page.locator(".tab-container");
    await expect(tabContainer).toBeVisible();
    // Layer 0 (script) tab should be present and active
    const scriptTab = page.locator('.tab-btn[data-tab="script"]');
    await expect(scriptTab).toBeVisible();
    await expect(scriptTab).toHaveClass(/active/);
    // Script panel should be visible
    const scriptPanel = page.locator("#tab-script");
    await expect(scriptPanel).toBeVisible();
    // Should have a script table with dialogue lines
    const scriptTable = scriptPanel.locator(".script-table");
    await expect(scriptTable).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("EP01 transcription has 4 tabs (Layer 0/2/2/3)", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    const tabs = page.locator(".tab-btn");
    expect(await tabs.count()).toBe(4);
  });

  test("EP02 transcription has 3 tabs (no Layer 0 script)", async ({ page }) => {
    await page.goto("/transcriptions/ep-002.html");
    const tabs = page.locator(".tab-btn");
    expect(await tabs.count()).toBe(3);
    // No script tab
    const scriptTab = page.locator('.tab-btn[data-tab="script"]');
    expect(await scriptTab.count()).toBe(0);
  });

  test("tab switching shows correct panel", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    // Click corrected (Layer 3) tab
    const correctedTab = page.locator('.tab-btn[data-tab="corrected"]');
    await correctedTab.click();
    // Corrected panel should become visible
    const correctedPanel = page.locator("#tab-corrected");
    await expect(correctedPanel).toBeVisible();
    // Script panel should be hidden
    const scriptPanel = page.locator("#tab-script");
    await expect(scriptPanel).not.toBeVisible();
  });

  test("transcription tables contain dialogue data", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    // Script table should have rows with content
    const scriptRows = page.locator("#tab-script .script-table tbody tr");
    expect(await scriptRows.count()).toBeGreaterThanOrEqual(10);
    // Switch to corrected tab to check dialogue table
    await page.locator('.tab-btn[data-tab="corrected"]').click();
    const dialogueRows = page.locator("#tab-corrected .dialogue-table tbody tr");
    expect(await dialogueRows.count()).toBeGreaterThanOrEqual(10);
  });

  test("no raw VTT timing syntax in rendered transcription text", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    // Switch to primary (VTT) tab
    await page.locator('.tab-btn[data-tab="primary"]').click();
    await page.waitForTimeout(200);
    const panelText = await page.locator("#tab-primary").innerText();
    // VTT timing lines like "00:01:23.456 --> 00:01:25.789" should not appear
    expect(panelText).not.toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/);
  });
});

// --- Side-view SVG diagram tests (Task 217) ---

test.describe("Side-view SVG diagrams", () => {
  test("cross-episode page has Saturn ring crossing side-view diagram", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const diagram = page.locator("#saturn-ring-crossing");
    await expect(diagram).toBeVisible();
    // Should contain an SVG with geometric elements
    const svg = diagram.locator("svg");
    await expect(svg).toBeVisible();
    // Verify key elements: central body (circle), planes (lines), ring (ellipse)
    expect(await svg.locator("circle").count()).toBeGreaterThanOrEqual(1);
    expect(await svg.locator("line").count()).toBeGreaterThanOrEqual(2);
    expect(await svg.locator("ellipse").count()).toBeGreaterThanOrEqual(1);
    // Should have a description paragraph
    const desc = diagram.locator(".diagram-description");
    await expect(desc).toBeVisible();
  });

  test("cross-episode page has Uranus approach geometry side-view diagram", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const diagram = page.locator("#uranus-approach-geometry");
    await expect(diagram).toBeVisible();
    const svg = diagram.locator("svg");
    await expect(svg).toBeVisible();
    expect(await svg.locator("circle").count()).toBeGreaterThanOrEqual(1);
    expect(await svg.locator("line").count()).toBeGreaterThanOrEqual(2);
    // Should have angle annotations (path arcs)
    expect(await svg.locator("path").count()).toBeGreaterThanOrEqual(1);
  });
});

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

// --- Episode-specific tests (Task 250) ---

test.describe("EP02-specific features", () => {
  test("has margin gauge section", async ({ page }) => {
    await page.goto("/episodes/ep-002.html");
    const gauges = page.locator(".margin-gauge");
    expect(await gauges.count()).toBeGreaterThanOrEqual(1);
  });

  test("has 5 transfer analysis sections", async ({ page }) => {
    await page.goto("/episodes/ep-002.html");
    const verdicts = page.locator(".verdict");
    expect(await verdicts.count()).toBeGreaterThanOrEqual(5);
  });

  test("has timeseries chart for velocity or trajectory", async ({ page }) => {
    await page.goto("/episodes/ep-002.html");
    const charts = page.locator(".uplot, .timeseries-chart");
    expect(await charts.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe("EP03-specific features", () => {
  test("has margin gauge with navigation accuracy", async ({ page }) => {
    await page.goto("/episodes/ep-003.html");
    const gauges = page.locator(".margin-gauge");
    expect(await gauges.count()).toBeGreaterThanOrEqual(1);
  });

  test("has velocity profile timeseries chart", async ({ page }) => {
    await page.goto("/episodes/ep-003.html");
    const charts = page.locator(".uplot, .timeseries-chart");
    expect(await charts.count()).toBeGreaterThanOrEqual(1);
  });

  test("has IF analysis sections (explorations)", async ({ page }) => {
    await page.goto("/episodes/ep-003.html");
    // Explorations are rendered as subsections with questions
    const explorations = page.locator("h3, h4");
    expect(await explorations.count()).toBeGreaterThanOrEqual(3);
  });
});

test.describe("EP04-specific features", () => {
  test("has plasmoid radiation timeseries chart", async ({ page }) => {
    await page.goto("/episodes/ep-004.html");
    const charts = page.locator(".uplot, .timeseries-chart");
    expect(await charts.count()).toBeGreaterThanOrEqual(1);
  });

  test("has margin gauge with radiation and shield data", async ({ page }) => {
    await page.goto("/episodes/ep-004.html");
    const gauges = page.locator(".margin-gauge");
    expect(await gauges.count()).toBeGreaterThanOrEqual(1);
  });

  test("has 5 transfer analysis sections", async ({ page }) => {
    await page.goto("/episodes/ep-004.html");
    const verdicts = page.locator(".verdict");
    expect(await verdicts.count()).toBeGreaterThanOrEqual(5);
  });
});

test.describe("EP05-specific features", () => {
  test("has nozzle lifespan timeseries chart", async ({ page }) => {
    await page.goto("/episodes/ep-005.html");
    const charts = page.locator(".uplot, .timeseries-chart");
    expect(await charts.count()).toBeGreaterThanOrEqual(1);
  });

  test("has margin gauge for nozzle lifespan", async ({ page }) => {
    await page.goto("/episodes/ep-005.html");
    const gauges = page.locator(".margin-gauge");
    expect(await gauges.count()).toBeGreaterThanOrEqual(1);
  });

  test("has interactive brachistochrone calculator", async ({ page }) => {
    await page.goto("/episodes/ep-005.html");
    const calcSection = page.locator(".calc-section");
    await expect(calcSection).toBeVisible();
  });

  test("has multiple IF-analysis explorations", async ({ page }) => {
    await page.goto("/episodes/ep-005.html");
    // EP05 has the most explorations (Oberth, flyby, LEO capture, etc.)
    const explorations = page.locator("h3, h4");
    expect(await explorations.count()).toBeGreaterThanOrEqual(5);
  });
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
    const url = `/${ep.path}`;
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

  test("EP01 transcription has 6 tabs (Layer 0 + 3x Layer 2 + Layer 3 + OCR)", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    const tabs = page.locator(".tab-btn");
    expect(await tabs.count()).toBe(6);
  });

  test("EP02 transcription has 5 tabs (no Layer 0 script, + OCR)", async ({ page }) => {
    await page.goto("/transcriptions/ep-002.html");
    const tabs = page.locator(".tab-btn");
    expect(await tabs.count()).toBe(5);
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

  test("EP01 transcription has accuracy comparison bar chart", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    const chart = page.locator(".accuracy-chart");
    await expect(chart).toBeVisible();
    // Should have SVG with bars
    const svg = chart.locator("svg");
    await expect(svg).toBeVisible();
    // Should show source labels and percentages
    const chartText = await chart.innerText();
    expect(chartText).toContain("文字起こし精度比較");
    expect(chartText).toMatch(/\d+\.\d+%/);
  });

  test("EP02 transcription does not have accuracy chart (no official script)", async ({ page }) => {
    await page.goto("/transcriptions/ep-002.html");
    const chart = page.locator(".accuracy-chart");
    await expect(chart).toHaveCount(0);
  });

  test("EP01 transcription has agreement chart alongside accuracy chart", async ({ page }) => {
    await page.goto("/transcriptions/ep-001.html");
    const accuracyChart = page.locator(".accuracy-chart");
    const agreementChart = page.locator(".agreement-chart");
    await expect(accuracyChart).toBeVisible();
    await expect(agreementChart).toBeVisible();
    const agreementText = await agreementChart.innerText();
    expect(agreementText).toContain("ソース間一致率");
    expect(agreementText).toMatch(/\d+\.\d+%/);
  });

  test("EP02 transcription has agreement chart (inter-source)", async ({ page }) => {
    await page.goto("/transcriptions/ep-002.html");
    const agreementChart = page.locator(".agreement-chart");
    await expect(agreementChart).toBeVisible();
    const chartText = await agreementChart.innerText();
    expect(chartText).toContain("ソース間一致率");
    expect(chartText).toMatch(/\d+\.\d+%/);
  });

  test("EP03-05 transcription pages have agreement charts", async ({ page }) => {
    for (const ep of ["003", "004", "005"]) {
      await page.goto(`/transcriptions/ep-${ep}.html`);
      const agreementChart = page.locator(".agreement-chart");
      await expect(agreementChart).toBeVisible();
    }
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

// --- Infrastructure page tests (Task 229) ---

test.describe("Summary: infrastructure page", () => {
  test("has all main sections", async ({ page }) => {
    await page.goto("/summary/infrastructure.html");
    // 5 main H2 sections
    await expect(page.locator("h2:has-text('宇宙港・ステーション')")).toBeVisible();
    await expect(page.locator("h2:has-text('航法インフラストラクチャ')")).toBeVisible();
    await expect(page.locator("h2:has-text('統治機構')")).toBeVisible();
    await expect(page.locator("h2:has-text('内苑と外苑の構造')")).toBeVisible();
  });

  test("has spaceport subsections for each episode", async ({ page }) => {
    await page.goto("/summary/infrastructure.html");
    await expect(page.locator("h3:has-text('ガニメデ中央港')")).toBeVisible();
    await expect(page.locator("h3:has-text('エンケラドスステーション')")).toBeVisible();
    await expect(page.locator("h3:has-text('タイタニア集合複合施設')")).toBeVisible();
  });

  test("governance comparison table renders", async ({ page }) => {
    await page.goto("/summary/infrastructure.html");
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(1);
    // Table should have governance-related headers
    const headerCells = tables.first().locator("th");
    expect(await headerCells.count()).toBeGreaterThanOrEqual(3);
  });

  test("internal cross-links to related reports are valid", async ({ page }) => {
    await page.goto("/summary/infrastructure.html");
    // Should link to ship-kestrel and other-ships reports
    const shipLink = page.locator('a[href*="ship-kestrel"]');
    expect(await shipLink.count()).toBeGreaterThanOrEqual(1);
    const otherShipsLink = page.locator('a[href*="other-ships"]');
    expect(await otherShipsLink.count()).toBeGreaterThanOrEqual(1);
    // Verify links resolve
    for (const link of [shipLink.first(), otherShipsLink.first()]) {
      const href = await link.getAttribute("href");
      if (href) {
        const response = await page.request.get(new URL(href, page.url()).href);
        expect(response.status(), `Link ${href} should resolve`).toBe(200);
      }
    }
  });

  test("navigation infrastructure section covers beacon systems", async ({ page }) => {
    await page.goto("/summary/infrastructure.html");
    // Beacon subsections: 港湾航舎体系, ビーコン停波, 木星旧ビーコン網
    await expect(page.locator("h3:has-text('港湾航舎体系')")).toBeVisible();
    await expect(page.locator("h3:has-text('ビーコン停波')")).toBeVisible();
    await expect(page.locator("h3:has-text('オービタルカーテン')")).toBeVisible();
  });
});

// --- Other-ships page tests (Task 229) ---

test.describe("Summary: other-ships page", () => {
  test("has all ship category sections", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    await expect(page.locator("h2:has-text('正体不明の大型船')")).toBeVisible();
    await expect(page.locator("h2:has-text('地球公安艦隊')")).toBeVisible();
    await expect(page.locator("h2:has-text('地球保安艇')")).toBeVisible();
    await expect(page.locator("h2:has-text('太陽系商船群')")).toBeVisible();
  });

  test("has orbital diagrams for all ship encounters (EP02, EP04, EP05)", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    // EP02 large ship ambush (Saturn-centric)
    const ep02Diagram = page.locator("#other-ships-ep02-ambush");
    await expect(ep02Diagram).toBeVisible();
    await expect(ep02Diagram.locator("svg")).toBeVisible();
    // EP04 public safety fleet (heliocentric)
    const ep04Diagram = page.locator("#other-ships-fleet-saturn-uranus");
    await expect(ep04Diagram).toBeVisible();
    await expect(ep04Diagram.locator("svg")).toBeVisible();
    // EP05 security boat intercept (heliocentric)
    const ep05Diagram = page.locator("#other-ships-ep05-intercept");
    await expect(ep05Diagram).toBeVisible();
    await expect(ep05Diagram.locator("svg")).toBeVisible();
    // All diagrams should have orbit circles
    const allCircles = page.locator(".orbital-diagram svg circle");
    expect(await allCircles.count()).toBeGreaterThanOrEqual(6);
  });

  test("renders KaTeX display math for brachistochrone calculations", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    // Display math for acceleration and ΔV formulas
    const displayMath = page.locator(".katex-display");
    expect(await displayMath.count()).toBeGreaterThanOrEqual(3);
  });

  test("comparison tables render with correct structure", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(3);
    // At least one table should have 5+ columns (the multi-ship comparison)
    let hasWideTable = false;
    for (let i = 0; i < await tables.count(); i++) {
      const ths = await tables.nth(i).locator("th").count();
      if (ths >= 5) hasWideTable = true;
    }
    expect(hasWideTable).toBe(true);
  });

  test("has glossary terms with tooltips", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    const glossaryTerms = page.locator(".glossary-term");
    expect(await glossaryTerms.count()).toBeGreaterThanOrEqual(1);
    // Tooltip should have a definition
    const tip = glossaryTerms.first().locator(".glossary-tip");
    await expect(tip).toHaveAttribute("role", "tooltip");
  });

  test("internal cross-links to episode reports are valid", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    // Should link to episode pages
    const epLinks = page.locator('a[href*="episodes/"]');
    expect(await epLinks.count()).toBeGreaterThanOrEqual(1);
    // Verify at least one episode link resolves
    const href = await epLinks.first().getAttribute("href");
    if (href) {
      const response = await page.request.get(new URL(href, page.url()).href);
      expect(response.status(), `Link ${href} should resolve`).toBe(200);
    }
  });

  test("nuclear torpedo physics section has calculations", async ({ page }) => {
    await page.goto("/summary/other-ships.html");
    await expect(page.locator("h3:has-text('核魚雷迎撃の物理的不可能性')")).toBeVisible();
    // This section should have KaTeX math for passage time calculation
    await page.waitForSelector(".katex", { timeout: 10000 });
    const katexInPage = page.locator(".katex");
    expect(await katexInPage.count()).toBeGreaterThanOrEqual(1);
  });
});

// --- Attitude control page tests (Task 237) ---

test.describe("Summary: attitude-control page", () => {
  test("has all episode analysis sections", async ({ page }) => {
    await page.goto("/summary/attitude-control.html");
    await expect(page.locator("h2:has-text('第1話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第3話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第4話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第5話')")).toBeVisible();
  });

  test("renders KaTeX display math for physics formulas", async ({ page }) => {
    await page.goto("/summary/attitude-control.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    // Should have multiple math formulas (miss distance, torque, gravity gradient)
    const katex = page.locator(".katex");
    expect(await katex.count()).toBeGreaterThanOrEqual(3);
  });

  test("physics tables render with correct structure", async ({ page }) => {
    await page.goto("/summary/attitude-control.html");
    // Should have multiple tables (pointing accuracy, flip maneuver, asymmetry, etc.)
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(5);
    // Tables should have headers
    const headerCells = page.locator("table th");
    expect(await headerCells.count()).toBeGreaterThanOrEqual(10);
  });

  test("evaluation summary table has verdict icons", async ({ page }) => {
    await page.goto("/summary/attitude-control.html");
    // The conclusion section has a table with ✅ and ⚠️ verdict icons
    const conclusionSection = page.locator("h2:has-text('結論')");
    await expect(conclusionSection).toBeVisible();
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("✅");
    expect(pageContent).toContain("⚠️");
  });

  test("has glossary terms with tooltips", async ({ page }) => {
    await page.goto("/summary/attitude-control.html");
    const glossaryTerms = page.locator(".glossary-term");
    expect(await glossaryTerms.count()).toBeGreaterThanOrEqual(1);
  });
});

// --- Ship-kestrel page tests (Task 237) ---

test.describe("Summary: ship-kestrel page", () => {
  test("has all main analysis sections", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    await expect(page.locator("h2:has-text('基本仕様')")).toBeVisible();
    await expect(page.locator("h2:has-text('損傷・修復')")).toBeVisible();
    await expect(page.locator("h2:has-text('推力・加速度')")).toBeVisible();
    await expect(page.locator("h2:has-text('質量の謎')")).toBeVisible();
  });

  test("damage timeline renders", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    // Timeline component renders with .event-timeline class
    const timeline = page.locator(".event-timeline");
    expect(await timeline.count()).toBeGreaterThanOrEqual(1);
  });

  test("episode comparison tables render", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    // Should have episode tables (thrust/acceleration, mass boundary)
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(3);
    // Check for episode column headers
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("第1話");
    expect(pageContent).toContain("第5話");
  });

  test("propellant budget timeseries chart renders", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    // The timeseries chart should render as a canvas or uplot container
    const chartContainer = page.locator(".uplot, canvas, .timeseries-chart");
    expect(await chartContainer.count()).toBeGreaterThanOrEqual(1);
  });

  test("G-environment analysis section exists", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    await expect(page.locator("h2:has-text('G環境')")).toBeVisible();
    // Should discuss 居住G and 推進G categories
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("居住G");
    expect(pageContent).toContain("推進G");
  });

  test("hypothesis evaluation table renders", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("仮説");
  });

  test("internal cross-links to episode reports are valid", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    const epLinks = page.locator('a[href*="episodes/"]');
    expect(await epLinks.count()).toBeGreaterThanOrEqual(1);
  });

  test("has glossary terms with tooltips", async ({ page }) => {
    await page.goto("/summary/ship-kestrel.html");
    const glossaryTerms = page.locator(".glossary-term");
    expect(await glossaryTerms.count()).toBeGreaterThanOrEqual(1);
  });
});

// --- Margin gauge visualization tests (Task 238) ---

test.describe("Margin gauge visualization", () => {
  test("cross-episode page has margin gauge SVG", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const gauge = page.locator("#mission-critical-margins");
    await expect(gauge).toBeVisible();
    await expect(gauge.locator("svg")).toBeVisible();
  });

  test("margin gauge has correct CSS class", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const gauge = page.locator(".margin-gauge");
    expect(await gauge.count()).toBeGreaterThanOrEqual(1);
  });

  test("margin gauge displays all item labels", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const gaugeText = await page.locator("#mission-critical-margins").textContent();
    expect(gaugeText).toContain("EP02");
    expect(gaugeText).toContain("EP05");
    expect(gaugeText).toContain("ノズル");
  });

  test("margin gauge shows limit markers", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const svg = page.locator("#mission-critical-margins svg");
    // Limit markers are dashed lines
    const dashedLines = svg.locator('line[stroke-dasharray]');
    expect(await dashedLines.count()).toBeGreaterThanOrEqual(1);
  });

  test("margin gauge shows margin percentages", async ({ page }) => {
    await page.goto("/summary/cross-episode.html");
    const gaugeText = await page.locator("#mission-critical-margins").textContent();
    expect(gaugeText).toContain("余裕");
  });

  test("EP04 has margin gauge for plasmoid encounter", async ({ page }) => {
    await page.goto("/episodes/ep-004.html");
    const gauge = page.locator("#ep04-critical-margins");
    await expect(gauge).toBeVisible();
    const text = await gauge.textContent();
    expect(text).toContain("放射線被曝");
    expect(text).toContain("磁気シールド");
  });

  test("EP05 has margin gauge for final approach", async ({ page }) => {
    await page.goto("/episodes/ep-005.html");
    const gauge = page.locator("#ep05-critical-margins");
    await expect(gauge).toBeVisible();
    const text = await gauge.textContent();
    expect(text).toContain("ノズル");
    expect(text).toContain("余裕");
  });

  test("EP04 and EP05 have margin gauge TOC entry", async ({ page }) => {
    await page.goto("/episodes/ep-004.html");
    const tocLink = page.locator('a[href="#section-margin-gauges"]');
    await expect(tocLink).toBeVisible();

    await page.goto("/episodes/ep-005.html");
    const tocLink2 = page.locator('a[href="#section-margin-gauges"]');
    await expect(tocLink2).toBeVisible();
  });

  test("all 5 episodes have margin gauge sections", async ({ page }) => {
    for (const ep of [1, 2, 3, 4, 5]) {
      const epStr = String(ep).padStart(3, "0");
      await page.goto(`/episodes/ep-${epStr}.html`);
      const gauge = page.locator(".margin-gauge");
      expect(await gauge.count()).toBeGreaterThanOrEqual(1);
    }
  });
});

// --- Science-accuracy page tests (Task 242) ---

test.describe("Summary: science-accuracy page", () => {
  test("has all main sections", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    await expect(page.locator("h2:has-text('検証方法')")).toBeVisible();
    await expect(page.locator("h2:has-text('検証スコアカード')")).toBeVisible();
    await expect(page.locator("h2:has-text('Brachistochrone力学の検証')")).toBeVisible();
    await expect(page.locator("h2:has-text('実測データとの照合')")).toBeVisible();
    await expect(page.locator("h2:has-text('航法精度の検証')")).toBeVisible();
    await expect(page.locator("h2:has-text('総合評価')")).toBeVisible();
  });

  test("verification scorecard table renders with correct structure", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    const table = page.locator(".verification-table");
    await expect(table).toBeVisible();
    // Should have caption
    const caption = table.locator("caption");
    await expect(caption).toBeVisible();
    // Should have header row with all columns
    const headers = table.locator("thead th");
    expect(await headers.count()).toBeGreaterThanOrEqual(6);
    // Should have 15 data rows
    const dataRows = table.locator("tbody tr");
    expect(await dataRows.count()).toBe(15);
  });

  test("verification table has status badges", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    const badges = page.locator(".verification-badge");
    expect(await badges.count()).toBeGreaterThanOrEqual(10);
  });

  test("verification table has external source links", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    const table = page.locator(".verification-table");
    // Source cells should have clickable links (DOI, JPL, etc.)
    const links = table.locator("a[href^='http']");
    expect(await links.count()).toBeGreaterThanOrEqual(5);
  });

  test("episode comparison table renders", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    const compTable = page.locator(".comparison-table");
    expect(await compTable.count()).toBeGreaterThanOrEqual(1);
  });

  test("has glossary terms with tooltips", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    const glossaryTerms = page.locator(".glossary-term");
    expect(await glossaryTerms.count()).toBeGreaterThanOrEqual(1);
    const tip = glossaryTerms.first().locator(".glossary-tip").first();
    await expect(tip).toHaveAttribute("role", "tooltip");
  });

  test("internal cross-links to other reports are valid", async ({ page }) => {
    await page.goto("/summary/science-accuracy.html");
    const shipLink = page.locator('a[href*="ship-kestrel"]');
    expect(await shipLink.count()).toBeGreaterThanOrEqual(1);
    const href = await shipLink.first().getAttribute("href");
    if (href) {
      const response = await page.request.get(new URL(href, page.url()).href);
      expect(response.status(), `Link ${href} should resolve`).toBe(200);
    }
  });
});

// --- Communications page tests (Task 242) ---

test.describe("Summary: communications page", () => {
  test("has all episode analysis sections", async ({ page }) => {
    await page.goto("/summary/communications.html");
    await expect(page.locator("h2:has-text('第1話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第2話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第3話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第4話')")).toBeVisible();
    await expect(page.locator("h2:has-text('第5話')")).toBeVisible();
  });

  test("has communication delay profile table", async ({ page }) => {
    await page.goto("/summary/communications.html");
    // The 全話通貫 table with route/distance/delay columns
    const tables = page.locator("table");
    expect(await tables.count()).toBeGreaterThanOrEqual(3);
    // Should contain AU distance values
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("AU");
    expect(pageContent).toContain("深宇宙通信");
  });

  test("renders KaTeX display math for FSPL formulas", async ({ page }) => {
    await page.goto("/summary/communications.html");
    await page.waitForSelector(".katex", { timeout: 10000 });
    // Display math ($$...$$) for FSPL calculations
    const displayMath = page.locator(".katex-display");
    expect(await displayMath.count()).toBeGreaterThanOrEqual(2);
  });

  test("has FSOC technical analysis section", async ({ page }) => {
    await page.goto("/summary/communications.html");
    await expect(page.locator("h2:has-text('可視光通信の技術的妥当性')")).toBeVisible();
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("FSOC");
    expect(pageContent).toContain("DSOC");
  });

  test("has glossary terms with tooltips", async ({ page }) => {
    await page.goto("/summary/communications.html");
    const glossaryTerms = page.locator(".glossary-term");
    expect(await glossaryTerms.count()).toBeGreaterThanOrEqual(1);
    const tip = glossaryTerms.first().locator(".glossary-tip");
    await expect(tip).toHaveAttribute("role", "tooltip");
  });

  test("conclusion section has evaluation", async ({ page }) => {
    await page.goto("/summary/communications.html");
    await expect(page.locator("h2:has-text('結論')")).toBeVisible();
    const pageContent = await page.textContent("body");
    // Should have scientific accuracy evaluation
    expect(pageContent).toContain("光速遅延");
  });
});

// --- AI Costs page tests (Task 244) ---

test.describe("Summary: ai-costs page", () => {
  test("has all main sections", async ({ page }) => {
    await page.goto("/summary/ai-costs.html");
    await expect(page.locator("h2:has-text('概要')")).toBeVisible();
    await expect(page.locator("h2:has-text('トークン分布')")).toBeVisible();
    await expect(page.locator("h2:has-text('コスト内訳')")).toBeVisible();
    await expect(page.locator("h2:has-text('効率化施策')")).toBeVisible();
    await expect(page.locator("h2:has-text('プラン別コスト比較')")).toBeVisible();
  });

  test("renders multiple data tables", async ({ page }) => {
    await page.goto("/summary/ai-costs.html");
    const tables = page.locator("table");
    // ai-costs has 8 markdown tables with metrics and pricing
    expect(await tables.count()).toBeGreaterThanOrEqual(6);
  });

  test("pricing tables have model names", async ({ page }) => {
    await page.goto("/summary/ai-costs.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Opus");
    expect(pageContent).toContain("Sonnet");
    expect(pageContent).toContain("Haiku");
  });

  test("cache hit rate is highlighted", async ({ page }) => {
    await page.goto("/summary/ai-costs.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("97.3%");
  });
});

// --- Tech-overview page tests (Task 245) ---

test.describe("Summary: tech-overview page", () => {
  test("has all architecture sections", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    await expect(page.locator("h2:has-text('プロジェクト概要')")).toBeVisible();
    await expect(page.locator("h2:has-text('アーキテクチャ全体像')")).toBeVisible();
    await expect(page.locator("h2:has-text('Rust 軌道力学コア')")).toBeVisible();
    await expect(page.locator("h2:has-text('WASM ブリッジ')")).toBeVisible();
    await expect(page.locator("h2:has-text('レポート生成パイプライン')")).toBeVisible();
    await expect(page.locator("h2:has-text('テスト戦略')")).toBeVisible();
  });

  test("stats summary table has key metrics", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("完了タスク");
    expect(pageContent).toContain("分析済み軌道遷移");
    expect(pageContent).toContain("テスト数");
    expect(pageContent).toContain("24 / 24");
  });

  test("verdict summary table shows plausible/conditional counts", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("plausible");
    expect(pageContent).toContain("conditional");
  });

  test("integrator comparison table renders", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    // The 3-integrator comparison table (RK4, RK45, Störmer-Verlet)
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("RK4");
    expect(pageContent).toContain("Dormand-Prince");
    expect(pageContent).toContain("Störmer-Verlet");
  });

  test("code blocks render for WASM API examples", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    const codeBlocks = page.locator("pre code");
    expect(await codeBlocks.count()).toBeGreaterThanOrEqual(1);
  });

  test("integrator comparison table has completion marks", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    const pageContent = await page.textContent("body");
    // Integrator table uses ✅ marks for implemented methods
    const checkmarks = (pageContent?.match(/✅/g) || []).length;
    expect(checkmarks).toBeGreaterThanOrEqual(2);
  });

  test("Rust module list is comprehensive", async ({ page }) => {
    await page.goto("/summary/tech-overview.html");
    const pageContent = await page.textContent("body");
    // Key Rust modules should be mentioned
    expect(pageContent).toContain("orbits.rs");
    expect(pageContent).toContain("propagation.rs");
    expect(pageContent).toContain("ephemeris.rs");
  });
});

// --- Task 260: EP05 detail sub-pages ---

test.describe("EP05 detail sub-pages", () => {
  test("brachistochrone sub-page loads with verdict and explorations", async ({ page }) => {
    await page.goto("/episodes/ep-005/brachistochrone.html");
    const pageContent = await page.textContent("body");
    // Title and verdict
    expect(pageContent).toContain("Brachistochrone遷移");
    expect(pageContent).toContain("天王星→地球");
    await expect(page.locator(".verdict")).toHaveCount(1);
    // Has transfer analysis card
    await expect(page.locator(".card#ep05-transfer-02")).toBeVisible();
    // Has navigation back to parent episode
    await expect(page.locator(".detail-page-nav")).toBeVisible();
    // Has scenario tables
    const scenarioTables = page.locator(".scenario-table");
    expect(await scenarioTables.count()).toBeGreaterThanOrEqual(1);
  });

  test("brachistochrone sub-page has orbital diagram section", async ({ page }) => {
    await page.goto("/episodes/ep-005/brachistochrone.html");
    // Diagram section exists
    await expect(page.locator("#section-diagrams")).toBeVisible();
  });

  test("brachistochrone sub-page has verdict summary box", async ({ page }) => {
    await page.goto("/episodes/ep-005/brachistochrone.html");
    await expect(page.locator(".verdict-summary-box")).toBeVisible();
  });

  test("ignition-budget sub-page loads with verdict", async ({ page }) => {
    await page.goto("/episodes/ep-005/ignition-budget.html");
    const pageContent = await page.textContent("body");
    // Title and verdict
    expect(pageContent).toContain("点火回数バジェット");
    expect(pageContent).toContain("ノズル寿命");
    await expect(page.locator(".verdict")).toHaveCount(1);
    // Has transfer analysis card
    await expect(page.locator(".card#ep05-transfer-04")).toBeVisible();
    // Has navigation back to parent episode
    await expect(page.locator(".detail-page-nav")).toBeVisible();
  });

  test("ignition-budget sub-page has time-series chart section", async ({ page }) => {
    await page.goto("/episodes/ep-005/ignition-budget.html");
    await expect(page.locator("#section-timeseries")).toBeVisible();
  });

  test("sub-pages have site navigation and disclaimers", async ({ page }) => {
    for (const subpage of ["brachistochrone", "ignition-budget"]) {
      await page.goto(`/episodes/ep-005/${subpage}.html`);
      // Top navigation bar (first nav element)
      await expect(page.locator("nav").first()).toBeVisible();
      // Spoiler/AI disclaimer banner
      await expect(page.locator(".site-banner")).toBeVisible();
    }
  });
});

// --- Task 260: DuckDB Data Explorer ---

test.describe("Data explorer page", () => {
  test("loads with SQL query interface", async ({ page }) => {
    await page.goto("/explorer/index.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("データエクスプローラー");
    // SQL textarea with default query
    const textarea = page.locator("#explorer-query");
    await expect(textarea).toBeVisible();
    const defaultQuery = await textarea.inputValue();
    expect(defaultQuery).toContain("SELECT");
  });

  test("has execution controls", async ({ page }) => {
    await page.goto("/explorer/index.html");
    // Execute button
    await expect(page.locator("#explorer-exec")).toBeVisible();
    // Schema button
    await expect(page.locator("#explorer-schema")).toBeVisible();
  });

  test("has preset query section", async ({ page }) => {
    await page.goto("/explorer/index.html");
    await expect(page.locator("#explorer-presets")).toBeVisible();
  });

  test("has navigation and disclaimers", async ({ page }) => {
    await page.goto("/explorer/index.html");
    await expect(page.locator("nav")).toBeVisible();
    await expect(page.locator(".site-banner")).toBeVisible();
  });
});

// --- Task 260: Meta task dashboard ---

test.describe("Task dashboard", () => {
  test("loads with progress summary", async ({ page }) => {
    await page.goto("/meta/tasks.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("タスク状況ダッシュボード");
    expect(pageContent).toContain("進捗概要");
    // Progress bar SVG
    await expect(page.locator("svg")).toBeVisible();
  });

  test("has task list with links to individual tasks", async ({ page }) => {
    await page.goto("/meta/tasks.html");
    // At least some task links
    const taskLinks = page.locator('a[href*="tasks/"]');
    expect(await taskLinks.count()).toBeGreaterThanOrEqual(50);
  });

  test("individual task page loads", async ({ page }) => {
    await page.goto("/meta/tasks/001.html");
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Task 001");
  });

  test("has navigation", async ({ page }) => {
    await page.goto("/meta/tasks.html");
    await expect(page.locator("nav")).toBeVisible();
  });
});

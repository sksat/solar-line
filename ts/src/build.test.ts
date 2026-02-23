import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  discoverEpisodes,
  discoverLogs,
  buildManifest,
  build,
} from "./build.ts";
import type { EpisodeReport } from "./report-types.ts";

/** Create a temp directory for test fixtures */
function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "solar-line-test-"));
}

/** Recursively remove a directory */
function rmDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// --- discoverEpisodes ---

describe("discoverEpisodes", () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it("returns empty array when no episodes dir exists", () => {
    const result = discoverEpisodes(tmpDir);
    assert.deepEqual(result, []);
  });

  it("discovers and parses episode JSON files", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const episode: EpisodeReport = {
      episode: 1,
      title: "Departure",
      summary: "Test episode",
      transfers: [],
    };
    fs.writeFileSync(path.join(epDir, "ep01.json"), JSON.stringify(episode));

    const result = discoverEpisodes(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].episode, 1);
    assert.equal(result[0].title, "Departure");
  });

  it("sorts files alphabetically", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const ep2: EpisodeReport = { episode: 2, title: "Second", summary: "", transfers: [] };
    const ep1: EpisodeReport = { episode: 1, title: "First", summary: "", transfers: [] };
    fs.writeFileSync(path.join(epDir, "ep02.json"), JSON.stringify(ep2));
    fs.writeFileSync(path.join(epDir, "ep01.json"), JSON.stringify(ep1));

    const result = discoverEpisodes(tmpDir);
    assert.equal(result[0].episode, 1);
    assert.equal(result[1].episode, 2);
  });
});

// --- discoverLogs ---

describe("discoverLogs", () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it("returns empty array when no logs dir exists", () => {
    const result = discoverLogs(tmpDir);
    assert.deepEqual(result, []);
  });

  it("discovers markdown log files", () => {
    const logsDir = path.join(tmpDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, "2026-02-23-session.md"), "# Session Log\n\nDid some work.");

    const result = discoverLogs(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].filename, "2026-02-23-session");
    assert.equal(result[0].date, "2026-02-23");
    assert.equal(result[0].description, "Session Log");
  });

  it("extracts date from filename", () => {
    const logsDir = path.join(tmpDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, "2026-01-15-analysis.md"), "# Analysis");

    const result = discoverLogs(tmpDir);
    assert.equal(result[0].date, "2026-01-15");
  });
});

// --- buildManifest ---

describe("buildManifest", () => {
  it("builds manifest from episodes and logs", () => {
    const episodes: EpisodeReport[] = [
      { episode: 1, title: "Departure", summary: "", transfers: [{} as any, {} as any] },
    ];
    const logs = [
      { filename: "2026-02-23-session", date: "2026-02-23", description: "Test", content: "" },
    ];

    const manifest = buildManifest(episodes, logs);
    assert.equal(manifest.title, "SOLAR LINE 考察");
    assert.equal(manifest.episodes.length, 1);
    assert.equal(manifest.episodes[0].transferCount, 2);
    assert.equal(manifest.episodes[0].path, "episodes/ep-001.html");
    assert.equal(manifest.logs.length, 1);
    assert.equal(manifest.logs[0].path, "logs/2026-02-23-session.html");
    assert.ok(manifest.generatedAt); // ISO string
  });

  it("handles empty inputs", () => {
    const manifest = buildManifest([], []);
    assert.equal(manifest.episodes.length, 0);
    assert.equal(manifest.logs.length, 0);
  });
});

// --- full build integration ---

describe("build (integration)", () => {
  let dataDir: string;
  let outDir: string;

  beforeEach(() => {
    dataDir = makeTempDir();
    outDir = makeTempDir();
  });
  afterEach(() => {
    rmDir(dataDir);
    rmDir(outDir);
  });

  it("generates index.html even with no data", () => {
    build({ dataDir, outDir });

    assert.ok(fs.existsSync(path.join(outDir, "index.html")));
    assert.ok(fs.existsSync(path.join(outDir, "logs", "index.html")));
    assert.ok(fs.existsSync(path.join(outDir, "manifest.json")));

    const index = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    assert.ok(index.includes("SOLAR LINE"));
    assert.ok(index.includes("エピソードレポートはまだありません。"));
  });

  it("generates episode pages from JSON data", () => {
    // Set up fixture data
    const epDir = path.join(dataDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const episode: EpisodeReport = {
      episode: 1,
      title: "Test Episode",
      summary: "A test.",
      transfers: [
        {
          id: "ep01-t01",
          episode: 1,
          description: "Test Transfer",
          timestamp: "01:00",
          claimedDeltaV: 5.0,
          computedDeltaV: 5.1,
          assumptions: ["Test assumption"],
          verdict: "plausible",
          explanation: "Test explanation.",
          parameters: { mu: 1.327e11 },
        },
      ],
    };
    fs.writeFileSync(path.join(epDir, "ep01.json"), JSON.stringify(episode));

    build({ dataDir, outDir });

    // Verify episode page
    const epPage = path.join(outDir, "episodes", "ep-001.html");
    assert.ok(fs.existsSync(epPage));
    const html = fs.readFileSync(epPage, "utf-8");
    assert.ok(html.includes("Test Episode"));
    assert.ok(html.includes("Test Transfer"));
    assert.ok(html.includes("妥当"));

    // Verify index references it
    const index = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    assert.ok(index.includes("第1話: Test Episode"));
    assert.ok(index.includes("1件の軌道遷移"));
  });

  it("generates log pages from markdown files", () => {
    const logsDir = path.join(dataDir, "logs");
    fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(path.join(logsDir, "2026-02-23-session.md"), "# Session\n\nAnalyzed orbits.");

    build({ dataDir, outDir });

    const logPage = path.join(outDir, "logs", "2026-02-23-session.html");
    assert.ok(fs.existsSync(logPage));
    const html = fs.readFileSync(logPage, "utf-8");
    assert.ok(html.includes("Session"));
    assert.ok(html.includes("Analyzed orbits."));

    // Verify logs index
    const logsIndex = fs.readFileSync(path.join(outDir, "logs", "index.html"), "utf-8");
    assert.ok(logsIndex.includes("2026-02-23"));
  });

  it("writes valid manifest.json", () => {
    build({ dataDir, outDir });

    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, "manifest.json"), "utf-8"));
    assert.equal(manifest.title, "SOLAR LINE 考察");
    assert.ok(Array.isArray(manifest.episodes));
    assert.ok(Array.isArray(manifest.logs));
    assert.ok(manifest.generatedAt);
  });
});

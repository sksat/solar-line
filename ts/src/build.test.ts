import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  discoverEpisodes,
  discoverLogs,
  discoverTranscriptions,
  buildManifest,
  countVerdicts,
  build,
} from "./build.ts";
import type { EpisodeReport, TransferAnalysis } from "./report-types.ts";

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

  it("index page includes project overview and stats", () => {
    const epDir = path.join(dataDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const episode: EpisodeReport = {
      episode: 1,
      title: "Test Episode",
      summary: "A test episode summary.",
      transfers: [
        { id: "t1", episode: 1, description: "T1", timestamp: "01:00", claimedDeltaV: null, computedDeltaV: 5.0, assumptions: [], verdict: "plausible", explanation: "ok", parameters: { mu: 1.327e11 } },
        { id: "t2", episode: 1, description: "T2", timestamp: "02:00", claimedDeltaV: null, computedDeltaV: 10.0, assumptions: [], verdict: "conditional", explanation: "ok", parameters: { mu: 1.327e11 } },
      ],
    };
    fs.writeFileSync(path.join(epDir, "ep01.json"), JSON.stringify(episode));

    build({ dataDir, outDir });

    const index = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    // Project overview elements
    assert.ok(index.includes("SOLAR LINE"), "should include project name");
    assert.ok(index.includes("ゆえぴこ"), "should mention the creator");
    assert.ok(index.includes("ケストレル"), "should mention the ship");
    assert.ok(index.includes("35.9 AU"), "should mention total route distance");
    // Stats section
    assert.ok(index.includes("分析概要"), "should have stats section");
    assert.ok(index.includes("軌道遷移"), "should show transfer count label");
    // Verdict badges
    assert.ok(index.includes("verdict-plausible"), "should show plausible verdict badge");
    assert.ok(index.includes("verdict-conditional"), "should show conditional verdict badge");
    // Episode card with summary
    assert.ok(index.includes("A test episode summary."), "should show episode summary");
  });
});

// --- countVerdicts ---

describe("countVerdicts", () => {
  const makeTransfer = (verdict: TransferAnalysis["verdict"]): TransferAnalysis => ({
    id: "t1", episode: 1, description: "T", timestamp: "00:00",
    claimedDeltaV: null, computedDeltaV: 5.0, assumptions: [],
    verdict, explanation: "ok", parameters: { mu: 1.327e11 },
  });

  it("counts verdicts correctly", () => {
    const ep: EpisodeReport = {
      episode: 1, title: "T", summary: "S",
      transfers: [
        makeTransfer("plausible"),
        makeTransfer("plausible"),
        makeTransfer("conditional"),
        makeTransfer("reference"),
      ],
    };
    const counts = countVerdicts(ep);
    assert.equal(counts.plausible, 2);
    assert.equal(counts.conditional, 1);
    assert.equal(counts.reference, 1);
    assert.equal(counts.implausible, 0);
    assert.equal(counts.indeterminate, 0);
  });

  it("returns all zeros for empty transfers", () => {
    const ep: EpisodeReport = { episode: 1, title: "T", summary: "S", transfers: [] };
    const counts = countVerdicts(ep);
    assert.equal(counts.plausible, 0);
    assert.equal(counts.conditional, 0);
    assert.equal(counts.indeterminate, 0);
    assert.equal(counts.reference, 0);
    assert.equal(counts.implausible, 0);
  });
});

// --- buildManifest verdict statistics ---

describe("buildManifest verdict statistics", () => {
  const makeTransfer = (verdict: TransferAnalysis["verdict"]): TransferAnalysis => ({
    id: "t1", episode: 1, description: "T", timestamp: "00:00",
    claimedDeltaV: null, computedDeltaV: 5.0, assumptions: [],
    verdict, explanation: "ok", parameters: { mu: 1.327e11 },
  });

  it("includes per-episode verdict counts", () => {
    const episodes: EpisodeReport[] = [{
      episode: 1, title: "T", summary: "S",
      transfers: [makeTransfer("plausible"), makeTransfer("conditional")],
    }];
    const manifest = buildManifest(episodes, []);
    assert.ok(manifest.episodes[0].verdicts);
    assert.equal(manifest.episodes[0].verdicts!.plausible, 1);
    assert.equal(manifest.episodes[0].verdicts!.conditional, 1);
  });

  it("includes total verdict counts", () => {
    const episodes: EpisodeReport[] = [
      { episode: 1, title: "T1", summary: "S", transfers: [makeTransfer("plausible"), makeTransfer("plausible")] },
      { episode: 2, title: "T2", summary: "S", transfers: [makeTransfer("conditional"), makeTransfer("implausible")] },
    ];
    const manifest = buildManifest(episodes, []);
    assert.ok(manifest.totalVerdicts);
    assert.equal(manifest.totalVerdicts!.plausible, 2);
    assert.equal(manifest.totalVerdicts!.conditional, 1);
    assert.equal(manifest.totalVerdicts!.implausible, 1);
    assert.equal(manifest.totalVerdicts!.indeterminate, 0);
  });

  it("includes episode summaries in manifest", () => {
    const episodes: EpisodeReport[] = [{
      episode: 1, title: "T", summary: "Test summary text",
      transfers: [makeTransfer("plausible")],
    }];
    const manifest = buildManifest(episodes, []);
    assert.equal(manifest.episodes[0].summary, "Test summary text");
  });

  it("omits totalVerdicts when no episodes", () => {
    const manifest = buildManifest([], []);
    assert.equal(manifest.totalVerdicts, undefined);
  });
});

// --- discoverTranscriptions ---

describe("discoverTranscriptions", () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it("returns empty array when no episodes dir exists", () => {
    const result = discoverTranscriptions(tmpDir);
    assert.deepEqual(result, []);
  });

  it("discovers lines-only files (Phase 1)", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const lines = {
      schemaVersion: 1,
      videoId: "test123",
      episode: 1,
      sourceSubtitle: { language: "ja", source: "whisper", rawContentHash: "abc" },
      lines: [
        { lineId: "ep01-line-001", startMs: 1000, endMs: 2000, text: "テスト台詞", rawEntryIds: ["cue-1"], mergeReasons: [] },
        { lineId: "ep01-line-002", startMs: 3000, endMs: 4000, text: "二番目", rawEntryIds: ["cue-2"], mergeReasons: ["small_gap"] },
      ],
      extractedAt: "2026-02-24T00:00:00Z",
      mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
    };
    fs.writeFileSync(path.join(epDir, "ep01_lines.json"), JSON.stringify(lines));

    const result = discoverTranscriptions(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].episode, 1);
    assert.equal(result[0].videoId, "test123");
    assert.equal(result[0].sourceInfo.source, "whisper");
    assert.equal(result[0].lines.length, 2);
    assert.equal(result[0].dialogue, null);
    assert.equal(result[0].speakers, null);
    assert.equal(result[0].scenes, null);
    assert.equal(result[0].title, null);
  });

  it("discovers lines + dialogue files (Phase 2)", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const lines = {
      schemaVersion: 1, videoId: "test123", episode: 2,
      sourceSubtitle: { language: "ja", source: "youtube-auto", rawContentHash: "abc" },
      lines: [{ lineId: "ep02-line-001", startMs: 0, endMs: 1000, text: "Hello", rawEntryIds: ["cue-1"], mergeReasons: [] }],
      extractedAt: "2026-02-24T00:00:00Z",
      mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
    };
    const dialogue = {
      schemaVersion: 1, videoId: "test123", episode: 2,
      title: "テストエピソード", sourceUrl: "https://example.com",
      language: "ja",
      speakers: [{ id: "kiritan", nameJa: "きりたん", aliases: [] }],
      scenes: [{ id: "ep02-scene-01", startMs: 0, endMs: 5000, description: "冒頭" }],
      dialogue: [{ speakerId: "kiritan", speakerName: "きりたん", text: "Hello", startMs: 0, endMs: 1000, sceneId: "ep02-scene-01", confidence: "verified", rawEntryIds: ["cue-1"], transferRefs: [], mentions: [] }],
      attributionNotes: "test", reviewedBy: "test", reviewedAt: "2026-02-24T00:00:00Z", rawContentHash: "abc",
    };
    const speakers = {
      schemaVersion: 1, episode: 2, videoId: "test123",
      speakers: [{ id: "kiritan", nameJa: "きりたん", nameEn: "Kiritan", aliases: [], notes: "主人公" }],
    };

    fs.writeFileSync(path.join(epDir, "ep02_lines.json"), JSON.stringify(lines));
    fs.writeFileSync(path.join(epDir, "ep02_dialogue.json"), JSON.stringify(dialogue));
    fs.writeFileSync(path.join(epDir, "ep02_speakers.json"), JSON.stringify(speakers));

    const result = discoverTranscriptions(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].episode, 2);
    assert.equal(result[0].title, "テストエピソード");
    assert.ok(result[0].dialogue);
    assert.equal(result[0].dialogue!.length, 1);
    assert.equal(result[0].dialogue![0].speakerName, "きりたん");
    assert.ok(result[0].speakers);
    assert.equal(result[0].speakers![0].notes, "主人公");
    assert.ok(result[0].scenes);
    assert.equal(result[0].scenes![0].description, "冒頭");
  });

  it("sorts by episode number", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    for (const n of [3, 1]) {
      const lines = {
        schemaVersion: 1, videoId: `test${n}`, episode: n,
        sourceSubtitle: { language: "ja", source: "whisper", rawContentHash: "abc" },
        lines: [{ lineId: `ep0${n}-line-001`, startMs: 0, endMs: 1000, text: "test", rawEntryIds: ["cue-1"], mergeReasons: [] }],
        extractedAt: "2026-02-24T00:00:00Z",
        mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
      };
      fs.writeFileSync(path.join(epDir, `ep0${n}_lines.json`), JSON.stringify(lines));
    }

    const result = discoverTranscriptions(tmpDir);
    assert.equal(result.length, 2);
    assert.equal(result[0].episode, 1);
    assert.equal(result[1].episode, 3);
  });
});

// --- buildManifest with transcriptions ---

describe("buildManifest with transcriptions", () => {
  it("includes transcription pages in manifest", () => {
    const transcriptions = [{
      episode: 1, videoId: "test", sourceInfo: { source: "whisper" as const, language: "ja" },
      lines: [{ lineId: "l1", startMs: 0, endMs: 1000, text: "test", mergeReasons: [] }],
      dialogue: null, speakers: null, scenes: null, title: null,
    }];
    const manifest = buildManifest([], [], [], transcriptions);
    assert.ok(manifest.transcriptionPages);
    assert.equal(manifest.transcriptionPages!.length, 1);
    assert.equal(manifest.transcriptionPages![0].episode, 1);
    assert.equal(manifest.transcriptionPages![0].lineCount, 1);
    assert.equal(manifest.transcriptionPages![0].hasDialogue, false);
    assert.equal(manifest.transcriptionPages![0].path, "transcriptions/ep-001.html");
  });

  it("omits transcriptionPages when no transcriptions", () => {
    const manifest = buildManifest([], []);
    assert.equal(manifest.transcriptionPages, undefined);
  });
});

// --- build integration with transcriptions ---

describe("build with transcriptions (integration)", () => {
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

  it("generates transcription pages", () => {
    const epDir = path.join(dataDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const lines = {
      schemaVersion: 1, videoId: "test123", episode: 1,
      sourceSubtitle: { language: "ja", source: "whisper", rawContentHash: "abc" },
      lines: [{ lineId: "ep01-line-001", startMs: 5000, endMs: 10000, text: "テスト", rawEntryIds: ["cue-1"], mergeReasons: [] }],
      extractedAt: "2026-02-24T00:00:00Z",
      mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
    };
    fs.writeFileSync(path.join(epDir, "ep01_lines.json"), JSON.stringify(lines));

    build({ dataDir, outDir });

    // Transcription index
    const indexPath = path.join(outDir, "transcriptions", "index.html");
    assert.ok(fs.existsSync(indexPath), "transcription index should exist");
    const indexHtml = fs.readFileSync(indexPath, "utf-8");
    assert.ok(indexHtml.includes("文字起こしデータ"), "index should have title");
    assert.ok(indexHtml.includes("第1話"), "index should reference episode");

    // Per-episode page
    const epPath = path.join(outDir, "transcriptions", "ep-001.html");
    assert.ok(fs.existsSync(epPath), "episode transcription page should exist");
    const epHtml = fs.readFileSync(epPath, "utf-8");
    assert.ok(epHtml.includes("テスト"), "should contain dialogue text");
    assert.ok(epHtml.includes("Whisper STT"), "should show source type");
    assert.ok(epHtml.includes("00:05"), "should format timestamp");

    // Main index should link to transcriptions
    const mainIndex = fs.readFileSync(path.join(outDir, "index.html"), "utf-8");
    assert.ok(mainIndex.includes("文字起こし"), "main index should link to transcriptions");
  });
});

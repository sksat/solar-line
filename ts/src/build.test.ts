import { describe, it, beforeEach, afterEach } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  discoverEpisodes,
  discoverLogs,
  discoverSummaries,
  discoverTranscriptions,
  buildManifest,
  countVerdicts,
  build,
  parseTaskFile,
  discoverTasks,
  parseADRFile,
  resolveDialogueReferences,
} from "./build.ts";
import type { EpisodeReport, TransferAnalysis, DialogueQuote } from "./report-types.ts";
import type { EpisodeDialogue, DialogueLine } from "./subtitle-types.ts";

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
    assert.equal(manifest.title, "SOLAR LINE 考証");
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
    assert.equal(manifest.title, "SOLAR LINE 考証");
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

// --- build with detailPages (integration) ---

describe("build with detailPages (integration)", () => {
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

  it("generates detail sub-pages for episodes with detailPages", () => {
    const epDir = path.join(dataDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const episode: EpisodeReport = {
      episode: 5,
      title: "Test EP05",
      summary: "Test summary.",
      transfers: [
        {
          id: "ep05-transfer-01",
          episode: 5,
          description: "Reference transfer",
          timestamp: "01:00",
          claimedDeltaV: null,
          computedDeltaV: 15.94,
          assumptions: [],
          verdict: "reference",
          explanation: "Reference value.",
          parameters: {},
        },
        {
          id: "ep05-transfer-02",
          episode: 5,
          description: "Brachistochrone transit",
          timestamp: "02:36",
          claimedDeltaV: null,
          computedDeltaV: 15207,
          assumptions: [],
          verdict: "conditional",
          explanation: "Analysis text.",
          parameters: {},
        },
      ],
      explorations: [
        {
          id: "ep05-exploration-01",
          transferId: "ep05-transfer-02",
          question: "Mass scenarios",
          scenarios: [{ label: "S1", variedParam: "m", variedValue: 48000, variedUnit: "t", results: {}, feasible: true, note: "ok" }],
          summary: "All feasible.",
        },
      ],
      detailPages: [
        {
          slug: "transfer-02",
          transferIds: ["ep05-transfer-02"],
        },
      ],
    };
    fs.writeFileSync(path.join(epDir, "ep05.json"), JSON.stringify(episode));

    build({ dataDir, outDir });

    // Main episode page should exist
    const epPage = path.join(outDir, "episodes", "ep-005.html");
    assert.ok(fs.existsSync(epPage), "episode page should exist");
    const mainHtml = fs.readFileSync(epPage, "utf-8");
    assert.ok(mainHtml.includes("transfer-summary"), "main page should have summary card");
    assert.ok(mainHtml.includes("ep-005/transfer-02.html"), "main page should link to detail");

    // Detail sub-page should exist
    const detailPage = path.join(outDir, "episodes", "ep-005", "transfer-02.html");
    assert.ok(fs.existsSync(detailPage), "detail sub-page should exist");
    const detailHtml = fs.readFileSync(detailPage, "utf-8");
    assert.ok(detailHtml.includes("Brachistochrone transit"), "detail page should render transfer");
    assert.ok(detailHtml.includes("Mass scenarios"), "detail page should render explorations");
    assert.ok(detailHtml.includes("breadcrumb"), "detail page should have breadcrumb");
    assert.ok(detailHtml.includes("ep-005.html"), "detail page should link back to parent");
  });

  it("does not generate sub-pages when detailPages is absent", () => {
    const epDir = path.join(dataDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const episode: EpisodeReport = {
      episode: 1,
      title: "Test EP01",
      summary: "Summary.",
      transfers: [
        { id: "t1", episode: 1, description: "T1", timestamp: "00:00", claimedDeltaV: null, computedDeltaV: 5.0, assumptions: [], verdict: "plausible", explanation: "ok", parameters: {} },
      ],
    };
    fs.writeFileSync(path.join(epDir, "ep01.json"), JSON.stringify(episode));

    build({ dataDir, outDir });

    assert.ok(!fs.existsSync(path.join(outDir, "episodes", "ep-001")), "should not create sub-directory");
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

  it("discovers script source (Layer 0)", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const lines = {
      schemaVersion: 1, videoId: "test123", episode: 1,
      sourceSubtitle: { language: "ja", source: "youtube-auto", rawContentHash: "abc" },
      lines: [{ lineId: "ep01-line-001", startMs: 0, endMs: 1000, text: "test", rawEntryIds: ["cue-1"], mergeReasons: [] }],
      extractedAt: "2026-02-28T00:00:00Z",
      mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
    };
    const script = {
      schemaVersion: 1, episode: 1, videoId: "test123",
      source: "script", sourceUrl: "https://note.com/test", author: "テスト作者", language: "ja",
      extractedAt: "2026-02-28T00:00:00Z",
      scenes: [{
        sceneId: "script-scene-01", title: "シーン1：テスト", setting: "内・テスト",
        lines: [
          { lineId: "ep01-sl-001", speaker: "主人公", speakerNote: null, text: "テスト台詞" },
          { lineId: "ep01-sl-002", speaker: null, speakerNote: null, text: "（ト書き）", isDirection: true },
        ],
      }],
    };
    fs.writeFileSync(path.join(epDir, "ep01_lines.json"), JSON.stringify(lines));
    fs.writeFileSync(path.join(epDir, "ep01_script.json"), JSON.stringify(script));

    const result = discoverTranscriptions(tmpDir);
    assert.equal(result.length, 1);
    assert.ok(result[0].scriptSource);
    assert.equal(result[0].scriptSource!.sourceUrl, "https://note.com/test");
    assert.equal(result[0].scriptSource!.author, "テスト作者");
    assert.equal(result[0].scriptSource!.scenes.length, 1);
    assert.equal(result[0].scriptSource!.scenes[0].lines.length, 2);
    assert.equal(result[0].scriptSource!.scenes[0].lines[0].speaker, "主人公");
    assert.equal(result[0].scriptSource!.scenes[0].lines[1].isDirection, true);
  });

  it("returns undefined scriptSource when no script file exists", () => {
    const epDir = path.join(tmpDir, "data", "episodes");
    fs.mkdirSync(epDir, { recursive: true });

    const lines = {
      schemaVersion: 1, videoId: "test123", episode: 1,
      sourceSubtitle: { language: "ja", source: "whisper", rawContentHash: "abc" },
      lines: [{ lineId: "ep01-line-001", startMs: 0, endMs: 1000, text: "test", rawEntryIds: ["cue-1"], mergeReasons: [] }],
      extractedAt: "2026-02-28T00:00:00Z",
      mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
    };
    fs.writeFileSync(path.join(epDir, "ep01_lines.json"), JSON.stringify(lines));

    const result = discoverTranscriptions(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].scriptSource, undefined);
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

// --- parseTaskFile ---

describe("parseTaskFile", () => {
  it("parses a DONE task", () => {
    const content = `# Task 001: Minimal Monorepo Scaffold + CI

## Status: DONE

## Goal
Create the minimal project scaffold.`;
    const task = parseTaskFile("001_scaffold_and_ci.md", content);
    assert.ok(task);
    assert.equal(task.number, 1);
    assert.equal(task.title, "Minimal Monorepo Scaffold + CI");
    assert.equal(task.status, "DONE");
  });

  it("parses a TODO task", () => {
    const content = `# Task 056: Speaker Diarization Investigation

## Status: TODO

## Motivation
Human directive: improve speaker attribution.`;
    const task = parseTaskFile("056_speaker_diarization.md", content);
    assert.ok(task);
    assert.equal(task.number, 56);
    assert.equal(task.title, "Speaker Diarization Investigation");
    assert.equal(task.status, "TODO");
  });

  it("parses an IN_PROGRESS task", () => {
    const content = `# Task 096: Nav Categories + Task Status Dashboard

## Status: IN_PROGRESS

## Motivation
Build a task dashboard.`;
    const task = parseTaskFile("096_nav_categories_and_task_dashboard.md", content);
    assert.ok(task);
    assert.equal(task.number, 96);
    assert.equal(task.status, "IN_PROGRESS");
  });

  it("extracts summary from first content paragraph after status", () => {
    const content = `# Task 010: Test

## Status: DONE

This is the summary line.

## Details
More content here.`;
    const task = parseTaskFile("010_test.md", content);
    assert.ok(task);
    assert.equal(task.summary, "This is the summary line.");
  });

  it("returns null for non-numbered filename", () => {
    const task = parseTaskFile("readme.md", "# Readme");
    assert.equal(task, null);
  });

  it("handles missing status gracefully", () => {
    const content = `# Task 999: No Status

Just some text.`;
    const task = parseTaskFile("999_no_status.md", content);
    assert.ok(task);
    assert.equal(task.status, "TODO");
  });

  it("parses bold markdown status format (**Status:** DONE)", () => {
    const content = `# Task 066: ccusage Cost Analysis

**Status:** DONE

**Priority:** HIGH`;
    const task = parseTaskFile("066_ccusage_cost_analysis.md", content);
    assert.ok(task);
    assert.equal(task.number, 66);
    assert.equal(task.status, "DONE");
  });
});

// --- discoverTasks ---

describe("discoverTasks", () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it("returns empty array when no current_tasks dir exists", () => {
    const result = discoverTasks(tmpDir);
    assert.deepEqual(result, []);
  });

  it("discovers and parses task files", () => {
    const tasksDir = path.join(tmpDir, "current_tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "001_test.md"), "# Task 001: Test Task\n\n## Status: DONE\n\nA summary.");
    fs.writeFileSync(path.join(tasksDir, "002_another.md"), "# Task 002: Another\n\n## Status: TODO\n\nAnother summary.");

    const result = discoverTasks(tmpDir);
    assert.equal(result.length, 2);
    assert.equal(result[0].number, 1);
    assert.equal(result[0].status, "DONE");
    assert.equal(result[1].number, 2);
    assert.equal(result[1].status, "TODO");
  });

  it("ignores non-numbered files", () => {
    const tasksDir = path.join(tmpDir, "current_tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "readme.md"), "# README");
    fs.writeFileSync(path.join(tasksDir, "001_task.md"), "# Task 001: Real\n\n## Status: DONE");

    const result = discoverTasks(tmpDir);
    assert.equal(result.length, 1);
  });

  it("sorts files by filename", () => {
    const tasksDir = path.join(tmpDir, "current_tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "010_second.md"), "# Task 010: Second\n\n## Status: TODO");
    fs.writeFileSync(path.join(tasksDir, "002_first.md"), "# Task 002: First\n\n## Status: DONE");

    const result = discoverTasks(tmpDir);
    assert.equal(result[0].number, 2);
    assert.equal(result[1].number, 10);
  });
});

// --- build integration with task dashboard ---

describe("build with task dashboard (integration)", () => {
  let dataDir: string;
  let outDir: string;

  beforeEach(() => {
    dataDir = makeTempDir();
    outDir = makeTempDir();
    // Create current_tasks/ as sibling of dataDir
    const tasksDir = path.join(dataDir, "..", "current_tasks");
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(path.join(tasksDir, "001_test.md"), "# Task 001: Test\n\n## Status: DONE\n\nDone summary.");
    fs.writeFileSync(path.join(tasksDir, "002_todo.md"), "# Task 002: Another\n\n## Status: TODO\n\nTodo summary.");
  });
  afterEach(() => {
    rmDir(dataDir);
    rmDir(outDir);
    const tasksDir = path.join(dataDir, "..", "current_tasks");
    if (fs.existsSync(tasksDir)) rmDir(tasksDir);
  });

  it("generates task dashboard page", () => {
    build({ dataDir, outDir });

    const dashPath = path.join(outDir, "meta", "tasks.html");
    assert.ok(fs.existsSync(dashPath), "task dashboard should exist");

    const html = fs.readFileSync(dashPath, "utf-8");
    assert.ok(html.includes("タスク状況ダッシュボード"), "should have dashboard title");
    assert.ok(html.includes("合計: 2タスク"), "should show task count");
    assert.ok(html.includes("完了: 1"), "should show done count");
    assert.ok(html.includes("未着手: 1"), "should show todo count");
    assert.ok(html.includes("Test"), "should list task title");
    assert.ok(html.includes("完了"), "should show status badge");
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

// --- discoverSummaries with Markdown ---

describe("discoverSummaries", () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTempDir(); });
  afterEach(() => { rmDir(tmpDir); });

  it("discovers JSON summary files", () => {
    const summaryDir = path.join(tmpDir, "data", "summary");
    fs.mkdirSync(summaryDir, { recursive: true });
    fs.writeFileSync(path.join(summaryDir, "test.json"), JSON.stringify({
      slug: "test",
      title: "Test Report",
      summary: "A test report",
      sections: [{ heading: "Intro", markdown: "Hello" }],
    }));

    const result = discoverSummaries(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, "test");
  });

  it("discovers Markdown summary files", () => {
    const summaryDir = path.join(tmpDir, "data", "summary");
    fs.mkdirSync(summaryDir, { recursive: true });
    fs.writeFileSync(path.join(summaryDir, "test.md"), `---
slug: test
title: Test Report
summary: A test report
---

## Intro

Hello world.
`);

    const result = discoverSummaries(tmpDir);
    assert.equal(result.length, 1);
    assert.equal(result[0].slug, "test");
    assert.equal(result[0].title, "Test Report");
    assert.equal(result[0].sections.length, 1);
    assert.equal(result[0].sections[0].heading, "Intro");
    assert.ok(result[0].sections[0].markdown.includes("Hello world."));
  });

  it("throws on duplicate slug (both .json and .md)", () => {
    const summaryDir = path.join(tmpDir, "data", "summary");
    fs.mkdirSync(summaryDir, { recursive: true });
    fs.writeFileSync(path.join(summaryDir, "test.json"), JSON.stringify({
      slug: "test", title: "Test", summary: "test",
      sections: [{ heading: "A", markdown: "B" }],
    }));
    fs.writeFileSync(path.join(summaryDir, "test.md"), `---
slug: test
title: Test
summary: test
---

## A

B
`);

    assert.throws(() => discoverSummaries(tmpDir), /Duplicate summary report/);
  });

  it("discovers mixed JSON and Markdown files", () => {
    const summaryDir = path.join(tmpDir, "data", "summary");
    fs.mkdirSync(summaryDir, { recursive: true });
    fs.writeFileSync(path.join(summaryDir, "alpha.json"), JSON.stringify({
      slug: "alpha", title: "Alpha", summary: "First",
      sections: [{ heading: "A", markdown: "Content" }],
    }));
    fs.writeFileSync(path.join(summaryDir, "beta.md"), `---
slug: beta
title: Beta
summary: Second
---

## B

Content
`);

    const result = discoverSummaries(tmpDir);
    assert.equal(result.length, 2);
    assert.equal(result[0].slug, "alpha");
    assert.equal(result[1].slug, "beta");
  });

  it("returns empty array when no summary dir exists", () => {
    const result = discoverSummaries(tmpDir);
    assert.equal(result.length, 0);
  });
});

// --- parseADRFile ---

describe("parseADRFile", () => {
  it("parses a standard ADR with title and status", () => {
    const content = `# ADR-001: Use Rust for orbital mechanics

## Status

Accepted

## Context

Rust provides memory safety and WASM compilation.
`;
    const result = parseADRFile("001-use-rust.md", content);
    assert.ok(result);
    assert.equal(result.number, 1);
    assert.equal(result.title, "ADR-001: Use Rust for orbital mechanics");
    assert.equal(result.status, "Accepted");
    assert.equal(result.slug, "001-use-rust");
    assert.equal(result.content, content);
  });

  it("returns null for filename without leading digits", () => {
    const result = parseADRFile("readme.md", "# Readme");
    assert.equal(result, null);
  });

  it("returns null for template file (number 0)", () => {
    const result = parseADRFile("000-template.md", "# Template");
    assert.equal(result, null);
  });

  it("falls back to filename when no heading found", () => {
    const content = "No heading here.\n\nJust body text.";
    const result = parseADRFile("005-no-heading.md", content);
    assert.ok(result);
    assert.equal(result.title, "005-no-heading.md");
  });

  it("defaults status to Unknown when no Status section", () => {
    const content = "# ADR-003: Something\n\nNo status section here.";
    const result = parseADRFile("003-something.md", content);
    assert.ok(result);
    assert.equal(result.status, "Unknown");
  });

  it("extracts status from ## Status section (case-insensitive)", () => {
    const content = `# ADR-010

## status

Proposed

## Details
Some details.
`;
    const result = parseADRFile("010-proposal.md", content);
    assert.ok(result);
    assert.equal(result.status, "Proposed");
  });

  it("stops reading status at next section heading", () => {
    const content = `# ADR-002

## Status

Deprecated

## Context

This was deprecated.
`;
    const result = parseADRFile("002-old.md", content);
    assert.ok(result);
    assert.equal(result.status, "Deprecated");
  });

  it("skips blank lines before status value", () => {
    const content = `# ADR-007

## Status


Superseded

## Details
`;
    const result = parseADRFile("007-super.md", content);
    assert.ok(result);
    assert.equal(result.status, "Superseded");
  });

  it("parses multi-digit ADR number", () => {
    const result = parseADRFile("123-big-number.md", "# Big One");
    assert.ok(result);
    assert.equal(result.number, 123);
  });

  it("strips .md from slug", () => {
    const result = parseADRFile("015-test.md", "# Test");
    assert.ok(result);
    assert.equal(result.slug, "015-test");
  });
});

// --- resolveDialogueReferences ---

describe("resolveDialogueReferences", () => {
  /** Helper: minimal EpisodeReport with quotes */
  function makeReport(
    episode: number,
    quotes: DialogueQuote[],
  ): EpisodeReport {
    return {
      episode,
      title: `Episode ${episode}`,
      summary: "test",
      transfers: [],
      dialogueQuotes: quotes,
    };
  }

  /** Helper: minimal EpisodeDialogue with given lines */
  function makeDialogue(
    episode: number,
    lines: Partial<DialogueLine>[],
  ): EpisodeDialogue {
    return {
      schemaVersion: 1,
      videoId: "test",
      episode,
      title: "test",
      sourceUrl: "https://example.com",
      language: "ja",
      speakers: [],
      scenes: [],
      attributionNotes: "test",
      reviewedBy: "test",
      reviewedAt: "2025-01-01T00:00:00Z",
      rawContentHash: "abc123",
      dialogue: lines.map((l, i) => ({
        lineId: l.lineId ?? `ep0${episode}-dl-${String(i + 1).padStart(3, "0")}`,
        speakerId: "test",
        speakerName: "Test",
        text: "hello",
        startMs: 0,
        endMs: 1000,
        sceneId: "scene-01",
        confidence: "verified" as const,
        rawEntryIds: [],
        transferRefs: [],
        mentions: [],
        ...l,
      })),
    };
  }

  it("returns empty array when no dialogueQuotes", () => {
    const report = makeReport(1, []);
    report.dialogueQuotes = undefined;
    const warnings = resolveDialogueReferences(report, makeDialogue(1, []));
    assert.deepEqual(warnings, []);
  });

  it("returns empty array when dialogueData is null", () => {
    const report = makeReport(1, [
      { id: "q1", dialogueLineId: "ep01-dl-001", speaker: "A", text: "hi", timestamp: "0:01" },
    ]);
    const warnings = resolveDialogueReferences(report, null);
    assert.deepEqual(warnings, []);
  });

  it("returns no warnings when all references resolve", () => {
    const report = makeReport(1, [
      { id: "q1", dialogueLineId: "ep01-dl-001", speaker: "A", text: "hi", timestamp: "0:01" },
      { id: "q2", dialogueLineId: "ep01-dl-002", speaker: "B", text: "bye", timestamp: "0:02" },
    ]);
    const dialogue = makeDialogue(1, [
      { lineId: "ep01-dl-001" },
      { lineId: "ep01-dl-002" },
    ]);
    const warnings = resolveDialogueReferences(report, dialogue);
    assert.deepEqual(warnings, []);
  });

  it("reports missing lineId references", () => {
    const report = makeReport(1, [
      { id: "q1", dialogueLineId: "ep01-dl-999", speaker: "A", text: "hi", timestamp: "0:01" },
    ]);
    const dialogue = makeDialogue(1, [{ lineId: "ep01-dl-001" }]);
    const warnings = resolveDialogueReferences(report, dialogue);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /q1/);
    assert.match(warnings[0], /ep01-dl-999/);
  });

  it("skips quotes without dialogueLineId", () => {
    const report = makeReport(1, [
      { id: "q1", speaker: "A", text: "hi", timestamp: "0:01" },
    ]);
    const dialogue = makeDialogue(1, []);
    const warnings = resolveDialogueReferences(report, dialogue);
    assert.deepEqual(warnings, []);
  });

  it("reports multiple broken references", () => {
    const report = makeReport(2, [
      { id: "q1", dialogueLineId: "ep02-dl-100", speaker: "A", text: "a", timestamp: "1:00" },
      { id: "q2", dialogueLineId: "ep02-dl-200", speaker: "B", text: "b", timestamp: "2:00" },
      { id: "q3", dialogueLineId: "ep02-dl-001", speaker: "C", text: "c", timestamp: "3:00" },
    ]);
    const dialogue = makeDialogue(2, [{ lineId: "ep02-dl-001" }]);
    const warnings = resolveDialogueReferences(report, dialogue);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /ep02-dl-100/);
    assert.match(warnings[1], /ep02-dl-200/);
  });

  it("includes episode number in warning message", () => {
    const report = makeReport(5, [
      { id: "q1", dialogueLineId: "ep05-dl-999", speaker: "A", text: "a", timestamp: "0:01" },
    ]);
    const dialogue = makeDialogue(5, []);
    const warnings = resolveDialogueReferences(report, dialogue);
    assert.match(warnings[0], /ep05/);
  });
});

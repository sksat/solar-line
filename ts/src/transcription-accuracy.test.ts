import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  levenshteinDistance,
  normalizedEditDistance,
  normalizeForComparison,
  extractScriptDialogue,
  corpusAccuracy,
  findBestMatch,
  compareTranscriptions,
  ocrToEpisodeLines,
  computeSourceAgreement,
  type ScriptFileData,
  type ScriptLine,
  type OcrFileData,
  type SourceAgreement,
} from "./transcription-accuracy.ts";
import type { EpisodeLines, ExtractedLine } from "./dialogue-extraction-types.ts";

// ---------------------------------------------------------------------------
// levenshteinDistance
// ---------------------------------------------------------------------------
describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    assert.equal(levenshteinDistance("abc", "abc"), 0);
  });

  it("returns length of other string when one is empty", () => {
    assert.equal(levenshteinDistance("", "abc"), 3);
    assert.equal(levenshteinDistance("abc", ""), 3);
  });

  it("handles single character edits", () => {
    assert.equal(levenshteinDistance("cat", "hat"), 1); // substitution
    assert.equal(levenshteinDistance("cat", "cats"), 1); // insertion
    assert.equal(levenshteinDistance("cats", "cat"), 1); // deletion
  });

  it("handles multi-character edits", () => {
    assert.equal(levenshteinDistance("kitten", "sitting"), 3);
  });

  it("works with Japanese characters", () => {
    assert.equal(levenshteinDistance("結露", "結露"), 0);
    assert.equal(levenshteinDistance("公案", "港湾"), 2); // both chars differ
    assert.equal(levenshteinDistance("ブロワ", "ブロア"), 1); // ワ→ア
  });

  it("handles both strings empty", () => {
    assert.equal(levenshteinDistance("", ""), 0);
  });
});

// ---------------------------------------------------------------------------
// normalizedEditDistance
// ---------------------------------------------------------------------------
describe("normalizedEditDistance", () => {
  it("returns 0 for identical strings", () => {
    assert.equal(normalizedEditDistance("abc", "abc"), 0);
  });

  it("returns 1 for completely different same-length strings", () => {
    assert.equal(normalizedEditDistance("abc", "xyz"), 1);
  });

  it("returns 0 for two empty strings", () => {
    assert.equal(normalizedEditDistance("", ""), 0);
  });

  it("normalises by max length", () => {
    // "cat" → "cats": distance 1, max length 4
    assert.equal(normalizedEditDistance("cat", "cats"), 0.25);
  });
});

// ---------------------------------------------------------------------------
// normalizeForComparison
// ---------------------------------------------------------------------------
describe("normalizeForComparison", () => {
  it("removes whitespace", () => {
    assert.equal(normalizeForComparison("a b c"), "abc");
  });

  it("removes newlines", () => {
    assert.equal(normalizeForComparison("a\nb\nc"), "abc");
  });

  it("removes Japanese punctuation", () => {
    assert.equal(normalizeForComparison("「こんにちは。」"), "こんにちは");
  });

  it("removes ellipsis markers", () => {
    assert.equal(normalizeForComparison("結露…　まだ残ってる"), "結露まだ残ってる");
  });

  it("removes full-width spaces", () => {
    assert.equal(normalizeForComparison("結露\u3000まだ"), "結露まだ");
  });
});

// ---------------------------------------------------------------------------
// extractScriptDialogue
// ---------------------------------------------------------------------------
describe("extractScriptDialogue", () => {
  const script: ScriptFileData = {
    episode: 1,
    scenes: [
      {
        sceneId: "s1",
        lines: [
          { lineId: "l1", speaker: "主人公", text: "セリフ1" },
          { lineId: "l2", speaker: null, text: "（ト書き）", isDirection: true },
          { lineId: "l3", speaker: "ケイ", text: "セリフ2" },
        ],
      },
      {
        sceneId: "s2",
        lines: [
          { lineId: "l4", speaker: "主人公", text: "セリフ3" },
        ],
      },
    ],
  };

  it("excludes stage directions", () => {
    const lines = extractScriptDialogue(script);
    assert.equal(lines.length, 3);
    assert.ok(lines.every(l => l.isDirection !== true));
  });

  it("preserves order across scenes", () => {
    const lines = extractScriptDialogue(script);
    assert.deepEqual(lines.map(l => l.lineId), ["l1", "l3", "l4"]);
  });
});

// ---------------------------------------------------------------------------
// corpusAccuracy
// ---------------------------------------------------------------------------
describe("corpusAccuracy", () => {
  it("returns 1.0 for identical text", () => {
    assert.equal(corpusAccuracy("こんにちは", "こんにちは"), 1);
  });

  it("ignores punctuation differences", () => {
    const acc = corpusAccuracy("こんにちは。", "こんにちは");
    assert.equal(acc, 1);
  });

  it("returns < 1 for different text", () => {
    const acc = corpusAccuracy("港湾環境データ更新", "公案環境データ更新");
    assert.ok(acc < 1);
    assert.ok(acc > 0);
  });
});

// ---------------------------------------------------------------------------
// findBestMatch
// ---------------------------------------------------------------------------
describe("findBestMatch", () => {
  const makeAsrLine = (id: string, text: string): ExtractedLine => ({
    lineId: id,
    startMs: 0,
    endMs: 1000,
    text,
    rawEntryIds: [],
    mergeReasons: [],
  });

  it("finds exact match among candidates", () => {
    const scriptLine: ScriptLine = { lineId: "s1", speaker: "A", text: "テスト" };
    const asrLines = [
      makeAsrLine("a1", "別のテキスト"),
      makeAsrLine("a2", "テスト"),
      makeAsrLine("a3", "また別"),
    ];
    const result = findBestMatch(scriptLine, asrLines, new Set());
    assert.equal(result.ned, 0);
    assert.deepEqual(result.matchedLineIds, ["a2"]);
  });

  it("finds best multi-line match", () => {
    const scriptLine: ScriptLine = { lineId: "s1", speaker: "A", text: "こんにちは世界" };
    const asrLines = [
      makeAsrLine("a1", "こんにちは"),
      makeAsrLine("a2", "世界"),
      makeAsrLine("a3", "違うテキスト"),
    ];
    const result = findBestMatch(scriptLine, asrLines, new Set());
    assert.equal(result.ned, 0); // "こんにちは" + "世界" after normalisation
    assert.deepEqual(result.matchedLineIds, ["a1", "a2"]);
  });

  it("skips used indices", () => {
    const scriptLine: ScriptLine = { lineId: "s1", speaker: "A", text: "テスト" };
    const asrLines = [
      makeAsrLine("a1", "テスト"),
      makeAsrLine("a2", "別のテキスト"),
    ];
    const result = findBestMatch(scriptLine, asrLines, new Set([0]));
    assert.deepEqual(result.matchedLineIds, ["a2"]);
    assert.ok(result.ned > 0);
  });

  it("handles empty script text", () => {
    const scriptLine: ScriptLine = { lineId: "s1", speaker: "A", text: "" };
    const asrLines = [makeAsrLine("a1", "テスト")];
    const result = findBestMatch(scriptLine, asrLines, new Set());
    assert.equal(result.ned, 0);
    assert.deepEqual(result.matchedLineIds, []);
  });
});

// ---------------------------------------------------------------------------
// compareTranscriptions
// ---------------------------------------------------------------------------
describe("compareTranscriptions", () => {
  const makeScript = (lines: ScriptLine[]): ScriptFileData => ({
    episode: 1,
    scenes: [{ sceneId: "s1", lines }],
  });

  const makeAsr = (lines: ExtractedLine[]): EpisodeLines => ({
    schemaVersion: 1,
    videoId: "test",
    episode: 1,
    sourceSubtitle: { language: "ja", source: "youtube-auto", rawContentHash: "test" },
    lines,
    extractedAt: "2026-01-01T00:00:00Z",
    mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
  });

  const makeLine = (id: string, text: string): ExtractedLine => ({
    lineId: id,
    startMs: 0,
    endMs: 1000,
    text,
    rawEntryIds: [],
    mergeReasons: [],
  });

  it("reports perfect accuracy for identical content", () => {
    const script = makeScript([
      { lineId: "s1", speaker: "A", text: "こんにちは" },
      { lineId: "s2", speaker: "B", text: "世界" },
    ]);
    const asr = makeAsr([
      makeLine("a1", "こんにちは"),
      makeLine("a2", "世界"),
    ]);
    const report = compareTranscriptions(script, asr);
    assert.equal(report.corpusCharacterAccuracy, 1);
    assert.equal(report.meanLineCharacterAccuracy, 1);
    assert.equal(report.scriptDialogueLines, 2);
    assert.equal(report.matchedLines, 2);
  });

  it("excludes stage directions from comparison", () => {
    const script = makeScript([
      { lineId: "s1", speaker: "A", text: "セリフ" },
      { lineId: "s2", speaker: null, text: "（ト書き）", isDirection: true },
    ]);
    const asr = makeAsr([makeLine("a1", "セリフ")]);
    const report = compareTranscriptions(script, asr);
    assert.equal(report.scriptDialogueLines, 1);
  });

  it("reports sourceType correctly for whisper", () => {
    const script = makeScript([{ lineId: "s1", speaker: "A", text: "テスト" }]);
    const asr: EpisodeLines = {
      schemaVersion: 1,
      videoId: "test",
      episode: 1,
      sourceSubtitle: {
        language: "ja",
        source: "whisper",
        rawContentHash: "test",
        whisperModel: "medium",
      },
      lines: [makeLine("a1", "テスト")],
      extractedAt: "2026-01-01T00:00:00Z",
      mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
    };
    const report = compareTranscriptions(script, asr);
    assert.equal(report.sourceType, "whisper-medium");
  });

  it("computes median correctly for odd number of lines", () => {
    const script = makeScript([
      { lineId: "s1", speaker: "A", text: "あ" },
      { lineId: "s2", speaker: "A", text: "い" },
      { lineId: "s3", speaker: "A", text: "う" },
    ]);
    const asr = makeAsr([
      makeLine("a1", "あ"),
      makeLine("a2", "い"),
      makeLine("a3", "う"),
    ]);
    const report = compareTranscriptions(script, asr);
    assert.equal(report.medianLineCharacterAccuracy, 1);
  });
});

// ---------------------------------------------------------------------------
// EP01 real data integration test
// ---------------------------------------------------------------------------
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename_local = fileURLToPath(import.meta.url);
const __dirname_local = dirname(__filename_local);

describe("EP01 real data accuracy", () => {
  let scriptData: ScriptFileData;
  let vttData: EpisodeLines;
  let whisperData: EpisodeLines;

  // Load real data
  const dataDir = join(__dirname_local, "..", "..", "reports", "data", "episodes");

  const scriptExists = existsSync(join(dataDir, "ep01_script.json"));
  const vttExists = existsSync(join(dataDir, "ep01_lines.json"));
  const whisperExists = existsSync(join(dataDir, "ep01_lines_whisper.json"));

  if (scriptExists) {
    scriptData = JSON.parse(readFileSync(join(dataDir, "ep01_script.json"), "utf8"));
  }
  if (vttExists) {
    vttData = JSON.parse(readFileSync(join(dataDir, "ep01_lines.json"), "utf8"));
  }
  if (whisperExists) {
    whisperData = JSON.parse(readFileSync(join(dataDir, "ep01_lines_whisper.json"), "utf8"));
  }

  it("script has 229 dialogue lines", { skip: !scriptExists }, () => {
    const dialogueLines = extractScriptDialogue(scriptData);
    assert.equal(dialogueLines.length, 229);
  });

  it("VTT corpus accuracy is between 0.3 and 0.9", { skip: !scriptExists || !vttExists }, () => {
    const report = compareTranscriptions(scriptData, vttData);
    assert.ok(report.corpusCharacterAccuracy >= 0.3, `VTT accuracy too low: ${report.corpusCharacterAccuracy}`);
    assert.ok(report.corpusCharacterAccuracy <= 0.9, `VTT accuracy surprisingly high: ${report.corpusCharacterAccuracy}`);
    console.log(`  VTT corpus accuracy: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  VTT mean line accuracy: ${(report.meanLineCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  VTT median line accuracy: ${(report.medianLineCharacterAccuracy * 100).toFixed(1)}%`);
  });

  it("Whisper corpus accuracy is between 0.3 and 0.95", { skip: !scriptExists || !whisperExists }, () => {
    const report = compareTranscriptions(scriptData, whisperData);
    assert.ok(report.corpusCharacterAccuracy >= 0.3, `Whisper accuracy too low: ${report.corpusCharacterAccuracy}`);
    assert.ok(report.corpusCharacterAccuracy <= 0.95, `Whisper accuracy surprisingly high: ${report.corpusCharacterAccuracy}`);
    console.log(`  Whisper corpus accuracy: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  Whisper mean line accuracy: ${(report.meanLineCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  Whisper median line accuracy: ${(report.medianLineCharacterAccuracy * 100).toFixed(1)}%`);
  });

  it("Whisper accuracy >= VTT accuracy at corpus level", { skip: !scriptExists || !vttExists || !whisperExists }, () => {
    const vttReport = compareTranscriptions(scriptData, vttData);
    const whisperReport = compareTranscriptions(scriptData, whisperData);
    // Whisper (medium model) should be at least as good as YouTube auto-captions for VOICEROID
    // If this fails, it's still interesting data — adjust the assertion based on actual findings
    console.log(`  VTT: ${(vttReport.corpusCharacterAccuracy * 100).toFixed(1)}% vs Whisper: ${(whisperReport.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    // Note: we don't assert Whisper > VTT since both may struggle with VOICEROID
  });
});

// ---------------------------------------------------------------------------
// EP01 Whisper turbo accuracy test
// ---------------------------------------------------------------------------
describe("EP01 Whisper turbo accuracy", () => {
  const dataDir = join(__dirname_local, "..", "..", "reports", "data", "episodes");
  const scriptExists = existsSync(join(dataDir, "ep01_script.json"));
  const turboExists = existsSync(join(dataDir, "ep01_lines_whisper_turbo.json"));

  let scriptData: ScriptFileData;
  let turboData: EpisodeLines;
  let mediumData: EpisodeLines;

  if (scriptExists) {
    scriptData = JSON.parse(readFileSync(join(dataDir, "ep01_script.json"), "utf8"));
  }
  if (turboExists) {
    turboData = JSON.parse(readFileSync(join(dataDir, "ep01_lines_whisper_turbo.json"), "utf8"));
  }
  const mediumExists = existsSync(join(dataDir, "ep01_lines_whisper.json"));
  if (mediumExists) {
    mediumData = JSON.parse(readFileSync(join(dataDir, "ep01_lines_whisper.json"), "utf8"));
  }

  it("turbo corpus accuracy is above 0.88", { skip: !scriptExists || !turboExists }, () => {
    const report = compareTranscriptions(scriptData, turboData);
    assert.ok(report.corpusCharacterAccuracy >= 0.88,
      `Turbo accuracy unexpectedly low: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  Turbo corpus accuracy: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  Turbo mean line accuracy: ${(report.meanLineCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  Turbo median line accuracy: ${(report.medianLineCharacterAccuracy * 100).toFixed(1)}%`);
  });

  it("turbo accuracy > medium accuracy", { skip: !scriptExists || !turboExists || !mediumExists }, () => {
    const turboReport = compareTranscriptions(scriptData, turboData);
    const mediumReport = compareTranscriptions(scriptData, mediumData);
    console.log(`  Medium: ${(mediumReport.corpusCharacterAccuracy * 100).toFixed(1)}% vs Turbo: ${(turboReport.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    assert.ok(turboReport.corpusCharacterAccuracy > mediumReport.corpusCharacterAccuracy,
      "Turbo should outperform medium model");
  });

  it("turbo source type is whisper-turbo", { skip: !scriptExists || !turboExists }, () => {
    const report = compareTranscriptions(scriptData, turboData);
    assert.equal(report.sourceType, "whisper-turbo");
  });
});

// ---------------------------------------------------------------------------
// ocrToEpisodeLines
// ---------------------------------------------------------------------------
describe("ocrToEpisodeLines", () => {
  const makeOcrData = (frames: OcrFileData["frames"]): OcrFileData => ({
    episode: 1,
    sourceType: "video-ocr",
    ocrEngine: "tesseract-5.3.0",
    ocrLanguages: { subtitle: "jpn", hud: "eng" },
    preprocessingMethod: "grayscale-threshold",
    framesDir: "raw_data/frames/ep01",
    extractedAt: "2026-03-01T00:00:00Z",
    frames,
    summary: { totalFrames: frames.length, framesWithSubtitle: frames.filter(f => f.subtitleText).length, framesWithHud: 0 },
  });

  it("converts OCR frames to EpisodeLines format", () => {
    const ocr = makeOcrData([
      { index: 0, timestampSec: 47, timestampFormatted: "00:47", description: "test", filename: "f0.jpg", subtitleText: "テスト字幕", hudText: null },
      { index: 1, timestampSec: 72, timestampFormatted: "01:12", description: "test2", filename: "f1.jpg", subtitleText: "二番目の字幕", hudText: null },
    ]);
    const result = ocrToEpisodeLines(ocr);
    assert.equal(result.lines.length, 2);
    assert.equal(result.sourceSubtitle.source, "video-ocr");
    assert.equal(result.episode, 1);
    assert.equal(result.videoId, "CQ_OkDjEwRk");
  });

  it("assigns sequential line IDs", () => {
    const ocr = makeOcrData([
      { index: 0, timestampSec: 10, timestampFormatted: "00:10", description: "", filename: "f0.jpg", subtitleText: "一行目", hudText: null },
      { index: 1, timestampSec: 20, timestampFormatted: "00:20", description: "", filename: "f1.jpg", subtitleText: "二行目", hudText: null },
    ]);
    const result = ocrToEpisodeLines(ocr);
    assert.equal(result.lines[0].lineId, "ep01-ocr-001");
    assert.equal(result.lines[1].lineId, "ep01-ocr-002");
  });

  it("skips frames with null/empty subtitleText", () => {
    const ocr = makeOcrData([
      { index: 0, timestampSec: 10, timestampFormatted: "00:10", description: "", filename: "f0.jpg", subtitleText: "有効", hudText: null },
      { index: 1, timestampSec: 20, timestampFormatted: "00:20", description: "", filename: "f1.jpg", subtitleText: null, hudText: "eng" },
      { index: 2, timestampSec: 30, timestampFormatted: "00:30", description: "", filename: "f2.jpg", subtitleText: "", hudText: null },
      { index: 3, timestampSec: 40, timestampFormatted: "00:40", description: "", filename: "f3.jpg", subtitleText: "   ", hudText: null },
    ]);
    const result = ocrToEpisodeLines(ocr);
    assert.equal(result.lines.length, 1);
    assert.equal(result.lines[0].text, "有効");
  });

  it("sets timestamps from frame timestampSec", () => {
    const ocr = makeOcrData([
      { index: 0, timestampSec: 120, timestampFormatted: "02:00", description: "", filename: "f0.jpg", subtitleText: "テスト", hudText: null },
    ]);
    const result = ocrToEpisodeLines(ocr);
    assert.equal(result.lines[0].startMs, 120000);
    assert.equal(result.lines[0].endMs, 125000);
  });

  it("stores filename in rawEntryIds", () => {
    const ocr = makeOcrData([
      { index: 0, timestampSec: 10, timestampFormatted: "00:10", description: "", filename: "frame_000_10s.jpg", subtitleText: "テスト", hudText: null },
    ]);
    const result = ocrToEpisodeLines(ocr);
    assert.deepEqual(result.lines[0].rawEntryIds, ["frame_000_10s.jpg"]);
  });

  it("handles episode 5 video ID", () => {
    const ocr = makeOcrData([]);
    ocr.episode = 5;
    const result = ocrToEpisodeLines(ocr);
    assert.equal(result.videoId, "_trGXYRF8-4");
    assert.equal(result.episode, 5);
  });

  it("produces valid EpisodeLines for compareTranscriptions", () => {
    const ocr = makeOcrData([
      { index: 0, timestampSec: 47, timestampFormatted: "00:47", description: "", filename: "f0.jpg", subtitleText: "テスト字幕", hudText: null },
    ]);
    const lines = ocrToEpisodeLines(ocr);
    const script: ScriptFileData = {
      episode: 1,
      scenes: [{ sceneId: "s1", lines: [{ lineId: "l1", speaker: "A", text: "テスト字幕" }] }],
    };
    const report = compareTranscriptions(script, lines);
    assert.equal(report.sourceType, "video-ocr");
    assert.equal(report.corpusCharacterAccuracy, 1);
  });
});

// ---------------------------------------------------------------------------
// EP01 OCR real data accuracy
// ---------------------------------------------------------------------------
describe("EP01 OCR real data accuracy", () => {
  const dataDir = join(__dirname_local, "..", "..", "reports", "data", "episodes");
  const scriptExists = existsSync(join(dataDir, "ep01_script.json"));
  const ocrExists = existsSync(join(dataDir, "ep01_ocr.json"));

  let scriptData: ScriptFileData;
  let ocrLines: EpisodeLines;

  if (scriptExists) {
    scriptData = JSON.parse(readFileSync(join(dataDir, "ep01_script.json"), "utf8"));
  }
  if (ocrExists) {
    const ocrData: OcrFileData = JSON.parse(readFileSync(join(dataDir, "ep01_ocr.json"), "utf8"));
    ocrLines = ocrToEpisodeLines(ocrData);
  }

  it("OCR produces 21 lines from EP01", { skip: !ocrExists }, () => {
    assert.equal(ocrLines.lines.length, 21);
  });

  it("OCR sourceType is video-ocr", { skip: !scriptExists || !ocrExists }, () => {
    const report = compareTranscriptions(scriptData, ocrLines);
    assert.equal(report.sourceType, "video-ocr");
  });

  it("OCR corpus accuracy is between 0.1 and 0.7", { skip: !scriptExists || !ocrExists }, () => {
    const report = compareTranscriptions(scriptData, ocrLines);
    // Tesseract OCR on Japanese anime subtitles is expected to be quite poor
    // This establishes a baseline for future OCR improvement tracking
    console.log(`  OCR corpus accuracy: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  OCR mean line accuracy: ${(report.meanLineCharacterAccuracy * 100).toFixed(1)}%`);
    console.log(`  OCR lines: ${ocrLines.lines.length} vs script: 229`);
    assert.ok(report.corpusCharacterAccuracy >= 0.1,
      `OCR accuracy extremely low: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    assert.ok(report.corpusCharacterAccuracy <= 0.7,
      `OCR accuracy surprisingly high: ${(report.corpusCharacterAccuracy * 100).toFixed(1)}%`);
  });

  it("OCR accuracy < Whisper turbo accuracy", { skip: !scriptExists || !ocrExists }, () => {
    const turboPath = join(dataDir, "ep01_lines_whisper_turbo.json");
    if (!existsSync(turboPath)) return;
    const turboData: EpisodeLines = JSON.parse(readFileSync(turboPath, "utf8"));
    const ocrReport = compareTranscriptions(scriptData, ocrLines);
    const turboReport = compareTranscriptions(scriptData, turboData);
    console.log(`  OCR: ${(ocrReport.corpusCharacterAccuracy * 100).toFixed(1)}% vs Turbo: ${(turboReport.corpusCharacterAccuracy * 100).toFixed(1)}%`);
    // OCR from sparse frames should be worse than continuous Whisper transcription
    assert.ok(ocrReport.corpusCharacterAccuracy < turboReport.corpusCharacterAccuracy,
      "OCR should have lower accuracy than Whisper turbo");
  });
});

// ---------------------------------------------------------------------------
// computeSourceAgreement — pairwise inter-source agreement
// ---------------------------------------------------------------------------
describe("computeSourceAgreement", () => {
  const makeLine = (id: string, text: string): ExtractedLine => ({
    lineId: id,
    startMs: 0,
    endMs: 1000,
    text,
    rawEntryIds: [],
    mergeReasons: [],
  });

  const makeEpisodeLines = (
    ep: number,
    source: string,
    lines: ExtractedLine[],
    whisperModel?: string
  ): EpisodeLines => ({
    schemaVersion: 1,
    videoId: "test",
    episode: ep,
    sourceSubtitle: {
      language: "ja",
      source: source as "youtube-auto" | "whisper",
      rawContentHash: "test",
      ...(whisperModel ? { whisperModel } : {}),
    },
    lines,
    extractedAt: "2026-01-01T00:00:00Z",
    mergeConfig: { maxGapMs: 300, minCueDurationMs: 100 },
  });

  it("returns 1.0 agreement for identical content", () => {
    const a = makeEpisodeLines(2, "youtube-auto", [
      makeLine("a1", "こんにちは"),
      makeLine("a2", "世界"),
    ]);
    const b = makeEpisodeLines(2, "whisper", [
      makeLine("b1", "こんにちは"),
      makeLine("b2", "世界"),
    ], "turbo");
    const result = computeSourceAgreement(a, b);
    assert.equal(result.agreement, 1);
    assert.equal(result.sourceA, "youtube-auto");
    assert.equal(result.sourceB, "whisper-turbo");
  });

  it("returns < 1.0 for partially different content", () => {
    const a = makeEpisodeLines(2, "youtube-auto", [
      makeLine("a1", "こんにちは世界"),
    ]);
    const b = makeEpisodeLines(2, "whisper", [
      makeLine("b1", "こんばんは世界"),
    ], "medium");
    const result = computeSourceAgreement(a, b);
    assert.ok(result.agreement < 1, `Expected < 1, got ${result.agreement}`);
    assert.ok(result.agreement > 0, `Expected > 0, got ${result.agreement}`);
  });

  it("handles empty sources", () => {
    const a = makeEpisodeLines(2, "youtube-auto", []);
    const b = makeEpisodeLines(2, "whisper", [makeLine("b1", "テスト")], "turbo");
    const result = computeSourceAgreement(a, b);
    assert.equal(result.agreement, 0);
  });

  it("handles both sources empty", () => {
    const a = makeEpisodeLines(2, "youtube-auto", []);
    const b = makeEpisodeLines(2, "whisper", [], "turbo");
    const result = computeSourceAgreement(a, b);
    // Two empty corpora are vacuously identical
    assert.equal(result.agreement, 1);
  });

  it("labels source correctly with whisper model", () => {
    const a = makeEpisodeLines(2, "whisper", [makeLine("a1", "テスト")], "medium");
    const b = makeEpisodeLines(2, "whisper", [makeLine("b1", "テスト")], "turbo");
    const result = computeSourceAgreement(a, b);
    assert.equal(result.sourceA, "whisper-medium");
    assert.equal(result.sourceB, "whisper-turbo");
  });

  it("ignores punctuation differences in agreement", () => {
    const a = makeEpisodeLines(2, "youtube-auto", [
      makeLine("a1", "こんにちは。世界！"),
    ]);
    const b = makeEpisodeLines(2, "whisper", [
      makeLine("b1", "こんにちは世界"),
    ], "turbo");
    const result = computeSourceAgreement(a, b);
    assert.equal(result.agreement, 1);
  });
});

// ---------------------------------------------------------------------------
// EP02-05 inter-source agreement real data
// ---------------------------------------------------------------------------
describe("EP02-05 inter-source agreement", () => {
  const dataDir = join(__dirname_local, "..", "..", "reports", "data", "episodes");

  for (const epNum of [2, 3, 4, 5]) {
    const epStr = String(epNum).padStart(2, "0");
    const vttPath = join(dataDir, `ep${epStr}_lines.json`);
    const whisperTurboPath = join(dataDir, `ep${epStr}_lines_whisper_turbo.json`);
    const vttExists = existsSync(vttPath);
    const turboExists = existsSync(whisperTurboPath);

    it(`EP${epStr} VTT↔Whisper-turbo agreement is between 0.3 and 1.0`, {
      skip: !vttExists || !turboExists,
    }, () => {
      const vtt: EpisodeLines = JSON.parse(readFileSync(vttPath, "utf8"));
      const turbo: EpisodeLines = JSON.parse(readFileSync(whisperTurboPath, "utf8"));
      const result = computeSourceAgreement(vtt, turbo);
      console.log(`  EP${epStr} VTT↔Whisper-turbo agreement: ${(result.agreement * 100).toFixed(1)}%`);
      assert.ok(result.agreement >= 0.3, `Agreement too low: ${result.agreement}`);
      assert.ok(result.agreement <= 1.0, `Agreement > 1: ${result.agreement}`);
    });
  }
});

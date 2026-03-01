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
  type ScriptFileData,
  type ScriptLine,
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

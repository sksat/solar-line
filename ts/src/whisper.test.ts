import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  parseWhisperJson,
  assessSegmentQuality,
  buildWhisperSubtitleFile,
  generateQualityReport,
  DEFAULT_QUALITY_THRESHOLDS,
  type WhisperOutput,
  type WhisperSegment,
} from "./whisper.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeSegment(overrides: Partial<WhisperSegment> = {}): WhisperSegment {
  return {
    id: 0,
    seek: 0,
    start: 0.0,
    end: 3.0,
    text: "テスト台詞です。",
    tokens: [1, 2, 3],
    temperature: 0.0,
    avg_logprob: -0.3,
    compression_ratio: 1.2,
    no_speech_prob: 0.01,
    ...overrides,
  };
}

function makeWhisperOutput(
  segments: WhisperSegment[] = [makeSegment()]
): WhisperOutput {
  return {
    text: segments.map((s) => s.text).join(""),
    segments,
    language: "ja",
  };
}

// ---------------------------------------------------------------------------
// assessSegmentQuality
// ---------------------------------------------------------------------------

describe("assessSegmentQuality", () => {
  it("marks high-quality segment as reliable", () => {
    const segment = makeSegment({
      avg_logprob: -0.3,
      no_speech_prob: 0.01,
      compression_ratio: 1.2,
    });
    const quality = assessSegmentQuality(segment);
    assert.equal(quality.isReliable, true);
    assert.equal(quality.segmentId, 0);
  });

  it("filters segment with very negative avg_logprob", () => {
    const segment = makeSegment({ avg_logprob: -1.5 });
    const quality = assessSegmentQuality(segment);
    assert.equal(quality.isReliable, false);
  });

  it("filters segment with high no_speech_prob", () => {
    const segment = makeSegment({ no_speech_prob: 0.9 });
    const quality = assessSegmentQuality(segment);
    assert.equal(quality.isReliable, false);
  });

  it("filters segment with high compression_ratio", () => {
    const segment = makeSegment({ compression_ratio: 3.0 });
    const quality = assessSegmentQuality(segment);
    assert.equal(quality.isReliable, false);
  });

  it("respects custom thresholds", () => {
    const segment = makeSegment({ avg_logprob: -1.5 });
    const quality = assessSegmentQuality(segment, {
      ...DEFAULT_QUALITY_THRESHOLDS,
      minAvgLogProb: -2.0,
    });
    assert.equal(quality.isReliable, true);
  });

  it("segment at boundary values is reliable", () => {
    const segment = makeSegment({
      avg_logprob: -1.0,
      no_speech_prob: 0.6,
      compression_ratio: 2.4,
    });
    const quality = assessSegmentQuality(segment);
    assert.equal(quality.isReliable, true);
  });
});

// ---------------------------------------------------------------------------
// parseWhisperJson
// ---------------------------------------------------------------------------

describe("parseWhisperJson", () => {
  it("converts segments to RawSubtitleEntry[]", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, start: 0.0, end: 2.5, text: "最初の台詞。" }),
      makeSegment({ id: 1, start: 3.0, end: 5.5, text: "次の台詞。" }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries.length, 2);
    assert.deepEqual(entries[0], {
      id: "whisper-0",
      startMs: 0,
      endMs: 2500,
      text: "最初の台詞。",
    });
    assert.deepEqual(entries[1], {
      id: "whisper-1",
      startMs: 3000,
      endMs: 5500,
      text: "次の台詞。",
    });
  });

  it("filters empty text segments", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, text: "" }),
      makeSegment({ id: 1, text: "  " }),
      makeSegment({ id: 2, text: "有効な台詞。" }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, "whisper-2");
  });

  it("filters low-quality segments", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, text: "良い台詞。", avg_logprob: -0.3 }),
      makeSegment({ id: 1, text: "悪い台詞。", no_speech_prob: 0.95 }),
      makeSegment({
        id: 2,
        text: "繰り返し繰り返し。",
        compression_ratio: 3.5,
      }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, "whisper-0");
  });

  it("skips segments where end <= start", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, start: 5.0, end: 5.0, text: "ゼロ長。" }),
      makeSegment({ id: 1, start: 6.0, end: 5.0, text: "逆転。" }),
      makeSegment({ id: 2, start: 7.0, end: 8.0, text: "正常。" }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].id, "whisper-2");
  });

  it("rounds timestamps to integer milliseconds", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, start: 1.2345, end: 3.6789, text: "丸め。" }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries[0].startMs, 1235);
    assert.equal(entries[0].endMs, 3679);
  });

  it("handles empty segment list", () => {
    const json = makeWhisperOutput([]);
    const entries = parseWhisperJson(json);
    assert.equal(entries.length, 0);
  });

  it("trims whitespace from segment text", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, text: "  前後空白  " }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries[0].text, "前後空白");
  });

  it("sorts unsorted segments by start time", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 2, start: 6.0, end: 9.0, text: "三番目。" }),
      makeSegment({ id: 0, start: 0.0, end: 3.0, text: "一番目。" }),
      makeSegment({ id: 1, start: 3.0, end: 6.0, text: "二番目。" }),
    ]);
    const entries = parseWhisperJson(json);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].text, "一番目。");
    assert.equal(entries[1].text, "二番目。");
    assert.equal(entries[2].text, "三番目。");
  });
});

// ---------------------------------------------------------------------------
// buildWhisperSubtitleFile
// ---------------------------------------------------------------------------

describe("buildWhisperSubtitleFile", () => {
  it("builds a valid RawSubtitleFile", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, start: 0.0, end: 2.0, text: "台詞。" }),
    ]);
    const rawJson = JSON.stringify(json);
    const file = buildWhisperSubtitleFile({
      videoId: "sm45987761",
      rawJson,
    });

    assert.equal(file.schemaVersion, 1);
    assert.equal(file.videoId, "sm45987761");
    assert.equal(file.language, "ja");
    assert.equal(file.source, "whisper");
    assert.equal(file.rawContentHash.length, 64);
    assert.equal(file.entries.length, 1);
    assert.match(file.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  it("uses detected language from Whisper output", () => {
    const json: WhisperOutput = {
      text: "English text.",
      segments: [makeSegment({ text: "English text." })],
      language: "en",
    };
    const file = buildWhisperSubtitleFile({
      videoId: "test",
      rawJson: JSON.stringify(json),
    });
    assert.equal(file.language, "en");
  });

  it("applies custom quality thresholds", () => {
    const json = makeWhisperOutput([
      makeSegment({ id: 0, text: "通常品質。", avg_logprob: -0.8 }),
      makeSegment({ id: 1, text: "低品質。", avg_logprob: -1.5 }),
    ]);
    // With default thresholds: -0.8 > -1.0 passes, -1.5 < -1.0 filtered
    const fileDefault = buildWhisperSubtitleFile({
      videoId: "test",
      rawJson: JSON.stringify(json),
    });
    assert.equal(fileDefault.entries.length, 1);

    // With relaxed thresholds
    const fileRelaxed = buildWhisperSubtitleFile({
      videoId: "test",
      rawJson: JSON.stringify(json),
      thresholds: { ...DEFAULT_QUALITY_THRESHOLDS, minAvgLogProb: -2.0 },
    });
    assert.equal(fileRelaxed.entries.length, 2);
  });
});

// ---------------------------------------------------------------------------
// generateQualityReport
// ---------------------------------------------------------------------------

describe("generateQualityReport", () => {
  it("generates correct quality report", () => {
    const json = makeWhisperOutput([
      makeSegment({
        id: 0,
        start: 0.0,
        end: 3.0,
        avg_logprob: -0.3,
        no_speech_prob: 0.01,
      }),
      makeSegment({
        id: 1,
        start: 3.0,
        end: 6.0,
        avg_logprob: -0.5,
        no_speech_prob: 0.02,
      }),
      makeSegment({
        id: 2,
        start: 6.0,
        end: 9.0,
        avg_logprob: -1.5,
        no_speech_prob: 0.9,
      }),
    ]);

    const report = generateQualityReport(json);
    assert.equal(report.totalSegments, 3);
    assert.equal(report.reliableSegments, 2);
    assert.equal(report.filteredSegments, 1);
    assert.equal(report.detectedLanguage, "ja");
    assert.equal(report.totalDurationMs, 9000);

    const expectedAvgLogProb = (-0.3 + -0.5 + -1.5) / 3;
    assert.ok(
      Math.abs(report.avgLogProb - expectedAvgLogProb) < 0.001,
      `avgLogProb ${report.avgLogProb} ≈ ${expectedAvgLogProb}`
    );

    const expectedAvgNoSpeech = (0.01 + 0.02 + 0.9) / 3;
    assert.ok(
      Math.abs(report.avgNoSpeechProb - expectedAvgNoSpeech) < 0.001,
      `avgNoSpeechProb ${report.avgNoSpeechProb} ≈ ${expectedAvgNoSpeech}`
    );
  });

  it("handles empty segments", () => {
    const json = makeWhisperOutput([]);
    const report = generateQualityReport(json);
    assert.equal(report.totalSegments, 0);
    assert.equal(report.reliableSegments, 0);
    assert.equal(report.avgLogProb, 0);
    assert.equal(report.totalDurationMs, 0);
  });
});

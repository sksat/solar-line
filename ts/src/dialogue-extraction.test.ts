/**
 * Tests for Phase 1 dialogue extraction pipeline.
 *
 * TDD: these tests define the expected behavior of the merging and
 * extraction logic before implementation.
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import type { RawSubtitleEntry } from "./subtitle-types.ts";
import { DEFAULT_MERGE_CONFIG } from "./dialogue-extraction-types.ts";
import {
  shouldMergeCues,
  mergeCueTexts,
  extractLines,
  validateEpisodeLines,
} from "./dialogue-extraction.ts";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function cue(
  id: string,
  startMs: number,
  endMs: number,
  text: string
): RawSubtitleEntry {
  return { id, startMs, endMs, text };
}

// ---------------------------------------------------------------------------
// shouldMergeCues
// ---------------------------------------------------------------------------

describe("shouldMergeCues", () => {
  const cfg = DEFAULT_MERGE_CONFIG;

  it("merges when previous cue lacks terminal punctuation and gap is small", () => {
    const prev = cue("c0", 0, 2000, "火星中央港から");
    const next = cue("c1", 2100, 4000, "ガニメデ中央港まで");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, true);
    assert.ok(result.reasons.includes("no_terminal_punctuation"));
  });

  it("does not merge when previous cue ends with 。", () => {
    const prev = cue("c0", 0, 2000, "了解。");
    const next = cue("c1", 2100, 4000, "出発する");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, false);
  });

  it("does not merge when previous cue ends with ！", () => {
    const prev = cue("c0", 0, 2000, "急げ！");
    const next = cue("c1", 2100, 4000, "了解");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, false);
  });

  it("does not merge when previous cue ends with ？", () => {
    const prev = cue("c0", 0, 2000, "本当か？");
    const next = cue("c1", 2100, 4000, "本当だ");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, false);
  });

  it("does not merge when gap exceeds maxGapMs", () => {
    const prev = cue("c0", 0, 2000, "火星中央港から");
    const next = cue("c1", 5000, 7000, "ガニメデ中央港まで");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, false);
  });

  it("merges when previous cue ends with continuation marker 、", () => {
    const prev = cue("c0", 0, 2000, "しかし、");
    const next = cue("c1", 2100, 4000, "問題がある");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, true);
    assert.ok(result.reasons.includes("continuation_marker"));
  });

  it("merges when previous cue ends with open quote 「", () => {
    const prev = cue("c0", 0, 2000, "きりたん「");
    const next = cue("c1", 2100, 4000, "了解しました」");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, true);
    assert.ok(result.reasons.includes("continuation_marker"));
  });

  it("merges when next cue starts with closing quote 」", () => {
    const prev = cue("c0", 0, 2000, "了解しました");
    const next = cue("c1", 2100, 4000, "」と返答した");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, true);
    assert.ok(result.reasons.includes("continuation_start"));
  });

  it("merges when previous cue ends with ellipsis …", () => {
    const prev = cue("c0", 0, 2000, "まさか…");
    const next = cue("c1", 2100, 4000, "そんなことが");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, true);
    assert.ok(result.reasons.includes("continuation_marker"));
  });

  it("does not merge when gap is large even with continuation markers", () => {
    const prev = cue("c0", 0, 2000, "しかし、");
    const next = cue("c1", 10000, 12000, "問題がある");
    const result = shouldMergeCues(prev, next, cfg);
    assert.equal(result.shouldMerge, false);
  });
});

// ---------------------------------------------------------------------------
// mergeCueTexts
// ---------------------------------------------------------------------------

describe("mergeCueTexts", () => {
  it("joins two texts without extra whitespace", () => {
    assert.equal(
      mergeCueTexts("火星中央港から", "ガニメデ中央港まで"),
      "火星中央港からガニメデ中央港まで"
    );
  });

  it("removes trailing/leading whitespace", () => {
    assert.equal(
      mergeCueTexts("火星中央港から ", " ガニメデ中央港まで"),
      "火星中央港からガニメデ中央港まで"
    );
  });

  it("strips duplicate text from auto-generated subtitle overlap", () => {
    assert.equal(
      mergeCueTexts("火星中央港から", "火星中央港からガニメデ中央港まで"),
      "火星中央港からガニメデ中央港まで"
    );
  });

  it("preserves text when no duplication", () => {
    assert.equal(mergeCueTexts("了解", "出発する"), "了解出発する");
  });
});

// ---------------------------------------------------------------------------
// extractLines
// ---------------------------------------------------------------------------

describe("extractLines", () => {
  const cfg = DEFAULT_MERGE_CONFIG;

  it("produces one line per cue when no merging needed", () => {
    const entries: RawSubtitleEntry[] = [
      cue("c0", 0, 2000, "了解。"),
      cue("c1", 3000, 5000, "出発する。"),
    ];
    const lines = extractLines(entries, "ep01", cfg);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].lineId, "ep01-line-001");
    assert.equal(lines[0].text, "了解。");
    assert.deepEqual(lines[0].rawEntryIds, ["c0"]);
    assert.deepEqual(lines[0].mergeReasons, []);
    assert.equal(lines[1].lineId, "ep01-line-002");
    assert.equal(lines[1].text, "出発する。");
  });

  it("merges continuation cues into a single line", () => {
    const entries: RawSubtitleEntry[] = [
      cue("c0", 0, 2000, "火星中央港から"),
      cue("c1", 2100, 4000, "ガニメデ中央港まで、"),
      cue("c2", 4100, 6000, "72時間以内に届けてほしい。"),
    ];
    const lines = extractLines(entries, "ep01", cfg);
    assert.equal(lines.length, 1);
    assert.equal(
      lines[0].text,
      "火星中央港からガニメデ中央港まで、72時間以内に届けてほしい。"
    );
    assert.deepEqual(lines[0].rawEntryIds, ["c0", "c1", "c2"]);
    assert.equal(lines[0].startMs, 0);
    assert.equal(lines[0].endMs, 6000);
  });

  it("handles mixed merge and no-merge sequences", () => {
    const entries: RawSubtitleEntry[] = [
      cue("c0", 0, 2000, "火星中央港から"),
      cue("c1", 2100, 4000, "出発する。"),
      cue("c2", 5000, 7000, "了解。"),
    ];
    const lines = extractLines(entries, "ep01", cfg);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].text, "火星中央港から出発する。");
    assert.deepEqual(lines[0].rawEntryIds, ["c0", "c1"]);
    assert.equal(lines[1].text, "了解。");
    assert.deepEqual(lines[1].rawEntryIds, ["c2"]);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(extractLines([], "ep01", cfg), []);
  });

  it("handles single cue", () => {
    const entries: RawSubtitleEntry[] = [cue("c0", 0, 2000, "了解。")];
    const lines = extractLines(entries, "ep01", cfg);
    assert.equal(lines.length, 1);
    assert.deepEqual(lines[0].rawEntryIds, ["c0"]);
  });

  it("skips empty text cues", () => {
    const entries: RawSubtitleEntry[] = [
      cue("c0", 0, 2000, "了解。"),
      cue("c1", 3000, 3500, ""),
      cue("c2", 4000, 6000, "出発する。"),
    ];
    const lines = extractLines(entries, "ep01", cfg);
    assert.equal(lines.length, 2);
  });

  it("assigns sequential line IDs with episode prefix", () => {
    const entries: RawSubtitleEntry[] = [
      cue("c0", 0, 2000, "了解。"),
      cue("c1", 3000, 5000, "出発する。"),
      cue("c2", 6000, 8000, "到着した。"),
    ];
    const lines = extractLines(entries, "ep02", cfg);
    assert.deepEqual(
      lines.map((l) => l.lineId),
      ["ep02-line-001", "ep02-line-002", "ep02-line-003"]
    );
  });
});

// ---------------------------------------------------------------------------
// validateEpisodeLines
// ---------------------------------------------------------------------------

describe("validateEpisodeLines", () => {
  it("returns no errors for valid data", () => {
    const data = {
      schemaVersion: 1,
      videoId: "sm45280425",
      episode: 1,
      sourceSubtitle: {
        language: "ja",
        source: "youtube-auto" as const,
        rawContentHash: "abc123",
      },
      lines: [
        {
          lineId: "ep01-line-001",
          startMs: 0,
          endMs: 2000,
          text: "了解。",
          rawEntryIds: ["c0"],
          mergeReasons: [],
        },
      ],
      extractedAt: "2026-02-23T00:00:00Z",
      mergeConfig: DEFAULT_MERGE_CONFIG,
    };
    assert.deepEqual(validateEpisodeLines(data), []);
  });

  it("catches non-chronological lines", () => {
    const data = {
      schemaVersion: 1,
      videoId: "sm45280425",
      episode: 1,
      sourceSubtitle: {
        language: "ja",
        source: "youtube-auto" as const,
        rawContentHash: "abc123",
      },
      lines: [
        {
          lineId: "ep01-line-001",
          startMs: 5000,
          endMs: 7000,
          text: "了解。",
          rawEntryIds: ["c0"],
          mergeReasons: [],
        },
        {
          lineId: "ep01-line-002",
          startMs: 2000,
          endMs: 4000,
          text: "出発。",
          rawEntryIds: ["c1"],
          mergeReasons: [],
        },
      ],
      extractedAt: "2026-02-23T00:00:00Z",
      mergeConfig: DEFAULT_MERGE_CONFIG,
    };
    const errors = validateEpisodeLines(data);
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes("chronological"));
  });

  it("catches duplicate line IDs", () => {
    const data = {
      schemaVersion: 1,
      videoId: "sm45280425",
      episode: 1,
      sourceSubtitle: {
        language: "ja",
        source: "youtube-auto" as const,
        rawContentHash: "abc123",
      },
      lines: [
        {
          lineId: "ep01-line-001",
          startMs: 0,
          endMs: 2000,
          text: "了解。",
          rawEntryIds: ["c0"],
          mergeReasons: [],
        },
        {
          lineId: "ep01-line-001",
          startMs: 3000,
          endMs: 5000,
          text: "出発。",
          rawEntryIds: ["c1"],
          mergeReasons: [],
        },
      ],
      extractedAt: "2026-02-23T00:00:00Z",
      mergeConfig: DEFAULT_MERGE_CONFIG,
    };
    const errors = validateEpisodeLines(data);
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes("duplicate"));
  });

  it("catches missing videoId", () => {
    const data = {
      schemaVersion: 1,
      videoId: "",
      episode: 1,
      sourceSubtitle: {
        language: "ja",
        source: "youtube-auto" as const,
        rawContentHash: "abc123",
      },
      lines: [],
      extractedAt: "2026-02-23T00:00:00Z",
      mergeConfig: DEFAULT_MERGE_CONFIG,
    };
    const errors = validateEpisodeLines(data);
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes("videoId"));
  });
});

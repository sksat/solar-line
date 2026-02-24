import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  parseVtt,
  parseSrt,
  parseTimestampMs,
  stripVttTags,
  validateRawSubtitleFile,
  validateEpisodeDialogue,
  buildRawSubtitleFile,
} from "./subtitle.ts";
import type {
  RawSubtitleEntry,
  RawSubtitleFile,
  EpisodeDialogue,
  DialogueLine,
  SceneBreak,
} from "./subtitle-types.ts";
import { SUBTITLE_SCHEMA_VERSION } from "./subtitle-types.ts";

// ---------------------------------------------------------------------------
// parseTimestampMs
// ---------------------------------------------------------------------------

describe("parseTimestampMs", () => {
  it("parses HH:MM:SS.mmm format", () => {
    assert.equal(parseTimestampMs("00:01:23.456"), 83456);
  });

  it("parses MM:SS.mmm format", () => {
    assert.equal(parseTimestampMs("01:23.456"), 83456);
  });

  it("parses HH:MM:SS,mmm format (SRT-style)", () => {
    assert.equal(parseTimestampMs("00:01:23,456"), 83456);
  });

  it("handles zero", () => {
    assert.equal(parseTimestampMs("00:00:00.000"), 0);
  });

  it("handles hours > 0", () => {
    assert.equal(parseTimestampMs("02:30:00.000"), 9000000);
  });

  it("throws on invalid format", () => {
    assert.throws(() => parseTimestampMs("invalid"), /Invalid timestamp/);
  });
});

// ---------------------------------------------------------------------------
// stripVttTags
// ---------------------------------------------------------------------------

describe("stripVttTags", () => {
  it("removes <c> tags", () => {
    assert.equal(stripVttTags("<c.color1>hello</c>"), "hello");
  });

  it("removes <b>, <i>, <u> tags", () => {
    assert.equal(stripVttTags("<b>bold</b> <i>italic</i>"), "bold italic");
  });

  it("preserves plain text", () => {
    assert.equal(stripVttTags("plain text"), "plain text");
  });

  it("removes multiple nested tags", () => {
    assert.equal(stripVttTags("<c><b>nested</b></c>"), "nested");
  });
});

// ---------------------------------------------------------------------------
// parseVtt
// ---------------------------------------------------------------------------

describe("parseVtt", () => {
  const sampleVtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello, this is the first line.

00:00:05.000 --> 00:00:08.000
Second line here.

00:00:10.000 --> 00:00:12.500
Third line with <c.color1>tags</c>.
`;

  it("parses VTT into entries", () => {
    const entries = parseVtt(sampleVtt);
    assert.equal(entries.length, 3);
  });

  it("extracts correct timestamps", () => {
    const entries = parseVtt(sampleVtt);
    assert.equal(entries[0].startMs, 1000);
    assert.equal(entries[0].endMs, 4000);
    assert.equal(entries[1].startMs, 5000);
    assert.equal(entries[1].endMs, 8000);
  });

  it("strips VTT formatting tags from text", () => {
    const entries = parseVtt(sampleVtt);
    assert.equal(entries[2].text, "Third line with tags.");
  });

  it("assigns sequential IDs", () => {
    const entries = parseVtt(sampleVtt);
    assert.equal(entries[0].id, "cue-0");
    assert.equal(entries[1].id, "cue-1");
    assert.equal(entries[2].id, "cue-2");
  });

  it("handles empty input", () => {
    const entries = parseVtt("WEBVTT\n\n");
    assert.equal(entries.length, 0);
  });

  it("handles multiline cues", () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
First line
Second line
`;
    const entries = parseVtt(vtt);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].text, "First line\nSecond line");
  });

  it("handles cues with explicit IDs", () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Cue with ID
`;
    const entries = parseVtt(vtt);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].text, "Cue with ID");
  });
});

// ---------------------------------------------------------------------------
// parseSrt
// ---------------------------------------------------------------------------

describe("parseSrt", () => {
  const sampleSrt = `1
00:00:01,000 --> 00:00:04,000
Hello, first line.

2
00:00:05,000 --> 00:00:08,000
Second line.
`;

  it("parses SRT into entries", () => {
    const entries = parseSrt(sampleSrt);
    assert.equal(entries.length, 2);
  });

  it("extracts correct timestamps", () => {
    const entries = parseSrt(sampleSrt);
    assert.equal(entries[0].startMs, 1000);
    assert.equal(entries[0].endMs, 4000);
  });

  it("preserves text content", () => {
    const entries = parseSrt(sampleSrt);
    assert.equal(entries[0].text, "Hello, first line.");
    assert.equal(entries[1].text, "Second line.");
  });

  it("assigns sequential IDs", () => {
    const entries = parseSrt(sampleSrt);
    assert.equal(entries[0].id, "cue-0");
    assert.equal(entries[1].id, "cue-1");
  });

  it("handles empty input", () => {
    const entries = parseSrt("");
    assert.equal(entries.length, 0);
  });
});

// ---------------------------------------------------------------------------
// buildRawSubtitleFile
// ---------------------------------------------------------------------------

describe("buildRawSubtitleFile", () => {
  it("builds a RawSubtitleFile from parsed entries and metadata", () => {
    const entries: RawSubtitleEntry[] = [
      { id: "cue-0", startMs: 0, endMs: 1000, text: "Hello" },
    ];
    const rawContent = "WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello\n";
    const result = buildRawSubtitleFile({
      videoId: "abc123",
      language: "ja",
      source: "youtube-auto",
      rawContent,
      entries,
    });

    assert.equal(result.schemaVersion, SUBTITLE_SCHEMA_VERSION);
    assert.equal(result.videoId, "abc123");
    assert.equal(result.language, "ja");
    assert.equal(result.source, "youtube-auto");
    assert.equal(result.entries.length, 1);
    assert.ok(result.fetchedAt); // ISO string
    assert.ok(result.rawContentHash); // non-empty SHA-256
    assert.equal(result.rawContentHash.length, 64); // hex SHA-256
  });
});

// ---------------------------------------------------------------------------
// validateRawSubtitleFile
// ---------------------------------------------------------------------------

describe("validateRawSubtitleFile", () => {
  it("returns no errors for valid data", () => {
    const valid: RawSubtitleFile = {
      schemaVersion: SUBTITLE_SCHEMA_VERSION,
      videoId: "abc123",
      language: "ja",
      source: "youtube-auto",
      fetchedAt: "2026-02-23T00:00:00Z",
      rawContentHash: "a".repeat(64),
      entries: [{ id: "cue-0", startMs: 0, endMs: 1000, text: "Hello" }],
    };
    const errors = validateRawSubtitleFile(valid);
    assert.equal(errors.length, 0);
  });

  it("catches missing videoId", () => {
    const invalid = {
      schemaVersion: SUBTITLE_SCHEMA_VERSION,
      videoId: "",
      language: "ja",
      source: "youtube-auto" as const,
      fetchedAt: "2026-02-23T00:00:00Z",
      rawContentHash: "a".repeat(64),
      entries: [],
    };
    const errors = validateRawSubtitleFile(invalid);
    assert.ok(errors.some((e) => e.includes("videoId")));
  });

  it("catches entries with endMs <= startMs", () => {
    const invalid: RawSubtitleFile = {
      schemaVersion: SUBTITLE_SCHEMA_VERSION,
      videoId: "abc123",
      language: "ja",
      source: "youtube-auto",
      fetchedAt: "2026-02-23T00:00:00Z",
      rawContentHash: "a".repeat(64),
      entries: [{ id: "cue-0", startMs: 5000, endMs: 3000, text: "Bad" }],
    };
    const errors = validateRawSubtitleFile(invalid);
    assert.ok(errors.some((e) => e.includes("endMs")));
  });

  it("catches non-chronological entries", () => {
    const invalid: RawSubtitleFile = {
      schemaVersion: SUBTITLE_SCHEMA_VERSION,
      videoId: "abc123",
      language: "ja",
      source: "youtube-auto",
      fetchedAt: "2026-02-23T00:00:00Z",
      rawContentHash: "a".repeat(64),
      entries: [
        { id: "cue-0", startMs: 5000, endMs: 6000, text: "Later" },
        { id: "cue-1", startMs: 1000, endMs: 2000, text: "Earlier" },
      ],
    };
    const errors = validateRawSubtitleFile(invalid);
    assert.ok(errors.some((e) => e.includes("chronological")));
  });
});

// ---------------------------------------------------------------------------
// validateEpisodeDialogue
// ---------------------------------------------------------------------------

describe("validateEpisodeDialogue", () => {
  const validDialogue: EpisodeDialogue = {
    schemaVersion: SUBTITLE_SCHEMA_VERSION,
    videoId: "abc123",
    episode: 1,
    title: "Test Episode",
    sourceUrl: "https://www.youtube.com/watch?v=abc123",
    language: "ja",
    speakers: [
      { id: "yukari", nameJa: "結月ゆかり", aliases: ["ゆかり"] },
    ],
    scenes: [
      { id: "ep01-scene-01", startMs: 0, endMs: 60000, description: "Opening" },
    ],
    dialogue: [
      {
        lineId: "ep01-dl-001",
        speakerId: "yukari",
        speakerName: "結月ゆかり",
        text: "ΔVは5km/sです",
        startMs: 1000,
        endMs: 4000,
        sceneId: "ep01-scene-01",
        confidence: "verified",
        rawEntryIds: ["cue-0"],
        transferRefs: [],
        mentions: [
          {
            concept: "delta_v",
            textSpan: [0, 2],
            normalizedValue: 5,
            unit: "km/s",
          },
        ],
      },
    ],
    attributionNotes: "Reviewed by Claude",
    reviewedBy: "claude",
    reviewedAt: "2026-02-23T00:00:00Z",
    rawContentHash: "a".repeat(64),
  };

  it("returns no errors for valid data", () => {
    const errors = validateEpisodeDialogue(validDialogue);
    assert.equal(errors.length, 0);
  });

  it("catches dialogue referencing unknown speaker", () => {
    const invalid: EpisodeDialogue = {
      ...validDialogue,
      dialogue: [
        { ...validDialogue.dialogue[0], speakerId: "unknown" },
      ],
    };
    const errors = validateEpisodeDialogue(invalid);
    assert.ok(errors.some((e) => e.includes("speaker")));
  });

  it("catches dialogue referencing unknown scene", () => {
    const invalid: EpisodeDialogue = {
      ...validDialogue,
      dialogue: [
        { ...validDialogue.dialogue[0], sceneId: "ep01-scene-99" },
      ],
    };
    const errors = validateEpisodeDialogue(invalid);
    assert.ok(errors.some((e) => e.includes("scene")));
  });

  it("catches overlapping scenes", () => {
    const invalid: EpisodeDialogue = {
      ...validDialogue,
      scenes: [
        { id: "ep01-scene-01", startMs: 0, endMs: 60000, description: "A" },
        { id: "ep01-scene-02", startMs: 30000, endMs: 90000, description: "B" },
      ],
    };
    const errors = validateEpisodeDialogue(invalid);
    assert.ok(errors.some((e) => e.includes("overlap")));
  });
});

/**
 * Report data integrity validation tests.
 *
 * These tests validate the actual JSON report data files in reports/data/,
 * ensuring structural integrity, referential consistency, and alignment
 * between episode reports and attributed dialogue data.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport, TransferAnalysis, DialogueQuote } from "./report-types.ts";
import type { EpisodeDialogue, DialogueLine } from "./subtitle-types.ts";

const REPORTS_DIR = path.resolve(import.meta.dirname ?? ".", "..", "..", "reports");
const EPISODES_DIR = path.join(REPORTS_DIR, "data", "episodes");

/** Load an episode report JSON file */
function loadEpisodeReport(epNum: number): EpisodeReport {
  const filePath = path.join(EPISODES_DIR, `ep${String(epNum).padStart(2, "0")}.json`);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/** Load attributed dialogue JSON if it exists, null otherwise */
function loadDialogue(epNum: number): EpisodeDialogue | null {
  const filePath = path.join(EPISODES_DIR, `ep${String(epNum).padStart(2, "0")}_dialogue.json`);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

/** Get all available episode numbers by scanning directory */
function getAvailableEpisodes(): number[] {
  const files = fs.readdirSync(EPISODES_DIR).filter(f => /^ep\d{2}\.json$/.test(f));
  return files.map(f => parseInt(f.slice(2, 4), 10)).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Structural integrity
// ---------------------------------------------------------------------------

describe("report data: structural integrity", () => {
  const episodes = getAvailableEpisodes();

  it("has at least one episode report", () => {
    assert.ok(episodes.length > 0, "No episode reports found");
  });

  for (const epNum of episodes) {
    describe(`episode ${epNum}`, () => {
      const report = loadEpisodeReport(epNum);

      it("has required fields", () => {
        assert.equal(report.episode, epNum);
        assert.ok(report.title.length > 0, "title must not be empty");
        assert.ok(report.summary.length > 0, "summary must not be empty");
        assert.ok(Array.isArray(report.transfers), "transfers must be an array");
      });

      it("has unique transfer IDs", () => {
        const ids = report.transfers.map(t => t.id);
        const uniqueIds = new Set(ids);
        assert.equal(ids.length, uniqueIds.size, `Duplicate transfer IDs: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
      });

      it("has unique dialogue quote IDs", () => {
        const quotes = report.dialogueQuotes ?? [];
        const ids = quotes.map(q => q.id);
        const uniqueIds = new Set(ids);
        assert.equal(ids.length, uniqueIds.size, `Duplicate quote IDs: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
      });

      it("has unique exploration IDs", () => {
        const explorations = report.explorations ?? [];
        const ids = explorations.map(e => e.id);
        const uniqueIds = new Set(ids);
        assert.equal(ids.length, uniqueIds.size, `Duplicate exploration IDs`);
      });

      it("has unique diagram IDs", () => {
        const diagrams = report.diagrams ?? [];
        const ids = diagrams.map(d => d.id);
        const uniqueIds = new Set(ids);
        assert.equal(ids.length, uniqueIds.size, `Duplicate diagram IDs`);
      });

      it("transfer episode numbers match report episode", () => {
        for (const t of report.transfers) {
          assert.equal(t.episode, epNum, `Transfer ${t.id} has episode=${t.episode}, expected ${epNum}`);
        }
      });

      it("transfers have valid verdicts", () => {
        const validVerdicts = new Set(["plausible", "implausible", "indeterminate", "conditional", "reference"]);
        for (const t of report.transfers) {
          assert.ok(validVerdicts.has(t.verdict), `Transfer ${t.id} has invalid verdict: ${t.verdict}`);
        }
      });

      it("video cards have valid providers", () => {
        const validProviders = new Set(["youtube", "niconico"]);
        for (const vc of report.videoCards ?? []) {
          assert.ok(validProviders.has(vc.provider), `Invalid video provider: ${vc.provider}`);
          assert.ok(vc.id.length > 0, "Video card must have an id");
        }
      });

      it("dialogue quotes have valid timestamps", () => {
        const timestampRe = /^\d{1,2}:\d{2}(:\d{2})?$/;
        for (const q of report.dialogueQuotes ?? []) {
          assert.ok(timestampRe.test(q.timestamp), `Quote ${q.id} has invalid timestamp: ${q.timestamp}`);
        }
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Referential integrity: evidenceQuoteIds → dialogueQuotes
// ---------------------------------------------------------------------------

describe("report data: evidenceQuoteIds referential integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const quoteIds = new Set((report.dialogueQuotes ?? []).map(q => q.id));

    for (const transfer of report.transfers) {
      const refs = transfer.evidenceQuoteIds ?? [];
      if (refs.length === 0) continue;

      it(`ep${String(epNum).padStart(2, "0")} ${transfer.id}: all evidenceQuoteIds reference existing quotes`, () => {
        for (const refId of refs) {
          assert.ok(quoteIds.has(refId), `Transfer ${transfer.id} references non-existent quote "${refId}". Available: [${[...quoteIds].join(", ")}]`);
        }
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Referential integrity: exploration.transferId → transfers
// ---------------------------------------------------------------------------

describe("report data: exploration transferId referential integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const transferIds = new Set(report.transfers.map(t => t.id));

    for (const exploration of report.explorations ?? []) {
      it(`ep${String(epNum).padStart(2, "0")} ${exploration.id}: transferId references existing transfer`, () => {
        assert.ok(
          transferIds.has(exploration.transferId),
          `Exploration ${exploration.id} references non-existent transfer "${exploration.transferId}"`
        );
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Referential integrity: diagram orbit/transfer references
// ---------------------------------------------------------------------------

describe("report data: diagram referential integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);

    for (const diagram of report.diagrams ?? []) {
      const orbitIds = new Set(diagram.orbits.map(o => o.id));

      it(`ep${String(epNum).padStart(2, "0")} ${diagram.id}: transfer arcs reference valid orbits`, () => {
        for (const arc of diagram.transfers) {
          assert.ok(
            orbitIds.has(arc.fromOrbitId),
            `Transfer arc "${arc.label}" references unknown fromOrbitId "${arc.fromOrbitId}"`
          );
          assert.ok(
            orbitIds.has(arc.toOrbitId),
            `Transfer arc "${arc.label}" references unknown toOrbitId "${arc.toOrbitId}"`
          );
        }
      });

      it(`ep${String(epNum).padStart(2, "0")} ${diagram.id}: orbits have unique IDs`, () => {
        const ids = diagram.orbits.map(o => o.id);
        assert.equal(ids.length, orbitIds.size, `Duplicate orbit IDs in diagram ${diagram.id}`);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Cross-file consistency: report quotes vs attributed dialogue
// ---------------------------------------------------------------------------

describe("report data: dialogue attribution consistency", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const dialogue = loadDialogue(epNum);

    if (!dialogue) continue;
    if (!report.dialogueQuotes || report.dialogueQuotes.length === 0) continue;

    it(`ep${String(epNum).padStart(2, "0")}: report speaker names use valid speaker names from dialogue registry`, () => {
      const validNames = new Set(dialogue.speakers.map(s => s.nameJa));
      for (const quote of report.dialogueQuotes!) {
        assert.ok(
          validNames.has(quote.speaker),
          `Quote ${quote.id} speaker "${quote.speaker}" not found in dialogue speaker registry. Valid: [${[...validNames].join(", ")}]`
        );
      }
    });

    it(`ep${String(epNum).padStart(2, "0")}: dialogue data has expected schema version`, () => {
      assert.equal(dialogue.schemaVersion, 1, `Unexpected dialogue schema version: ${dialogue.schemaVersion}`);
    });

    it(`ep${String(epNum).padStart(2, "0")}: dialogue data has speakers and scenes`, () => {
      assert.ok(dialogue.speakers.length > 0, "No speakers in dialogue data");
      assert.ok(dialogue.scenes.length > 0, "No scenes in dialogue data");
      assert.ok(dialogue.dialogue.length > 0, "No dialogue entries");
    });

    it(`ep${String(epNum).padStart(2, "0")}: all dialogue entries reference valid speakers`, () => {
      const validSpeakerIds = new Set(dialogue.speakers.map(s => s.id));
      for (const entry of dialogue.dialogue) {
        assert.ok(
          validSpeakerIds.has(entry.speakerId),
          `Dialogue entry at ${entry.startMs}ms has unknown speakerId "${entry.speakerId}"`
        );
      }
    });

    it(`ep${String(epNum).padStart(2, "0")}: all dialogue entries reference valid scenes`, () => {
      const validSceneIds = new Set(dialogue.scenes.map(s => s.id));
      for (const entry of dialogue.dialogue) {
        assert.ok(
          validSceneIds.has(entry.sceneId),
          `Dialogue entry at ${entry.startMs}ms has unknown sceneId "${entry.sceneId}"`
        );
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Cross-episode consistency: ID prefixes match episode number
// ---------------------------------------------------------------------------

describe("report data: ID naming conventions", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const prefix = `ep${String(epNum).padStart(2, "0")}`;

    it(`${prefix}: transfer IDs start with correct prefix`, () => {
      for (const t of report.transfers) {
        assert.ok(t.id.startsWith(prefix), `Transfer ${t.id} should start with "${prefix}"`);
      }
    });

    it(`${prefix}: dialogue quote IDs start with correct prefix`, () => {
      for (const q of report.dialogueQuotes ?? []) {
        assert.ok(q.id.startsWith(prefix), `Quote ${q.id} should start with "${prefix}"`);
      }
    });

    it(`${prefix}: exploration IDs start with correct prefix`, () => {
      for (const e of report.explorations ?? []) {
        assert.ok(e.id.startsWith(prefix), `Exploration ${e.id} should start with "${prefix}"`);
      }
    });

    it(`${prefix}: diagram IDs start with correct prefix`, () => {
      for (const d of report.diagrams ?? []) {
        assert.ok(d.id.startsWith(prefix), `Diagram ${d.id} should start with "${prefix}"`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Source citation validation
// ---------------------------------------------------------------------------

describe("report data: source citations", () => {
  const episodes = getAvailableEpisodes();
  const validSourceTypes = new Set(["worldbuilding-doc", "episode-dialogue", "episode-visual", "external-reference", "cross-episode"]);

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);

    for (const transfer of report.transfers) {
      if (!transfer.sources || transfer.sources.length === 0) continue;

      it(`ep${String(epNum).padStart(2, "0")} ${transfer.id}: sources have valid types`, () => {
        for (const source of transfer.sources!) {
          assert.ok(
            validSourceTypes.has(source.sourceType),
            `Source "${source.claim}" has invalid type: ${source.sourceType}`
          );
          assert.ok(source.claim.length > 0, "Source claim must not be empty");
          assert.ok(source.sourceRef.length > 0, "Source ref must not be empty");
          assert.ok(source.sourceLabel.length > 0, "Source label must not be empty");
        }
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Summary report validation
// ---------------------------------------------------------------------------

describe("report data: summary reports", () => {
  const summaryDir = path.join(REPORTS_DIR, "data", "summary");

  it("summary directory exists", () => {
    assert.ok(fs.existsSync(summaryDir), "Summary directory not found");
  });

  it("cross-episode.json exists and is valid", () => {
    const filePath = path.join(summaryDir, "cross-episode.json");
    assert.ok(fs.existsSync(filePath), "cross-episode.json not found");

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    assert.ok(data.slug, "Missing slug");
    assert.ok(data.title, "Missing title");
    assert.ok(data.summary, "Missing summary");
    assert.ok(Array.isArray(data.sections), "sections must be an array");
    assert.ok(data.sections.length > 0, "Must have at least one section");

    for (const section of data.sections) {
      assert.ok(section.heading, `Section missing heading`);
      assert.ok(typeof section.markdown === "string", `Section "${section.heading}" missing markdown`);
    }
  });
});

// ---------------------------------------------------------------------------
// Transcription-report sync: dialogue quote text and timestamp matching
// ---------------------------------------------------------------------------

/**
 * Parse "MM:SS" or "HH:MM:SS" timestamp string to milliseconds.
 * Returns null if the format is invalid.
 */
function parseTimestampMs(ts: string): number | null {
  const parts = ts.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) {
    const [min, sec] = parts;
    return (min * 60 + sec) * 1000;
  }
  if (parts.length === 3) {
    const [hr, min, sec] = parts;
    return (hr * 3600 + min * 60 + sec) * 1000;
  }
  return null;
}

/**
 * Find dialogue entries that overlap a target timestamp.
 * A match occurs if the target falls within the entry's time range (startMs to endMs),
 * or if the entry starts within toleranceMs of the target.
 * Returns entries sorted by proximity to the target.
 */
function findNearbyDialogue(
  dialogueLines: DialogueLine[],
  targetMs: number,
  toleranceMs: number
): DialogueLine[] {
  return dialogueLines
    .filter(d =>
      // Target falls within the dialogue entry's time range
      (targetMs >= d.startMs && targetMs <= d.endMs) ||
      // Or entry start is within tolerance of target
      Math.abs(d.startMs - targetMs) <= toleranceMs
    )
    .sort((a, b) => Math.abs(a.startMs - targetMs) - Math.abs(b.startMs - targetMs));
}

/**
 * Normalize Japanese text for fuzzy comparison: remove punctuation and whitespace.
 */
function normalizeJa(text: string): string {
  return text.replace(/[\s、。！？「」『』（）\(\)…—―・,\.!?\u3000]/g, "");
}

/**
 * Check if two texts have significant overlap.
 * Returns true if one is a substring of the other, or if they share
 * a long common substring (≥30% of the shorter text).
 */
function hasTextOverlap(reportText: string, dialogueText: string): boolean {
  const a = normalizeJa(reportText);
  const b = normalizeJa(dialogueText);
  if (a.length === 0 || b.length === 0) return false;
  // Direct substring check
  if (a.includes(b) || b.includes(a)) return true;
  // Check for a shared substring of at least 30% of the shorter text
  const minLen = Math.min(a.length, b.length);
  const threshold = Math.max(3, Math.floor(minLen * 0.3));
  for (let i = 0; i <= a.length - threshold; i++) {
    const sub = a.slice(i, i + threshold);
    if (b.includes(sub)) return true;
  }
  return false;
}

describe("report data: transcription-report sync", () => {
  const episodes = getAvailableEpisodes();
  /** Tolerance for timestamp matching: ±15 seconds */
  const TIMESTAMP_TOLERANCE_MS = 15_000;

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const dialogue = loadDialogue(epNum);
    const prefix = `ep${String(epNum).padStart(2, "0")}`;

    if (!dialogue) continue;
    if (!report.dialogueQuotes || report.dialogueQuotes.length === 0) continue;

    // Build speaker name lookup: speakerId → nameJa
    const speakerNameById = new Map(dialogue.speakers.map(s => [s.id, s.nameJa]));

    it(`${prefix}: dialogue quotes have matching entries in dialogue data (timestamp proximity)`, () => {
      const unmatched: string[] = [];

      for (const quote of report.dialogueQuotes!) {
        const targetMs = parseTimestampMs(quote.timestamp);
        if (targetMs === null) {
          // Timestamp parse failures are caught by another test
          continue;
        }

        const nearby = findNearbyDialogue(dialogue.dialogue, targetMs, TIMESTAMP_TOLERANCE_MS);
        if (nearby.length === 0) {
          unmatched.push(
            `${quote.id} "${quote.text.slice(0, 30)}..." @${quote.timestamp} — no dialogue entry within ±${TIMESTAMP_TOLERANCE_MS / 1000}s`
          );
        }
      }

      if (unmatched.length > 0) {
        const total = report.dialogueQuotes!.length;
        const matchRate = ((total - unmatched.length) / total * 100).toFixed(0);
        assert.ok(
          unmatched.length <= Math.ceil(total * 0.2),
          `${unmatched.length}/${total} quotes unmatched (${matchRate}% match rate). ` +
          `Unmatched:\n  ${unmatched.join("\n  ")}`
        );
      }
    });

    it(`${prefix}: matched quotes have consistent speaker names`, () => {
      const mismatches: string[] = [];

      for (const quote of report.dialogueQuotes!) {
        const targetMs = parseTimestampMs(quote.timestamp);
        if (targetMs === null) continue;

        const nearby = findNearbyDialogue(dialogue.dialogue, targetMs, TIMESTAMP_TOLERANCE_MS);
        if (nearby.length === 0) continue;

        // Check if any nearby entry has a matching speaker
        const speakerMatch = nearby.some(d => {
          const speakerName = speakerNameById.get(d.speakerId) ?? d.speakerName;
          return speakerName === quote.speaker;
        });

        if (!speakerMatch) {
          const nearbyNames = nearby.map(d => speakerNameById.get(d.speakerId) ?? d.speakerName);
          mismatches.push(
            `${quote.id}: report says "${quote.speaker}" but nearby dialogue has [${[...new Set(nearbyNames)].join(", ")}] @${quote.timestamp}`
          );
        }
      }

      if (mismatches.length > 0) {
        assert.fail(
          `Speaker mismatches found:\n  ${mismatches.join("\n  ")}`
        );
      }
    });

    it(`${prefix}: matched quotes have overlapping text content`, () => {
      const noOverlap: string[] = [];

      for (const quote of report.dialogueQuotes!) {
        const targetMs = parseTimestampMs(quote.timestamp);
        if (targetMs === null) continue;

        const nearby = findNearbyDialogue(dialogue.dialogue, targetMs, TIMESTAMP_TOLERANCE_MS);
        if (nearby.length === 0) continue;

        // Check if any nearby entry has text overlap
        const textMatch = nearby.some(d => hasTextOverlap(quote.text, d.text));

        if (!textMatch) {
          const nearbyTexts = nearby.map(d => `"${d.text.slice(0, 30)}..."`);
          noOverlap.push(
            `${quote.id}: "${quote.text.slice(0, 40)}..." has no text overlap with nearby entries: ${nearbyTexts.join(", ")}`
          );
        }
      }

      if (noOverlap.length > 0) {
        const total = report.dialogueQuotes!.length;
        const matched = total - noOverlap.length;
        // Allow up to 30% mismatch (quotes may be paraphrased or combined from multiple lines)
        assert.ok(
          noOverlap.length <= Math.ceil(total * 0.3),
          `${noOverlap.length}/${total} quotes have no text overlap (${((matched / total) * 100).toFixed(0)}% overlap rate). ` +
          `No overlap:\n  ${noOverlap.join("\n  ")}`
        );
      }
    });
  }
});

/**
 * Report data integrity validation tests.
 *
 * These tests validate the actual JSON report data files in reports/data/,
 * ensuring structural integrity, referential consistency, and alignment
 * between episode reports and attributed dialogue data.
 * Also validates internal link targets in summary report markdown files.
 */
import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import type { EpisodeReport, TransferAnalysis, DialogueQuote, SummaryReport, OrbitalDiagram, BurnMarker, TransferArc } from "./report-types.ts";
import type { EpisodeDialogue, DialogueLine } from "./subtitle-types.ts";
import { loadSummaryBySlug } from "./mdx-parser.ts";

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

      it("has transfers in sequential ID order", () => {
        const ids = report.transfers.map(t => t.id);
        const sorted = [...ids].sort();
        assert.deepStrictEqual(ids, sorted, `Transfers out of order: ${ids.join(", ")}`);
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
// Error band and uncertainty data integrity
// ---------------------------------------------------------------------------

describe("report data: time-series error band integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const charts = report.timeSeriesCharts ?? [];

    for (const chart of charts) {
      for (const series of chart.series) {
        if (series.yLow || series.yHigh) {
          it(`ep${String(epNum).padStart(2, "0")} ${chart.id} "${series.label}": yLow length matches y length`, () => {
            if (series.yLow) {
              assert.equal(
                series.yLow.length,
                series.y.length,
                `yLow length (${series.yLow.length}) !== y length (${series.y.length})`
              );
            }
          });

          it(`ep${String(epNum).padStart(2, "0")} ${chart.id} "${series.label}": yHigh length matches y length`, () => {
            if (series.yHigh) {
              assert.equal(
                series.yHigh.length,
                series.y.length,
                `yHigh length (${series.yHigh.length}) !== y length (${series.y.length})`
              );
            }
          });

          it(`ep${String(epNum).padStart(2, "0")} ${chart.id} "${series.label}": yLow and yHigh are both present`, () => {
            assert.ok(
              (series.yLow && series.yHigh) || (!series.yLow && !series.yHigh),
              "yLow and yHigh must both be present or both absent"
            );
          });
        }
      }
    }
  }
});

describe("report data: error bands bracket nominal values", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const charts = report.timeSeriesCharts ?? [];

    for (const chart of charts) {
      for (const series of chart.series) {
        if (series.yLow && series.yHigh) {
          it(`ep${String(epNum).padStart(2, "0")} ${chart.id} "${series.label}": yLow <= yHigh`, () => {
            for (let i = 0; i < series.y.length; i++) {
              assert.ok(
                series.yLow![i] <= series.yHigh![i] + 0.01,
                `yLow[${i}]=${series.yLow![i]} > yHigh[${i}]=${series.yHigh![i]}`
              );
            }
          });

          it(`ep${String(epNum).padStart(2, "0")} ${chart.id} "${series.label}": has errorSource`, () => {
            assert.ok(
              series.errorSource,
              "Series with error bands should specify errorSource"
            );
          });
        }
      }
    }
  }
});

describe("report data: all episodes have error bands on at least one chart", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    it(`ep${String(epNum).padStart(2, "0")} has at least one series with error bands`, () => {
      const report = loadEpisodeReport(epNum);
      const charts = report.timeSeriesCharts ?? [];
      const hasErrorBands = charts.some(chart =>
        chart.series.some(s => s.yLow && s.yHigh)
      );
      assert.ok(hasErrorBands, `Episode ${epNum} has no error bands on any chart`);
    });
  }
});

describe("report data: uncertainty ellipse referential integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);

    for (const diagram of report.diagrams ?? []) {
      if (diagram.uncertaintyEllipses && diagram.uncertaintyEllipses.length > 0) {
        const orbitIds = new Set(diagram.orbits.map(o => o.id));

        for (const ue of diagram.uncertaintyEllipses) {
          it(`ep${String(epNum).padStart(2, "0")} ${diagram.id}: uncertainty ellipse references valid orbit "${ue.orbitId}"`, () => {
            assert.ok(
              orbitIds.has(ue.orbitId),
              `Uncertainty ellipse references unknown orbitId "${ue.orbitId}"`
            );
          });

          it(`ep${String(epNum).padStart(2, "0")} ${diagram.id}: uncertainty ellipse orbit "${ue.orbitId}" has angle defined`, () => {
            const orbit = diagram.orbits.find(o => o.id === ue.orbitId);
            assert.ok(
              orbit && orbit.angle !== undefined,
              `Uncertainty ellipse orbit "${ue.orbitId}" must have angle defined`
            );
          });
        }
      }
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

  it("cross-episode report exists and is valid", () => {
    const data = loadSummaryBySlug(summaryDir, "cross-episode");
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

// ---------------------------------------------------------------------------
// Dialogue lineId integrity
// ---------------------------------------------------------------------------

describe("report data: dialogue lineId integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const dialogue = loadDialogue(epNum);
    if (!dialogue) continue;
    const prefix = `ep${String(epNum).padStart(2, "0")}`;

    it(`${prefix}: all dialogue entries have a lineId`, () => {
      const missing = dialogue.dialogue.filter(d => !d.lineId);
      assert.equal(
        missing.length, 0,
        `${missing.length} dialogue entries missing lineId (first at ${missing[0]?.startMs}ms)`,
      );
    });

    it(`${prefix}: dialogue lineIds are unique`, () => {
      const ids = dialogue.dialogue.map(d => d.lineId).filter(Boolean);
      const uniqueIds = new Set(ids);
      assert.equal(ids.length, uniqueIds.size, `Duplicate lineIds found`);
    });

    it(`${prefix}: dialogue lineIds follow naming convention`, () => {
      for (let i = 0; i < dialogue.dialogue.length; i++) {
        const entry = dialogue.dialogue[i];
        if (!entry.lineId) continue;
        assert.ok(
          entry.lineId.startsWith(prefix),
          `lineId "${entry.lineId}" should start with "${prefix}"`,
        );
        assert.match(
          entry.lineId,
          /^ep\d{2}-dl-\d{3}$/,
          `lineId "${entry.lineId}" should match pattern "epXX-dl-NNN"`,
        );
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Referential integrity: dialogueLineId → dialogue data
// ---------------------------------------------------------------------------

describe("report data: dialogueLineId referential integrity", () => {
  const episodes = getAvailableEpisodes();

  for (const epNum of episodes) {
    const report = loadEpisodeReport(epNum);
    const dialogue = loadDialogue(epNum);
    if (!dialogue) continue;
    if (!report.dialogueQuotes || report.dialogueQuotes.length === 0) continue;
    const prefix = `ep${String(epNum).padStart(2, "0")}`;

    // Build lineId lookup
    const lineIdSet = new Set(dialogue.dialogue.map(d => d.lineId).filter(Boolean));
    const lineById = new Map(dialogue.dialogue.filter(d => d.lineId).map(d => [d.lineId, d]));

    it(`${prefix}: all dialogueLineId references point to existing dialogue entries`, () => {
      const broken: string[] = [];
      for (const quote of report.dialogueQuotes!) {
        if (!quote.dialogueLineId) continue;
        if (!lineIdSet.has(quote.dialogueLineId)) {
          broken.push(`${quote.id} → "${quote.dialogueLineId}" (not found)`);
        }
      }
      assert.equal(broken.length, 0, `Broken dialogueLineId references:\n  ${broken.join("\n  ")}`);
    });

    it(`${prefix}: dialogueLineId references have consistent speaker names`, () => {
      const mismatches: string[] = [];
      for (const quote of report.dialogueQuotes!) {
        if (!quote.dialogueLineId) continue;
        const line = lineById.get(quote.dialogueLineId);
        if (!line) continue; // Already caught by previous test
        if (line.speakerName !== quote.speaker) {
          mismatches.push(
            `${quote.id}: report="${quote.speaker}", dialogue="${line.speakerName}" (via ${quote.dialogueLineId})`,
          );
        }
      }
      assert.equal(
        mismatches.length, 0,
        `Speaker name mismatches via dialogueLineId:\n  ${mismatches.join("\n  ")}`,
      );
    });

    it(`${prefix}: dialogueLineId references have overlapping text`, () => {
      const noOverlap: string[] = [];
      for (const quote of report.dialogueQuotes!) {
        if (!quote.dialogueLineId) continue;
        const line = lineById.get(quote.dialogueLineId);
        if (!line) continue;
        if (!hasTextOverlap(quote.text, line.text)) {
          noOverlap.push(
            `${quote.id}: report="${quote.text.slice(0, 30)}..." vs dialogue="${line.text.slice(0, 30)}..."`,
          );
        }
      }
      assert.equal(
        noOverlap.length, 0,
        `No text overlap via dialogueLineId:\n  ${noOverlap.join("\n  ")}`,
      );
    });
  }
});

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

// ---------------------------------------------------------------------------
// Burn marker position and timing validation
// ---------------------------------------------------------------------------

const SUMMARY_DIR = path.join(REPORTS_DIR, "data", "summary");

/** Load a summary report (supports both .md and .json formats) */
function loadSummaryReport(slug: string): SummaryReport {
  return loadSummaryBySlug(SUMMARY_DIR, slug);
}

/** Collect all orbital diagrams from all sources */
function collectAllDiagrams(): Array<{ source: string; diagram: OrbitalDiagram }> {
  const results: Array<{ source: string; diagram: OrbitalDiagram }> = [];

  // Episode diagrams
  for (const epNum of getAvailableEpisodes()) {
    const report = loadEpisodeReport(epNum);
    const prefix = `ep${String(epNum).padStart(2, "0")}`;
    for (const d of report.diagrams ?? []) {
      results.push({ source: prefix, diagram: d });
    }
  }

  // Cross-episode summary diagram
  const crossEp = loadSummaryReport("cross-episode");
  for (const section of crossEp.sections) {
    for (const d of section.orbitalDiagrams ?? []) {
      results.push({ source: "cross-episode", diagram: d });
    }
  }

  return results;
}

describe("report data: burn marker angle alignment", () => {
  const allDiagrams = collectAllDiagrams();
  /** Maximum allowed angular deviation (radians) between burn marker and orbit */
  const ANGLE_TOLERANCE = 0.001;

  for (const { source, diagram } of allDiagrams) {
    const orbitMap = new Map(diagram.orbits.map(o => [o.id, o]));

    for (const arc of diagram.transfers) {
      if (!arc.burnMarkers || arc.burnMarkers.length === 0) continue;

      const fromOrbit = orbitMap.get(arc.fromOrbitId);
      const toOrbit = orbitMap.get(arc.toOrbitId);

      for (const bm of arc.burnMarkers) {
        it(`${source} ${diagram.id ?? diagram.title}: "${bm.label}" angle matches orbit position`, () => {
          if (bm.type === "acceleration") {
            // Departure burns should be at the from-orbit angle
            if (fromOrbit?.angle !== undefined) {
              const delta = Math.abs(bm.angle - fromOrbit.angle);
              assert.ok(
                delta < ANGLE_TOLERANCE,
                `Acceleration burn "${bm.label}" angle ${bm.angle} differs from departure orbit "${arc.fromOrbitId}" angle ${fromOrbit.angle} by ${delta.toFixed(4)} rad`,
              );
            }
          } else if (bm.type === "deceleration" || bm.type === "capture") {
            // Arrival/capture burns should be at the to-orbit angle
            if (toOrbit?.angle !== undefined) {
              const delta = Math.abs(bm.angle - toOrbit.angle);
              assert.ok(
                delta < ANGLE_TOLERANCE,
                `${bm.type} burn "${bm.label}" angle ${bm.angle} differs from arrival orbit "${arc.toOrbitId}" angle ${toOrbit.angle} by ${delta.toFixed(4)} rad`,
              );
            }
          }
          // Midcourse burns can be at any angle — no position constraint
        });
      }
    }
  }
});

describe("report data: burn marker timing consistency", () => {
  const allDiagrams = collectAllDiagrams();

  for (const { source, diagram } of allDiagrams) {
    for (const arc of diagram.transfers) {
      if (!arc.burnMarkers || arc.burnMarkers.length === 0) continue;
      if (arc.startTime === undefined || arc.endTime === undefined) continue;

      const arcDuration = arc.endTime - arc.startTime;

      for (const bm of arc.burnMarkers) {
        if (bm.startTime === undefined || bm.endTime === undefined) continue;

        it(`${source} ${diagram.id ?? diagram.title}: "${bm.label}" timing is relative (within arc duration)`, () => {
          // Burn times must be relative: 0 ≤ startTime ≤ endTime ≤ arcDuration
          assert.ok(
            bm.startTime! >= 0,
            `Burn "${bm.label}" startTime ${bm.startTime} is negative`,
          );
          assert.ok(
            bm.endTime! <= arcDuration,
            `Burn "${bm.label}" endTime ${bm.endTime} exceeds arc duration ${arcDuration}`,
          );
          assert.ok(
            bm.startTime! <= bm.endTime!,
            `Burn "${bm.label}" startTime ${bm.startTime} > endTime ${bm.endTime}`,
          );
        });
      }

      // For brachistochrone arcs: check midpoint symmetry
      if (arc.style === "brachistochrone" && arc.burnMarkers.length === 2) {
        const accelBurn = arc.burnMarkers.find(b => b.type === "acceleration");
        const decelBurn = arc.burnMarkers.find(b => b.type === "deceleration");

        if (accelBurn?.endTime !== undefined && decelBurn?.startTime !== undefined) {
          it(`${source} ${diagram.id ?? diagram.title}: brachistochrone midpoint flip at 50%`, () => {
            const midpoint = arcDuration / 2;
            const accelEnd = accelBurn!.endTime!;
            const decelStart = decelBurn!.startTime!;
            // Allow 0.1% tolerance for rounding
            const tolerance = arcDuration * 0.001;
            assert.ok(
              Math.abs(accelEnd - midpoint) <= tolerance,
              `Acceleration end ${accelEnd} should be at midpoint ${midpoint} (±${tolerance.toFixed(0)})`,
            );
            assert.ok(
              Math.abs(decelStart - midpoint) <= tolerance,
              `Deceleration start ${decelStart} should be at midpoint ${midpoint} (±${tolerance.toFixed(0)})`,
            );
          });
        }
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Internal link validation for summary reports
// ---------------------------------------------------------------------------

describe("report data: internal links in summary markdown", () => {
  const SUMMARY_DIR = path.join(REPORTS_DIR, "data", "summary");
  const summaryFiles = fs.existsSync(SUMMARY_DIR)
    ? fs.readdirSync(SUMMARY_DIR).filter(f => f.endsWith(".md"))
    : [];

  // Known valid output paths (episode + summary pages in dist)
  const VALID_EPISODE_FILES = new Set(
    getAvailableEpisodes().map(n => `ep-${String(n).padStart(3, "0")}.html`),
  );
  const VALID_SUMMARY_FILES = new Set(
    summaryFiles.map(f => f.replace(/\.md$/, ".html")),
  );

  for (const file of summaryFiles) {
    it(`${file}: all internal ../episodes/ links point to valid files`, () => {
      const content = fs.readFileSync(path.join(SUMMARY_DIR, file), "utf-8");
      // Match markdown links to ../episodes/XXX.html
      const episodeLinkPattern = /\.\.\/(episodes\/[^)#"]+\.html)/g;
      let match: RegExpExecArray | null;
      const brokenLinks: string[] = [];
      while ((match = episodeLinkPattern.exec(content)) !== null) {
        const linkedFile = match[1].replace("episodes/", "");
        if (!VALID_EPISODE_FILES.has(linkedFile)) {
          brokenLinks.push(`${match[0]} → ${linkedFile} not found`);
        }
      }
      assert.deepStrictEqual(brokenLinks, [], `Broken episode links in ${file}`);
    });

    it(`${file}: all internal ../summary/ links point to valid files`, () => {
      const content = fs.readFileSync(path.join(SUMMARY_DIR, file), "utf-8");
      const summaryLinkPattern = /\.\.\/(summary\/[^)#"]+\.html)/g;
      let match: RegExpExecArray | null;
      const brokenLinks: string[] = [];
      while ((match = summaryLinkPattern.exec(content)) !== null) {
        const linkedFile = match[1].replace("summary/", "");
        if (!VALID_SUMMARY_FILES.has(linkedFile)) {
          brokenLinks.push(`${match[0]} → ${linkedFile} not found`);
        }
      }
      assert.deepStrictEqual(brokenLinks, [], `Broken summary links in ${file}`);
    });
  }

  // Also check episode JSON files for internal links
  for (const epNum of getAvailableEpisodes()) {
    it(`ep${String(epNum).padStart(2, "0")}.json: all internal episode links are valid`, () => {
      const filePath = path.join(EPISODES_DIR, `ep${String(epNum).padStart(2, "0")}.json`);
      const content = fs.readFileSync(filePath, "utf-8");
      const episodeLinkPattern = /episodes\/([^)#"\\]+\.html)/g;
      let match: RegExpExecArray | null;
      const brokenLinks: string[] = [];
      while ((match = episodeLinkPattern.exec(content)) !== null) {
        if (!VALID_EPISODE_FILES.has(match[1])) {
          brokenLinks.push(`episodes/${match[1]} not found`);
        }
      }
      assert.deepStrictEqual(brokenLinks, [], `Broken episode links in ep${String(epNum).padStart(2, "0")}.json`);
    });
  }
});

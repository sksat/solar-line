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
import type { EpisodeDialogue } from "./subtitle-types.ts";

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
        const validVerdicts = new Set(["plausible", "implausible", "indeterminate", "conditional"]);
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
  const validSourceTypes = new Set(["worldbuilding-doc", "episode-dialogue", "episode-visual", "external-reference"]);

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

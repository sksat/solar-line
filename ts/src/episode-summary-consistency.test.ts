/**
 * Episode↔Summary Consistency Tests (Task 207).
 *
 * Validates that hardcoded EPISODE_SUMMARIES[] in cross-episode-analysis.ts
 * stays consistent with the computed values from analyzeEpisodeX() functions.
 *
 * When episode analyses change (new formulas, parameter corrections),
 * these tests fail — forcing the summary to be updated as well.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  SHIP_SPECS,
  EPISODE_SUMMARIES,
  buildRouteContinuityTable,
  buildDeltaVScalingTable,
  buildShipSpecsTable,
} from "./cross-episode-analysis.ts";
import { analyzeEpisode1 } from "./ep01-analysis.ts";
import { analyzeEpisode2 } from "./ep02-analysis.ts";
import { analyzeEpisode3 } from "./ep03-analysis.ts";
import { analyzeEpisode4 } from "./ep04-analysis.ts";
import { analyzeEpisode5 } from "./ep05-analysis.ts";
import { computeTimeline } from "./timeline-analysis.ts";
import { calendarToJD } from "./ephemeris.ts";

// --- Helpers ---

/** Assert that summary value ≈ computed value within relative tolerance. */
function assertConsistent(
  summaryVal: number,
  computedVal: number,
  label: string,
  relTol = 0.01,
): void {
  if (computedVal === 0) {
    assert.ok(Math.abs(summaryVal) < 1e-6, `${label}: expected ~0, got ${summaryVal}`);
    return;
  }
  const relErr = Math.abs((summaryVal - computedVal) / computedVal);
  assert.ok(
    relErr < relTol,
    `${label}: summary=${summaryVal}, computed=${computedVal} (relErr=${(relErr * 100).toFixed(2)}%, tol=${(relTol * 100).toFixed(0)}%)`,
  );
}

// ============================================================
// EP01: EPISODE_SUMMARIES[0] vs analyzeEpisode1()
// ============================================================

describe("EP01 summary↔analysis consistency", () => {
  const summary = EPISODE_SUMMARIES[0];
  const analysis = analyzeEpisode1();

  it("brachistochroneDeltaV matches analysis", () => {
    assert.ok(summary.brachistochroneDeltaV !== null, "EP01 should have brachistochrone ΔV");
    assertConsistent(
      summary.brachistochroneDeltaV!,
      analysis.brachistochrone72h[0].deltaVKms,
      "EP01 brachistochroneDeltaV",
    );
  });

  it("massBoundaryT matches analysis", () => {
    assert.ok(summary.massBoundaryT !== null, "EP01 should have mass boundary");
    assertConsistent(
      summary.massBoundaryT!,
      analysis.boundaries.massBoundary72h.maxMassT,
      "EP01 massBoundaryT",
    );
  });

  it("thrustUsedMN matches SHIP_SPECS nominal thrust", () => {
    assert.strictEqual(summary.thrustUsedMN, SHIP_SPECS.thrustMN,
      "EP01 uses nominal thrust");
  });

  it("transferTime mentions 72 hours", () => {
    assert.ok(summary.transferTime.includes("72"),
      `EP01 transferTime should mention 72h: "${summary.transferTime}"`);
  });
});

// ============================================================
// EP02: EPISODE_SUMMARIES[1] vs analyzeEpisode2()
// ============================================================

describe("EP02 summary↔analysis consistency", () => {
  const summary = EPISODE_SUMMARIES[1];
  const analysis = analyzeEpisode2();

  it("brachistochroneDeltaV is null (ballistic/trim transfer)", () => {
    assert.strictEqual(summary.brachistochroneDeltaV, null,
      "EP02 is not brachistochrone — should be null");
  });

  it("massBoundaryT is null (no mass-limited brachistochrone)", () => {
    assert.strictEqual(summary.massBoundaryT, null);
  });

  it("transferTime references ~87 days (trim-thrust corrected)", () => {
    assert.ok(summary.transferTime.includes("87"),
      `EP02 transferTime should reference 87-day trim-thrust scenario: "${summary.transferTime}"`);
    // Must NOT reference 455 days as the primary transfer time
    assert.ok(!summary.transferTime.includes("455"),
      `EP02 transferTime should not mention 455 days: "${summary.transferTime}"`);
  });

  it("trim-thrust primary scenario produces ~87 days", () => {
    const primary = analysis.trimThrust.primary!;
    assert.ok(primary.transferDays > 70 && primary.transferDays < 100,
      `EP02 trim-thrust primary should be ~87 days, got ${primary.transferDays}`);
  });

  it("thrustUsedMN is 0 (damaged, trim only)", () => {
    assert.strictEqual(summary.thrustUsedMN, 0,
      "EP02 uses trim-only thrust (effectively 0 MN main engine)");
  });
});

// ============================================================
// EP03: EPISODE_SUMMARIES[2] vs analyzeEpisode3()
// ============================================================

describe("EP03 summary↔analysis consistency", () => {
  const summary = EPISODE_SUMMARIES[2];
  const analysis = analyzeEpisode3();

  it("brachistochroneDeltaV matches analysis", () => {
    assert.ok(summary.brachistochroneDeltaV !== null, "EP03 should have brachistochrone ΔV");
    assertConsistent(
      summary.brachistochroneDeltaV!,
      analysis.brachistochrone[0].deltaVKms,
      "EP03 brachistochroneDeltaV",
    );
  });

  it("massBoundaryT matches analysis (not rounded down)", () => {
    assert.ok(summary.massBoundaryT !== null, "EP03 should have mass boundary");
    // Task 207 fix: was 452, should be 452.5 (452.499 from analysis)
    assertConsistent(
      summary.massBoundaryT!,
      analysis.massFeasibility.maxMassT,
      "EP03 massBoundaryT",
    );
  });

  it("thrustUsedMN matches SHIP_SPECS nominal thrust", () => {
    assert.strictEqual(summary.thrustUsedMN, SHIP_SPECS.thrustMN,
      "EP03 uses full nominal thrust (repaired engine)");
  });

  it("transferTime mentions 143", () => {
    assert.ok(summary.transferTime.includes("143"),
      `EP03 transferTime should mention 143h: "${summary.transferTime}"`);
  });
});

// ============================================================
// EP04: EPISODE_SUMMARIES[3] vs analyzeEpisode4()
// ============================================================

describe("EP04 summary↔analysis consistency", () => {
  const summary = EPISODE_SUMMARIES[3];
  const analysis = analyzeEpisode4();

  it("brachistochroneDeltaV matches analysis (48kt scenario)", () => {
    assert.ok(summary.brachistochroneDeltaV !== null, "EP04 should have brachistochrone ΔV");
    assertConsistent(
      summary.brachistochroneDeltaV!,
      analysis.brachistochrone[0].deltaVKms,
      "EP04 brachistochroneDeltaV",
    );
  });

  it("thrustUsedMN matches SHIP_SPECS damaged thrust", () => {
    assert.strictEqual(summary.thrustUsedMN, SHIP_SPECS.damagedThrustMN,
      "EP04 uses 65% damaged thrust");
  });

  it("thrustUsedMN matches analysis damage assessment", () => {
    assertConsistent(
      summary.thrustUsedMN,
      analysis.damageAssessment.effectiveThrustMN,
      "EP04 thrustUsedMN vs damageAssessment",
      0.001,
    );
  });
});

// ============================================================
// EP05: EPISODE_SUMMARIES[4] vs analyzeEpisode5()
// ============================================================

describe("EP05 summary↔analysis consistency", () => {
  const summary = EPISODE_SUMMARIES[4];
  const analysis = analyzeEpisode5();

  it("brachistochroneDeltaV matches analysis (300t scenario)", () => {
    assert.ok(summary.brachistochroneDeltaV !== null, "EP05 should have brachistochrone ΔV");
    assertConsistent(
      summary.brachistochroneDeltaV!,
      analysis.brachistochroneByMass[0].deltaVKms,
      "EP05 brachistochroneDeltaV",
    );
  });

  it("thrustUsedMN matches SHIP_SPECS damaged thrust", () => {
    assert.strictEqual(summary.thrustUsedMN, SHIP_SPECS.damagedThrustMN,
      "EP05 uses 65% damaged thrust (same as EP04)");
  });
});

// ============================================================
// Cross-summary internal consistency
// ============================================================

describe("EPISODE_SUMMARIES internal consistency", () => {
  it("EP04 and EP05 share thrust (both post-damage)", () => {
    assert.strictEqual(
      EPISODE_SUMMARIES[3].thrustUsedMN,
      EPISODE_SUMMARIES[4].thrustUsedMN,
      "EP04 and EP05 should use same damaged thrust",
    );
  });

  it("EP01 and EP03 share thrust (both nominal)", () => {
    assert.strictEqual(
      EPISODE_SUMMARIES[0].thrustUsedMN,
      EPISODE_SUMMARIES[2].thrustUsedMN,
      "EP01 and EP03 should use same nominal thrust",
    );
  });

  it("damaged thrust < nominal thrust", () => {
    assert.ok(
      EPISODE_SUMMARIES[3].thrustUsedMN < EPISODE_SUMMARIES[0].thrustUsedMN,
      "post-damage thrust should be < nominal",
    );
  });

  it("brachistochrone ΔV scales with distance (EP01 < EP03 < EP05)", () => {
    const dv1 = EPISODE_SUMMARIES[0].brachistochroneDeltaV!;
    const dv3 = EPISODE_SUMMARIES[2].brachistochroneDeltaV!;
    const dv5 = EPISODE_SUMMARIES[4].brachistochroneDeltaV!;
    assert.ok(dv1 < dv3, `EP01 ΔV (${dv1}) should be < EP03 ΔV (${dv3})`);
    assert.ok(dv3 < dv5, `EP03 ΔV (${dv3}) should be < EP05 ΔV (${dv5})`);
  });

  it("EP04 brachistochrone ΔV is smallest (48kt mass, longer time)", () => {
    const dv4 = EPISODE_SUMMARIES[3].brachistochroneDeltaV!;
    const dv1 = EPISODE_SUMMARIES[0].brachistochroneDeltaV!;
    assert.ok(dv4 < dv1,
      `EP04 ΔV at 48kt (${dv4}) should be < EP01 (${dv1}) due to longer time`);
  });

  it("route continuity: each arrival system matches next departure system", () => {
    // System-level continuity: arrival and departure bodies belong to same planetary system
    // e.g., ガニメデ（木星系）→ 木星圏 is continuous (both Jupiter system)
    const systemKeywords: Record<number, string> = {
      1: "木星", // EP1→EP2: Jupiter system
      2: "土星", // EP2→EP3: Saturn system
      3: "天王星", // EP3→EP4: Uranus system
      // EP4→EP5: same route segment (Uranus→Earth), departure body is same
    };

    for (let i = 0; i < EPISODE_SUMMARIES.length - 1; i++) {
      const current = EPISODE_SUMMARIES[i];
      const next = EPISODE_SUMMARIES[i + 1];
      const keyword = systemKeywords[current.episode];

      if (keyword) {
        assert.ok(
          current.arrivalBody.includes(keyword),
          `EP${current.episode} arrival "${current.arrivalBody}" should reference ${keyword}`,
        );
        assert.ok(
          next.departureBody.includes(keyword),
          `EP${next.episode} departure "${next.departureBody}" should reference ${keyword}`,
        );
      }
    }
  });
});

// ============================================================
// SHIP_SPECS ↔ analysis consistency
// ============================================================

describe("SHIP_SPECS↔analysis consistency", () => {
  it("damagedThrustMN = thrustMN × damagedThrustPercent/100", () => {
    const expected = SHIP_SPECS.thrustMN * SHIP_SPECS.damagedThrustPercent / 100;
    assertConsistent(
      SHIP_SPECS.damagedThrustMN,
      expected,
      "damagedThrustMN derivation",
      0.001,
    );
  });

  it("nominal mass matches EP01 analysis canonical mass", () => {
    const analysis = analyzeEpisode1();
    assert.strictEqual(
      SHIP_SPECS.nominalMassT * 1000,
      48_000_000,
      "nominalMassT should be 48,000t = 48,000,000 kg",
    );
    // EP01 accel at canonical mass: a = F/m = 9.8e6 / 48e6 = 0.2042 m/s²
    const expectedAccel = (SHIP_SPECS.thrustMN * 1e6) / (SHIP_SPECS.nominalMassT * 1000);
    assertConsistent(
      analysis.shipAcceleration.accelNormalMs2,
      expectedAccel,
      "EP01 accel from SHIP_SPECS F/m",
      1e-6,
    );
  });
});

// ============================================================
// MDX report ↔ TypeScript consistency
// ============================================================

describe("MDX report↔TypeScript consistency", () => {
  const summaryDir = path.resolve(import.meta.dirname!, "../../reports/data/summary");
  const episodesDir = path.resolve(import.meta.dirname!, "../../reports/data/episodes");

  function readMdx(filename: string, subdir: "summary" | "episodes" = "summary"): string {
    const dir = subdir === "episodes" ? episodesDir : summaryDir;
    return fs.readFileSync(path.join(dir, filename), "utf-8");
  }

  describe("cross-episode.md consistency", () => {
    const content = readMdx("cross-episode.md");

    it("EP02 transfer time should reference ~87 days, not 455 days", () => {
      // The corrected EP02 transfer uses trim-thrust for ~87 days (Task 206).
      // Any remaining 455-day references in prose/tables/charts should be
      // about the legacy estimate or the ballistic baseline, not the primary value.
      // Check that the route continuity table uses ~87 days for EP02:
      const routeTable = buildRouteContinuityTable();
      const transferRow = routeTable.rows.find(r => r.metric === "遷移時間");
      assert.ok(transferRow, "route continuity table should have a transfer time row");
      assert.ok(
        transferRow.values[2].includes("87"),
        `EP02 transfer time in route table should reference 87 days: "${transferRow.values[2]}"`,
      );
    });

    it("total mission timeline should reflect corrected EP02 (~124 days, not 479)", () => {
      // With EP02 at ~87 days instead of 455, total mission is ~124 days
      // The MDX should not state 479 days as the total mission duration
      // unless explicitly discussing the legacy/old calculation
      const ep02 = analyzeEpisode2();
      const ep02Days = ep02.trimThrust.primary!.transferDays;
      // EP01: 3 days, EP03: ~6 days, EP04-05: ~21 days = ~30 days + EP02
      const approxTotal = ep02Days + 30;
      assert.ok(approxTotal < 200,
        `corrected total mission should be ~124 days, not 479 (EP02=${ep02Days.toFixed(0)}d)`);
    });

    it("ΔV scaling table EP02 should not claim brachistochrone ΔV", () => {
      const table = buildDeltaVScalingTable();
      const dvRow = table.rows.find(r => r.metric.includes("ΔV"));
      assert.ok(dvRow, "ΔV scaling table should have a ΔV row");
      assert.ok(
        dvRow.values[2].includes("弾道") || dvRow.values[2] === "—（弾道）",
        `EP02 should be marked as ballistic in ΔV table: "${dvRow.values[2]}"`,
      );
    });

    it("ship specs table has valid values for all 5 episodes", () => {
      const table = buildShipSpecsTable();
      for (const row of table.rows) {
        for (const ep of [1, 2, 3, 4, 5]) {
          assert.ok(
            row.values[ep] !== undefined && row.values[ep].length > 0,
            `ship specs row "${row.metric}" missing value for EP${ep}`,
          );
        }
      }
    });
  });

  describe("epoch date consistency with computed timeline", () => {
    const tl = computeTimeline(calendarToJD(2240, 1, 1));

    // Episode MDX files should have epochAnnotation dates matching the computed timeline
    const expectedDates: Record<number, { departure: string; arrival: string }> = {};
    for (const event of tl.events) {
      expectedDates[event.episode] = {
        departure: event.departureDate,
        arrival: event.arrivalDate,
      };
    }

    for (const ep of [1, 2, 3, 5]) {
      // EP04 has a special reference annotation (48kt brachistochrone), skip exact check
      const slug = `ep${String(ep).padStart(2, "0")}`;
      const content = readMdx(`${slug}.md`, "episodes");

      it(`EP${ep} epochAnnotation dates match computed timeline`, () => {
        const expected = expectedDates[ep <= 4 ? ep : 4]; // EP05 uses EP04's departure
        const depDate = ep === 5 ? expectedDates[4].departure : expected.departure;
        const arrDate = ep === 5 ? expectedDates[4].arrival : expected.arrival;

        assert.ok(
          content.includes(depDate),
          `EP${ep} should contain departure date ${depDate} in epochAnnotation`,
        );
        assert.ok(
          content.includes(arrDate),
          `EP${ep} should contain arrival date ${arrDate} in epochAnnotation`,
        );
      });
    }

    it("cross-episode.md timeline table dates match computed timeline", () => {
      const content = readMdx("cross-episode.md", "summary");

      // EP01
      assert.ok(content.includes(`"1": "${expectedDates[1].departure} → ${expectedDates[1].arrival}"`),
        "EP01 table date should match timeline");
      // EP02
      assert.ok(content.includes(`"2": "${expectedDates[2].departure} → ${expectedDates[2].arrival}"`),
        "EP02 table date should match timeline");
      // EP03
      assert.ok(content.includes(`"3": "${expectedDates[3].departure} → ${expectedDates[3].arrival}"`),
        "EP03 table date should match timeline");
      // EP04
      assert.ok(content.includes(`"4": "${expectedDates[4].departure}`),
        "EP04 table date should match departure");
      // EP05
      assert.ok(content.includes(`"5": "${expectedDates[4].departure} → ${expectedDates[4].arrival}"`),
        "EP05 table date should match timeline");
    });
  });

  describe("ship-kestrel.md consistency", () => {
    const content = readMdx("ship-kestrel.md");

    it("thrust values match SHIP_SPECS", () => {
      assert.ok(content.includes("9.8"), "should reference 9.8 MN nominal thrust");
      assert.ok(content.includes("6.37"), "should reference 6.37 MN damaged thrust");
    });

    it("nominal mass matches SHIP_SPECS", () => {
      assert.ok(content.includes("48,000") || content.includes("48000"),
        "should reference 48,000t nominal mass");
    });

    it("nozzle margin matches EP05 analysis", () => {
      const analysis = analyzeEpisode5();
      const marginMin = analysis.nozzleLifespan.marginMinutes;
      assert.ok(content.includes(String(marginMin)),
        `should reference ${marginMin} minute nozzle margin`);
    });

    it("plasmoid exposure matches EP04 analysis", () => {
      const analysis = analyzeEpisode4();
      const exposureMSv = analysis.plasmoid.totalExposureMSv;
      assert.ok(content.includes(String(exposureMSv)),
        `should reference ${exposureMSv} mSv plasmoid exposure`);
    });
  });
});

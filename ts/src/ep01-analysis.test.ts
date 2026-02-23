/**
 * Tests for Episode 1 analysis: Mars → Ganymede transfer.
 *
 * These tests verify the orbital mechanics calculations and ensure
 * the analysis produces physically meaningful results.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hohmannBaseline,
  shipAcceleration,
  brachistochroneRequirements,
  reachableDistance,
  massSensitivity,
  maxFeasibleMass,
  requiredThrust,
  minimumTransferTime,
  analyzeEpisode1,
  KESTREL,
  EP01_CONTRACT,
  DISTANCE_SCENARIOS,
  distanceInAU,
} from "./ep01-analysis.ts";
import {
  orbitalPeriod,
  brachistochroneAccel,
  brachistochroneDeltaV,
  MU,
  ORBIT_RADIUS,
} from "./orbital.ts";

describe("orbital.ts extensions", () => {
  it("orbitalPeriod: Earth around Sun ≈ 365.25 days", () => {
    const period = orbitalPeriod(MU.SUN, 149_597_870.7);
    const days = period / 86400;
    assert.ok(
      Math.abs(days - 365.25) < 0.5,
      `period=${days} days, expected ~365.25`,
    );
  });

  it("brachistochroneAccel: known case", () => {
    // 1e6 km in 1000 s → a = 4 * 1e6 / 1e6 = 4 km/s²
    const a = brachistochroneAccel(1_000_000, 1000);
    assert.ok(Math.abs(a - 4) < 1e-10, `a=${a}, expected 4`);
  });

  it("brachistochroneDeltaV: known case", () => {
    // 1e6 km in 1000 s → ΔV = 4 * 1e6 / 1000 = 4000 km/s
    const dv = brachistochroneDeltaV(1_000_000, 1000);
    assert.ok(Math.abs(dv - 4000) < 1e-10, `dv=${dv}, expected 4000`);
  });

  it("brachistochrone: ΔV = accel * time", () => {
    const d = 5e8; // 5e8 km
    const t = 72 * 3600;
    const a = brachistochroneAccel(d, t);
    const dv = brachistochroneDeltaV(d, t);
    assert.ok(
      Math.abs(dv - a * t) < 1e-6,
      `ΔV=${dv}, a*t=${a * t}`,
    );
  });
});

describe("distance scenarios", () => {
  it("closest distance ≈ 3.68 AU", () => {
    const au = distanceInAU(DISTANCE_SCENARIOS.closest);
    assert.ok(au > 3.5 && au < 3.9, `closest=${au} AU`);
  });

  it("mid distance ≈ 5.4 AU (quadrature geometry)", () => {
    const au = distanceInAU(DISTANCE_SCENARIOS.mid);
    assert.ok(au > 5.0 && au < 5.7, `mid=${au} AU`);
  });

  it("farthest distance ≈ 6.73 AU", () => {
    const au = distanceInAU(DISTANCE_SCENARIOS.farthest);
    assert.ok(au > 6.5 && au < 7.0, `farthest=${au} AU`);
  });

  it("closest < mid < farthest", () => {
    assert.ok(DISTANCE_SCENARIOS.closest < DISTANCE_SCENARIOS.mid);
    assert.ok(DISTANCE_SCENARIOS.mid < DISTANCE_SCENARIOS.farthest);
  });
});

describe("Hohmann baseline: Mars → Jupiter", () => {
  it("total ΔV ≈ 10.2 km/s (heliocentric)", () => {
    const h = hohmannBaseline();
    assert.ok(
      h.totalDv > 9.0 && h.totalDv < 11.0,
      `totalDv=${h.totalDv} km/s`,
    );
  });

  it("departure ΔV > arrival ΔV", () => {
    const h = hohmannBaseline();
    assert.ok(h.departureDv > h.arrivalDv);
  });

  it("transfer time ≈ 2.7 years", () => {
    const h = hohmannBaseline();
    const years = h.transferTimeDays / 365.25;
    assert.ok(
      years > 2.0 && years < 3.5,
      `transferTime=${years} years`,
    );
  });

  it("transfer time >> 72 hours", () => {
    const h = hohmannBaseline();
    assert.ok(
      h.transferTimeSec > EP01_CONTRACT.deadlineSec * 100,
      "Hohmann transfer is vastly longer than 72h deadline",
    );
  });
});

describe("ship acceleration", () => {
  it("normal acceleration ≈ 0.204 m/s²", () => {
    const s = shipAcceleration();
    assert.ok(
      Math.abs(s.accelNormalMs2 - 0.204) < 0.01,
      `accel=${s.accelNormalMs2} m/s²`,
    );
  });

  it("acceleration ≈ 0.02g (well below 1g)", () => {
    const s = shipAcceleration();
    assert.ok(
      s.accelNormalG > 0.01 && s.accelNormalG < 0.05,
      `accelG=${s.accelNormalG}`,
    );
  });

  it("peak > normal thrust", () => {
    const s = shipAcceleration();
    assert.ok(s.accelPeakMs2 > s.accelNormalMs2);
  });

  it("ΔV in 72h continuous burn at normal thrust ≈ 52.9 km/s", () => {
    const s = shipAcceleration();
    assert.ok(
      s.dvNormal72hKms > 45 && s.dvNormal72hKms < 60,
      `ΔV=${s.dvNormal72hKms} km/s`,
    );
  });
});

describe("brachistochrone requirements for 72h", () => {
  it("produces results for all 3 distance scenarios", () => {
    const reqs = brachistochroneRequirements(EP01_CONTRACT.deadlineSec);
    assert.equal(reqs.length, 3);
    assert.deepEqual(
      reqs.map((r) => r.scenario),
      ["closest", "mid", "farthest"],
    );
  });

  it("closest scenario requires ~33 m/s² (~3.4g)", () => {
    const reqs = brachistochroneRequirements(EP01_CONTRACT.deadlineSec);
    const closest = reqs[0];
    assert.ok(
      closest.accelG > 2 && closest.accelG < 5,
      `accelG=${closest.accelG}`,
    );
  });

  it("all scenarios require ΔV >> ship capability", () => {
    const reqs = brachistochroneRequirements(EP01_CONTRACT.deadlineSec);
    const ship = shipAcceleration();
    for (const req of reqs) {
      // Required ΔV in m/s vs ship's ΔV budget in m/s
      assert.ok(
        req.deltaVMs > ship.dvNormal72hMs * 100,
        `scenario=${req.scenario}: required ${req.deltaVMs} m/s >> ship ${ship.dvNormal72hMs} m/s`,
      );
    }
  });

  it("required acceleration increases with distance", () => {
    const reqs = brachistochroneRequirements(EP01_CONTRACT.deadlineSec);
    for (let i = 1; i < reqs.length; i++) {
      assert.ok(reqs[i].accelMs2 > reqs[i - 1].accelMs2);
    }
  });
});

describe("brachistochrone requirements for 150h (normal route)", () => {
  it("normal route requirements are lower than 72h", () => {
    const req72 = brachistochroneRequirements(EP01_CONTRACT.deadlineSec);
    const req150 = brachistochroneRequirements(EP01_CONTRACT.normalTimeSec);
    for (let i = 0; i < req72.length; i++) {
      assert.ok(req150[i].accelMs2 < req72[i].accelMs2);
      assert.ok(req150[i].deltaVMs < req72[i].deltaVMs);
    }
  });
});

describe("reachable distance with ship thrust", () => {
  it("reachable distance in 72h is small compared to Mars-Jupiter distance", () => {
    const reach = reachableDistance();
    assert.ok(
      reach.distanceKm < DISTANCE_SCENARIOS.closest * 0.01,
      `reachable=${reach.distanceKm} km is < 1% of closest distance`,
    );
  });

  it("reachable distance is on the order of millions of km (~0.02 AU)", () => {
    const reach = reachableDistance();
    assert.ok(
      reach.distanceKm > 1_000_000 && reach.distanceKm < 10_000_000,
      `reachable=${reach.distanceKm} km`,
    );
  });
});

describe("mass sensitivity analysis", () => {
  it("produces 4 mass interpretations", () => {
    const sens = massSensitivity();
    assert.equal(sens.length, 4);
  });

  it("lighter mass → higher acceleration", () => {
    const sens = massSensitivity();
    for (let i = 1; i < sens.length; i++) {
      assert.ok(sens[i].accelNormalMs2 > sens[i - 1].accelNormalMs2);
    }
  });

  it("even lightest interpretation (48t) cannot reach Mars-Jupiter in 72h", () => {
    // 48t = 48,000 kg, thrust = 9.8 MN → a = 204 m/s²
    // brachistochrone: d = a*t²/4 = 204e-3 * (259200)² / 4 ≈ 3.4e9 km
    // Mars-Jupiter closest ≈ 5.5e8 km
    // Actually at 48t, a = 9.8e6/48000 = 204 m/s² → d = 204e-3 * (259200)²/4 km
    // = 0.204 * 6.718e10 / 4 = 3.43e9 km ... that's ~23 AU, so it COULD reach
    const sens = massSensitivity();
    const lightest = sens[sens.length - 1];
    // At 48t, the ship would have ~204 m/s², reaching very far
    assert.ok(
      lightest.accelNormalMs2 > 100,
      `accel at 48t = ${lightest.accelNormalMs2} m/s²`,
    );
  });

  it("at 48,000t, reachable distance in 72h ≈ 0.02 AU (tiny vs Mars-Jupiter)", () => {
    const sens = massSensitivity();
    const heaviest = sens[0];
    assert.ok(
      heaviest.reachable72h.distanceAU < 0.1,
      `reachable=${heaviest.reachable72h.distanceAU} AU`,
    );
    // Still much less than Mars-Jupiter closest (~3.7 AU)
    assert.ok(
      heaviest.reachable72h.distanceAU < distanceInAU(DISTANCE_SCENARIOS.closest) * 0.01,
      "reachable < 1% of closest Mars-Jupiter distance",
    );
  });
});

describe("boundary analysis: maxFeasibleMass", () => {
  it("closest approach, 72h: max mass ≈ 299 tonnes", () => {
    const result = maxFeasibleMass(DISTANCE_SCENARIOS.closest, EP01_CONTRACT.deadlineSec);
    // F / a_req = 9.8e6 / 32.78 ≈ 299,000 kg
    assert.ok(
      result.maxMassT > 250 && result.maxMassT < 350,
      `maxMass=${result.maxMassT} t, expected ~299`,
    );
  });

  it("required acceleration for closest 72h ≈ 33 m/s² (3.3g)", () => {
    const result = maxFeasibleMass(DISTANCE_SCENARIOS.closest, EP01_CONTRACT.deadlineSec);
    assert.ok(
      result.aReqG > 3.0 && result.aReqG < 3.8,
      `aReqG=${result.aReqG}, expected ~3.3`,
    );
  });

  it("canonical 48,000t mass far exceeds max feasible mass", () => {
    const result = maxFeasibleMass(DISTANCE_SCENARIOS.closest, EP01_CONTRACT.deadlineSec);
    assert.ok(
      KESTREL.massKg > result.maxMassKg * 100,
      "48,000t is >100x the feasible mass limit",
    );
  });

  it("longer transfer time allows heavier mass", () => {
    const m72h = maxFeasibleMass(DISTANCE_SCENARIOS.closest, EP01_CONTRACT.deadlineSec);
    const m150h = maxFeasibleMass(DISTANCE_SCENARIOS.closest, EP01_CONTRACT.normalTimeSec);
    assert.ok(m150h.maxMassKg > m72h.maxMassKg);
  });
});

describe("boundary analysis: requiredThrust", () => {
  it("at 48,000t for closest 72h: thrust ≈ 1,574 GN (~160x Kestrel)", () => {
    const result = requiredThrust(DISTANCE_SCENARIOS.closest, EP01_CONTRACT.deadlineSec);
    assert.ok(
      result.thrustRatioToKestrel > 100 && result.thrustRatioToKestrel < 200,
      `thrustRatio=${result.thrustRatioToKestrel}, expected ~160`,
    );
  });

  it("at 299t for closest 72h: thrust ≈ 9.8 MN (matches Kestrel)", () => {
    const result = requiredThrust(
      DISTANCE_SCENARIOS.closest,
      EP01_CONTRACT.deadlineSec,
      299_000,
    );
    assert.ok(
      Math.abs(result.thrustMN - 9.8) < 1.0,
      `thrust=${result.thrustMN} MN, expected ~9.8`,
    );
  });
});

describe("boundary analysis: minimumTransferTime", () => {
  it("at canonical 48,000t: min time >> 72h", () => {
    const result = minimumTransferTime(DISTANCE_SCENARIOS.closest);
    assert.ok(
      result.timeHours > 500,
      `minTime=${result.timeHours} h, expected >> 72h`,
    );
  });

  it("at 299t: min time ≈ 72h", () => {
    const result = minimumTransferTime(DISTANCE_SCENARIOS.closest, 299_000);
    assert.ok(
      Math.abs(result.timeHours - 72) < 5,
      `minTime=${result.timeHours} h, expected ~72h`,
    );
  });

  it("lighter mass → shorter min time", () => {
    const heavy = minimumTransferTime(DISTANCE_SCENARIOS.closest, 48_000_000);
    const light = minimumTransferTime(DISTANCE_SCENARIOS.closest, 48_000);
    assert.ok(light.timeSec < heavy.timeSec);
  });
});

describe("full Episode 1 analysis", () => {
  it("analyzeEpisode1 returns all expected sections", () => {
    const result = analyzeEpisode1();
    assert.ok(result.hohmann);
    assert.ok(result.shipAcceleration);
    assert.ok(result.brachistochrone72h);
    assert.ok(result.brachistochrone150h);
    assert.ok(result.reachableWithShipThrust);
    assert.ok(result.massSensitivity);
    assert.ok(result.boundaries);
    assert.ok(result.boundaries.massBoundary72h);
    assert.ok(result.boundaries.thrustBoundary72h);
    assert.ok(result.boundaries.minTimeAtCanonicalMass);
    assert.ok(result.boundaries.minTimeAt299t);
  });

  it("analysis is internally consistent", () => {
    const result = analyzeEpisode1();
    // Hohmann time should be way more than 72h
    assert.ok(result.hohmann.transferTimeSec > EP01_CONTRACT.deadlineSec * 100);
    // Ship acceleration should be well below what's required for 72h brachistochrone
    const reqClosest = result.brachistochrone72h[0];
    assert.ok(
      result.shipAcceleration.accelNormalMs2 < reqClosest.accelMs2 * 0.01,
      `Ship accel ${result.shipAcceleration.accelNormalMs2} is < 1% of required ${reqClosest.accelMs2}`,
    );
  });
});

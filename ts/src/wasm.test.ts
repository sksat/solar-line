/**
 * Round-trip tests: verify WASM bridge produces results consistent with
 * the pure TypeScript implementation and known reference values.
 *
 * These tests require the WASM package to be built first:
 *   wasm-pack build --target nodejs --out-dir ../../ts/pkg crates/solar-line-wasm
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { visViva, hohmannTransferDv, MU } from "./orbital.ts";

// The WASM module is loaded dynamically since it's a generated artifact.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasm: any;

before(async () => {
  wasm = await import("../pkg/solar_line_wasm.js");
});

describe("WASM bridge: vis_viva", () => {
  it("matches TypeScript implementation for circular LEO orbit", () => {
    const r = 6_778; // ~400km altitude
    const tsResult = visViva(MU.EARTH, r, r);
    const wasmResult = wasm.vis_viva(MU.EARTH, r, r);
    assert.ok(
      Math.abs(tsResult - wasmResult) < 1e-10,
      `TS=${tsResult}, WASM=${wasmResult}`,
    );
  });

  it("returns correct value for elliptical orbit", () => {
    // ISS-like: r=6786 km, a=6786 km (circular), v=sqrt(mu/r)
    const mu = MU.EARTH;
    const r = 6786;
    const a = 6786;
    const expected = Math.sqrt(mu / r);
    const result = wasm.vis_viva(mu, r, a);
    assert.ok(
      Math.abs(result - expected) < 1e-10,
      `result=${result}, expected=${expected}`,
    );
  });
});

describe("WASM bridge: hohmann_transfer_dv", () => {
  it("matches TypeScript for LEO to GEO", () => {
    const r1 = 6_578;
    const r2 = 42_164;
    const [tsDv1, tsDv2] = hohmannTransferDv(MU.EARTH, r1, r2);
    const wasmDvs: Float64Array = wasm.hohmann_transfer_dv(MU.EARTH, r1, r2);

    assert.ok(
      Math.abs(tsDv1 - wasmDvs[0]) < 1e-10,
      `dv1: TS=${tsDv1}, WASM=${wasmDvs[0]}`,
    );
    assert.ok(
      Math.abs(tsDv2 - wasmDvs[1]) < 1e-10,
      `dv2: TS=${tsDv2}, WASM=${wasmDvs[1]}`,
    );
  });

  it("matches TypeScript for Earth to Mars", () => {
    const mu = MU.SUN;
    const rEarth = 149_597_870.7;
    const rMars = 227_939_200;
    const [tsDv1, tsDv2] = hohmannTransferDv(mu, rEarth, rMars);
    const wasmDvs: Float64Array = wasm.hohmann_transfer_dv(mu, rEarth, rMars);

    assert.ok(
      Math.abs(tsDv1 - wasmDvs[0]) < 1e-10,
      `dv1: TS=${tsDv1}, WASM=${wasmDvs[0]}`,
    );
    assert.ok(
      Math.abs(tsDv2 - wasmDvs[1]) < 1e-10,
      `dv2: TS=${tsDv2}, WASM=${wasmDvs[1]}`,
    );
  });
});

describe("WASM bridge: orbital_period", () => {
  it("computes Earth orbital period ~365.25 days", () => {
    const mu = MU.SUN;
    const a = 149_597_870.7;
    const period = wasm.orbital_period(mu, a);
    const days = period / 86400;
    assert.ok(
      Math.abs(days - 365.25) < 0.5,
      `period=${days} days, expected ~365.25`,
    );
  });
});

describe("WASM bridge: solve_kepler", () => {
  it("solves Kepler equation for Earth-like eccentricity", () => {
    const e = 0.0167;
    const M = Math.PI / 4;
    const result = wasm.solve_kepler(M, e);
    assert.ok(typeof result.eccentric_anomaly === "number");
    assert.ok(typeof result.iterations === "number");
    assert.ok(typeof result.residual === "number");

    // Verify M = E - e*sin(E)
    const E = result.eccentric_anomaly;
    const residual = Math.abs(E - e * Math.sin(E) - M);
    assert.ok(residual < 1e-12, `residual=${residual}`);
  });

  it("throws for hyperbolic eccentricity", () => {
    assert.throws(() => wasm.solve_kepler(1.0, 1.5));
  });
});

describe("WASM bridge: anomaly round-trip", () => {
  it("mean → true → mean round trip preserves value", () => {
    const e = 0.2;
    const M = 2.5;
    const nu = wasm.mean_to_true_anomaly(M, e);
    const M_back = wasm.true_to_mean_anomaly(nu, e);
    // Normalize M to [0, 2π) for comparison
    const TAU = 2 * Math.PI;
    let M_norm = M % TAU;
    if (M_norm < 0) M_norm += TAU;
    assert.ok(
      Math.abs(M_norm - M_back) < 1e-10,
      `M=${M_norm}, M_back=${M_back}`,
    );
  });

  it("true → eccentric → true round trip preserves value", () => {
    const e = 0.3;
    const nu = 1.2;
    const E = wasm.true_to_eccentric_anomaly(nu, e);
    const nu_back = wasm.eccentric_to_true_anomaly(E, e);
    // Normalize for comparison
    const TAU = 2 * Math.PI;
    let nu_norm = nu % TAU;
    if (nu_norm < 0) nu_norm += TAU;
    assert.ok(
      Math.abs(nu_norm - nu_back) < 1e-10,
      `nu=${nu_norm}, nu_back=${nu_back}`,
    );
  });
});

describe("WASM bridge: propagate_mean_anomaly", () => {
  it("propagates half orbit to π", () => {
    const TAU = 2 * Math.PI;
    const n = TAU / 3600; // period = 3600s
    const m = wasm.propagate_mean_anomaly(0, n, 1800);
    assert.ok(
      Math.abs(m - Math.PI) < 1e-10,
      `m=${m}, expected π=${Math.PI}`,
    );
  });
});

describe("WASM bridge: specific_energy", () => {
  it("returns negative for bound orbits", () => {
    const energy = wasm.specific_energy(MU.EARTH, 6578);
    assert.ok(energy < 0, `energy=${energy}, expected negative`);
  });
});

describe("WASM bridge: specific_angular_momentum", () => {
  it("matches sqrt(mu*r) for circular orbit", () => {
    const r = 6578;
    const h = wasm.specific_angular_momentum(MU.EARTH, r, 0);
    const expected = Math.sqrt(MU.EARTH * r);
    assert.ok(
      Math.abs(h - expected) < 1e-6,
      `h=${h}, expected=${expected}`,
    );
  });
});

describe("WASM bridge: mean_motion", () => {
  it("computes Earth mean motion within 0.2%", () => {
    const TAU = 2 * Math.PI;
    const n = wasm.mean_motion(MU.SUN, 149_597_870.7);
    const expected = TAU / (365.25 * 86400);
    assert.ok(
      Math.abs(n - expected) / expected < 0.002,
      `n=${n}, expected~=${expected}`,
    );
  });
});

describe("WASM bridge: constants", () => {
  it("returns gravitational parameters matching TS constants", () => {
    const mu = wasm.get_mu_constants();
    assert.ok(
      Math.abs(mu.sun - MU.SUN) < 1,
      `mu.sun=${mu.sun}, expected=${MU.SUN}`,
    );
    assert.ok(
      Math.abs(mu.earth - MU.EARTH) < 1e-6,
      `mu.earth=${mu.earth}, expected=${MU.EARTH}`,
    );
    assert.ok(
      Math.abs(mu.mars - MU.MARS) < 1e-2,
      `mu.mars=${mu.mars}, expected=${MU.MARS}`,
    );
  });

  it("returns orbit radii with expected ordering", () => {
    const r = wasm.get_orbit_radius_constants();
    assert.ok(r.mercury < r.venus);
    assert.ok(r.venus < r.earth);
    assert.ok(r.earth < r.mars);
    assert.ok(r.mars < r.jupiter);
    assert.ok(r.jupiter < r.saturn);
  });

  it("returns reference orbits with correct relationships", () => {
    const ref_ = wasm.get_reference_orbit_constants();
    assert.ok(ref_.earth_radius < ref_.leo_radius);
    assert.ok(ref_.leo_radius < ref_.geo_radius);
    // Earth radius is about 6378 km
    assert.ok(
      Math.abs(ref_.earth_radius - 6378.137) < 0.001,
      `earth_radius=${ref_.earth_radius}`,
    );
  });
});

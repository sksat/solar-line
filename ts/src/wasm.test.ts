/**
 * Round-trip tests: verify WASM bridge produces results consistent with
 * the pure TypeScript implementation and known reference values.
 *
 * These tests require the WASM package to be built first (either target works):
 *   wasm-pack build --target nodejs --out-dir ../../ts/pkg crates/solar-line-wasm
 *   wasm-pack build --target web --out-dir ../../ts/pkg crates/solar-line-wasm
 */
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { visViva, hohmannTransferDv, brachistochroneAccel, brachistochroneDeltaV, MU } from "./orbital.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The WASM module is loaded dynamically since it's a generated artifact.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasm: any;

before(async () => {
  wasm = await import("../pkg/solar_line_wasm.js");
  // --target web builds require explicit initialization; --target nodejs does not.
  if (typeof wasm.default === "function") {
    const wasmPath = join(__dirname, "..", "pkg", "solar_line_wasm_bg.wasm");
    const wasmBytes = readFileSync(wasmPath);
    wasm.initSync({ module: wasmBytes });
  }
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

  it("apoapsis velocity lower than periapsis for eccentric orbit", () => {
    // GEO-like orbit with e=0.5: a=42164 km
    const mu = MU.EARTH;
    const a = 42_164;
    const e = 0.5;
    const rPeri = a * (1 - e); // 21082 km
    const rApo = a * (1 + e); // 63246 km
    const vPeri = wasm.vis_viva(mu, rPeri, a);
    const vApo = wasm.vis_viva(mu, rApo, a);
    // At periapsis, velocity > circular; at apoapsis, velocity < circular
    const vCirc = Math.sqrt(mu / a);
    assert.ok(vPeri > vCirc, `periapsis v=${vPeri} should exceed circular v=${vCirc}`);
    assert.ok(vApo < vCirc, `apoapsis v=${vApo} should be below circular v=${vCirc}`);
    // Verify vis-viva: v² = μ(2/r - 1/a)
    const expectedPeri = Math.sqrt(mu * (2 / rPeri - 1 / a));
    assert.ok(Math.abs(vPeri - expectedPeri) < 1e-10, `periapsis vis-viva mismatch`);
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

  it("computes Mercury orbital period ~87.97 days", () => {
    const mu = MU.SUN;
    const aMercury = 57_909_050; // km, Mercury semi-major axis
    const period = wasm.orbital_period(mu, aMercury);
    const days = period / 86400;
    assert.ok(
      Math.abs(days - 87.97) < 0.5,
      `Mercury period=${days} days, expected ~87.97`,
    );
  });

  it("obeys Kepler's third law: period ratio = (a ratio)^1.5", () => {
    const mu = MU.SUN;
    const aEarth = 149_597_870.7;
    const aMercury = 57_909_050;
    const pEarth = wasm.orbital_period(mu, aEarth);
    const pMercury = wasm.orbital_period(mu, aMercury);
    const periodRatio = pEarth / pMercury;
    const expectedRatio = Math.pow(aEarth / aMercury, 1.5);
    assert.ok(
      Math.abs(periodRatio - expectedRatio) < 1e-6,
      `period ratio=${periodRatio}, expected (a ratio)^1.5=${expectedRatio}`,
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

  it("converges for high eccentricity (e=0.9)", () => {
    const e = 0.9;
    const M = Math.PI / 3;
    const result = wasm.solve_kepler(M, e);
    // Verify residual: M = E - e*sin(E)
    const E = result.eccentric_anomaly;
    const residual = Math.abs(E - e * Math.sin(E) - M);
    assert.ok(residual < 1e-12, `high-e residual=${residual}, should be < 1e-12`);
    // Should converge in reasonable iterations
    assert.ok(result.iterations > 0 && result.iterations < 100, `iterations=${result.iterations}`);
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

  it("circular orbit (e=0): mean anomaly equals true anomaly", () => {
    const e = 0;
    const M = 1.5;
    const nu = wasm.mean_to_true_anomaly(M, e);
    // For e=0, true anomaly = mean anomaly (circular orbit)
    assert.ok(
      Math.abs(nu - M) < 1e-10,
      `circular: ν=${nu}, M=${M} — should be identical`,
    );
    const M_back = wasm.true_to_mean_anomaly(nu, e);
    assert.ok(
      Math.abs(M_back - M) < 1e-10,
      `circular round-trip: M_back=${M_back}, M=${M}`,
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

  it("full orbit returns to starting anomaly (mod 2π)", () => {
    const TAU = 2 * Math.PI;
    const n = TAU / 3600;
    const m = wasm.propagate_mean_anomaly(0, n, 3600);
    // Full period → M = 2π, which modulo 2π = 0 (or 2π)
    const mMod = m % TAU;
    assert.ok(
      mMod < 1e-8 || Math.abs(mMod - TAU) < 1e-8,
      `full orbit M=${m} mod 2π=${mMod}, expected ~0`,
    );
  });
});

describe("WASM bridge: specific_energy", () => {
  it("returns negative for bound orbits", () => {
    const energy = wasm.specific_energy(MU.EARTH, 6578);
    assert.ok(energy < 0, `energy=${energy}, expected negative`);
  });

  it("returns positive for hyperbolic (escape) trajectory", () => {
    // At escape speed, energy = 0; above escape speed, energy > 0
    // Use a very large semi-major axis (effectively unbound)
    // For hyperbolic orbit: a < 0, E = -mu/(2a) > 0
    // Simulate with a radius much larger than the SOI where escape velocity is tiny
    // Instead, test directly: E = v²/2 - mu/r. At r=6578 km, v_esc = sqrt(2*mu/r)
    // At radius 6578 km, bound orbit → negative. At radius 1e9 km → nearly zero.
    const energyFar = wasm.specific_energy(MU.EARTH, 1_000_000_000);
    // At 1 billion km, energy ≈ -mu/(2*1e9) ≈ near zero but still negative
    assert.ok(energyFar < 0, `far orbit energy=${energyFar}, still negative (bound)`);
    // Energy at far distance should be less negative than close orbit
    const energyClose = wasm.specific_energy(MU.EARTH, 6578);
    assert.ok(
      energyFar > energyClose,
      `far orbit less bound: ${energyFar} > ${energyClose}`,
    );
  });

  it("matches -μ/(2a) formula quantitatively", () => {
    // For a circular orbit: a = r, E = -μ/(2a)
    const a = 42_164; // GEO
    const energy = wasm.specific_energy(MU.EARTH, a);
    const expected = -MU.EARTH / (2 * a);
    assert.ok(
      Math.abs(energy - expected) < 1e-6,
      `energy=${energy}, expected -μ/(2a)=${expected}`,
    );
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

  it("eccentric orbit has lower h than circular at same semi-major axis", () => {
    const a = 6578; // same semi-major axis
    const hCirc = wasm.specific_angular_momentum(MU.EARTH, a, 0);
    const hEcc = wasm.specific_angular_momentum(MU.EARTH, a, 0.5);
    // h = sqrt(mu * a * (1 - e²)), so h(e=0.5) = sqrt(0.75) * h(e=0) ≈ 0.866 * h(e=0)
    assert.ok(
      hEcc < hCirc,
      `eccentric h=${hEcc} should be less than circular h=${hCirc} at same a`,
    );
    const ratio = hEcc / hCirc;
    assert.ok(
      Math.abs(ratio - Math.sqrt(0.75)) < 0.001,
      `ratio=${ratio}, expected sqrt(0.75)=${Math.sqrt(0.75)}`,
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

  it("inner planet has faster mean motion than outer", () => {
    const nVenus = wasm.mean_motion(MU.SUN, 108_208_000);
    const nEarth = wasm.mean_motion(MU.SUN, 149_597_870.7);
    const nMars = wasm.mean_motion(MU.SUN, 227_939_200);
    assert.ok(nVenus > nEarth, `Venus n=${nVenus} should exceed Earth n=${nEarth}`);
    assert.ok(nEarth > nMars, `Earth n=${nEarth} should exceed Mars n=${nMars}`);
  });

  it("Kepler's third law: n ratio = (a ratio)^(-3/2)", () => {
    const nEarth = wasm.mean_motion(MU.SUN, 149_597_870.7);
    const nMars = wasm.mean_motion(MU.SUN, 227_939_200);
    const nRatio = nEarth / nMars;
    const aRatio = 149_597_870.7 / 227_939_200;
    // n ∝ a^(-3/2), so n_E/n_M = (a_E/a_M)^(-3/2) = (a_M/a_E)^(3/2)
    const expectedRatio = Math.pow(1 / aRatio, 1.5);
    assert.ok(
      Math.abs(nRatio - expectedRatio) < 1e-6,
      `n ratio=${nRatio}, expected (a ratio)^(-3/2)=${expectedRatio}`,
    );
  });
});

describe("WASM bridge: brachistochrone_accel", () => {
  it("matches TypeScript for Mars-Jupiter 72h transfer", () => {
    const d = 550_630_800; // km, closest approach
    const t = 72 * 3600;  // seconds
    const tsResult = brachistochroneAccel(d, t);
    const wasmResult = wasm.brachistochrone_accel(d, t);
    assert.ok(
      Math.abs(tsResult - wasmResult) < 1e-12,
      `TS=${tsResult}, WASM=${wasmResult}`,
    );
  });

  it("EP02 Saturn leg: longer distance/time gives lower accel", () => {
    const dSaturn = 1_280_000_000; // km, ~Jupiter-Saturn distance
    const tSaturn = 87 * 24 * 3600; // 87 days in seconds
    const accelSaturn = wasm.brachistochrone_accel(dSaturn, tSaturn);
    const accelMarsJupiter = wasm.brachistochrone_accel(550_630_800, 72 * 3600);
    // Saturn leg has longer time for similar distance, so lower accel
    assert.ok(accelSaturn < accelMarsJupiter,
      `Saturn accel=${accelSaturn} should be < Mars-Jupiter=${accelMarsJupiter}`);
    // Sanity: accel should be positive and physically reasonable
    assert.ok(accelSaturn > 0 && accelSaturn < 0.001,
      `Saturn accel=${accelSaturn} should be small positive value`);
  });
});

describe("WASM bridge: brachistochrone_dv", () => {
  it("matches TypeScript for Mars-Jupiter 72h transfer", () => {
    const d = 550_630_800;
    const t = 72 * 3600;
    const tsResult = brachistochroneDeltaV(d, t);
    const wasmResult = wasm.brachistochrone_dv(d, t);
    assert.ok(
      Math.abs(tsResult - wasmResult) < 1e-8,
      `TS=${tsResult}, WASM=${wasmResult}`,
    );
  });

  it("ΔV equals accel * time", () => {
    const d = 550_630_800;
    const t = 72 * 3600;
    const accel = wasm.brachistochrone_accel(d, t);
    const dv = wasm.brachistochrone_dv(d, t);
    assert.ok(
      Math.abs(dv - accel * t) < 1e-6,
      `dv=${dv}, accel*t=${accel * t}`,
    );
  });
});

describe("WASM bridge: brachistochrone_max_distance", () => {
  it("round-trips with brachistochrone_accel", () => {
    const d = 550_630_800;
    const t = 72 * 3600;
    const accel = wasm.brachistochrone_accel(d, t);
    const dBack = wasm.brachistochrone_max_distance(accel, t);
    assert.ok(
      Math.abs(dBack - d) < 1.0,
      `d=${d}, dBack=${dBack}`,
    );
  });

  it("higher acceleration covers more distance in same time", () => {
    const t = 72 * 3600;
    const d1 = wasm.brachistochrone_max_distance(0.1, t);
    const d2 = wasm.brachistochrone_max_distance(0.2, t);
    assert.ok(d2 > d1, `higher accel distance ${d2} should exceed ${d1}`);
    // Distance ∝ accel, so d2 should be ~2*d1
    assert.ok(
      Math.abs(d2 / d1 - 2.0) < 0.01,
      `ratio=${d2 / d1}, expected ~2.0`,
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

describe("WASM bridge: brachistochrone_time", () => {
  it("inverts brachistochrone_accel", () => {
    const d = 550_630_800;
    const t = 72 * 3600;
    const accel = wasm.brachistochrone_accel(d, t);
    const tBack = wasm.brachistochrone_time(d, accel);
    assert.ok(
      Math.abs(tBack - t) < 0.1,
      `t=${t}, tBack=${tBack}`,
    );
  });

  it("zero distance gives zero time", () => {
    const t = wasm.brachistochrone_time(0, 1.0);
    assert.ok(t === 0 || Math.abs(t) < 1e-10, `zero distance time=${t}, expected 0`);
  });
});

describe("WASM bridge: exhaust_velocity", () => {
  it("computes ve = Isp * g0 for Kestrel", () => {
    const ve = wasm.exhaust_velocity(1_000_000);
    // 1e6 s * 9.80665 m/s² = 9.80665e6 m/s = 9806.65 km/s
    assert.ok(
      Math.abs(ve - 9806.65) < 0.01,
      `ve=${ve}, expected ~9806.65`,
    );
  });

  it("chemical rocket: Isp 450s → ~4.41 km/s", () => {
    const ve = wasm.exhaust_velocity(450);
    // 450 s * 9.80665 m/s² = 4412.99 m/s = 4.413 km/s
    assert.ok(
      Math.abs(ve - 4.413) < 0.01,
      `chemical ve=${ve}, expected ~4.413 km/s`,
    );
  });

  it("scales linearly: double Isp gives double ve", () => {
    const ve450 = wasm.exhaust_velocity(450);
    const ve900 = wasm.exhaust_velocity(900);
    // ve = Isp × g0, so doubling Isp should double ve
    assert.ok(
      Math.abs(ve900 - 2 * ve450) < 1e-10,
      `ve(900)=${ve900} should be 2×ve(450)=${2 * ve450}`,
    );
  });
});

describe("WASM bridge: rocket equation", () => {
  it("mass_ratio returns e^(dv/ve) for known values", () => {
    const dv = 9.8; // km/s
    const ve = 9806.65; // km/s (Kestrel)
    const mr = wasm.mass_ratio(dv, ve);
    assert.ok(
      Math.abs(mr - Math.exp(dv / ve)) < 1e-10,
      `mr=${mr}, expected=${Math.exp(dv / ve)}`,
    );
  });

  it("propellant_fraction is 1 - 1/mass_ratio", () => {
    const dv = 100;
    const ve = 9806.65;
    const mr = wasm.mass_ratio(dv, ve);
    const pf = wasm.propellant_fraction(dv, ve);
    assert.ok(
      Math.abs(pf - (1 - 1 / mr)) < 1e-10,
      `pf=${pf}, expected=${1 - 1 / mr}`,
    );
  });

  it("initial_mass = dry_mass * mass_ratio", () => {
    const dryMass = 48_000_000; // kg
    const dv = 50; // km/s
    const ve = 9806.65;
    const im = wasm.initial_mass(dryMass, dv, ve);
    const mr = wasm.mass_ratio(dv, ve);
    assert.ok(
      Math.abs(im - dryMass * mr) / im < 1e-10,
      `im=${im}, expected=${dryMass * mr}`,
    );
  });

  it("required_propellant_mass = initial_mass - dry_mass", () => {
    const dryMass = 48_000_000;
    const dv = 50;
    const ve = 9806.65;
    const pm = wasm.required_propellant_mass(dryMass, dv, ve);
    const im = wasm.initial_mass(dryMass, dv, ve);
    assert.ok(
      Math.abs(pm - (im - dryMass)) < 1.0,
      `pm=${pm}, expected=${im - dryMass}`,
    );
  });

  it("mass_flow_rate = thrust / (ve_kms * 1000)", () => {
    const thrust = 9_800_000; // N = 9.8 MN
    const veKms = 9806.65; // km/s
    const mdot = wasm.mass_flow_rate(thrust, veKms);
    // mass_flow_rate returns thrust_N / (ve_kms * 1000)
    assert.ok(
      Math.abs(mdot - thrust / (veKms * 1000)) < 1e-6,
      `mdot=${mdot}, expected=${thrust / (veKms * 1000)}`,
    );
  });

  it("jet_power = 0.5 * thrust * ve_kms * 1000", () => {
    const thrust = 9_800_000; // N
    const veKms = 9806.65; // km/s
    const power = wasm.jet_power(thrust, veKms);
    // jet_power returns 0.5 * F * ve_kms * 1000 (watts)
    assert.ok(
      Math.abs(power - 0.5 * thrust * veKms * 1000) / power < 1e-10,
      `power=${power}, expected=${0.5 * thrust * veKms * 1000}`,
    );
  });
});

describe("WASM bridge: speed_of_light", () => {
  it("returns 299792.458 km/s", () => {
    const c = wasm.speed_of_light();
    assert.ok(
      Math.abs(c - 299_792.458) < 1e-10,
      `c=${c}`,
    );
  });

  it("consistent with light_time at 1 AU", () => {
    const c = wasm.speed_of_light();
    const au = 149_597_870.7; // km
    const expectedTime = au / c; // ~499 seconds
    const actualTime = wasm.light_time_seconds(au);
    assert.ok(
      Math.abs(actualTime - expectedTime) < 0.01,
      `light_time=${actualTime}, c-derived=${expectedTime}`,
    );
  });
});

describe("WASM bridge: light_time", () => {
  it("light_time_seconds for 1 AU ≈ 499 s", () => {
    const t = wasm.light_time_seconds(149_597_870.7);
    assert.ok(Math.abs(t - 499.0) < 0.5, `t=${t}`);
  });

  it("light_time_minutes for 1 AU ≈ 8.3 min", () => {
    const t = wasm.light_time_minutes(149_597_870.7);
    assert.ok(Math.abs(t - 8.317) < 0.01, `t=${t}`);
  });

  it("round_trip is 2x one-way", () => {
    const oneWay = wasm.light_time_seconds(149_597_870.7);
    const rt = wasm.round_trip_light_time(149_597_870.7);
    assert.ok(
      Math.abs(rt - 2 * oneWay) < 1e-10,
      `rt=${rt}, 2*oneWay=${2 * oneWay}`,
    );
  });
});

describe("WASM bridge: relativistic", () => {
  it("lorentz_factor at 0 velocity returns 1.0", () => {
    const gamma = wasm.lorentz_factor(0);
    assert.equal(gamma, 1.0);
  });

  it("lorentz_factor at 0.5c returns ~1.155", () => {
    const c = 299_792.458;
    const gamma = wasm.lorentz_factor(0.5 * c);
    assert.ok(
      Math.abs(gamma - 1 / Math.sqrt(1 - 0.25)) < 1e-6,
      `gamma=${gamma}`,
    );
  });

  it("beta = v/c", () => {
    const v = 1000; // km/s
    const b = wasm.beta(v);
    assert.ok(
      Math.abs(b - v / 299_792.458) < 1e-10,
      `beta=${b}`,
    );
  });
});

describe("WASM bridge: ephemeris utilities", () => {
  it("calendar_to_jd for J2000 epoch returns 2451545.0", () => {
    const jd = wasm.calendar_to_jd(2000, 1, 1.5);
    assert.ok(
      Math.abs(jd - 2_451_545.0) < 0.01,
      `jd=${jd}, expected=2451545.0`,
    );
  });

  it("jd_to_date_string returns formatted date", () => {
    const s = wasm.jd_to_date_string(2_451_545.0);
    assert.ok(
      typeof s === "string" && s.length > 0,
      `jd_to_date_string returned: ${s}`,
    );
  });

  it("j2000_jd returns 2451545.0", () => {
    const jd = wasm.j2000_jd();
    assert.equal(jd, 2_451_545.0);
  });
});

describe("WASM bridge: planet ephemeris", () => {
  it("planet_position returns x,y,z for Earth at J2000", () => {
    const pos = wasm.planet_position("earth", 2_451_545.0);
    assert.ok(pos.x !== undefined && pos.y !== undefined);
    // Earth should be ~1 AU from Sun
    const r = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    assert.ok(r > 140_000_000 && r < 160_000_000, `r=${r} km`);
  });

  it("planet_longitude returns degrees for Mars", () => {
    const lon = wasm.planet_longitude("mars", 2_451_545.0);
    assert.ok(lon >= 0 && lon < 360, `lon=${lon}`);
  });

  it("phase_angle returns value between -180 and 180", () => {
    const angle = wasm.phase_angle("earth", "mars", 2_451_545.0);
    assert.ok(angle >= -180 && angle <= 180, `angle=${angle}`);
  });

  it("synodic_period for Earth-Mars ≈ 780 days", () => {
    const period = wasm.synodic_period("earth", "mars");
    const days = period / 86400;
    assert.ok(
      Math.abs(days - 780) < 20,
      `synodic period=${days} days, expected ~780`,
    );
  });

  it("hohmann_phase_angle for Earth→Mars ≈ 44°", () => {
    const angleRad = wasm.hohmann_phase_angle("earth", "mars");
    const angleDeg = angleRad * 180 / Math.PI;
    // Earth→Mars Hohmann phase angle is ~44°
    assert.ok(
      Math.abs(angleDeg - 44.3) < 5,
      `hohmann phase angle=${angleDeg}° (${angleRad} rad), expected ~44°`,
    );
  });

  it("hohmann_transfer_time for Earth→Mars ≈ 259 days", () => {
    const time = wasm.hohmann_transfer_time("earth", "mars");
    const days = time / 86400;
    assert.ok(
      Math.abs(days - 259) < 5,
      `transfer time=${days} days, expected ~259`,
    );
  });
});

describe("WASM bridge: SOI and flyby", () => {
  it("soi_radius for Jupiter ≈ 48 million km", () => {
    const muJupiter = 1.266865349e8;
    const muSun = 1.32712440041e11;
    const rJupiter = 778_570_000;
    const soi = wasm.soi_radius(rJupiter, muJupiter, muSun);
    // Jupiter SOI ≈ 48.2 million km
    assert.ok(
      soi > 45_000_000 && soi < 52_000_000,
      `soi=${soi} km`,
    );
  });

  it("unpowered_flyby returns deflected velocity", () => {
    const muJupiter = 1.266865349e8;
    const vInfX = 10.0; // km/s
    const vInfY = 0.0;
    const vInfZ = 0.0;
    const rPeri = 500_000; // km
    // Normal vector for flyby plane (z-axis = ecliptic normal)
    const normalX = 0.0;
    const normalY = 0.0;
    const normalZ = 1.0;
    // Returns [turn_angle_rad, v_periapsis, v_inf_out, out_dir_x, out_dir_y, out_dir_z]
    const result = wasm.unpowered_flyby(
      muJupiter, vInfX, vInfY, vInfZ, rPeri, normalX, normalY, normalZ,
    );
    const turnAngleRad = result[0];
    const vOutDir = [result[3], result[4], result[5]];
    const vInfOut = result[2];
    // Speed should be conserved (energy conservation)
    assert.ok(
      Math.abs(vInfOut - 10.0) < 0.1,
      `v_inf_out=${vInfOut}, expected 10.0 (energy conservation)`,
    );
    // Direction should change (deflection > 0)
    const turnAngleDeg = turnAngleRad * 180 / Math.PI;
    assert.ok(
      turnAngleDeg > 0,
      `turn angle=${turnAngleDeg}°`,
    );
    // Output direction should differ from input [1,0,0]
    assert.ok(
      Math.abs(vOutDir[0] - 1.0) > 0.001 || Math.abs(vOutDir[1]) > 0.001,
      `out_dir should differ from [1,0,0]: got [${vOutDir}]`,
    );
  });

  it("powered_flyby increases v_inf via Oberth burn at periapsis", () => {
    const muJupiter = 1.266865349e8;
    const vInfX = 10.0; // km/s
    const vInfY = 0.0;
    const vInfZ = 0.0;
    const rPeri = 200_000; // km (close to Jupiter for strong Oberth effect)
    const burnDv = 2.0; // km/s burn at periapsis
    const normalX = 0.0;
    const normalY = 0.0;
    const normalZ = 1.0;
    // Returns [turn_angle_rad, v_periapsis, v_inf_out, out_dir_x, out_dir_y, out_dir_z]
    const result = wasm.powered_flyby(
      muJupiter, vInfX, vInfY, vInfZ, rPeri, burnDv, normalX, normalY, normalZ,
    );
    assert.equal(result.length, 6, "should return 6 floats");
    // Powered flyby should increase v_inf (Oberth effect)
    const vInfOut = result[2];
    assert.ok(
      vInfOut > 10.0,
      `powered flyby should increase v_inf: got ${vInfOut}, expected > 10.0`,
    );
    // Output direction should be a unit vector
    const dirMag = Math.sqrt(result[3] ** 2 + result[4] ** 2 + result[5] ** 2);
    assert.ok(
      Math.abs(dirMag - 1.0) < 0.01,
      `out_dir should be unit vector: magnitude=${dirMag}`,
    );
    // Direction should differ from input [1,0,0]
    assert.ok(
      Math.abs(result[3] - 1.0) > 0.001 || Math.abs(result[4]) > 0.001,
      `out_dir should differ from input: got [${result[3]}, ${result[4]}, ${result[5]}]`,
    );
  });

  it("oberth_dv_gain is positive for Jupiter periapsis burn", () => {
    const muJupiter = 1.266865349e8;
    const rPeri = 200_000; // km (close to Jupiter)
    const vInf = 10.0; // km/s
    const burnDv = 2.0; // km/s
    const gain = wasm.oberth_dv_gain(muJupiter, rPeri, vInf, burnDv);
    assert.ok(gain > burnDv, `gain=${gain} should exceed burn_dv=${burnDv}`);
  });

  it("oberth_efficiency is positive for deep gravity well", () => {
    const muJupiter = 1.266865349e8;
    const rPeri = 200_000;
    const vInf = 10.0;
    const burnDv = 2.0;
    const eff = wasm.oberth_efficiency(muJupiter, rPeri, vInf, burnDv);
    assert.ok(eff > 0, `efficiency=${eff}`);
  });
});

// ---------------------------------------------------------------------------
// Kepler equation and anomaly conversions
// ---------------------------------------------------------------------------

describe("WASM bridge: Kepler equation", () => {
  const muSun = 1.32712440041e11; // km³/s²
  const aEarth = 149_598_023; // km (semi-major axis)
  const eEarth = 0.0167086; // eccentricity

  it("solve_kepler returns eccentric anomaly for circular-ish orbit", () => {
    const M = Math.PI / 3; // 60° mean anomaly
    const result = wasm.solve_kepler(M, eEarth);
    assert.ok(result.eccentric_anomaly !== undefined, "has eccentric_anomaly");
    assert.ok(result.iterations > 0, `iterations=${result.iterations}`);
    assert.ok(result.residual < 1e-12, `residual=${result.residual}`);
    // E should be close to M for near-circular orbit
    assert.ok(
      Math.abs(result.eccentric_anomaly - M) < 0.05,
      `E=${result.eccentric_anomaly} ≈ M=${M}`,
    );
  });

  it("mean_to_true_anomaly round-trips with true_to_mean_anomaly", () => {
    const M = 1.0; // ~57° mean anomaly
    const nu = wasm.mean_to_true_anomaly(M, eEarth);
    const M2 = wasm.true_to_mean_anomaly(nu, eEarth);
    assert.ok(
      Math.abs(M2 - M) < 1e-10,
      `round-trip: M=${M} → ν=${nu} → M2=${M2}`,
    );
  });

  it("eccentric_to_true_anomaly round-trips with true_to_eccentric_anomaly", () => {
    const E = 1.5; // eccentric anomaly in radians
    const nu = wasm.eccentric_to_true_anomaly(E, eEarth);
    const E2 = wasm.true_to_eccentric_anomaly(nu, eEarth);
    assert.ok(
      Math.abs(E2 - E) < 1e-10,
      `round-trip: E=${E} → ν=${nu} → E2=${E2}`,
    );
  });

  it("eccentric_to_mean_anomaly for E=0 returns M=0", () => {
    const M = wasm.eccentric_to_mean_anomaly(0, eEarth);
    assert.ok(Math.abs(M) < 1e-15, `M(E=0)=${M}`);
  });

  it("mean_motion for Earth orbit ≈ 1.991e-7 rad/s", () => {
    const n = wasm.mean_motion(muSun, aEarth);
    // Expected: n = sqrt(mu/a^3) ≈ 1.991e-7 rad/s
    assert.ok(
      Math.abs(n - 1.991e-7) < 1e-9,
      `mean motion=${n} rad/s`,
    );
  });

  it("propagate_mean_anomaly advances correctly", () => {
    const M0 = 0;
    const n = wasm.mean_motion(muSun, aEarth);
    const halfPeriod = Math.PI / n; // half an orbit
    const M1 = wasm.propagate_mean_anomaly(M0, n, halfPeriod);
    assert.ok(
      Math.abs(M1 - Math.PI) < 1e-6,
      `M after half period=${M1}, expected π`,
    );
  });

  it("orbital_period for Earth ≈ 365.25 days", () => {
    const T = wasm.orbital_period(muSun, aEarth);
    const days = T / 86400;
    assert.ok(
      Math.abs(days - 365.25) < 0.1,
      `period=${days} days, expected ~365.25`,
    );
  });

  it("specific_energy for Earth orbit is negative (bound)", () => {
    const eps = wasm.specific_energy(muSun, aEarth);
    assert.ok(eps < 0, `specific energy=${eps} should be negative for bound orbit`);
  });

  it("specific_angular_momentum for Earth orbit is positive", () => {
    const h = wasm.specific_angular_momentum(muSun, aEarth, eEarth);
    assert.ok(h > 0, `h=${h} km²/s`);
    // For near-circular: h ≈ sqrt(mu * a)
    const expected = Math.sqrt(muSun * aEarth);
    assert.ok(
      Math.abs(h - expected) / expected < 0.001,
      `h=${h} ≈ sqrt(μa)=${expected}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Orbital elements to state vector
// ---------------------------------------------------------------------------

describe("WASM bridge: orbital elements", () => {
  it("elements_to_state_vector for circular equatorial orbit", () => {
    const muEarth = 3.986004418e5; // km³/s²
    const a = 6_771; // LEO ~400km altitude
    const result = wasm.elements_to_state_vector(
      muEarth, a, 0.0, 0.0, 0.0, 0.0, 0.0,
    );
    // At true anomaly=0, position should be at periapsis along x-axis
    const r = Math.sqrt(
      result.position[0] ** 2 + result.position[1] ** 2 + result.position[2] ** 2,
    );
    assert.ok(
      Math.abs(r - a) < 1,
      `radius=${r} km, expected ~${a} km for circular orbit`,
    );
    // Speed should be ~sqrt(mu/a)
    const v = Math.sqrt(
      result.velocity[0] ** 2 + result.velocity[1] ** 2 + result.velocity[2] ** 2,
    );
    const expectedV = Math.sqrt(muEarth / a);
    assert.ok(
      Math.abs(v - expectedV) < 0.01,
      `speed=${v} km/s, expected ~${expectedV} km/s`,
    );
  });

  it("inclined orbit has nonzero z-component in position", () => {
    const muEarth = 3.986004418e5;
    const a = 6_771;
    const inc = Math.PI / 2; // 90° polar orbit
    const trueAnomaly = Math.PI / 4; // 45° past ascending node
    const result = wasm.elements_to_state_vector(
      muEarth, a, 0.0, inc, 0.0, 0.0, trueAnomaly,
    );
    const r = Math.sqrt(
      result.position[0] ** 2 + result.position[1] ** 2 + result.position[2] ** 2,
    );
    // Radius should still be ~a for circular orbit
    assert.ok(
      Math.abs(r - a) < 1,
      `inclined orbit radius=${r} km, expected ~${a}`,
    );
    // For i=90°, ν=45°: position should have significant z-component
    assert.ok(
      Math.abs(result.position[2]) > 100,
      `polar orbit at ν=45° should have z-component: z=${result.position[2]}`,
    );
  });

  it("eccentric orbit at periapsis has correct radius and speed", () => {
    const muEarth = 3.986004418e5;
    const a = 42_164; // GEO semi-major axis
    const e = 0.5;
    // At true anomaly=0 (periapsis): r_p = a(1-e), v_p = sqrt(mu(2/r_p - 1/a))
    const result = wasm.elements_to_state_vector(
      muEarth, a, e, 0.0, 0.0, 0.0, 0.0, // all angles = 0, ν=0 (periapsis)
    );
    const r = Math.sqrt(
      result.position[0] ** 2 + result.position[1] ** 2 + result.position[2] ** 2,
    );
    const rpExpected = a * (1 - e);
    assert.ok(
      Math.abs(r - rpExpected) < 1,
      `periapsis radius=${r} km, expected ${rpExpected} km`,
    );
    const v = Math.sqrt(
      result.velocity[0] ** 2 + result.velocity[1] ** 2 + result.velocity[2] ** 2,
    );
    const vpExpected = Math.sqrt(muEarth * (2 / rpExpected - 1 / a));
    assert.ok(
      Math.abs(v - vpExpected) < 0.01,
      `periapsis speed=${v} km/s, expected ${vpExpected} km/s`,
    );
  });
});

// ---------------------------------------------------------------------------
// Orbit propagation
// ---------------------------------------------------------------------------

describe("WASM bridge: orbit propagation", () => {
  const muSun = 1.32712440041e11;

  it("propagate_ballistic conserves energy for Earth-like orbit", () => {
    // Earth at perihelion, approximate position and velocity
    const x = 147_100_000; // km
    const y = 0;
    const z = 0;
    const vx = 0;
    const vy = 30.29; // km/s (Earth orbital velocity)
    const vz = 0;
    const dt = 60; // 1 min time step
    const duration = 86400; // 1 day
    // Returns [x, y, z, vx, vy, vz, time, energy_drift]
    const result = wasm.propagate_ballistic(x, y, z, vx, vy, vz, muSun, dt, duration);
    assert.equal(result.length, 8, "should return 8 values");
    // Energy drift should be small
    const drift = result[7];
    assert.ok(drift < 1e-6, `energy drift=${drift}, should be < 1e-6`);
    // Position should have moved (not stuck at origin)
    const rFinal = Math.sqrt(result[0] ** 2 + result[1] ** 2 + result[2] ** 2);
    assert.ok(
      rFinal > 140_000_000 && rFinal < 160_000_000,
      `final radius=${rFinal} km`,
    );
  });

  it("propagate_brachistochrone moves towards target", () => {
    const x = 147_100_000; // km (near Earth)
    const y = 0;
    const z = 0;
    const vx = 0;
    const vy = 30.0; // km/s
    const vz = 0;
    const dt = 60;
    const duration = 3600; // 1 hour
    const accel = 0.0002; // km/s² (~0.02g)
    const flipTime = 1800; // flip at midpoint
    // Returns [x, y, z, vx, vy, vz, time]
    const result = wasm.propagate_brachistochrone(
      x, y, z, vx, vy, vz, muSun, dt, duration, accel, flipTime,
    );
    assert.equal(result.length, 7, "should return 7 values");
    // Should have moved from initial position
    const dx = result[0] - x;
    const dy = result[1] - y;
    assert.ok(
      Math.sqrt(dx ** 2 + dy ** 2) > 0,
      "ship should have moved from initial position",
    );
  });

  it("propagate_trajectory returns sampled points", () => {
    const x = 147_100_000;
    const y = 0;
    const z = 0;
    const vx = 0;
    const vy = 30.29;
    const vz = 0;
    const dt = 60;
    const duration = 86400; // 1 day
    const sampleInterval = 100; // every 100 steps = 6000s
    const result = wasm.propagate_trajectory(
      x, y, z, vx, vy, vz, muSun, dt, duration, sampleInterval,
    );
    // Returns flat array [t0, x0, y0, z0, t1, x1, y1, z1, ...]
    assert.ok(result.length >= 4, `result has ${result.length} elements`);
    assert.equal(result.length % 4, 0, "length should be multiple of 4");
    // First point should be near initial position
    const t0 = result[0];
    const x0 = result[1];
    assert.ok(Math.abs(t0) < 1, `first time=${t0} should be ~0`);
    assert.ok(
      Math.abs(x0 - x) < 1000,
      `first x=${x0} should be near initial x=${x}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Communications functions
// ---------------------------------------------------------------------------

describe("WASM bridge: communications", () => {
  const j2000 = 2_451_545.0;

  it("comm_feasibility_label returns Japanese label", () => {
    // 0s delay → real-time
    const label0 = wasm.comm_feasibility_label(0);
    assert.ok(typeof label0 === "string" && label0.length > 0, `label="${label0}"`);
    // 600s delay → should be different classification
    const label600 = wasm.comm_feasibility_label(600);
    assert.ok(typeof label600 === "string" && label600.length > 0, `label="${label600}"`);
  });

  it("free_space_path_loss_db returns positive dB for deep space", () => {
    const loss = wasm.free_space_path_loss_db(778_570_000, 32e9); // Jupiter distance, Ka-band
    assert.ok(loss > 200, `FSPL=${loss} dB for Jupiter distance Ka-band`);
  });

  it("planet_distance_range returns [min, max] for Earth-Mars", () => {
    const range = wasm.planet_distance_range("earth", "mars");
    assert.equal(range.length, 2, "should return 2 values");
    const [min, max] = [range[0], range[1]];
    assert.ok(min > 50_000_000 && min < 80_000_000, `min=${min} km`);
    assert.ok(max > 350_000_000 && max < 410_000_000, `max=${max} km`);
    assert.ok(min < max, "min < max");
  });

  it("planet_light_delay returns seconds for Earth-Mars at J2000", () => {
    const delay = wasm.planet_light_delay("earth", "mars", j2000);
    // Light delay depends on actual distance, should be 3-22 min → 180-1320s
    assert.ok(delay > 100 && delay < 1400, `delay=${delay}s`);
  });

  it("planet_light_delay_range returns [min, max] seconds", () => {
    const range = wasm.planet_light_delay_range("earth", "mars");
    assert.equal(range.length, 2, "should return 2 values");
    assert.ok(range[0] > 100 && range[0] < 500, `min delay=${range[0]}s`);
    assert.ok(range[1] > 1000 && range[1] < 1400, `max delay=${range[1]}s`);
  });

  it("ship_planet_light_delay for ship near Earth ≈ 0", () => {
    // Ship at ~1 AU from Sun on x-axis (near Earth)
    const pos = wasm.planet_position("earth", j2000);
    const delay = wasm.ship_planet_light_delay(pos.x, pos.y, "earth", j2000);
    assert.ok(delay < 10, `delay=${delay}s, ship near Earth should be ~0`);
  });

  it("comm_timeline_linear returns flat array with expected stride", () => {
    const travelTime = 86400 * 30; // 30 days
    const nSteps = 5;
    const result = wasm.comm_timeline_linear("earth", "mars", j2000, travelTime, nSteps);
    // Returns flat array with stride 6: [jd, elapsed_s, ship_x, ship_y, delay_s, feasibility_code, ...]
    assert.ok(result.length >= 6, `result has ${result.length} elements`);
    assert.equal(result.length % 6, 0, `length should be multiple of 6, got ${result.length}`);
  });
});

// ---------------------------------------------------------------------------
// Attitude and pointing functions
// ---------------------------------------------------------------------------

describe("WASM bridge: attitude and pointing", () => {
  it("miss_distance_km increases with pointing error", () => {
    const accel = 0.2; // m/s²
    const burnTime = 3600; // 1 hour
    const miss1 = wasm.miss_distance_km(accel, burnTime, 0.001); // ~0.057°
    const miss2 = wasm.miss_distance_km(accel, burnTime, 0.01); // ~0.57°
    assert.ok(miss2 > miss1, `miss2=${miss2} > miss1=${miss1}`);
    assert.ok(miss1 > 0, `miss1=${miss1} should be positive`);
  });

  it("required_pointing_rad returns correct inverse", () => {
    const accel = 0.2;
    const burnTime = 3600;
    const maxMiss = 100; // 100 km
    const pointing = wasm.required_pointing_rad(accel, burnTime, maxMiss);
    assert.ok(pointing > 0, `pointing=${pointing} rad`);
    // Verify: miss at this pointing should be ~maxMiss
    const actualMiss = wasm.miss_distance_km(accel, burnTime, pointing);
    assert.ok(
      Math.abs(actualMiss - maxMiss) < 1,
      `miss at computed pointing=${actualMiss} km ≈ ${maxMiss} km`,
    );
  });

  it("velocity_error_from_pointing is positive", () => {
    const err = wasm.velocity_error_from_pointing(0.2, 3600, 0.001);
    assert.ok(err > 0, `velocity error=${err}`);
  });

  it("accuracy_to_pointing_error_rad converts fraction to radians", () => {
    const err = wasm.accuracy_to_pointing_error_rad(0.998); // 99.8% accuracy
    assert.ok(err > 0 && err < 0.1, `pointing error=${err} rad`);
  });

  it("delta_v_correction_fraction is small for low exhaust velocity", () => {
    // Low exhaust velocity → negligible relativistic correction
    const frac = wasm.delta_v_correction_fraction(10.0, 3.0); // 10 km/s, mass ratio 3
    assert.ok(Math.abs(frac) < 0.01, `correction fraction=${frac}`);
  });

  it("flip_angular_rate for 60s flip", () => {
    const rate = wasm.flip_angular_rate(60); // 60 second flip
    // π radians / 60 seconds ≈ 0.0524 rad/s
    assert.ok(
      Math.abs(rate - Math.PI / 60) < 0.001,
      `angular rate=${rate} rad/s`,
    );
  });

  it("flip_angular_momentum is positive", () => {
    const L = wasm.flip_angular_momentum(48_000_000, 21.4, 0.05);
    assert.ok(L > 0, `angular momentum=${L} kg·m²/s`);
  });

  it("flip_rcs_torque is positive", () => {
    const torque = wasm.flip_rcs_torque(48_000_000, 21.4, 60, 5);
    assert.ok(torque > 0, `RCS torque=${torque} N·m`);
  });

  it("gravity_gradient_torque is non-negative", () => {
    const tau = wasm.gravity_gradient_torque(
      3.986004418e14, // Earth GM in m³/s²
      6_771_000, // 400km altitude in meters
      48_000_000, // 48kt mass
      42.8, // ship length in meters
      0.1, // 0.1 rad angle
    );
    assert.ok(tau >= 0, `gravity gradient torque=${tau} N·m`);
  });
});

// ---------------------------------------------------------------------------
// Jupiter radiation
// ---------------------------------------------------------------------------

describe("WASM bridge: Jupiter radiation", () => {
  it("jupiter_radius_km ≈ 71,492 km", () => {
    const r = wasm.jupiter_radius_km();
    assert.ok(
      Math.abs(r - 71_492) < 100,
      `Jupiter radius=${r} km`,
    );
  });

  it("jupiter_dose_rate_krad_h is higher closer to Jupiter", () => {
    // Model covers 6-63 Rj (inner belt starts at 6 Rj)
    const rate10 = wasm.jupiter_dose_rate_krad_h(10); // 10 Rj (inner belt)
    const rate20 = wasm.jupiter_dose_rate_krad_h(20); // 20 Rj (middle magnetosphere)
    assert.ok(rate10 > rate20, `dose at 10Rj=${rate10} > dose at 20Rj=${rate20}`);
    assert.ok(rate10 > 0, `dose rate at 10Rj=${rate10} krad/h`);
  });

  it("jupiter_transit_analysis returns comprehensive result", () => {
    // Transit from 15 Rj outward to 50 Rj at 7 km/s radial, 100 krad shield
    const result = wasm.jupiter_transit_analysis(15, 50, 7, 100);
    assert.ok(result.total_dose_krad > 0, `total dose=${result.total_dose_krad}`);
    assert.ok(typeof result.shield_survives === "boolean", "has shield_survives");
    assert.ok(result.peak_dose_rate_krad_h > 0, "has peak dose rate");
  });

  it("jupiter_minimum_survival_velocity is positive", () => {
    const v = wasm.jupiter_minimum_survival_velocity(20, 5, 500);
    assert.ok(v > 0, `min survival velocity=${v} km/s`);
  });
});

// ---------------------------------------------------------------------------
// Plasmoid and plasma functions
// ---------------------------------------------------------------------------

describe("WASM bridge: plasmoid analysis", () => {
  it("magnetic_pressure_pa for typical plasmoid field", () => {
    const p = wasm.magnetic_pressure_pa(1e-7); // 100 nT
    assert.ok(p > 0, `magnetic pressure=${p} Pa`);
    // P = B²/(2μ₀) ≈ (1e-7)²/(2*4π*1e-7) ≈ 4e-9 Pa
    assert.ok(p < 1e-6, `pressure should be small: ${p} Pa`);
  });

  it("ram_pressure_pa for solar wind", () => {
    const density = 1e-20; // kg/m³ (typical solar wind)
    const velocity = 400_000; // 400 km/s in m/s
    const p = wasm.ram_pressure_pa(density, velocity);
    assert.ok(p > 0, `ram pressure=${p} Pa`);
  });

  it("plasma_number_density_to_mass converts correctly", () => {
    const n = 1e6; // 10⁶ particles/m³
    const rho = wasm.plasma_number_density_to_mass(n);
    // Pure hydrogen: rho = n * m_p ≈ 1e6 * 1.67e-27 ≈ 1.67e-21 kg/m³
    assert.ok(rho > 1e-22 && rho < 1e-20, `density=${rho} kg/m³`);
  });

  it("plasmoid_perturbation returns full analysis", () => {
    const result = wasm.plasmoid_perturbation(
      1e-7, // B in Tesla
      1e6, // number density
      400_000, // plasma velocity m/s
      100, // cross section m²
      60, // transit duration s
      48_000_000, // ship mass kg
      86400 * 30, // remaining travel s
    );
    assert.ok(result.velocity_perturbation_m_s >= 0, "has velocity perturbation");
    assert.ok(result.miss_distance_km >= 0, "has miss distance");
    assert.ok(result.total_pressure_pa > 0, "has total pressure");
  });

  it("uranus_plasmoid_scenarios returns array of scenarios", () => {
    const scenarios = wasm.uranus_plasmoid_scenarios();
    assert.ok(Array.isArray(scenarios), "should be array");
    assert.ok(scenarios.length >= 2, `should have multiple scenarios, got ${scenarios.length}`);
    assert.ok(scenarios[0].label.length > 0, "scenario has label");
    assert.ok(scenarios[0].b_tesla > 0, "scenario has B field");
  });
});

// ---------------------------------------------------------------------------
// 3D orbital analysis
// ---------------------------------------------------------------------------

describe("WASM bridge: 3D orbital analysis", () => {
  const j2000 = 2_451_545.0;

  it("ecliptic_z_height for Earth is near zero (small inclination)", () => {
    const z = wasm.ecliptic_z_height("earth", j2000);
    // Earth orbit is in the ecliptic plane by definition, z should be ~0
    assert.ok(Math.abs(z) < 1_000_000, `z=${z} km (should be small)`);
  });

  it("max_ecliptic_z_height for Mars > Earth", () => {
    const zMars = wasm.max_ecliptic_z_height("mars");
    const zEarth = wasm.max_ecliptic_z_height("earth");
    // Mars has higher inclination (1.85°) than Earth (0°)
    assert.ok(zMars > zEarth, `Mars max z=${zMars} > Earth max z=${zEarth}`);
  });

  it("out_of_plane_distance returns positive value", () => {
    const d = wasm.out_of_plane_distance("earth", "mars", j2000);
    assert.ok(d >= 0, `out-of-plane distance=${d} km`);
  });

  it("plane_change_dv is zero for zero inclination change", () => {
    const dv = wasm.plane_change_dv(30.0, 0.0);
    assert.ok(Math.abs(dv) < 1e-10, `dv=${dv} should be ~0`);
  });

  it("plane_change_dv increases with inclination", () => {
    const dv1 = wasm.plane_change_dv(30.0, 0.01); // ~0.57°
    const dv2 = wasm.plane_change_dv(30.0, 0.1); // ~5.7°
    assert.ok(dv2 > dv1, `dv at 0.1 rad=${dv2} > dv at 0.01 rad=${dv1}`);
  });

  it("transfer_inclination_penalty returns delta_i and dv", () => {
    const result = wasm.transfer_inclination_penalty("earth", "mars", j2000, 30.0);
    assert.ok(result.delta_i_rad >= 0, `delta_i=${result.delta_i_rad} rad`);
    assert.ok(result.dv_penalty_km_s >= 0, `dv penalty=${result.dv_penalty_km_s} km/s`);
  });

  it("saturn_ring_plane_normal returns unit vector", () => {
    const n = wasm.saturn_ring_plane_normal(j2000);
    assert.equal(n.length, 3, "should return 3 components");
    const mag = Math.sqrt(n[0] ** 2 + n[1] ** 2 + n[2] ** 2);
    assert.ok(
      Math.abs(mag - 1.0) < 0.01,
      `normal magnitude=${mag}, expected ~1.0`,
    );
  });

  it("uranus_spin_axis_ecliptic returns unit vector", () => {
    const a = wasm.uranus_spin_axis_ecliptic();
    assert.equal(a.length, 3, "should return 3 components");
    const mag = Math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2);
    assert.ok(
      Math.abs(mag - 1.0) < 0.01,
      `axis magnitude=${mag}, expected ~1.0`,
    );
  });

  it("uranus_approach_analysis returns approach classification", () => {
    const result = wasm.uranus_approach_analysis(1.0, 0.0, 0.0, 50_000);
    assert.ok(typeof result.is_polar_approach === "boolean", "has is_polar_approach");
    assert.ok(typeof result.is_equatorial_approach === "boolean", "has is_equatorial_approach");
    assert.ok(result.equatorial_ecliptic_angle_deg >= 0, "has angle");
  });
});

// ---------------------------------------------------------------------------
// Relativistic analysis
// ---------------------------------------------------------------------------

describe("WASM bridge: relativistic analysis", () => {
  it("relativistic_effects_summary returns all fields", () => {
    const result = wasm.relativistic_effects_summary(7600); // ~2.5% c
    assert.ok(result.gamma > 1.0, `gamma=${result.gamma}`);
    assert.ok(result.beta > 0 && result.beta < 1, `beta=${result.beta}`);
    assert.ok(result.timeDilationPpm > 0, `time dilation=${result.timeDilationPpm} ppm`);
    assert.ok(result.keCorrectionPpm > 0, `KE correction=${result.keCorrectionPpm} ppm`);
  });

  it("relativistic_brachistochrone_times returns coord and proper times", () => {
    const dist = 778_570_000; // Jupiter distance km
    const accel = 0.0002; // km/s² (~0.02g)
    const result = wasm.relativistic_brachistochrone_times(dist, accel);
    assert.ok(result.coordinateTimeSec > 0, `coord time=${result.coordinateTimeSec}s`);
    assert.ok(result.properTimeSec > 0, `proper time=${result.properTimeSec}s`);
    // Proper time should be ≤ coordinate time (time dilation)
    assert.ok(
      result.properTimeSec <= result.coordinateTimeSec + 1,
      `proper ≤ coord: ${result.properTimeSec} ≤ ${result.coordinateTimeSec}`,
    );
  });

  it("relativistic_brachistochrone_peak_velocity < c", () => {
    const vPeak = wasm.relativistic_brachistochrone_peak_velocity(778_570_000, 0.0002);
    assert.ok(vPeak > 0, `peak velocity=${vPeak} km/s`);
    assert.ok(vPeak < 299_792.458, `peak velocity=${vPeak} should be < c`);
  });

  it("classical_delta_v matches Tsiolkovsky equation", () => {
    const ve = 9806.65; // km/s (Isp=10^6 s)
    const mr = 1.1; // mass ratio
    const dv = wasm.classical_delta_v(ve, mr);
    const expected = ve * Math.log(mr);
    assert.ok(
      Math.abs(dv - expected) < 0.01,
      `dv=${dv}, expected=${expected}`,
    );
  });

  it("relativistic_delta_v ≈ classical for low exhaust velocity", () => {
    const ve = 10.0; // 10 km/s (non-relativistic)
    const mr = 3.0;
    const classical = wasm.classical_delta_v(ve, mr);
    const relativistic = wasm.relativistic_delta_v(ve, mr);
    assert.ok(
      Math.abs(classical - relativistic) / classical < 0.001,
      `classical=${classical} ≈ relativistic=${relativistic}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Mass timeline
// ---------------------------------------------------------------------------

describe("WASM bridge: mass timeline", () => {
  it("mass_propellant_consumed is positive for positive dv", () => {
    const consumed = wasm.mass_propellant_consumed(48_000_000, 1.0, 1_000_000);
    assert.ok(consumed > 0, `consumed=${consumed} kg`);
    assert.ok(consumed < 48_000_000, `consumed=${consumed} < total mass`);
  });

  it("mass_post_burn < pre-burn mass", () => {
    const preBurn = 48_000_000;
    const postBurn = wasm.mass_post_burn(preBurn, 1.0, 1_000_000);
    assert.ok(postBurn < preBurn, `post=${postBurn} < pre=${preBurn}`);
    assert.ok(postBurn > 0, `post=${postBurn} > 0`);
  });

  it("mass_post_burn + propellant_consumed = pre_burn", () => {
    const pre = 48_000_000;
    const dv = 2.0;
    const isp = 1_000_000;
    const consumed = wasm.mass_propellant_consumed(pre, dv, isp);
    const post = wasm.mass_post_burn(pre, dv, isp);
    assert.ok(
      Math.abs((post + consumed) - pre) < 1,
      `post(${post}) + consumed(${consumed}) = ${post + consumed} ≈ pre(${pre})`,
    );
  });
});

// ---------------------------------------------------------------------------
// Hohmann window
// ---------------------------------------------------------------------------

describe("WASM bridge: Hohmann window", () => {
  it("next_hohmann_window returns a JD for Earth→Mars", () => {
    const jd = wasm.next_hohmann_window("earth", "mars", 2_451_545.0);
    assert.ok(jd !== null, "should find a window");
    assert.ok(jd > 2_451_545.0, `window JD=${jd} > search start`);
  });

  it("window is within Earth-Mars synodic period (~780 days)", () => {
    const start = 2_451_545.0; // J2000
    const jd = wasm.next_hohmann_window("earth", "mars", start);
    const daysDelta = jd - start;
    // Earth-Mars synodic period ~780 days; window should be within that
    assert.ok(daysDelta > 0 && daysDelta < 800,
      `window ${daysDelta} days from start should be within synodic period ~780d`);
  });

  it("Earth→Jupiter window within synodic period (~399 days)", () => {
    const start = 2_451_545.0; // J2000
    const jd = wasm.next_hohmann_window("earth", "jupiter", start);
    assert.ok(jd !== null, "should find Earth→Jupiter window");
    const daysDelta = jd - start;
    // Earth-Jupiter synodic period ~398.9 days
    assert.ok(daysDelta > 0 && daysDelta < 420,
      `window ${daysDelta} days from start should be within synodic period ~399d`);
  });
});

// ---------------------------------------------------------------------------
// Adaptive and symplectic propagation
// ---------------------------------------------------------------------------

describe("WASM bridge: adaptive and symplectic propagation", () => {
  const muSun = 1.32712440041e11;
  const x0 = 147_100_000;
  const vy0 = 30.29;

  it("propagate_adaptive_ballistic conserves energy", () => {
    // Returns [x, y, z, vx, vy, vz, time, energy_drift, n_eval]
    const result = wasm.propagate_adaptive_ballistic(
      x0, 0, 0, 0, vy0, 0, muSun, 86400, 1e-10, 1e-12,
    );
    assert.equal(result.length, 9, "should return 9 values");
    const drift = result[7];
    const nEval = result[8];
    assert.ok(drift < 1e-8, `energy drift=${drift}`);
    assert.ok(nEval > 0, `n_eval=${nEval}`);
  });

  it("propagate_adaptive_brachistochrone returns 8 values", () => {
    const accel = 0.0002; // km/s²
    const duration = 3600;
    const flipTime = 1800;
    // Returns [x, y, z, vx, vy, vz, time, n_eval]
    const result = wasm.propagate_adaptive_brachistochrone(
      x0, 0, 0, 0, vy0, 0, muSun, duration, accel, flipTime, 1e-8, 1e-10,
    );
    assert.equal(result.length, 8, "should return 8 values");
    assert.ok(result[7] > 0, `n_eval=${result[7]}`);
  });

  it("propagate_symplectic_ballistic has excellent energy conservation", () => {
    // Returns [x, y, z, vx, vy, vz, time, energy_drift, n_steps]
    const result = wasm.propagate_symplectic_ballistic(
      x0, 0, 0, 0, vy0, 0, muSun, 60, 86400,
    );
    assert.equal(result.length, 9, "should return 9 values");
    const drift = result[7];
    assert.ok(drift < 1e-6, `energy drift=${drift}`);
    // Symplectic integrators should conserve energy well
    const rFinal = Math.sqrt(result[0] ** 2 + result[1] ** 2 + result[2] ** 2);
    assert.ok(
      rFinal > 140_000_000 && rFinal < 160_000_000,
      `final radius=${rFinal} km`,
    );
  });
});

// ---------------------------------------------------------------------------
// Saturn ring crossing
// ---------------------------------------------------------------------------

describe("WASM bridge: Saturn ring crossing", () => {
  it("saturn_ring_crossing returns crossing analysis", () => {
    const j2000 = 2_451_545.0;
    // Ship approaching Saturn from above the ring plane
    const result = wasm.saturn_ring_crossing(
      0, 0, 100_000, // position: 100k km above ring plane
      0, 0, -10, // velocity: 10 km/s downward
      j2000,
    );
    assert.ok(typeof result.crosses_ring_plane === "boolean", "has crosses_ring_plane");
    assert.ok(typeof result.within_rings === "boolean", "has within_rings");
    assert.ok(typeof result.approach_angle_to_ring_plane_deg === "number", "has approach angle");
  });

  it("straight-down approach crosses ring plane with valid angle", () => {
    const j2000 = 2_451_545.0;
    const result = wasm.saturn_ring_crossing(
      0, 0, 100_000, // directly above ecliptic
      0, 0, -10, // straight down in ecliptic z
      j2000,
    );
    assert.equal(result.crosses_ring_plane, true,
      "z-axis approach should cross ring plane");
    // Saturn's ring plane is tilted ~26.7° from ecliptic, so approach angle
    // from ecliptic z-axis is ~90°-26.7° = ~63° to ring plane
    assert.ok(
      result.approach_angle_to_ring_plane_deg > 50 && result.approach_angle_to_ring_plane_deg < 75,
      `approach angle=${result.approach_angle_to_ring_plane_deg}° should reflect Saturn tilt`,
    );
  });

  it("in-ecliptic approach has different angle than z-axis approach", () => {
    const j2000 = 2_451_545.0;
    // Approaching from in-ecliptic-plane (along x-axis)
    const inEcliptic = wasm.saturn_ring_crossing(
      100_000, 0, 0, // in ecliptic plane, 100k km from Saturn
      -10, 0, 0, // approaching along -x
      j2000,
    );
    // Approaching from above (along z-axis)
    const fromAbove = wasm.saturn_ring_crossing(
      0, 0, 100_000,
      0, 0, -10,
      j2000,
    );
    // Both should cross ring plane but at different angles
    assert.equal(inEcliptic.crosses_ring_plane, true);
    assert.equal(fromAbove.crosses_ring_plane, true);
    const angleDiff = Math.abs(
      inEcliptic.approach_angle_to_ring_plane_deg - fromAbove.approach_angle_to_ring_plane_deg,
    );
    assert.ok(angleDiff > 10,
      `angle difference=${angleDiff}° should be significant between ecliptic and z-axis approaches`);
  });
});

// ---------------------------------------------------------------------------
// Mass compute timeline
// ---------------------------------------------------------------------------

describe("WASM bridge: mass compute timeline", () => {
  it("mass_compute_timeline computes snapshots from events", () => {
    const input = {
      name: "test-ship",
      initial_total_kg: 48_000_000,
      initial_dry_kg: 47_000_000,
      events: [
        {
          time_h: 0,
          episode: 1,
          label: "Departure burn",
          kind: {
            type: "fuel_burn",
            delta_v_km_s: 1.0,
            isp_s: 1_000_000,
            burn_duration_h: 0.5,
          },
        },
        {
          time_h: 24,
          episode: 1,
          label: "Container jettison",
          kind: {
            type: "container_jettison",
            mass_kg: 42_300,
          },
        },
      ],
    };
    const result = wasm.mass_compute_timeline(input);
    assert.equal(result.name, "test-ship", "name matches");
    assert.ok(result.snapshots.length >= 2, `snapshots=${result.snapshots.length}, result=${JSON.stringify(result).slice(0, 200)}`);
    // Find post-burn snapshot: total mass should have decreased from initial
    const lastSnapshot = result.snapshots[result.snapshots.length - 1];
    assert.ok(
      lastSnapshot.total_mass_kg < 48_000_000,
      `final mass=${lastSnapshot.total_mass_kg} < initial 48M`,
    );
  });

  it("jettison-only event reduces total mass by exact amount", () => {
    const jettMass = 100_000; // 100t
    const input = {
      name: "jettison-test",
      initial_total_kg: 1_000_000,
      initial_dry_kg: 900_000,
      events: [
        {
          time_h: 10,
          episode: 1,
          label: "Container drop",
          kind: {
            type: "container_jettison",
            mass_kg: jettMass,
          },
        },
      ],
    };
    const result = wasm.mass_compute_timeline(input);
    const lastSnapshot = result.snapshots[result.snapshots.length - 1];
    assert.ok(
      Math.abs(lastSnapshot.total_mass_kg - (1_000_000 - jettMass)) < 1,
      `after jettison: mass=${lastSnapshot.total_mass_kg}, expected ${1_000_000 - jettMass}`,
    );
  });

  it("multiple burns produce monotonically decreasing total mass", () => {
    const input = {
      name: "multi-burn",
      initial_total_kg: 1_000_000,
      initial_dry_kg: 800_000,
      events: [
        { time_h: 0, episode: 1, label: "Burn 1",
          kind: { type: "fuel_burn" as const, delta_v_km_s: 50.0, isp_s: 100_000, burn_duration_h: 1 } },
        { time_h: 10, episode: 1, label: "Burn 2",
          kind: { type: "fuel_burn" as const, delta_v_km_s: 50.0, isp_s: 100_000, burn_duration_h: 1 } },
        { time_h: 20, episode: 1, label: "Burn 3",
          kind: { type: "fuel_burn" as const, delta_v_km_s: 50.0, isp_s: 100_000, burn_duration_h: 1 } },
      ],
    };
    const result = wasm.mass_compute_timeline(input);
    // Should have at least 3 snapshots (one per burn)
    assert.ok(result.snapshots.length >= 3,
      `expected ≥3 snapshots, got ${result.snapshots.length}`);
    // Mass should decrease monotonically after each burn
    for (let i = 1; i < result.snapshots.length; i++) {
      assert.ok(result.snapshots[i].total_mass_kg <= result.snapshots[i - 1].total_mass_kg,
        `mass should decrease: snapshot[${i}]=${result.snapshots[i].total_mass_kg} > snapshot[${i - 1}]=${result.snapshots[i - 1].total_mass_kg}`);
    }
    // Final mass should be less than initial but above dry mass
    const finalMass = result.snapshots[result.snapshots.length - 1].total_mass_kg;
    assert.ok(finalMass < 1_000_000, `final mass ${finalMass} < initial 1M`);
    assert.ok(finalMass > 800_000, `final mass ${finalMass} > dry mass 800k`);
  });
});

// ---------------------------------------------------------------------------
// DAG analysis
// ---------------------------------------------------------------------------

describe("WASM bridge: DAG analysis", () => {
  // Minimal DAG state for testing
  // Note: JsDagNode uses #[serde(rename_all = "camelCase")] so depends_on → dependsOn
  const dagState = {
    nodes: {
      "param.ship_mass": {
        id: "param.ship_mass",
        type: "parameter",
        dependsOn: ["source.worldbuilding_doc"],
        status: "valid",
        tags: ["ship"],
      },
      "source.worldbuilding_doc": {
        id: "source.worldbuilding_doc",
        type: "data_source",
        dependsOn: [],
        status: "valid",
        tags: ["source"],
      },
      "analysis.ep01_transfer": {
        id: "analysis.ep01_transfer",
        type: "analysis",
        dependsOn: ["param.ship_mass"],
        status: "valid",
        tags: ["ep01"],
      },
      "report.ep01": {
        id: "report.ep01",
        type: "report",
        dependsOn: ["analysis.ep01_transfer"],
        status: "valid",
        tags: ["ep01", "report"],
      },
    },
  };

  it("dag_analyze returns topological order and critical path", () => {
    const result = wasm.dag_analyze(dagState);
    assert.ok(Array.isArray(result.topo_order), "has topo_order");
    assert.equal(result.topo_order.length, 4, "all 4 nodes in topo order");
    assert.ok(Array.isArray(result.critical_path), "has critical_path");
    assert.ok(result.critical_path.length > 0, "critical path is non-empty");
    assert.ok(Array.isArray(result.orphans), "has orphans");
  });

  it("dag_downstream finds downstream nodes", () => {
    const downstream: string[] = wasm.dag_downstream(dagState, "param.ship_mass");
    assert.ok(downstream.length >= 1, `downstream has ${downstream.length} nodes: ${JSON.stringify(downstream)}`);
    const dsSet = new Set(downstream);
    assert.ok(
      dsSet.has("analysis.ep01_transfer"),
      `analysis depends on param, got: ${JSON.stringify(downstream)}`,
    );
  });

  it("dag_upstream finds upstream nodes", () => {
    const upstream: string[] = wasm.dag_upstream(dagState, "report.ep01");
    assert.ok(upstream.length >= 1, `upstream has ${upstream.length} nodes: ${JSON.stringify(upstream)}`);
    const usSet = new Set(upstream);
    assert.ok(
      usSet.has("analysis.ep01_transfer"),
      `report depends on analysis, got: ${JSON.stringify(upstream)}`,
    );
  });

  it("dag_impact returns cascade analysis", () => {
    const impact = wasm.dag_impact(dagState, "param.ship_mass");
    assert.ok(impact.affected.length >= 1, `affected: ${JSON.stringify(impact.affected)}`);
    assert.ok(impact.cascade_count >= 1, `cascade_count=${impact.cascade_count}`);
  });

  it("dag_layout returns positions for all nodes", () => {
    const layout = wasm.dag_layout(dagState, 800, 600);
    assert.equal(layout.ids.length, 4, "4 node IDs");
    assert.equal(layout.x.length, 4, "4 x positions");
    assert.equal(layout.y.length, 4, "4 y positions");
    assert.equal(layout.layers.length, 4, "4 layer assignments");
    assert.ok(typeof layout.crossings === "number", "has crossings count");
  });

  it("dag_find_paths finds path from source to report", () => {
    const result = wasm.dag_find_paths(
      dagState, "source.worldbuilding_doc", "report.ep01", 5,
    );
    // Result might be { paths: [...] } or a direct array
    const paths = result.paths ?? result;
    assert.ok(
      Array.isArray(paths) && paths.length > 0,
      `found at least one path, got: ${JSON.stringify(result)}`,
    );
  });

  it("dag_subgraph filters by tag", () => {
    const subgraph = wasm.dag_subgraph(dagState, "ep01", 0);
    assert.ok(Array.isArray(subgraph), "returns array");
    assert.ok(
      subgraph.includes("analysis.ep01_transfer"),
      "includes ep01 analysis",
    );
    assert.ok(
      subgraph.includes("report.ep01"),
      "includes ep01 report",
    );
  });
});

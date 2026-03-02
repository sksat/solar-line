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
